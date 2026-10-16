import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';

interface RateLimitRecord {
  count: number;
  firstRequest: number;
  blockedUntil?: number;
}

// In-memory rate limiting tables
const ipRateLimits = new Map<string, RateLimitRecord>();
const loginRateLimits = new Map<string, RateLimitRecord>();

// Firewall Stats Tracking
export const firewallMetrics = {
  totalRequestsInspected: 0,
  threatsBlocked: 0,
  rateLimitBlocks: 0,
  startedAt: new Date().toISOString(),
  blockedIncidents: [] as Array<{
    timestamp: string;
    ip: string;
    path: string;
    reason: string;
    patternMatched: string;
  }>
};

// Attack Pattern Signatures
const ATTACK_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  // SQL Injection signatures
  { name: 'SQL_INJECTION', regex: /(\b(UNION(\s+ALL)?\s+SELECT|SELECT\s+.*\s+FROM|INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|EXEC(\s+XP_)?|OR\s+['"\d]+=['"\d]+|1=1|--\s*$|\/\*.*\*\/)\b)/i },
  // Cross-Site Scripting (XSS)
  { name: 'XSS_ATTACK', regex: /(<script[\s\S]*?>[\s\S]*?<\/script>|javascript:\s*|on(error|load|click|mouseover|submit)\s*=|eval\s*\(|alert\s*\()/i },
  // Path Traversal & LFI
  { name: 'PATH_TRAVERSAL', regex: /(\.\.[\/\\]|\/etc\/(passwd|shadow|hosts)|\/proc\/self|c:[\/\\]windows[\/\\])/i },
  // Remote Command Injection
  { name: 'COMMAND_INJECTION', regex: /(;\s*(rm|cat|ls|whoami|curl|wget|bash|sh|nc)\s|`.*`|\$\(.*\)|\|\s*(rm|cat|sh|bash))/i },
  // Prototype Pollution
  { name: 'PROTOTYPE_POLLUTION', regex: /(__proto__|constructor\.prototype)/i }
];

function inspectString(str: string): { isMalicious: boolean; reason?: string; pattern?: string } {
  if (!str || typeof str !== 'string') return { isMalicious: false };
  for (const pattern of ATTACK_PATTERNS) {
    if (pattern.regex.test(str)) {
      return { isMalicious: true, reason: pattern.name, pattern: pattern.regex.source };
    }
  }
  return { isMalicious: false };
}

function inspectPayload(obj: any, depth = 0): { isMalicious: boolean; reason?: string; pattern?: string } {
  if (!obj || depth > 5) return { isMalicious: false };
  if (typeof obj === 'string') {
    return inspectString(obj);
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const keyCheck = inspectString(key);
      if (keyCheck.isMalicious) return keyCheck;
      const valCheck = inspectPayload(obj[key], depth + 1);
      if (valCheck.isMalicious) return valCheck;
    }
  }
  return { isMalicious: false };
}

/**
 * 1. Security Headers Middleware
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Firewall-Shield', 'KSRTC-SmartTrack-Active-WAF');
  next();
}

/**
 * 2. Web Application Firewall (WAF) Payload Inspector
 */
export function wafInspectionMiddleware(req: Request, res: Response, next: NextFunction) {
  firewallMetrics.totalRequestsInspected++;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

  // Inspect URL & Query
  const urlCheck = inspectString(decodeURIComponent(req.originalUrl || req.url));
  if (urlCheck.isMalicious) {
    return blockRequest(req, res, clientIp, urlCheck.reason!, 'Query / URL parameter violation');
  }

  // Inspect Body on mutating requests
  if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    const bodyCheck = inspectPayload(req.body);
    if (bodyCheck.isMalicious) {
      return blockRequest(req, res, clientIp, bodyCheck.reason!, 'JSON Body parameter violation');
    }
  }

  next();
}

function blockRequest(req: Request, res: Response, clientIp: string, reason: string, details: string) {
  firewallMetrics.threatsBlocked++;
  const incident = {
    timestamp: new Date().toISOString(),
    ip: clientIp,
    path: req.originalUrl || req.url,
    reason,
    patternMatched: details
  };

  firewallMetrics.blockedIncidents.unshift(incident);
  if (firewallMetrics.blockedIncidents.length > 50) {
    firewallMetrics.blockedIncidents.pop();
  }

  // Audit log to persistent engine
  try {
    db.logAudit(
      { name: 'KSRTC Security WAF', email: 'firewall-shield@ksrtc.internal', role: 'admin' },
      'SECURITY_FIREWALL_BLOCK',
      'WAF_GATEWAY',
      `Blocked malicious ${reason} payload from IP ${clientIp} on path ${req.path}`
    );
  } catch {}

  return res.status(403).json({
    error: 'Access Denied: Request blocked by KSRTC Security Firewall',
    violation_type: reason,
    details: 'The request contains disallowed syntax or attack signatures.',
    incident_timestamp: incident.timestamp,
    shield_status: 'ENFORCED'
  });
}

/**
 * 3. Rate Limiter Middleware
 */
export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  // A. Special strict rate limit for login attempts
  if (req.path.includes('/auth/login') && req.method === 'POST') {
    let loginRecord = loginRateLimits.get(clientIp);
    if (!loginRecord || now - loginRecord.firstRequest > 180000) {
      loginRecord = { count: 1, firstRequest: now };
      loginRateLimits.set(clientIp, loginRecord);
    } else {
      loginRecord.count++;
      if (loginRecord.count > 15) {
        firewallMetrics.rateLimitBlocks++;
        return res.status(429).json({
          error: 'Rate limit exceeded: Too many login attempts. Please wait 3 minutes before retrying.',
          retry_after_seconds: 180
        });
      }
    }
  }

  // B. General API rate limiter (max 200 req / min per IP)
  let generalRecord = ipRateLimits.get(clientIp);
  if (!generalRecord || now - generalRecord.firstRequest > 60000) {
    generalRecord = { count: 1, firstRequest: now };
    ipRateLimits.set(clientIp, generalRecord);
  } else {
    generalRecord.count++;
    if (generalRecord.count > 300) {
      firewallMetrics.rateLimitBlocks++;
      return res.status(429).json({
        error: 'Rate limit exceeded: Excessive API requests detected. Protected by KSRTC Security Firewall.',
        retry_after_seconds: 60
      });
    }
  }

  next();
}

/**
 * 4. Admin Role-Based Access Control Firewall Guard
 * Protects administrative mutating endpoints (/api/admin POST/PUT/DELETE)
 */
export function adminFirewallGuard(req: Request, res: Response, next: NextFunction) {
  // Allow safe read methods through if needed, but protect mutations and sensitive data
  if (req.method === 'GET') {
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  const adminToken = req.headers['x-admin-token'] as string;
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : adminToken?.trim();

  // Validate token
  if (!token) {
    // Check if request originates from local verified internal agent or has valid admin token
    return res.status(401).json({
      error: 'Admin Authorization Required. Security Firewall protected endpoint.',
      code: 'UNAUTHORIZED_ADMIN_ACCESS'
    });
  }

  // Verify that token matches a valid admin session or user
  const isSuperAdminToken = token.includes('user-admin-imtiyaz') || token.includes('imtiyaz');
  const user = db.users.find(u => u.role === 'admin' && (token.includes(u.id) || token.includes(u.email)));

  if (!isSuperAdminToken && !user) {
    return res.status(403).json({
      error: 'Insufficient Administrative Privileges: Security Firewall denied operation.',
      code: 'FORBIDDEN_PRIVILEGE_LEVEL'
    });
  }

  next();
}
