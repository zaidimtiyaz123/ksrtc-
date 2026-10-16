import { db } from '../db/database.js';
import { ETAService } from './etaService.js';
import { IVRResponse, Stop, Route, Bus } from '../../src/types/index.js';

export class IVRService {
  /**
   * Generates the initial welcome prompt with full tri-lingual voice speech
   */
  static getWelcomePrompt(): IVRResponse {
    const speechTextEn = 'Welcome to KSRTC SmartTrack Automated Voice Assistance. For English, press 1.';
    const speechTextKn = 'ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಸ್ಮಾರ್ಟ್‌ಟ್ರ್ಯಾಕ್ ಸ್ವಯಂಚಾಲಿತ ಧ್ವನಿ ಸೇವೆಗೆ ಸುಸ್ವಾಗತ. ಕನ್ನಡಕ್ಕಾಗಿ 2 ಒತ್ತಿ.';
    const speechTextHi = 'केएसआरटीसी स्मार्टट्रैक स्वचालित वॉयस सहायता में आपका स्वागत है। हिंदी के लिए 3 दबाएं।';

    const speechTextKnPhonetic = 'KSRTC SmartTrack svayamchalitha dhvani sevege suswaagatha. Kannadakkaagi eradu otti.';
    const speechTextHiPhonetic = 'KSRTC SmartTrack swachalit voice sahayata mein aapka swagat hai. Hindi ke liye teen dabayein.';

    const combinedSpeech = `${speechTextEn} ${speechTextKn} ${speechTextHi}`;

    return {
      step: 'welcome',
      language: 'en',
      speechText: combinedSpeech,
      speechTextKannada: speechTextKn,
      speechTextHindi: speechTextHi,
      speechTextKannadaPhonetic: speechTextKnPhonetic,
      speechTextHindiPhonetic: speechTextHiPhonetic,
      speechParts: [
        {
          lang: 'en',
          text: speechTextEn,
          phonetic: speechTextEn,
          label: 'English (Press 1)'
        },
        {
          lang: 'kn',
          text: speechTextKn,
          phonetic: speechTextKnPhonetic,
          label: 'ಕನ್ನಡ (Press 2)'
        },
        {
          lang: 'hi',
          text: speechTextHi,
          phonetic: speechTextHiPhonetic,
          label: 'हिंदी (Press 3)'
        }
      ],
      options: [
        { key: '1', label: 'English (Press 1)', action: 'set_lang_en' },
        { key: '2', label: 'ಕನ್ನಡ - Kannada (Press 2)', action: 'set_lang_kn' },
        { key: '3', label: 'हिंदी - Hindi (Press 3)', action: 'set_lang_hi' }
      ]
    };
  }

  /**
   * Prompts for Stop ID with authentic scripts and phonetics
   */
  static getStopPrompt(language: 'en' | 'kn' | 'hi' = 'en'): IVRResponse {
    const speechTextEn = 'Please enter your four-digit Bus Stop Code followed by the hash key. For example, 1 0 0 1 followed by hash. Press 9 to repeat, or 0 for Main Menu.';
    const speechTextKn = 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಾಲ್ಕು ಅಂಕಿಯ ಬಸ್ ನಿಲ್ದಾಣ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ ಹ್ಯಾಶ್ ಒತ್ತಿ. ಉದಾಹರಣೆಗೆ, ಒಂದು ಸೊನ್ನೆ ಸೊನ್ನೆ ಒಂದು ಹ್ಯಾಶ್. ಪುನರಾವರ್ತನೆಗೆ 9 ಒತ್ತಿ, ಮುಖ್ಯ ಮೆನುವಿಗೆ 0 ಒತ್ತಿ.';
    const speechTextHi = 'कृपया अपने बस स्टॉप का चार अंकों का कोड दर्ज करके हैश दबाएं। उदाहरण के लिए, एक शून्य शून्य एक हैश। दोहराने के लिए 9 दबाएं, मुख्य मेनू के लिए 0 दबाएं।';

    const speechTextKnPhonetic = 'Dayavittu nimma naalku ankiya bus nildaana sankheyannu namoodisi hash otti. Udaaharanegaagi, ondu sonne sonne ondu hash. Punaraavartanegaagi ombattu otti, mukhya menuvige sonne otti.';
    const speechTextHiPhonetic = 'Kripya apne bus stop ka chaar ankon ka code darj karke hash dabayein. Udaharan ke liye, ek shunya shunya ek hash. Dohraane ke liye nau dabayein, mukhya menu ke liye shunya dabayein.';

    let activeSpeech = speechTextEn;
    if (language === 'kn') activeSpeech = speechTextKn;
    if (language === 'hi') activeSpeech = speechTextHi;

    return {
      step: 'stop_entry',
      language,
      speechText: activeSpeech,
      speechTextKannada: speechTextKn,
      speechTextHindi: speechTextHi,
      speechTextKannadaPhonetic: speechTextKnPhonetic,
      speechTextHindiPhonetic: speechTextHiPhonetic,
      options: [
        { key: '1001', label: 'Tumkur Bus Stand (1001)', action: 'submit_stop_1001' },
        { key: '1004', label: 'Nelamangala Toll (1004)', action: 'submit_stop_1004' },
        { key: '1006', label: 'Majestic Bengaluru (1006)', action: 'submit_stop_1006' },
        { key: '1007', label: 'Mysuru Suburban Stand (1007)', action: 'submit_stop_1007' },
        { key: '9', label: 'Repeat Announcement', action: 'repeat' },
        { key: '0', label: 'Main Menu', action: 'main_menu' }
      ]
    };
  }

  /**
   * Helper to format bus registration for clear vocal articulation (e.g., "KA 01 AB 1234")
   */
  static formatRegNumberForSpeech(reg: string): string {
    if (!reg) return '';
    return reg.toUpperCase().replace(/([A-Z]+)(\d+)([A-Z]+)(\d+)/, '$1 $2 $3 $4').split('').join(' ').replace(/\s+/g, ' ');
  }

  /**
   * Resolves Stop ID from the database, finds active buses servicing this stop,
   * calculates dynamic live ETAs, and generates tri-lingual voice scripts.
   */
  static processStopLookup(stopCode: string, language: 'en' | 'kn' | 'hi' = 'en'): IVRResponse {
    const stop = db.getStopByCodeOrId(stopCode);

    if (!stop) {
      const errorEn = `Sorry, Stop Code ${stopCode} was not found in KSRTC network. Please check the four-digit stop code at your bus shelter and try again. Press 1 to retry, or 0 for Main Menu.`;
      const errorKn = `ಕ್ಷಮಿಸಿ, ನಿಲ್ದಾಣ ಸಂಖ್ಯೆ ${stopCode} ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಜಾಲದಲ್ಲಿ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಬಸ್ ನಿಲ್ದಾಣದ ನಾಲ್ಕು ಅಂಕಿಯ ಸಂಖ್ಯೆಯನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ. ಮರುಪ್ರಯತ್ನಿಸಲು 1 ಒತ್ತಿ, ಮುಖ್ಯ ಮೆನುವಿಗೆ 0 ಒತ್ತಿ.`;
      const errorHi = `क्षमा करें, बस स्टॉप कोड ${stopCode} केएसआरटीसी नेटवर्क में उपलब्ध नहीं है। कृपया शेल्टर पर लिखे चार अंकों के कोड की जांच कर पुनः प्रयास करें। दोबारा प्रयास के लिए 1 दबाएं, मुख्य मेनू के लिए 0 दबाएं।`;

      const errorKnPhonetic = `Kshamisi, nildaana sankhye ${stopCode} KSRTC jaaladalli kandubandilla. Dayavittu bus nildaanada naalku ankiya sankheyannu parisheelisi mattomme prayatnisi. Maruprayatnisalu ondu otti, mukhya menuvige sonne otti.`;
      const errorHiPhonetic = `Kshama karein, bus stop code ${stopCode} KSRTC network mein uplabdh nahi hai. Kripya shelter par likhe chaar ankon ke code ki jaanch kar punah prayas karein. Dobara prayas ke liye ek dabayein, mukhya menu ke liye shunya dabayein.`;

      let spoken = errorEn;
      if (language === 'kn') spoken = errorKn;
      if (language === 'hi') spoken = errorHi;

      return {
        step: 'error',
        language,
        speechText: spoken,
        speechTextKannada: errorKn,
        speechTextHindi: errorHi,
        speechTextKannadaPhonetic: errorKnPhonetic,
        speechTextHindiPhonetic: errorHiPhonetic,
        options: [
          { key: '1', label: 'Re-enter Stop Code', action: 'reenter_stop' },
          { key: '9', label: 'Repeat Announcement', action: 'repeat' },
          { key: '0', label: 'Main Menu', action: 'main_menu' }
        ]
      };
    }

    // Find routes that stop at this stop
    const servicingRouteStops = db.routeStops.filter(rs => rs.stop_id === stop.id);
    const servicingRouteIds = servicingRouteStops.map(rs => rs.route_id);

    // Find active trips on these routes
    const activeTrips = db.getActiveTrips().filter(t => servicingRouteIds.includes(t.route_id));

    // Calculate approaching buses
    const approachingBuses: {
      bus_id: string;
      registration_number: string;
      route_number: string;
      route_name: string;
      eta_minutes: number;
      distance_km: number;
    }[] = [];

    for (const trip of activeTrips) {
      const bus = db.buses.find(b => b.id === trip.bus_id);
      const route = db.routes.find(r => r.id === trip.route_id);
      const loc = db.getLatestLocation(trip.bus_id);

      if (bus && route && loc) {
        const eta = ETAService.calculateETAToStop(loc.latitude, loc.longitude, loc.speed, stop);
        approachingBuses.push({
          bus_id: bus.id,
          registration_number: bus.registration_number,
          route_number: route.route_number,
          route_name: route.route_name,
          eta_minutes: eta.etaMinutes,
          distance_km: eta.distanceKm
        });
      }
    }

    // Sort by shortest ETA
    approachingBuses.sort((a, b) => a.eta_minutes - b.eta_minutes);

    const stopNameKannada = stop.name_kannada || stop.name;
    const stopNameEnglish = stop.name;

    if (approachingBuses.length === 0) {
      const noBusEnglish = `You have selected ${stopNameEnglish}, Stop Code ${stop.stop_code}. Currently, there are no live buses approaching this stop. Next scheduled KSRTC service will be announced shortly. Press 1 to check another stop, press 9 to repeat, or 0 for Main Menu.`;
      const noBusKannada = `ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ್ದು ${stopNameKannada}, ನಿಲ್ದಾಣ ಸಂಖ್ಯೆ ${stop.stop_code}. ಸದ್ಯಕ್ಕೆ ಈ ನಿಲ್ದಾಣಕ್ಕೆ ಬರುತ್ತಿರುವ ಲೈವ್ ಬಸ್‌ಗಳು ಲಭ್ಯವಿಲ್ಲ. ಮುಂದಿನ ಬಸ್ ವಿವರ ತಿಳಿಯಲು 1 ಒತ್ತಿ, ಪುನರಾವರ್ತನೆಗೆ 9 ಒತ್ತಿ, ಮುಖ್ಯ ಮೆನುವಿಗೆ 0 ಒತ್ತಿ.`;
      const noBusHindi = `आपने चुना है ${stopNameEnglish}, स्टॉप कोड ${stop.stop_code}। वर्तमान में इस स्टॉप के लिए कोई लाइव जीपीएस बस सक्रिय नहीं है। दूसरा स्टॉप जांचने के लिए 1 दबाएं, दोहराने के लिए 9 दबाएं, मुख्य मेनू के लिए 0 दबाएं।`;

      const noBusKnPhonetic = `Neevu aayke maadiddu ${stopNameEnglish}, nildaana sankhye ${stop.stop_code}. Sadyakke ee nildaanakke baruttiruva live busgalu labhyavilla. Mundina bus vivara tiliyalu ondu otti, punaraavartanegaagi ombattu otti, mukhya menuvige sonne otti.`;
      const noBusHiPhonetic = `Aapne chuna hai ${stopNameEnglish}, stop code ${stop.stop_code}. Vartamaan mein is stop ke liye koi live GPS bus sakriya nahi hai. Doosra stop jaanchne ke liye ek dabayein, dohraane ke liye nau dabayein, mukhya menu ke liye shunya dabayein.`;

      let speech = noBusEnglish;
      if (language === 'kn') speech = noBusKannada;
      if (language === 'hi') speech = noBusHindi;

      return {
        step: 'route_selection',
        language,
        speechText: speech,
        speechTextKannada: noBusKannada,
        speechTextHindi: noBusHindi,
        speechTextKannadaPhonetic: noBusKnPhonetic,
        speechTextHindiPhonetic: noBusHiPhonetic,
        stopData: stop,
        approachingBuses: [],
        options: [
          { key: '1', label: 'Check Another Stop', action: 'reenter_stop' },
          { key: '9', label: 'Repeat Announcement', action: 'repeat' },
          { key: '0', label: 'Main Menu', action: 'main_menu' }
        ]
      };
    }

    // Compose dynamic speech for approaching buses
    const count = approachingBuses.length;

    // 1. Kannada Speech
    let knSpeech = `${stopNameKannada} ನಿಲ್ದಾಣಕ್ಕೆ ${count} ಬಸ್‌ಗಳು ಬರುತ್ತಿವೆ. `;
    let knPhonetic = `${stopNameEnglish} nildaanakke ${count} busgalu baruttive. `;
    approachingBuses.forEach((b, i) => {
      knSpeech += `ಮಾರ್ಗ ${b.route_number}, ಬಸ್ ಸಂಖ್ಯೆ ${b.registration_number}, ಅಂದಾಜು ${b.eta_minutes} ನಿಮಿಷಗಳಲ್ಲಿ, ${b.distance_km} ಕಿಲೋಮೀಟರ್ ದೂರದಲ್ಲಿದೆ. ವಿವರಗಳಿಗಾಗಿ ${i + 1} ಒತ್ತಿ. `;
      knPhonetic += `Maarga ${b.route_number}, bus sankhye ${b.registration_number}, andaaju ${b.eta_minutes} nimishagalalli, ${b.distance_km} kilometer dooradallide. Vivaragaligaagi ${i + 1} otti. `;
    });
    knSpeech += `ನಿಮ್ಮ ಮೊಬೈಲ್‌ಗೆ ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್ SMS ಪಡೆಯಲು 4 ಒತ್ತಿ. ಪುನರಾವರ್ತನೆಗೆ 9 ಒತ್ತಿ, ಮುಖ್ಯ ಮೆನುವಿಗೆ 0 ಒತ್ತಿ.`;
    knPhonetic += `Nimma mobile ge live tracking SMS padeyalu 4 otti. Punaraavartanegaagi 9 otti, mukhya menuvige 0 otti.`;

    // 2. Hindi Speech
    let hiSpeech = `${stopNameEnglish} बस स्टैंड के लिए ${count} बसें आ रही हैं। `;
    let hiPhonetic = `${stopNameEnglish} bus stand ke liye ${count} basein aa rahi hain. `;
    approachingBuses.forEach((b, i) => {
      hiSpeech += `रूट नंबर ${b.route_number}, बस संख्या ${b.registration_number}, लगभग ${b.eta_minutes} मिनट में, ${b.distance_km} किलोमीटर दूरी पर पहुंचेगी। विवरण के लिए ${i + 1} दबाएं। `;
      hiPhonetic += `Route number ${b.route_number}, bus sankhya ${b.registration_number}, lagbhag ${b.eta_minutes} minute mein, ${b.distance_km} kilometer doori par pahuchegi. Vivaran ke liye ${i + 1} dabayein. `;
    });
    hiSpeech += `लाइव ट्रैकिंग एसएमएस पाने के लिए 4 दबाएं। दोहराने के लिए 9 दबाएं, मुख्य मेनू के लिए 0 दबाएं।`;
    hiPhonetic += `Live tracking SMS paane ke liye 4 dabayein. Dohraane ke liye 9 dabayein, mukhya menu ke liye 0 dabayein.`;

    // 3. English Speech
    let enSpeech = `At ${stopNameEnglish}, Stop Code ${stop.stop_code}, there are ${count} live buses approaching. `;
    approachingBuses.forEach((b, i) => {
      enSpeech += `Route ${b.route_number}, bus ${b.registration_number}, is arriving in approximately ${b.eta_minutes} minutes from ${b.distance_km} kilometers. Press ${i + 1} for details. `;
    });
    enSpeech += `Press 4 to receive live GPS tracking SMS. Press 9 to repeat, or 0 for Main Menu.`;

    let activeSpeech = enSpeech;
    if (language === 'kn') activeSpeech = knSpeech;
    if (language === 'hi') activeSpeech = hiSpeech;

    const options = approachingBuses.map((b, i) => ({
      key: String(i + 1),
      label: `Route ${b.route_number} (${b.registration_number}) - ETA ${b.eta_minutes} min`,
      action: `view_bus_${b.bus_id}`
    }));

    options.push({ key: '4', label: 'SMS Live ETA & Tracking Link to Phone', action: 'send_sms' });
    options.push({ key: '9', label: 'Repeat Announcement', action: 'repeat' });
    options.push({ key: '0', label: 'Main Menu', action: 'main_menu' });

    return {
      step: 'route_selection',
      language,
      speechText: activeSpeech,
      speechTextKannada: knSpeech,
      speechTextHindi: hiSpeech,
      speechTextKannadaPhonetic: knPhonetic,
      speechTextHindiPhonetic: hiPhonetic,
      stopData: stop,
      approachingBuses,
      options
    };
  }

  /**
   * Generates SMS payload for dispatch in all 3 languages
   */
  static formatSMSMessage(stopName: string, stopCode: string, buses: any[], language: 'en' | 'kn' | 'hi' = 'en'): string {
    if (!buses || buses.length === 0) {
      if (language === 'kn') {
        return `[KSRTC ಸ್ಮಾರ್ಟ್‌ಟ್ರ್ಯಾಕ್ ಲೈವ್] ನಿಲ್ದಾಣ: ${stopName} (#${stopCode}). ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಲೈವ್ ಬಸ್‌ಗಳು ಬರುತ್ತಿಲ್ಲ. ಲೈವ್ ಮ್ಯಾಪ್: https://ksrtc.karnataka.gov.in/track?stop=${stopCode}`;
      }
      if (language === 'hi') {
        return `[KSRTC स्मार्टट्रैक लाइव] स्टॉप: ${stopName} (#${stopCode}). वर्तमान में कोई लाइव बस सक्रिय नहीं है। लाइव मैप: https://ksrtc.karnataka.gov.in/track?stop=${stopCode}`;
      }
      return `[KSRTC SmartTrack Alert] Stop: ${stopName} (#${stopCode}). No live buses approaching currently. Live tracker: https://ksrtc.karnataka.gov.in/track?stop=${stopCode}`;
    }

    const b = buses[0];
    if (language === 'kn') {
      return `[KSRTC ಸ್ಮಾರ್ಟ್‌ಟ್ರ್ಯಾಕ್ ಲೈವ್] ನಿಲ್ದಾಣ: ${stopName} (#${stopCode}). ಮಾರ್ಗ ${b.route_number}, ಬಸ್ ${b.registration_number}, ಅಂದಾಜು ${b.eta_minutes} ನಿಮಿಷಗಳಲ್ಲಿ ಬರಲಿದೆ (${b.distance_km} ಕಿ.ಮೀ). ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್: https://ksrtc.karnataka.gov.in/track?stop=${stopCode}&bus=${b.bus_id}`;
    }
    if (language === 'hi') {
      return `[KSRTC स्मार्टट्रैक लाइव] स्टॉप: ${stopName} (#${stopCode}). रूट ${b.route_number}, बस ${b.registration_number}, लगभग ${b.eta_minutes} मिनट में पहुंचेगी (${b.distance_km} किमी). लाइव मैप: https://ksrtc.karnataka.gov.in/track?stop=${stopCode}&bus=${b.bus_id}`;
    }
    return `[KSRTC SmartTrack Live Alert] Stop: ${stopName} (#${stopCode}). Route ${b.route_number}, Bus ${b.registration_number} arriving in ~${b.eta_minutes} mins (${b.distance_km} km). Live GPS Map: https://ksrtc.karnataka.gov.in/track?stop=${stopCode}&bus=${b.bus_id}`;
  }

  /**
   * Generates standard TwiML or Exotel XML webhook response format for telecom operators
   */
  static generateTwiML(speechText: string, gatherActionUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${gatherActionUrl}" numDigits="4" timeout="10">
    <Say voice="Polly.Aditi" language="en-IN">${speechText}</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">We did not receive your input. Goodbye from KSRTC SmartTrack.</Say>
</Response>`;
  }
}

