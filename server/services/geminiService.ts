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

function generateLocalTransitResponse(query: string, language: string, contextSummary: any, routes: any[]): string {
  const q = query.toLowerCase();

  if (language === 'kn') {
    if (q.includes('shakti') || q.includes('ಶಕ್ತಿ') || q.includes('ಮಹಿಳೆ') || q.includes('ಉಚಿತ')) {
      return 'ಶಕ್ತಿ ಯೋಜನೆಯಡಿ ಕರ್ನಾಟಕದ ಮಹಿಳಾ ಪ್ರಯಾಣಿಕರಿಗೆ ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಸಾಮಾನ್ಯ ಮತ್ತು ವೇಗದೂತ (ಕರ್ನಾಟಕ ಸಾರಿಗೆ) ಬಸ್‌ಗಳಲ್ಲಿ ಉಚಿತ ಪ್ರಯಾಣ ಲಭ್ಯವಿದೆ. ಪ್ರಯಾಣದ ವೇಳೆ ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಗುರುತಿನ ಚೀಟಿ (ಆಧಾರ್ ಅಥವಾ ವೋಟರ್ ಐಡಿ) ತೋರಿಸಿ ಶಕ್ತಿ ಶೂನ್ಯ ಶುಲ್ಕ ಟಿಕೆಟ್ ಪಡೆಯಬಹುದು.';
    }
    if (q.includes('152') || q.includes('ತುಮಕೂರು') || q.includes('ಬೆಂಗಳೂರು')) {
      return 'ಮಾರ್ಗ 152 (ತುಮಕೂರು ⇄ ಬೆಂಗಳೂರು ಮೆಜೆಸ್ಟಿಕ್ ಎಕ್ಸ್‌ಪ್ರೆಸ್): ಪ್ರಯಾಣ ದೂರ 72.5 ಕಿಮೀ, ಸರಾಸರಿ ಅವಧಿ 90 ನಿಮಿಷಗಳು. ಪ್ರತಿ 15 ನಿಮಿಷಕ್ಕೊಮ್ಮೆ ಬಸ್‌ಗಳು ಲಭ್ಯವಿವೆ. ಪ್ರಸ್ತುತ ನೈಜ ಸಮಯದಲ್ಲಿ ವಾಹನಗಳು ಸಕ್ರಿಯವಾಗಿ ಸಂಚರಿಸುತ್ತಿವೆ.';
    }
    return `ನಮಸ್ಕಾರ! ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಸ್ಮಾರ್ಟ್‌ಟ್ರ್ಯಾಕ್: ಪ್ರಸ್ತುತ ${contextSummary.activeTripsCount} ಬಸ್‌ಗಳು ${contextSummary.totalRoutes} ಪ್ರಮುಖ ಮಾರ್ಗಗಳಲ್ಲಿ ಸಕ್ರಿಯವಾಗಿ ಸಂಚರಿಸುತ್ತಿವೆ. ನೇರ ಜಿಪಿಎಸ್ ನಕ್ಷೆಯಲ್ಲಿ ನಿಮ್ಮ ಬಸ್ ಇರುವ ಸ್ಥಳ ಮತ್ತು ನಿಖರ ಆಗಮನ ಸಮಯವನ್ನು ವೀಕ್ಷಿಸಬಹುದು.`;
  }

  if (language === 'hi') {
    if (q.includes('shakti') || q.includes('women') || q.includes('free') || q.includes('महिला')) {
      return 'शक्ति योजना के तहत कर्नाटक की निवासी महिलाओं को केएसआरटीसी की साधारण और एक्सप्रेस (कर्नाटक सारिगे) बसों में मुफ्त यात्रा की सुविधा उपलब्ध है। यात्रा के दौरान वैध सरकारी पहचान पत्र (आधार कार्ड या वोटर आईडी) प्रस्तुत करना पर्याप्त है।';
    }
    return `नमस्ते! केएसआरटीसी स्मार्टट्रैक सेवा: वर्तमान में ${contextSummary.activeTripsCount} बसें ${contextSummary.totalRoutes} प्रमुख मार्गों (बेंगलुरु, मैसूरु, तुमकुरु) पर सक्रिय रूप से चल रही हैं। लाइव मैप पर सटीक जीपीएस स्थिति ट्रैक कर सकते हैं।`;
  }

  // English
  if (q.includes('shakti') || q.includes('women') || q.includes('free') || q.includes('rule')) {
    return 'Under the KSRTC Shakti Scheme, women domiciled in Karnataka travel free on all ordinary and express (Karnataka Sarige) state services. Commuters simply present any valid Karnataka government photo ID (Aadhaar or Voter ID) to the conductor to receive a zero-fare ticket.';
  }

  if (q.includes('152') || q.includes('tumkur') || q.includes('majestic')) {
    return 'Route 152 (Tumkur ⇄ Bengaluru Majestic Kempegowda Express via NH48): Distance is 72.5 km with an average travel time of 90 minutes. Operating every 15 minutes with real-time GPS tracking active.';
  }

  if (q.includes('ev') || q.includes('electric') || q.includes('power plus')) {
    return 'Yes, KSRTC operates modern "EV Power Plus" intercity electric luxury coaches along the Bengaluru-Mysuru Expressway, offering fast charging, air conditioning, and zero-emission travel.';
  }

  if (q.includes('majestic') || q.includes('kempegowda')) {
    return `Currently, active express services are connected to Kempegowda Majestic Station from Tumkur (Route 152), Mysuru (Route 201), and Hassan. Check the Live Tracking page for real-time corridor arrivals.`;
  }

  return `KSRTC SmartTrack Transit Assistant: Currently, ${contextSummary.activeTripsCount} buses are operating across ${contextSummary.totalRoutes} active routes including Bengaluru, Mysuru, Tumkur, and Hassan corridors. Live GPS coordinates and ETAs are continually refreshed on the Tracking Map.`;
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
      const fallbackText = generateLocalTransitResponse(query, language, contextSummary, routes);
      return {
        response: fallbackText,
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

    const intelligentFallback = generateLocalTransitResponse(query, language, contextSummary, routes);
    return {
      response: intelligentFallback,
      isAiGenerated: false
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
