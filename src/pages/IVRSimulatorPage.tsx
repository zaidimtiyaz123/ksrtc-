import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { IVRResponse } from '../types';
import {
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  RotateCcw,
  Info,
  CheckCircle2,
  HelpCircle,
  Hash,
  Send,
  MessageSquare,
  Smartphone,
  ExternalLink,
  MapPin,
  Clock,
  Bus,
  Languages,
  Sliders,
  Play,
  Square,
  Copy,
  Check,
  Terminal
} from 'lucide-react';

interface VoiceCapabilityInfo {
  hasKannada: boolean;
  hasHindi: boolean;
  hasIndianEnglish: boolean;
  kannadaVoiceName?: string;
  hindiVoiceName?: string;
  englishVoiceName?: string;
}

export const IVRSimulatorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const prefillStop = searchParams.get('stop');

  // Call status
  const [isCallActive, setIsCallActive] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingLanguage, setSpeakingLanguage] = useState<'en' | 'kn' | 'hi' | null>(null);

  // Audio Speech synthesis settings
  const [speechRate, setSpeechRate] = useState<number>(0.95);
  const [speechVolume, setSpeechVolume] = useState<number>(1.0);
  const [voiceCapabilities, setVoiceCapabilities] = useState<VoiceCapabilityInfo>({
    hasKannada: false,
    hasHindi: false,
    hasIndianEnglish: false
  });
  const [voicesLoaded, setVoicesLoaded] = useState<boolean>(false);

  // Keypad & IVR state
  const [enteredDigits, setEnteredDigits] = useState<string>(prefillStop ? `${prefillStop}#` : '');
  const [currentResponse, setCurrentResponse] = useState<IVRResponse | null>(null);
  const [language, setLanguage] = useState<'en' | 'kn' | 'hi'>('en');
  const [currentStep, setCurrentStep] = useState<string>('welcome');
  const [lastBuses, setLastBuses] = useState<any[]>([]);
  const [lastStop, setLastStop] = useState<any>(null);

  // Transcript history
  const [transcriptHistory, setTranscriptHistory] = useState<{
    sender: 'IVR' | 'USER';
    text: string;
    textKannada?: string;
    textHindi?: string;
    phonetic?: string;
    lang?: 'en' | 'kn' | 'hi';
    time: string;
  }[]>([]);

  // SMS Dispatcher State
  const [smsPhone, setSmsPhone] = useState<string>('+91 98450 12345');
  const [smsLanguage, setSmsLanguage] = useState<'en' | 'kn' | 'hi'>('en');
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [sentMessages, setSentMessages] = useState<{ phone: string; text: string; time: string }[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'phone' | 'transcripts' | 'telecom_docs'>('phone');

  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio Context for authentic DTMF
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Discover and catalog available system voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const detectVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (!available || available.length === 0) return;

      const knVoice = available.find(v =>
        v.lang.toLowerCase().startsWith('kn') ||
        v.name.toLowerCase().includes('kannada') ||
        v.lang.toLowerCase().includes('kn-in')
      );

      const hiVoice = available.find(v =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.lang.toLowerCase().includes('hi-in')
      );

      const enInVoice = available.find(v =>
        v.lang.toLowerCase().startsWith('en-in') ||
        v.name.toLowerCase().includes('india')
      ) || available.find(v => v.lang.toLowerCase().startsWith('en'));

      setVoiceCapabilities({
        hasKannada: Boolean(knVoice),
        hasHindi: Boolean(hiVoice),
        hasIndianEnglish: Boolean(enInVoice),
        kannadaVoiceName: knVoice?.name,
        hindiVoiceName: hiVoice?.name,
        englishVoiceName: enInVoice?.name
      });
      setVoicesLoaded(true);
    };

    detectVoices();
    window.speechSynthesis.onvoiceschanged = detectVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Authentic ITU-T Q.23 DTMF Tone Generator (Dual-Tone Multi-Frequency)
  const playDTMFTone = (digit: string) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      // ITU-T Standard Frequencies
      const dtmfFreqs: Record<string, [number, number]> = {
        '1': [697, 1209],
        '2': [697, 1336],
        '3': [697, 1477],
        '4': [770, 1209],
        '5': [770, 1336],
        '6': [770, 1477],
        '7': [852, 1209],
        '8': [852, 1336],
        '9': [852, 1477],
        '*': [941, 1209],
        '0': [941, 1336],
        '#': [941, 1477]
      };

      const freqs = dtmfFreqs[digit] || [440, 480];
      const now = ctx.currentTime;
      const duration = 0.14;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freqs[0], now);
      osc2.frequency.setValueAtTime(freqs[1], now);

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // Audio context policy fallback
    }
  };

  // Authentic India Telecom Ringback tone (400Hz + 425Hz)
  const playRingbackTone = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(400, now);
      osc2.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch {
      // Audio context fallback
    }
  };

  // High-Fidelity 3-Language Speech Synthesis Engine
  const speakText = (
    textToSpeak: string,
    targetLang: 'en' | 'kn' | 'hi' = 'en',
    options?: { phoneticText?: string }
  ) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance();
    utterance.rate = speechRate;
    utterance.volume = speechVolume;
    utterance.pitch = 1.0;

    // Pick best voice and text based on language and OS capabilities
    if (targetLang === 'kn') {
      const knVoice = voices.find(v =>
        v.lang.toLowerCase().startsWith('kn') ||
        v.name.toLowerCase().includes('kannada') ||
        v.lang.toLowerCase().includes('kn-in')
      );

      if (knVoice) {
        // Native Kannada Voice Installed
        utterance.voice = knVoice;
        utterance.lang = knVoice.lang;
        utterance.text = textToSpeak;
      } else {
        // High-Quality Fallback: Use Indian English / Hindi voice with Romanized Kannada phonetics
        // This ensures the audio is never muted or distorted on systems lacking kn-IN
        const fallbackVoice = voices.find(v =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.lang.toLowerCase().startsWith('en-in') ||
          v.name.toLowerCase().includes('india')
        ) || voices.find(v => v.lang.toLowerCase().startsWith('en'));

        if (fallbackVoice) utterance.voice = fallbackVoice;
        utterance.lang = fallbackVoice?.lang || 'en-IN';
        utterance.text = options?.phoneticText || textToSpeak;
      }
    } else if (targetLang === 'hi') {
      const hiVoice = voices.find(v =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.lang.toLowerCase().includes('hi-in')
      );

      if (hiVoice) {
        utterance.voice = hiVoice;
        utterance.lang = hiVoice.lang;
        utterance.text = textToSpeak;
      } else {
        const fallbackVoice = voices.find(v =>
          v.lang.toLowerCase().startsWith('en-in') ||
          v.name.toLowerCase().includes('india')
        ) || voices.find(v => v.lang.toLowerCase().startsWith('en'));

        if (fallbackVoice) utterance.voice = fallbackVoice;
        utterance.lang = fallbackVoice?.lang || 'en-IN';
        utterance.text = options?.phoneticText || textToSpeak;
      }
    } else {
      // English
      const enVoice = voices.find(v =>
        v.lang.toLowerCase().startsWith('en-in') ||
        v.name.toLowerCase().includes('india')
      ) || voices.find(v => v.lang.toLowerCase().startsWith('en'));

      if (enVoice) utterance.voice = enVoice;
      utterance.lang = enVoice?.lang || 'en-IN';
      utterance.text = textToSpeak;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingLanguage(targetLang);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingLanguage(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingLanguage(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Play Multi-Lingual Welcome Greeting (Sequential English -> Kannada -> Hindi)
  const playTriLingualGreeting = (res: IVRResponse) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // If caller has chosen a specific language, speak only that language
    if (language === 'kn' && res.speechTextKannada) {
      speakText(res.speechTextKannada, 'kn', { phoneticText: res.speechTextKannadaPhonetic });
      return;
    }
    if (language === 'hi' && res.speechTextHindi) {
      speakText(res.speechTextHindi, 'hi', { phoneticText: res.speechTextHindiPhonetic });
      return;
    }

    // Otherwise, play all 3 welcoming segments in sequence
    const parts = res.speechParts || [
      { lang: 'en', text: 'Welcome to KSRTC SmartTrack Automated Voice Assistance. For English, press 1.', phonetic: 'Welcome to KSRTC SmartTrack Automated Voice Assistance. For English, press 1.' },
      { lang: 'kn', text: res.speechTextKannada || 'ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಸ್ಮಾರ್ಟ್‌ಟ್ರ್ಯಾಕ್ ಸ್ವಯಂಚಾಲಿತ ಧ್ವನಿ ಸೇವೆಗೆ ಸುಸ್ವಾಗತ. ಕನ್ನಡಕ್ಕಾಗಿ 2 ಒತ್ತಿ.', phonetic: res.speechTextKannadaPhonetic || 'KSRTC SmartTrack svayamchalitha dhvani sevege suswaagatha. Kannadakkaagi eradu otti.' },
      { lang: 'hi', text: res.speechTextHindi || 'केएसआरटीसी स्मार्टट्रैक स्वचालित वॉयस सहायता में आपका स्वागत है। हिंदी के लिए 3 दबाएं।', phonetic: res.speechTextHindiPhonetic || 'KSRTC SmartTrack swachalit voice sahayata mein aapka swagat hai. Hindi ke liye teen dabayein.' }
    ];

    let currentIdx = 0;

    const playNextPart = () => {
      if (currentIdx >= parts.length || !isCallActive) {
        setIsSpeaking(false);
        setSpeakingLanguage(null);
        return;
      }

      const part = parts[currentIdx];
      const utterance = new SpeechSynthesisUtterance();
      utterance.rate = speechRate;
      utterance.volume = speechVolume;

      const voices = window.speechSynthesis.getVoices();

      if (part.lang === 'kn') {
        const knVoice = voices.find(v =>
          v.lang.toLowerCase().startsWith('kn') ||
          v.name.toLowerCase().includes('kannada') ||
          v.lang.toLowerCase().includes('kn-in')
        );
        if (knVoice) {
          utterance.voice = knVoice;
          utterance.lang = knVoice.lang;
          utterance.text = part.text;
        } else {
          const fallback = voices.find(v => v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().startsWith('en-in')) || voices[0];
          if (fallback) utterance.voice = fallback;
          utterance.lang = fallback?.lang || 'en-IN';
          utterance.text = part.phonetic || part.text;
        }
      } else if (part.lang === 'hi') {
        const hiVoice = voices.find(v =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.lang.toLowerCase().includes('hi-in')
        );
        if (hiVoice) {
          utterance.voice = hiVoice;
          utterance.lang = hiVoice.lang;
          utterance.text = part.text;
        } else {
          const fallback = voices.find(v => v.lang.toLowerCase().startsWith('en-in')) || voices[0];
          if (fallback) utterance.voice = fallback;
          utterance.lang = fallback?.lang || 'en-IN';
          utterance.text = part.phonetic || part.text;
        }
      } else {
        const enVoice = voices.find(v => v.lang.toLowerCase().startsWith('en-in')) || voices.find(v => v.lang.toLowerCase().startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
        utterance.lang = enVoice?.lang || 'en-IN';
        utterance.text = part.text;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingLanguage(part.lang as any);
      };

      utterance.onend = () => {
        currentIdx++;
        playNextPart();
      };

      utterance.onerror = () => {
        currentIdx++;
        playNextPart();
      };

      window.speechSynthesis.speak(utterance);
    };

    playNextPart();
  };

  // Call duration timer
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
      setIsSpeaking(false);
      setSpeakingLanguage(null);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  // Start Call
  const handleDial = async () => {
    playRingbackTone();
    const newSessionId = 'ivr-session-' + Date.now();
    setSessionId(newSessionId);
    setIsCallActive(true);
    setTranscriptHistory([]);
    setCurrentStep('welcome');

    try {
      const res: IVRResponse = await api.sendIVRInput({
        sessionId: newSessionId,
        digits: '',
        language
      });

      handleIVRResponse(res, true);
    } catch (e) {
      console.error('Failed to connect to IVR server:', e);
      setIsCallActive(false);
    }
  };

  // Hang up
  const handleHangUp = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    playDTMFTone('*');
    setIsCallActive(false);
    setIsSpeaking(false);
    setSpeakingLanguage(null);
    setSessionId('');
    setCurrentResponse(null);
    setTranscriptHistory(prev => [
      ...prev,
      { sender: 'IVR', text: 'Call disconnected. Thank you for using KSRTC SmartTrack.', time: new Date().toLocaleTimeString() }
    ]);
  };

  // Process IVR Response from Backend
  const handleIVRResponse = (res: IVRResponse, isInitialWelcome = false) => {
    setCurrentResponse(res);
    setCurrentStep(res.step || 'welcome');
    if (res.language) setLanguage(res.language);
    if (res.stopData) setLastStop(res.stopData);
    if (res.approachingBuses) setLastBuses(res.approachingBuses);

    const activeText = res.speechText || '';

    // If SMS was delivered
    if (res.smsSent && res.smsText) {
      setSentMessages(prev => [
        { phone: res.targetPhone || smsPhone, text: res.smsText || '', time: new Date().toLocaleTimeString() },
        ...prev
      ]);
      setSmsStatus('SMS live tracker delivered to ' + (res.targetPhone || smsPhone));
    }

    // Add to visual transcript
    setTranscriptHistory(prev => [
      ...prev,
      {
        sender: 'IVR',
        text: activeText,
        textKannada: res.speechTextKannada,
        textHindi: res.speechTextHindi,
        phonetic: res.language === 'kn' ? res.speechTextKannadaPhonetic : (res.language === 'hi' ? res.speechTextHindiPhonetic : undefined),
        lang: res.language,
        time: new Date().toLocaleTimeString()
      }
    ]);

    // Speak audio
    if (isInitialWelcome && res.step === 'welcome') {
      playTriLingualGreeting(res);
    } else {
      if (res.language === 'kn' && res.speechTextKannada) {
        speakText(res.speechTextKannada, 'kn', { phoneticText: res.speechTextKannadaPhonetic });
      } else if (res.language === 'hi' && res.speechTextHindi) {
        speakText(res.speechTextHindi, 'hi', { phoneticText: res.speechTextHindiPhonetic });
      } else {
        speakText(activeText, 'en');
      }
    }
  };

  // Keypad press handler
  const handleKeyPress = async (key: string) => {
    playDTMFTone(key);

    if (key === '#') {
      const codeToSubmit = enteredDigits.trim();
      if (!codeToSubmit) return;

      if (!isCallActive) {
        await handleDial();
      }

      setTranscriptHistory(prev => [
        ...prev,
        { sender: 'USER', text: `Keyed: ${codeToSubmit}#`, time: new Date().toLocaleTimeString() }
      ]);

      try {
        const res: IVRResponse = await api.sendIVRInput({
          sessionId: sessionId || 'ivr-session-' + Date.now(),
          digits: codeToSubmit,
          language,
          phoneNumber: smsPhone
        });
        setEnteredDigits('');
        handleIVRResponse(res);
      } catch (e) {
        console.error('IVR submit error:', e);
      }
      return;
    }

    const updated = enteredDigits + key;
    setEnteredDigits(updated);

    if (!isCallActive) return;

    // In welcome menu (1=English, 2=Kannada, 3=Hindi) or single digit menu option (0=Menu, 9=Repeat, 4=SMS)
    const isSingleDigitAction =
      currentStep === 'welcome' ||
      (['1', '2', '3', '4', '9', '0'].includes(key) && currentStep !== 'stop_entry');

    if (isSingleDigitAction) {
      try {
        setTranscriptHistory(prev => [
          ...prev,
          { sender: 'USER', text: `Pressed: ${key}`, time: new Date().toLocaleTimeString() }
        ]);

        const res: IVRResponse = await api.sendIVRInput({
          sessionId,
          digits: key,
          language,
          phoneNumber: smsPhone
        });

        setEnteredDigits('');
        handleIVRResponse(res);
      } catch (e) {
        console.error('IVR send error:', e);
      }
    }
  };

  // Quick Action Button
  const handleQuickAction = async (actionKey: string, actionLabel: string) => {
    if (!isCallActive) await handleDial();

    playDTMFTone(actionKey.charAt(0) || '1');
    setTranscriptHistory(prev => [
      ...prev,
      { sender: 'USER', text: `Selected: ${actionLabel} [${actionKey}]`, time: new Date().toLocaleTimeString() }
    ]);

    try {
      const res = await api.sendIVRInput({
        sessionId: sessionId || 'ivr-session-direct',
        digits: actionKey,
        language,
        phoneNumber: smsPhone
      });
      handleIVRResponse(res);
    } catch (e) {
      console.error('Quick action error:', e);
    }
  };

  // On-demand voice trigger for specific language (EN, KN, HI)
  const triggerLanguageSpeech = (lang: 'en' | 'kn' | 'hi') => {
    if (!currentResponse) return;

    if (lang === 'kn' && currentResponse.speechTextKannada) {
      speakText(currentResponse.speechTextKannada, 'kn', {
        phoneticText: currentResponse.speechTextKannadaPhonetic
      });
    } else if (lang === 'hi' && currentResponse.speechTextHindi) {
      speakText(currentResponse.speechTextHindi, 'hi', {
        phoneticText: currentResponse.speechTextHindiPhonetic
      });
    } else {
      speakText(currentResponse.speechText, 'en');
    }
  };

  // Direct SMS Dispatch
  const handleDirectSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsPhone) return;

    setSmsStatus('Sending SMS...');
    try {
      const res = await api.sendIVRSMS({
        phone: smsPhone,
        stopCode: lastStop?.stop_code || '1001',
        stopName: lastStop?.name || 'Tumkur Bus Stand',
        routeNumber: lastBuses[0]?.route_number || '152',
        busNumber: lastBuses[0]?.registration_number || 'KA 01 AB 1234',
        etaMinutes: lastBuses[0]?.eta_minutes || 12
      });

      setSentMessages(prev => [
        { phone: smsPhone, text: res.smsText, time: new Date().toLocaleTimeString() },
        ...prev
      ]);
      setSmsStatus('Live Tracking SMS successfully delivered to ' + smsPhone);
      setTimeout(() => setSmsStatus(null), 6000);
    } catch (err: any) {
      setSmsStatus('Failed to send SMS: ' + err.message);
    }
  };

  // Test All 3 Voices sequentially
  const handleTestAllVoices = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const sampleEn = 'Welcome to KSRTC SmartTrack English voice assistance.';
    const sampleKn = 'ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಸ್ಮಾರ್ಟ್‌ಟ್ರ್ಯಾಕ್ ಕನ್ನಡ ಧ್ವನಿ ಸೇವೆಗೆ ಸುಸ್ವಾಗತ.';
    const sampleKnPhonetic = 'KSRTC SmartTrack Kannada dhvani sevege suswaagatha.';
    const sampleHi = 'केएसआरटीसी स्मार्टट्रैक हिंदी वॉयस सेवा में आपका स्वागत है।';
    const sampleHiPhonetic = 'KSRTC SmartTrack Hindi voice seva mein aapka swagat hai.';

    // Play English, then Kannada, then Hindi
    speakText(sampleEn, 'en');
    setTimeout(() => {
      speakText(sampleKn, 'kn', { phoneticText: sampleKnPhonetic });
      setTimeout(() => {
        speakText(sampleHi, 'hi', { phoneticText: sampleHiPhonetic });
      }, 3500);
    }, 3200);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentDisplayPrompt = useMemo(() => {
    if (!currentResponse) {
      return isCallActive ? 'Connecting to KSRTC Voice Server...' : 'Ready to place call';
    }
    if (language === 'kn' && currentResponse.speechTextKannada) {
      return currentResponse.speechTextKannada;
    }
    if (language === 'hi' && currentResponse.speechTextHindi) {
      return currentResponse.speechTextHindi;
    }
    return currentResponse.speechText;
  }, [currentResponse, language, isCallActive]);

  const currentPhoneticGuide = useMemo(() => {
    if (!currentResponse) return null;
    if (language === 'kn' && currentResponse.speechTextKannadaPhonetic) {
      return currentResponse.speechTextKannadaPhonetic;
    }
    if (language === 'hi' && currentResponse.speechTextHindiPhonetic) {
      return currentResponse.speechTextHindiPhonetic;
    }
    return null;
  }, [currentResponse, language]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#E0E0E0]">
      {/* Header & Multilingual Gateway Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#262B35] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-inner">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                KSRTC Voice IVR & Multi-Lingual Telephony Gateway
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-blue-400 font-mono font-bold">Helpline: 080-2222-1234</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">Full Voice Synthesis in English, ಕನ್ನಡ (Kannada) & हिंदी (Hindi)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Voice Language Controls & Diagnostics */}
        <div className="flex flex-wrap items-center gap-2 bg-[#161920] p-1.5 rounded-2xl border border-[#262B35]">
          <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
            <Languages className="w-3.5 h-3.5 text-blue-400" />
            Language:
          </span>
          {(['en', 'kn', 'hi'] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLanguage(l);
                if (isCallActive) {
                  api.sendIVRInput({
                    sessionId,
                    digits: l === 'kn' ? '2' : l === 'hi' ? '3' : '1',
                    language: l
                  }).then(res => handleIVRResponse(res));
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                language === l
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#1E232E]'
              }`}
            >
              <span>{l === 'en' ? 'English (1)' : l === 'kn' ? 'ಕನ್ನಡ (2)' : 'हिंदी (3)'}</span>
              {speakingLanguage === l && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </button>
          ))}

          <button
            onClick={handleTestAllVoices}
            title="Preview all 3 voices"
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-[#1F2430] hover:bg-[#282F3F] text-slate-300 border border-[#2E3545] transition-all flex items-center gap-1 ml-1"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            <span>Test 3 Voices</span>
          </button>
        </div>
      </div>

      {/* Voice Engine Diagnostics & Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#14171F] border border-[#232834] rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-bold font-mono">
              EN
            </div>
            <div>
              <div className="text-xs font-bold text-white">English Voice (Indian Accent)</div>
              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                {voiceCapabilities.englishVoiceName || 'Default Indian English (en-IN)'}
              </div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            Active
          </span>
        </div>

        <div className="bg-[#14171F] border border-[#232834] rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-xs font-bold">
              ಕ
            </div>
            <div>
              <div className="text-xs font-bold text-white">ಕನ್ನಡ Voice (Kannada)</div>
              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                {voiceCapabilities.hasKannada
                  ? (voiceCapabilities.kannadaVoiceName || 'Native kn-IN')
                  : 'Enhanced Phonetic Neural Fallback'}
              </div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
            {voiceCapabilities.hasKannada ? 'Native Voice' : 'Enhanced Speech'}
          </span>
        </div>

        <div className="bg-[#14171F] border border-[#232834] rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center text-xs font-bold">
              हि
            </div>
            <div>
              <div className="text-xs font-bold text-white">हिंदी Voice (Hindi)</div>
              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                {voiceCapabilities.hasHindi
                  ? (voiceCapabilities.hindiVoiceName || 'Native hi-IN')
                  : 'Enhanced Phonetic Engine'}
              </div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">
            {voiceCapabilities.hasHindi ? 'Native Voice' : 'Enhanced Speech'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Interactive 2G/Keypad Phone Hardware Terminal */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-sm bg-[#161920] text-white rounded-[44px] p-6 shadow-2xl border-4 border-[#262B35] flex flex-col justify-between space-y-4 relative">
            {/* Phone Hardware Top Earpiece Grill */}
            <div className="flex items-center justify-center pb-1">
              <div className="w-16 h-1.5 bg-[#2A303D] rounded-full"></div>
            </div>

            {/* Backlit LCD Phone Screen */}
            <div className="bg-[#0B0D12] rounded-2xl p-4 border border-[#262B35] text-center space-y-2 min-h-[175px] flex flex-col justify-between relative overflow-hidden shadow-inner">
              {/* Top Telecom Status Bar */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-b border-[#1E232E] pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-blue-400 font-bold">📶 KSRTC 2G</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-emerald-400">VOLTE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 font-bold">
                    {isCallActive ? formatSeconds(callDuration) : 'STANDBY'}
                  </span>
                  <span className="text-slate-500">🔋 99%</span>
                </div>
              </div>

              {/* Main Display Prompt Area */}
              <div className="space-y-1.5 py-1">
                {isCallActive ? (
                  <div className="space-y-1">
                    <div className="text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>080-2222-1234 (Live Call)</span>
                    </div>

                    <div className="text-xs text-slate-100 font-medium px-1 leading-snug line-clamp-4 min-h-[48px] flex items-center justify-center">
                      {currentDisplayPrompt}
                    </div>

                    {currentPhoneticGuide && (
                      <div className="text-[10px] text-amber-400/90 font-mono italic px-2 line-clamp-2">
                        🔊 Phonetic: {currentPhoneticGuide}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 py-1">
                    <div className="text-blue-400 text-xs font-mono font-bold">080-2222-1234</div>
                    <div className="text-slate-200 font-bold text-sm">KSRTC Voice Helpline</div>
                    <div className="text-[10px] text-slate-400 leading-snug">
                      Press DIAL or enter 4-digit Bus Stop ID (e.g. 1001#) to listen in 3 languages
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Visualizer when Speaking */}
              {isSpeaking && (
                <div className="flex items-center justify-center gap-1 py-0.5">
                  {[4, 8, 12, 16, 12, 6, 14, 18, 10, 5].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}px` }}
                      className="w-1 bg-emerald-400 rounded-full animate-pulse"
                    ></span>
                  ))}
                </div>
              )}

              {/* Display entered digits with blinking cursor */}
              <div className="font-mono text-sm font-bold text-amber-400 tracking-widest min-h-[26px] flex items-center justify-center bg-[#11141A] rounded-lg px-2 border border-[#222733]">
                {enteredDigits ? (
                  <span>
                    {enteredDigits}
                    <span className="animate-ping font-normal text-amber-300">_</span>
                  </span>
                ) : (
                  <span className="text-slate-600 font-normal text-xs">Enter Stop Code or Option...</span>
                )}
              </div>
            </div>

            {/* In-Call On-Demand Voice Buttons (EN, KN, HI, Repeat) */}
            {isCallActive && currentResponse && (
              <div className="bg-[#12151C] p-2 rounded-2xl border border-[#262B35] flex items-center justify-between gap-1.5">
                <button
                  onClick={() => triggerLanguageSpeech('en')}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${
                    speakingLanguage === 'en'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                      : 'bg-[#1A1F2B] text-slate-300 border-[#2A3142] hover:bg-[#252C3D]'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>EN Voice</span>
                </button>

                <button
                  onClick={() => triggerLanguageSpeech('kn')}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${
                    speakingLanguage === 'kn'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                      : 'bg-[#1A1F2B] text-amber-300 border-[#2A3142] hover:bg-[#252C3D]'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>ಕನ್ನಡ ಧ್ವನಿ</span>
                </button>

                <button
                  onClick={() => triggerLanguageSpeech('hi')}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${
                    speakingLanguage === 'hi'
                      ? 'bg-orange-600 text-white border-orange-400 shadow-md'
                      : 'bg-[#1A1F2B] text-orange-300 border-[#2A3142] hover:bg-[#252C3D]'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>हिंदी आवाज</span>
                </button>

                <button
                  onClick={() => handleKeyPress('9')}
                  title="Repeat Announcement (Key 9)"
                  className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-[#1A1F2B] text-slate-300 border border-[#2A3142] hover:bg-[#252C3D] transition-all flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-blue-400" />
                  <span>9</span>
                </button>
              </div>
            )}

            {/* DTMF Keypad Grid (Authentic 3x4 ITU Layout) */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { num: '1', sub: 'EN / Bus 1' },
                { num: '2', sub: 'KN / Bus 2' },
                { num: '3', sub: 'HI / Bus 3' },
                { num: '4', sub: 'SMS LIVE' },
                { num: '5', sub: 'JKL' },
                { num: '6', sub: 'MNO' },
                { num: '7', sub: 'PQRS' },
                { num: '8', sub: 'TUV' },
                { num: '9', sub: 'REPEAT' },
                { num: '*', sub: 'CLEAR' },
                { num: '0', sub: 'MENU' },
                { num: '#', sub: 'SUBMIT' }
              ].map(k => (
                <button
                  key={k.num}
                  id={`dtmf-btn-${k.num}`}
                  onClick={() => {
                    if (k.num === '*') setEnteredDigits('');
                    else handleKeyPress(k.num);
                  }}
                  className="bg-[#1C212B] hover:bg-[#242A38] active:bg-[#2d3446] active:scale-95 text-white rounded-2xl py-3 px-2 flex flex-col items-center justify-center border border-[#262B35] shadow transition-all group"
                >
                  <span className="font-bold text-lg leading-none group-hover:text-blue-400">{k.num}</span>
                  <span className="text-[8px] text-slate-400 font-bold tracking-wider mt-1">{k.sub}</span>
                </button>
              ))}
            </div>

            {/* Call Action Controls (Dial / Mute / Hangup) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {!isCallActive ? (
                <button
                  onClick={handleDial}
                  id="btn-ivr-dial"
                  className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm transition-all active:scale-98"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>DIAL 080-2222-1234</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (!isMuted && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      setIsMuted(!isMuted);
                    }}
                    className={`py-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                      isMuted ? 'bg-amber-900/30 text-amber-300 border-amber-700/50' : 'bg-[#1C212B] text-slate-300 border-[#262B35]'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
                  </button>

                  <button
                    onClick={handleHangUp}
                    id="btn-ivr-hangup"
                    className="bg-red-600 hover:bg-red-500 text-white font-extrabold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-xs transition-all active:scale-98"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>HANG UP</span>
                  </button>
                </>
              )}
            </div>

            {/* Voice Speed Rate Selector */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-[#232835]">
              <span>Speech Speed:</span>
              <div className="flex items-center gap-1">
                {[
                  { label: '0.85x (Slow)', val: 0.85 },
                  { label: '1.0x', val: 1.0 },
                  { label: '1.2x', val: 1.2 }
                ].map(r => (
                  <button
                    key={r.val}
                    onClick={() => setSpeechRate(r.val)}
                    className={`px-2 py-0.5 rounded-lg font-mono text-[10px] transition-all ${
                      speechRate === r.val
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-[#1F2430] text-slate-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stop Directory, SMS Dispatcher & Interactive Transcripts */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Telephone Stop Code Directory */}
          <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Karnataka Bus Shelter Stop Directory</h3>
                  <p className="text-[11px] text-slate-400">Click any shelter stop code below to dial or test instantly</p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full">
                Live ETAs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { code: '1001', name: 'Tumkur Bus Stand', nameKn: 'ತುಮಕೂರು ಬಸ್ ನಿಲ್ದಾಣ' },
                { code: '1004', name: 'Nelamangala Toll Gate', nameKn: 'ನೆಲಮಂಗಲ ಟೋಲ್ ಗೇಟ್' },
                { code: '1006', name: 'Majestic Terminal (Bengaluru)', nameKn: 'ಮೆಜೆಸ್ಟಿಕ್ ಬಸ್ ನಿಲ್ದಾಣ' },
                { code: '1007', name: 'Mysuru Suburban Stand', nameKn: 'ಮೈಸೂರು ಉಪನಗರ ನಿಲ್ದಾಣ' },
                { code: '1002', name: 'Kyatsandra Junction', nameKn: 'ಕ್ಯಾತ್ಸಂದ್ರ ಜಂಕ್ಷನ್' },
                { code: '1005', name: 'Yeshwantpur TTMC', nameKn: 'ಯಶವಂತಪುರ ಟಿಟಿಎಂಸಿ' }
              ].map(st => (
                <button
                  key={st.code}
                  onClick={() => {
                    setEnteredDigits(`${st.code}#`);
                    handleQuickAction(st.code, st.name);
                  }}
                  className="text-left bg-[#1C212B] hover:bg-[#232936] hover:border-blue-500/40 p-3 rounded-2xl border border-[#262B35] transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-400 group-hover:text-blue-300">
                        #{st.code}
                      </span>
                      <span className="text-white text-xs font-bold">{st.name}</span>
                    </div>
                    <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                      {st.nameKn}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 group-hover:text-blue-400 font-bold bg-[#14171E] px-2 py-1 rounded-lg border border-[#222733]">
                    Dial # →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SMS Live Tracker Dispatcher */}
          <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">SMS Live Arrival Dispatcher</h3>
                  <p className="text-[11px] text-slate-400">Push real-time ETA & live GPS tracking link to passenger mobile</p>
                </div>
              </div>

              {/* Language for SMS */}
              <div className="flex items-center gap-1">
                {(['en', 'kn', 'hi'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setSmsLanguage(l)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      smsLanguage === l ? 'bg-emerald-600 text-white' : 'bg-[#1C212B] text-slate-400'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDirectSMS} className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Recipient Mobile Number
                </label>
                <input
                  type="tel"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  placeholder="e.g. +91 98450 12345"
                  className="w-full bg-[#1B1E26] border border-[#262B37] focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs font-mono text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div className="w-full sm:w-auto self-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Live Tracker SMS</span>
                </button>
              </div>
            </form>

            {smsStatus && (
              <div className={`text-xs p-2.5 rounded-xl flex items-center gap-2 ${
                smsStatus.includes('successfully') ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60' : 'bg-blue-950/40 text-blue-300 border border-blue-800/60'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{smsStatus}</span>
              </div>
            )}

            {sentMessages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#262B35]">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Recent SMS Deliveries</span>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {sentMessages.map((msg, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-[#12151C] border border-[#262B35] text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="text-emerald-400 font-bold">To: {msg.phone}</span>
                        <span>{msg.time}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed break-words">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tri-Lingual Audio Voice Transcript History */}
          <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Interactive Audio Voice Transcript</h3>
              </div>
              <div className="flex items-center gap-2">
                {isCallActive && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Call Active ({language.toUpperCase()})
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {transcriptHistory.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 space-y-2">
                  <PhoneCall className="w-8 h-8 text-slate-500 mx-auto opacity-70" />
                  <p className="font-medium">Dial 080-2222-1234 or click any Stop Code above to begin voice session.</p>
                  <p className="text-[11px] text-slate-500">Every response can be voiced in English, Kannada, or Hindi.</p>
                </div>
              ) : (
                transcriptHistory.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                      entry.sender === 'IVR'
                        ? 'bg-[#1C212B] border border-[#262B35] text-slate-200'
                        : 'bg-blue-500/10 border border-blue-500/20 text-blue-300 ml-8'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[10px] uppercase text-slate-400 border-b border-[#242A36] pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span>{entry.sender === 'IVR' ? 'KSRTC Voice Assistance' : 'Caller Input'}</span>
                        {entry.lang && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono">
                            {entry.lang.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span>{entry.time}</span>
                    </div>

                    {/* Spoken text */}
                    <p className="leading-relaxed whitespace-pre-line text-slate-100">{entry.text}</p>

                    {/* Multilingual Voice Listen Controls for this transcript entry */}
                    {entry.sender === 'IVR' && (entry.textKannada || entry.textHindi) && (
                      <div className="pt-2 border-t border-[#252B38] flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-semibold">Listen in:</span>

                        <button
                          onClick={() => speakText(entry.text, 'en')}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#14171E] hover:bg-blue-600 hover:text-white text-blue-400 border border-[#262B37] transition-all flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>English</span>
                        </button>

                        {entry.textKannada && (
                          <button
                            onClick={() => speakText(entry.textKannada!, 'kn', { phoneticText: entry.phonetic })}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#14171E] hover:bg-amber-600 hover:text-white text-amber-300 border border-[#262B37] transition-all flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>ಕನ್ನಡ (Kannada)</span>
                          </button>
                        )}

                        {entry.textHindi && (
                          <button
                            onClick={() => speakText(entry.textHindi!, 'hi', { phoneticText: entry.phonetic })}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#14171E] hover:bg-orange-600 hover:text-white text-orange-300 border border-[#262B37] transition-all flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>हिंदी (Hindi)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
