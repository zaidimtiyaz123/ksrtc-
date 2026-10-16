import { Router } from 'express';
import { GeminiTransitService, getGeminiAI } from '../services/geminiService.js';

export const aiRouter = Router();

// Check status of configured AI API Keys & Gemini capability
aiRouter.get('/status', (req, res) => {
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY.trim().length > 0
  );

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const hasSupabase = Boolean(
    (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
    supabaseKey.length >= 20
  );

  const hasIVR = Boolean(process.env.IVR_API_KEY || process.env.TWILIO_AUTH_TOKEN);

  res.json({
    gemini: {
      available: hasGeminiKey,
      model: 'gemini-3.8-flash',
      feature: 'KSRTC SmartTrack AI Transit Copilot & Dispatch Intelligence'
    },
    supabase: {
      available: hasSupabase,
      feature: 'PostgreSQL Real-Time Telemetry Background Sync'
    },
    ivr: {
      available: hasIVR,
      provider: process.env.IVR_PROVIDER || 'exotel',
      feature: 'Automated Telephony & SMS Alerts'
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

// Transit Copilot: Passenger & Conductor conversational assistance
aiRouter.post('/transit-copilot', async (req, res) => {
  try {
    const { query, language, userRole } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const result = await GeminiTransitService.queryTransitAssistant({
      query,
      language: language || 'en',
      userRole: userRole || 'passenger'
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to process AI transit query',
      details: err?.message
    });
  }
});

// Voice Announcement Generator for Driver Public Address
aiRouter.post('/announcement', async (req, res) => {
  try {
    const { stopName, routeNumber, language } = req.body;
    const text = await GeminiTransitService.generateCockpitAnnouncement(
      stopName || 'Upcoming Station',
      routeNumber || '152',
      language || 'kn'
    );
    res.json({ announcement: text });
  } catch (err: any) {
    res.status(500).json({ error: 'Announcement generation failed' });
  }
});
