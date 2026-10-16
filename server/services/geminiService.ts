import { GoogleGenAI } from '@google/genai';
import { db } from '../db/database.js';

let aiClient: GoogleGenAI | null = null;

/**
 * Lazy initialization for Gemini API SDK
 * Never crashes the application when GEMINI_API_KEY is not configured.
 */
export function getGeminiAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }

  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey });
    } catch (err) {
      console.warn('[Gemini AI] Initialization warning:', err);
      return null;
    }
  }

  return aiClient;
}

export interface TransitCopilotQuery {
  query: string;
  language?: 'en' | 'kn' | 'hi';
  userRole?: 'passenger' | 'driver' | 'admin';
  currentLocation?: { latitude: number; longitude: number };
}

export class GeminiTransitService {
  /**
   * AI Transit Copilot: Answers passenger queries about routes, stops, active buses,
   * schedules, accessibility, and optimal connecting services across Karnataka.
   */
  static async queryTransitAssistant({ query, language = 'en', userRole = 'passenger' }: TransitCopilotQuery) {
    const ai = getGeminiAI();

    // Snapshot of real fleet & route state from in-memory DB
    const activeBuses = db.buses.filter(b => b.status === 'active');
    const routes = db.routes.filter(r => r.status === 'active');
    const activeTrips = db.trips.filter(t => t.status === 'in_progress');

    const contextSummary = {
      totalRoutes: routes.length,
      activeBusesCount: activeBuses.length,
      activeTripsCount: activeTrips.length,
      availableRoutes: routes.map(r => ({
        number: r.route_number,
        name: r.route_name,
        origin: r.origin,
        destination: r.destination,
        distance_km: r.distance_km,
        duration_min: r.estimated_duration_min
      })),
      activeBuses: activeBuses.map(b => ({
        reg: b.registration_number,
        fleetNo: b.fleet_number,
        model: b.model,
        depot: b.depot
      }))
    };

    if (!ai) {
      // Graceful fallback when GEMINI_API_KEY is not yet supplied in settings
      return {
        response: `KSRTC SmartTrack AI Copilot is running in fallback mode (GEMINI_API_KEY not set). Currently, ${contextSummary.activeTripsCount} buses are actively operating across ${contextSummary.totalRoutes} corridors including Bengaluru, Mysuru, Tumkur, and Hassan. For real-time AI transit answers, configure GEMINI_API_KEY in the application settings.`,
        isAiGenerated: false,
        activeCorridors: routes.map(r => r.route_number)
      };
    }

    const systemPrompt = `You are "KSRTC SmartTrack AI Transit Copilot", the intelligent transit assistant for Karnataka State Road Transport Corporation.
You assist passengers, conductors, and depot managers with accurate bus tracking, timing estimates, route connections, bus stops, and travel guidance across Karnataka.

Current Real-Time Fleet Context:
- Active Routes: ${JSON.stringify(contextSummary.availableRoutes)}
- Total Operating Buses: ${contextSummary.activeBusesCount}
- Active Trips in Progress: ${contextSummary.activeTripsCount}

Guidelines:
1. Provide helpful, polite, and concise answers tailored to Karnataka commuters.
2. If asked in Kannada, reply in Kannada script. If Hindi, in Hindi. Otherwise in English.
3. Reference real KSRTC amenities (Airavat Club Class, Rajahamsa, Sarige, Shakti Scheme for women, EV buses).
4. If asked about a specific route or stop, provide relevant details from the fleet context.`;

    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser Question (${userRole}, language=${language}): "${query}"` }]
            }
          ]
        });

        const responseText = response.text || 'Information currently unavailable from KSRTC Central Dispatch.';
        return {
          response: responseText,
          isAiGenerated: true,
          model
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiTransitService] Model ${model} unavailable, attempting fallback:`, err?.message?.slice(0, 100));
      }
    }

    console.error('[GeminiTransitService] All Gemini models exhausted:', lastError?.message || lastError);
    return {
      response: `KSRTC Live System Note: Real-time service inquiry processed. Currently, ${contextSummary.activeBusesCount} buses are actively tracking across routes 152, 201, 302, and 501. Please refer to the Live Tracking Map for exact GPS telemetry.`,
      isAiGenerated: false,
      error: lastError?.message
    };
  }

  /**
   * Driver Cockpit Voice Announcement Generator
   */
  static async generateCockpitAnnouncement(stopName: string, routeNumber: string, language: 'en' | 'kn' | 'hi' = 'kn') {
    const ai = getGeminiAI();

    if (!ai) {
      if (language === 'kn') {
        return `ಮುಂದಿನ ನಿಲ್ದಾಣ ${stopName}. ಇಳಿಯುವ ಪ್ರಯಾಣಿಕರು ಸಿದ್ಧರಾಗಿರಿ.`;
      }
      return `Next stop is ${stopName}. Passengers please get ready to alight.`;
    }

    const prompt = `Generate a concise 1-sentence public address voice announcement for a KSRTC bus on Route ${routeNumber} approaching stop "${stopName}".
Language: ${language === 'kn' ? 'Kannada' : language === 'hi' ? 'Hindi' : 'English'}.
Only output the exact announcement sentence, nothing else.`;

    for (const model of ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest']) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt
        });

        return response.text?.trim() || `Next stop ${stopName}.`;
      } catch {
        continue;
      }
    }

    return language === 'kn' ? `ಮುಂದಿನ ನಿಲ್ದಾಣ ${stopName}.` : `Next stop ${stopName}.`;
  }
}
