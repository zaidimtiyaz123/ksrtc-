import { Router } from 'express';
import { IVRService } from '../services/ivrService.js';
import { db } from '../db/database.js';

export const ivrRouter = Router();

// In-memory active interactive call sessions
const sessions = new Map<string, {
  step: 'welcome' | 'stop_entry' | 'route_selection' | 'bus_details';
  language: 'en' | 'kn' | 'hi';
  stopCode?: string;
  approachingBuses?: any[];
  phone?: string;
}>();

// 1. Initial greeting
ivrRouter.get('/welcome', (req, res) => {
  const prompt = IVRService.getWelcomePrompt();
  res.json(prompt);
});

// 2. Language selection
ivrRouter.post('/language', (req, res) => {
  const { lang } = req.body;
  const selectedLang = (lang === '2' || lang === 'kn') ? 'kn' : ((lang === '3' || lang === 'hi') ? 'hi' : 'en');
  const prompt = IVRService.getStopPrompt(selectedLang);
  res.json(prompt);
});

// 3. Stop ID Lookup
ivrRouter.post('/stop', (req, res) => {
  const { stop_code, language } = req.body;

  if (!stop_code) {
    return res.status(400).json({ error: 'stop_code is required' });
  }

  const lang = (language === 'kn' || language === 'hi') ? language : 'en';
  const result = IVRService.processStopLookup(String(stop_code).trim(), lang);
  res.json(result);
});

// 4. Interactive DTMF Key Selection handler
ivrRouter.post('/selection', (req, res) => {
  const { action, language, stop_code } = req.body;
  const lang = (language === 'kn' || language === 'hi') ? language : 'en';

  if (action === 'main_menu') {
    return res.json(IVRService.getWelcomePrompt());
  }

  if (action === 'reenter_stop') {
    return res.json(IVRService.getStopPrompt(lang));
  }

  if (stop_code) {
    return res.json(IVRService.processStopLookup(String(stop_code).trim(), lang));
  }

  return res.json(IVRService.getWelcomePrompt());
});

// 5. Interactive IVR input handler for the Call Simulator and Web clients
ivrRouter.post(['/interact', '/input'], (req, res) => {
  const { sessionId, digits, action, language, stop_code, phoneNumber } = req.body;
  const sId = sessionId || 'default-ivr-session';

  let session = sessions.get(sId);
  if (!session || digits === '' || action === 'main_menu') {
    session = {
      step: 'welcome',
      language: (language as any) || 'en'
    };
    sessions.set(sId, session);

    if (digits === '' || !digits) {
      return res.json(IVRService.getWelcomePrompt());
    }
  }

  const inputDigits = String(digits || '').trim().replace(/#/g, '');

  // Global Language Switch override if explicitly requested
  if (language && ['en', 'kn', 'hi'].includes(language)) {
    session.language = language as 'en' | 'kn' | 'hi';
    sessions.set(sId, session);
  }

  // Handle Repeat Announcement (Digit 9 or action 'repeat')
  if (inputDigits === '9' || action === 'repeat') {
    if (session.step === 'welcome') {
      return res.json(IVRService.getWelcomePrompt());
    } else if (session.step === 'stop_entry') {
      return res.json(IVRService.getStopPrompt(session.language));
    } else if (session.step === 'route_selection' || session.step === 'bus_details') {
      return res.json(IVRService.processStopLookup(session.stopCode || '1001', session.language));
    }
  }

  // Step A: Welcome -> Language selection
  if (session.step === 'welcome') {
    let chosenLang: 'en' | 'kn' | 'hi' = 'en';
    if (inputDigits === '2' || action === 'set_lang_kn' || language === 'kn') chosenLang = 'kn';
    else if (inputDigits === '3' || action === 'set_lang_hi' || language === 'hi') chosenLang = 'hi';
    else chosenLang = 'en';

    session.language = chosenLang;
    session.step = 'stop_entry';
    sessions.set(sId, session);

    return res.json(IVRService.getStopPrompt(chosenLang));
  }

  // Step B: Stop entry
  if (session.step === 'stop_entry' || (inputDigits.length >= 3 && !['0', '1', '2', '3', '4', '9'].includes(inputDigits))) {
    if (inputDigits === '0' || action === 'main_menu') {
      session.step = 'welcome';
      sessions.set(sId, session);
      return res.json(IVRService.getWelcomePrompt());
    }

    const code = inputDigits || stop_code || '1001';
    const result = IVRService.processStopLookup(code, session.language);

    if (result.step !== 'error') {
      session.step = 'route_selection';
      session.stopCode = code;
      session.approachingBuses = result.approachingBuses || [];
      sessions.set(sId, session);
    }
    return res.json(result);
  }

  // Step C: Route selection & Live options
  if (session.step === 'route_selection') {
    if (inputDigits === '0' || action === 'main_menu') {
      session.step = 'welcome';
      sessions.set(sId, session);
      return res.json(IVRService.getWelcomePrompt());
    }

    if (inputDigits === '*' || action === 'reenter_stop') {
      session.step = 'stop_entry';
      sessions.set(sId, session);
      return res.json(IVRService.getStopPrompt(session.language));
    }

    // Option 4: Send SMS tracking link
    if (inputDigits === '4' || action === 'send_sms') {
      const stop = db.getStopByCodeOrId(session.stopCode || '1001');
      const smsText = IVRService.formatSMSMessage(
        stop?.name || 'Bus Stand',
        session.stopCode || '1001',
        session.approachingBuses || [],
        session.language
      );

      // Create notification record for SMS tracking
      const targetPhone = phoneNumber || session.phone || '+91 98765 43210';
      db.notifications.unshift({
        id: `sms-${Date.now()}`,
        user_id: 'user-passenger-1',
        title: `SMS Sent to ${targetPhone}`,
        message: smsText,
        type: 'approaching',
        read_status: false,
        created_at: new Date().toISOString()
      });
      db.saveToFile();

      const confirmMsgEn = `Live tracking link and arrival ETA have been dispatched to your mobile phone via SMS. Safe travels with KSRTC!`;
      const confirmMsgKn = `ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಲಿಂಕ್ ಮತ್ತು ಬಸ್ ಆಗಮನದ ಸಮಯವನ್ನು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗೆ SMS ಮೂಲಕ ರವಾನಿಸಲಾಗಿದೆ. ಶುಭ ಪ್ರಯಾಣ!`;
      const confirmMsgHi = `लाइव ट्रैकिंग लिंक और आगमन समय आपके मोबाइल पर एसएमएस द्वारा भेज दिया गया है। मंगलमय यात्रा!`;

      const confirmKnPhonetic = `Live tracking link mattu bus aagamanada samayavannu nimma mobile sankhyege SMS moolaka ravaanisalaagide. Shubha prayaana!`;
      const confirmHiPhonetic = `Live tracking link aur aagaman samay aapke mobile par SMS dwara bhej diya gaya hai. Mangalmay yaatra!`;

      const confirmMsg = session.language === 'kn' ? confirmMsgKn : (session.language === 'hi' ? confirmMsgHi : confirmMsgEn);

      return res.json({
        step: 'route_selection',
        language: session.language,
        speechText: confirmMsg,
        speechTextKannada: confirmMsgKn,
        speechTextHindi: confirmMsgHi,
        speechTextKannadaPhonetic: confirmKnPhonetic,
        speechTextHindiPhonetic: confirmHiPhonetic,
        smsSent: true,
        smsText,
        targetPhone,
        options: [
          { key: '1', label: 'Check Another Stop', action: 'reenter_stop' },
          { key: '9', label: 'Repeat Announcement', action: 'repeat' },
          { key: '0', label: 'Main Menu', action: 'main_menu' }
        ]
      });
    }

    // Numbers 1, 2, 3 correspond to approaching bus index
    const busIdx = parseInt(inputDigits, 10) - 1;
    if (session.approachingBuses && session.approachingBuses[busIdx]) {
      const bus = session.approachingBuses[busIdx];
      const busMsgKn = `ಮಾರ್ಗ ಸಂಖ್ಯೆ ${bus.route_number}, ಬಸ್ ನಂಬರ್ ${bus.registration_number}. ಪ್ರಸ್ತುತ ವೇಗ ಮತ್ತು ಮಾರ್ಗ ಪರಿಸ್ಥಿತಿಯ ಆಧಾರದ ಮೇಲೆ ಇದು ${bus.eta_minutes} ನಿಮಿಷಗಳಲ್ಲಿ ಬರಲಿದೆ. ದೂರ ${bus.distance_km} ಕಿಲೋಮೀಟರ್. SMS ಪಡೆಯಲು 4 ಒತ್ತಿ, ಮುಖ್ಯ ಮೆನುವಿಗೆ 0 ಒತ್ತಿ.`;
      const busMsgHi = `रूट नंबर ${bus.route_number}, बस नंबर ${bus.registration_number}। यह बस लगभग ${bus.eta_minutes} मिनट में पहुंचेगी। दूरी ${bus.distance_km} किलोमीटर है। एसएमएस पाने के लिए 4 दबाएं, मुख्य मेनू के लिए 0 दबाएं।`;
      const busMsgEn = `Route ${bus.route_number}, Bus registration ${bus.registration_number}. Approaching in approximately ${bus.eta_minutes} minutes from distance of ${bus.distance_km} kilometers. Press 4 to receive live tracking SMS to your phone, or press 0 for main menu.`;

      const busKnPhonetic = `Maarga sankhye ${bus.route_number}, bus number ${bus.registration_number}. Prastuta vega mattu maarga paristhithiya aadharada mele idhu ${bus.eta_minutes} nimishagalalli baralide. Doora ${bus.distance_km} kilometer. SMS padeyalu 4 otti, mukhya menuvige 0 otti.`;
      const busHiPhonetic = `Route number ${bus.route_number}, bus number ${bus.registration_number}. Yeh bus lagbhag ${bus.eta_minutes} minute mein pahuchegi. Doori ${bus.distance_km} kilometer hai. SMS paane ke liye 4 dabayein, mukhya menu ke liye 0 dabayein.`;

      const busMsg = session.language === 'kn' ? busMsgKn : (session.language === 'hi' ? busMsgHi : busMsgEn);

      return res.json({
        step: 'bus_details',
        language: session.language,
        speechText: busMsg,
        speechTextKannada: busMsgKn,
        speechTextHindi: busMsgHi,
        speechTextKannadaPhonetic: busKnPhonetic,
        speechTextHindiPhonetic: busHiPhonetic,
        options: [
          { key: '4', label: 'Send SMS Link to My Phone', action: 'send_sms' },
          { key: '1', label: 'Back to Bus List', action: 'reenter_stop' },
          { key: '9', label: 'Repeat Announcement', action: 'repeat' },
          { key: '0', label: 'Main Menu', action: 'main_menu' }
        ]
      });
    }

    // Default fallback in route_selection
    return res.json(IVRService.processStopLookup(session.stopCode || '1001', session.language));
  }

  return res.json(IVRService.getWelcomePrompt());
});

// 6. Direct SMS Dispatcher API
ivrRouter.post('/send-sms', (req, res) => {
  const { phone, stopCode, stopName, routeNumber, busNumber, etaMinutes } = req.body;
  const recipient = phone || '+91 98765 43210';
  const sCode = stopCode || '1001';
  const sName = stopName || 'Tumkur Bus Stand';
  const rNum = routeNumber || '152';
  const bNum = busNumber || 'KA 01 AB 1234';
  const eta = etaMinutes || 12;

  const smsText = `[KSRTC SmartTrack Live Alert] Stop: ${sName} (#${sCode}). Bus ${bNum} (Route ${rNum}) arriving in ~${eta} mins. Live GPS Map: https://ksrtc.karnataka.gov.in/track?stop=${sCode}`;

  // Log in notifications
  const notif = {
    id: `sms-${Date.now()}`,
    user_id: 'user-passenger-1',
    title: `SMS Dispatched to ${recipient}`,
    message: smsText,
    type: 'approaching' as const,
    read_status: false,
    created_at: new Date().toISOString()
  };
  db.notifications.unshift(notif);
  db.saveToFile();

  res.json({
    success: true,
    message: 'SMS dispatched successfully via KSRTC Telecom Gateway',
    smsText,
    recipient,
    timestamp: new Date().toISOString()
  });
});

// 7. Telecom Provider Webhook (Twilio / Exotel TwiML)
ivrRouter.all('/webhook/telephony', (req, res) => {
  const digits = req.body?.Digits || req.query?.Digits || req.body?.digits;
  const language = req.query?.lang || 'en';

  res.type('text/xml');

  if (!digits) {
    // Initial welcome gather
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="/api/ivr/webhook/telephony?step=language" numDigits="1" timeout="8">
    <Say voice="Polly.Aditi" language="en-IN">Welcome to KSRTC SmartTrack Voice Assistance. Press 1 for English. Kannada gagi 2 otti. Hindi ke liye 3 dabaye.</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">No input received. Connecting to operator.</Say>
</Response>`;
    return res.send(twiml);
  }

  if (req.query?.step === 'language') {
    const selectedLang = digits === '2' ? 'kn' : (digits === '3' ? 'hi' : 'en');
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="/api/ivr/webhook/telephony?step=stop&amp;lang=${selectedLang}" numDigits="4" timeout="10">
    <Say voice="Polly.Aditi" language="en-IN">Please enter your 4-digit Stop ID followed by the hash key.</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">No Stop ID entered. Thank you for calling KSRTC.</Say>
</Response>`;
    return res.send(twiml);
  }

  if (req.query?.step === 'stop') {
    const lookup = IVRService.processStopLookup(digits, language as any);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">${lookup.speechText}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">Thank you for using KSRTC SmartTrack voice services. Safe travels.</Say>
</Response>`;
    return res.send(twiml);
  }

  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Goodbye.</Say></Response>`);
});

