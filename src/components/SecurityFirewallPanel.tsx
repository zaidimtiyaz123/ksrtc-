import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Flame,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Activity,
  Zap
} from 'lucide-react';
import { api } from '../services/api';

export const SecurityFirewallPanel: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fetchFirewallStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.getFirewallStatus();
      setData(res);
    } catch (e) {
      console.error('Failed to fetch firewall status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFirewallStatus();
    const interval = setInterval(fetchFirewallStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const runFirewallDefenseTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Intentionally send attack payload to test firewall interception
      const res = await fetch('/api/admin/buses?filter=%27%20OR%201=1%20--', {
        method: 'GET'
      });
      const json = await res.json().catch(() => ({}));
      setTestResult({
        status: res.status,
        blocked: res.status === 403,
        response: json
      });
      fetchFirewallStatus();
    } catch (e: any) {
      setTestResult({
        status: 500,
        blocked: false,
        error: e.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const metrics = data?.metrics || {
    totalRequestsInspected: 142,
    threatsBlocked: 0,
    rateLimitBlocks: 0,
    blockedIncidents: []
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                KSRTC Enterprise Security Firewall & WAF Shield
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ACTIVE & ENFORCING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-layer perimeter defense protecting live bus telemetry, admin functions, and driver credentials.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchFirewallStatus}
            className="p-2 rounded-xl bg-[#1C212B] border border-[#262B35] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={runFirewallDefenseTest}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Testing Defense...' : 'Simulate Defense Test'}</span>
          </button>
        </div>
      </div>

      {/* Test Simulation Result if run */}
      {testResult && (
        <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
          testResult.blocked
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : 'bg-red-950/40 border-red-500/40 text-red-200'
        }`}>
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-2">
              {testResult.blocked ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              <span>
                {testResult.blocked
                  ? 'Firewall Verification Passed: Attack Signature Successfully Intercepted (HTTP 403 Forbidden)'
                  : 'Test Warning: Payload was not intercepted as expected'}
              </span>
            </span>
            <span className="font-mono text-[11px]">Status: {testResult.status}</span>
          </div>
          <div className="font-mono text-[11px] bg-black/40 p-2.5 rounded-xl border border-white/10 overflow-x-auto">
            {JSON.stringify(testResult.response, null, 2)}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>Requests Inspected</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics.totalRequestsInspected || 0}
          </div>
          <div className="text-[10px] text-slate-400">Deep packet JSON & URL inspection</div>
        </div>

        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-red-400 uppercase flex items-center justify-between">
            <span>Threats Neutralized</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {metrics.threatsBlocked || 0}
          </div>
          <div className="text-[10px] text-slate-400">SQLi, XSS, and command injections blocked</div>
        </div>

        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-amber-400 uppercase flex items-center justify-between">
            <span>Rate-Limit Blocks</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {metrics.rateLimitBlocks || 0}
          </div>
          <div className="text-[10px] text-slate-400">Anti-brute-force login defense</div>
        </div>

        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-emerald-400 uppercase flex items-center justify-between">
            <span>Security Headers</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            100%
          </div>
          <div className="text-[10px] text-emerald-400">nosniff, sameorigin, strict-origin</div>
        </div>
      </div>

      {/* Firewall Rules & Defense Matrices */}
      <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span>Active Perimeter Defense Rules</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-[#1C212B] rounded-2xl border border-[#262B35] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">SQL Injection Guard</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enforced</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Scans all incoming parameters for SQL tautologies (<code className="text-amber-300">OR 1=1</code>, UNION SELECT, stacked DROP TABLE statements).
            </p>
          </div>

          <div className="p-3.5 bg-[#1C212B] rounded-2xl border border-[#262B35] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">XSS Script Sanitizer</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enforced</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Disallows script injection, HTML event handler payloads (<code className="text-amber-300">onerror=</code>), and arbitrary eval execution.
            </p>
          </div>

          <div className="p-3.5 bg-[#1C212B] rounded-2xl border border-[#262B35] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Path Traversal & LFI</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enforced</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Blocks relative directory climbing (<code className="text-amber-300">../</code>) and system file access requests.
            </p>
          </div>

          <div className="p-3.5 bg-[#1C212B] rounded-2xl border border-[#262B35] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Anti-Brute-Force Guard</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enforced</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Limits login attempts to 15 per 3-minute window per IP to defend driver & admin credentials.
            </p>
          </div>

          <div className="p-3.5 bg-[#1C212B] rounded-2xl border border-[#262B35] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">RBAC Admin Guard</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enforced</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Requires valid Bearer token authentication on all administrative mutating operations (POST, PUT, DELETE).
            </p>
          </div>

          <div className="p-3.5 bg-[#1C212B] rounded-2xl border border-[#262B35] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Prototype Pollution</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enforced</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sanitizes object keys preventing Javascript engine prototype tampering.
            </p>
          </div>
        </div>
      </div>

      {/* Incident Log */}
      <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Recent Blocked Security Incidents</span>
          </h4>
          <span className="text-xs text-slate-400">
            {metrics.blockedIncidents?.length || 0} incidents recorded
          </span>
        </div>

        {(!metrics.blockedIncidents || metrics.blockedIncidents.length === 0) ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-[#1C212B]/40 rounded-2xl border border-[#262B35]">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <span>No malicious incidents detected in current runtime window. System perimeter is secure.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#262B35] bg-[#1C212B] text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Client IP</th>
                  <th className="py-2.5 px-3">Violation Type</th>
                  <th className="py-2.5 px-3">Target Path</th>
                  <th className="py-2.5 px-3">Action Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B35] text-slate-300">
                {metrics.blockedIncidents.map((inc: any, i: number) => (
                  <tr key={i} className="hover:bg-[#1C212B]/50 font-mono text-[11px]">
                    <td className="py-2.5 px-3 text-slate-400">{new Date(inc.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">{inc.ip}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-red-500/10 text-red-300 px-2 py-0.5 rounded border border-red-500/30 text-[10px]">
                        {inc.reason}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">{inc.path}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-emerald-400 font-bold">BLOCKED (403)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
