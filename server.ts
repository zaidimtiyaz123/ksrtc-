import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

import { authRouter } from './server/routes/authRoutes.js';
import { driverRouter } from './server/routes/driverRoutes.js';
import { locationRouter } from './server/routes/locationRoutes.js';
import { busRouter } from './server/routes/busRoutes.js';
import { routeRouter } from './server/routes/routeRoutes.js';
import { stopRouter } from './server/routes/stopRoutes.js';
import { ivrRouter } from './server/routes/ivrRoutes.js';
import { adminRouter } from './server/routes/adminRoutes.js';
import { passengerRouter } from './server/routes/passengerRoutes.js';
import { aiRouter } from './server/routes/aiRoutes.js';
import { simulationRouter } from './server/routes/simulationRoutes.js';
import { plannerRouter } from './server/routes/plannerRoutes.js';
import { fleetSimulation } from './server/services/fleetSimulationService.js';
import { setupWebSocketServer, wsTelemetry } from './server/websocket/liveServer.js';
import {
  securityHeadersMiddleware,
  wafInspectionMiddleware,
  rateLimiterMiddleware,
  adminFirewallGuard,
  firewallMetrics
} from './server/middleware/firewall.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount Application Security Firewall
  app.use(securityHeadersMiddleware);
  app.use(rateLimiterMiddleware);
  app.use(wafInspectionMiddleware);

  // Firewall Diagnostics Endpoint
  app.get('/api/security/firewall-status', (req, res) => {
    res.json({
      status: 'active',
      shield: 'KSRTC SmartTrack Intelligent Firewall',
      metrics: firewallMetrics,
      timestamp: new Date().toISOString()
    });
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'online',
      service: 'KSRTC SmartTrack Realtime Fleet Engine',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/ws/status', (req, res) => {
    res.json({
      status: 'active',
      path: '/api/ws',
      activeClients: wsTelemetry.activeClients,
      peakConcurrentClients: wsTelemetry.peakConcurrentClients,
      totalConnectionsServed: wsTelemetry.totalConnectionsServed,
      messagesBroadcasted: wsTelemetry.messagesBroadcasted,
      pingsProcessed: wsTelemetry.pingsProcessed,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/config/maps', (req, res) => {
    const rawKey = (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim();
    // Valid Google Maps API keys start with "AIza" and are at least 20 characters
    const isValidGoogleKey = rawKey.startsWith('AIza') && rawKey.length >= 20;

    res.json({
      apiKey: isValidGoogleKey ? rawKey : '',
      configured: isValidGoogleKey,
      invalidKeyDetected: Boolean(rawKey && !isValidGoogleKey),
      invalidKeyType: rawKey.startsWith('nvapi-') ? 'nvidia' : rawKey ? 'unknown' : 'none',
      invalidKeyReason: Boolean(rawKey && !isValidGoogleKey)
        ? (rawKey.startsWith('nvapi-')
            ? 'An NVIDIA API key was provided in Google Maps settings. Google Maps API keys must start with "AIza".'
            : 'Configured key does not match Google Maps Platform API key format (must start with "AIza").')
        : undefined
    });
  });

  // Diagnostic Endpoint for All System API Keys & Integrations
  app.get('/api/config/system-keys', (req, res) => {
    const gmapsRaw = (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim();
    const gmapsValid = gmapsRaw.startsWith('AIza') && gmapsRaw.length >= 20;

    const geminiRaw = (process.env.GEMINI_API_KEY || '').trim();
    const geminiValid = Boolean(geminiRaw && geminiRaw !== 'MY_GEMINI_API_KEY' && geminiRaw.length > 20);

    const supabaseUrlRaw = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKeyRaw = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    const isSupabaseUrlValid = (supabaseUrlRaw.startsWith('http://') || supabaseUrlRaw.startsWith('https://')) && !supabaseUrlRaw.includes('localhost:0');
    const isSupabaseKeyValid = supabaseKeyRaw.length >= 20 && !supabaseKeyRaw.startsWith('nvapi-');

    const twilioSidRaw = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const twilioTokenRaw = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const isTwilioValid = twilioSidRaw.startsWith('AC') && twilioTokenRaw.length >= 20 && !twilioSidRaw.startsWith('nvapi-');

    res.json({
      keys: [
        {
          id: 'free_maps',
          name: 'Free Interactive Vector & Satellite Maps',
          provider: 'OpenStreetMap & CartoDB (Leaflet Engine)',
          status: 'active',
          isKeyRequired: false,
          health: 'healthy',
          message: '100% Free & Unlimited. Zero API key required. Supports CartoDB Dark, Voyager, OSM, and Esri Satellite.',
          action: 'Ready to use across all tracking views.'
        },
        {
          id: 'gemini_ai',
          name: 'Google Gemini Transit AI Copilot',
          provider: 'Google DeepMind (@google/genai)',
          status: geminiValid ? 'active' : 'missing',
          isKeyRequired: true,
          health: geminiValid ? 'healthy' : 'warning',
          message: geminiValid
            ? 'Connected with multi-model failover (gemini-3.6-flash / gemini-3.8-flash).'
            : 'Gemini API key is not configured or empty.',
          action: geminiValid ? 'AI transit assistant and voice announcements are active.' : 'Add GEMINI_API_KEY in Settings.'
        },
        {
          id: 'google_maps',
          name: 'Google Maps Platform SDK',
          provider: 'Google Maps JavaScript API',
          status: gmapsValid ? 'active' : gmapsRaw ? 'error' : 'unconfigured',
          isKeyRequired: true,
          health: gmapsValid ? 'healthy' : 'warning',
          message: gmapsValid
            ? 'Valid Google Maps API Key active.'
            : gmapsRaw.startsWith('nvapi-')
            ? 'Error: An NVIDIA API Key was entered instead of a Google Maps key (Google keys must start with "AIza").'
            : gmapsRaw === '100' || gmapsRaw === 'VITE_GOOGLE_MAPS_API_KEY'
            ? 'Error: Placeholder value detected instead of an API key.'
            : 'Unconfigured. Free OpenStreetMap engine is active as primary zero-key map.',
          action: 'Use the 1-click Free OpenStreetMap or get a Google Maps Demo Key.'
        },
        {
          id: 'supabase_db',
          name: 'Supabase PostgreSQL Cloud Sync',
          provider: 'Supabase Database',
          status: (isSupabaseUrlValid && isSupabaseKeyValid) ? 'active' : 'local_storage',
          isKeyRequired: false,
          health: (isSupabaseUrlValid && isSupabaseKeyValid) ? 'healthy' : 'info',
          message: (isSupabaseUrlValid && isSupabaseKeyValid)
            ? 'Connected to remote Supabase database.'
            : supabaseKeyRaw.startsWith('nvapi-')
            ? 'Note: NVIDIA API key detected in Supabase config. Telemetry is safely persisted locally in high-speed memory DB.'
            : 'Telemetry running on ultra-fast local database engine (zero cloud configuration needed).',
          action: 'Local memory database is fully operational.'
        },
        {
          id: 'telephony_ivr',
          name: 'IVR Telephony & Audio Announcements',
          provider: 'Web SpeechSynthesis & Audio Synthesizer',
          status: 'active',
          isKeyRequired: false,
          health: 'healthy',
          message: 'Zero-cost browser speech synthesizer handles live Kannada, English, and Hindi stop announcements without external Twilio charges.',
          action: 'Interactive DTMF simulator ready in Passenger Portal.'
        }
      ],
      freeMapAvailable: true,
      aiCopilotAvailable: geminiValid
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/driver', driverRouter);
  app.use('/api/location', locationRouter);
  app.use('/api/buses', busRouter);
  app.use('/api/routes', routeRouter);
  app.use('/api/stops', stopRouter);
  app.use('/api/ivr', ivrRouter);
  app.use('/api/admin', adminFirewallGuard, adminRouter);
  app.use('/api/passenger', passengerRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/simulation', simulationRouter);
  app.use('/api/planner', plannerRouter);

  const server = http.createServer(app);

  // Mount Real-Time WebSocket Server
  setupWebSocketServer(server);

  // Production Deployment: Simulation disabled for clean real GPS tracking
  console.log('[KSRTC SmartTrack] Production Mode: Real-time driver GPS & passenger telemetry active');

  // Vite Middleware for SPA Frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false // Prevent WebSocket connection errors inside container proxy
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[KSRTC SmartTrack] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start KSRTC SmartTrack server:', err);
});
