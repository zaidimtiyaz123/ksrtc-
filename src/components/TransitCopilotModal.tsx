import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  X,
  Bot,
  User,
  RotateCcw,
  Languages,
  CheckCircle2,
  Bus,
  Clock,
  MapPin,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface TransitCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery?: string;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  model?: string;
  isAiGenerated?: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Buses to Kempegowda', query: 'Which buses are currently running towards Majestic Kempegowda?' },
  { label: 'Route 152 Info', query: 'Tell me the schedule, stops and fare for Route 152 Tumkur to Bengaluru.' },
  { label: 'Shakti Scheme Rules', query: 'What are the rules and ID requirements for the Shakti Scheme free travel for women in KSRTC?' },
  { label: 'EV Electric Buses', query: 'Does KSRTC operate EV Power Plus electric buses on Bengaluru-Mysuru expressway?' },
  { label: 'ಕನ್ನಡದಲ್ಲಿ ಮಾಹಿತಿ (Kannada)', query: 'ಬೆಂಗಳೂರು ಮತ್ತು ಮೈಸೂರು ನಡುವಿನ ಬಸ್ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ನಿಲುಗಡೆಗಳನ್ನು ತಿಳಿಸಿ.' }
];

export const TransitCopilotModal: React.FC<TransitCopilotModalProps> = ({
  isOpen,
  onClose,
  defaultQuery
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'initial',
      sender: 'assistant',
      text: 'Namaskara! I am the KSRTC SmartTrack AI Transit Copilot powered by Google Gemini. Ask me about live bus routes, stops, schedules, Shakti scheme guidelines, or connecting services across Karnataka in English, ಕನ್ನಡ, or हिंदी.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAiGenerated: true
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'kn' | 'hi'>('en');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && defaultQuery) {
      handleSend(defaultQuery);
    }
  }, [isOpen, defaultQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.queryTransitCopilot(query, language);
      const assistantMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.response || 'Information received from KSRTC dispatch.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: res.model,
        isAiGenerated: res.isAiGenerated
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: `Service notification: Unable to query KSRTC Transit AI at this moment. Please check the Live Map for GPS vehicle coordinates.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAiGenerated: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Try finding a suitable voice
    const voices = window.speechSynthesis.getVoices();
    if (language === 'kn') {
      const knVoice = voices.find(v => v.lang.includes('kn') || v.name.includes('Kannada'));
      if (knVoice) utterance.voice = knVoice;
    } else if (language === 'hi') {
      const hiVoice = voices.find(v => v.lang.includes('hi') || v.name.includes('Hindi'));
      if (hiVoice) utterance.voice = hiVoice;
    } else {
      const enInVoice = voices.find(v => v.lang === 'en-IN' || v.lang.startsWith('en'));
      if (enInVoice) utterance.voice = enInVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0D1017] border border-[#232B3B] rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E2536] flex items-center justify-between bg-[#131722]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">KSRTC AI Transit Copilot</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gemini Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time route intelligence, timings, Shakti scheme & stops
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-[#1A202E] p-1 rounded-xl border border-[#2B354A]">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'en' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('kn')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'kn' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ಕನ್ನಡ
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'hi' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1A202E] hover:bg-[#2B354A] text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-[#0A0D14] border-b border-[#1A202E] flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" /> Suggestions:
          </span>
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p.query)}
              disabled={loading}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#141A26] hover:bg-[#1E2738] text-[11px] font-medium text-slate-300 hover:text-white border border-[#252E42] transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{p.label}</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar bg-[#0D1017]">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                      : 'bg-[#151A26] border border-[#232B3D] text-slate-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">{msg.timestamp}</span>

                    {!isUser && (
                      <div className="flex items-center gap-2">
                        {msg.model && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">
                            {msg.model}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => speakText(msg.text)}
                          className="hover:text-purple-300 transition-colors p-1 rounded cursor-pointer"
                          title="Read out aloud"
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-purple-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
              </div>
              <div className="bg-[#151A26] border border-[#232B3D] rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                <span>Consulting KSRTC SmartTrack dispatch & fleet context...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#131722] border-t border-[#1E2536]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              placeholder={
                language === 'kn'
                  ? 'ಬಸ್ ಮಾರ್ಗ, ನಿಲ್ದಾಣ ಅಥವಾ ಸಮಯದ ಬಗ್ಗೆ ಕೇಳಿ...'
                  : language === 'hi'
                  ? 'बस रूट, स्टॉप या समय के बारे में पूछें...'
                  : 'Ask about buses, route 152, Shakti scheme, stops, or timings...'
              }
              className="flex-1 bg-[#090C12] border border-[#262F42] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer shrink-0"
            >
              <span>Ask</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Powered by Gemini Multimodal Transit Engine</span>
            <span>Kannada • English • Hindi</span>
          </div>
        </div>
      </div>
    </div>
  );
};
