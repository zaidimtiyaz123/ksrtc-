import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemKeyDiagnostic, SystemKeysResponse } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Key,
  ExternalLink,
  Sparkles,
  MapPin,
  Database,
  PhoneCall,
  Terminal,
  Layers,
  HelpCircle,
  Check
} from 'lucide-react';

interface ApiDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFreeMap?: () => void;
}

export const ApiDiagnosticsModal: React.FC<ApiDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onSelectFreeMap
}) => {
  const [data, setData] = useState<SystemKeysResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getSystemKeysConfig();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch system keys config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await api.queryTransitCopilot('Status ping: List 2 major KSRTC depots in Bengaluru.', 'en');
      setGeminiTestResult(res.response || 'Success: Gemini API connection verified!');
    } catch (err: any) {
      setGeminiTestResult(`Connection error: ${err?.message || 'Failed to ping Gemini'}`);
    } finally {
      setTestingGemini(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F1219] border border-[#262D3D] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#222838] flex items-center justify-between bg-[#141824]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">API Key & Service Diagnostics</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Scanner
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time validation for Maps, Gemini AI, Database, and Telephony
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="p-2 rounded-xl bg-[#1D2333] hover:bg-[#283247] text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Re-scan APIs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1D2333] hover:bg-[#283247] text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Top Banner highlighting Free Maps */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-blue-950/60 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">100% Free Maps Active Everywhere</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Zero Key Needed
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                The application features fully functional, interactive <strong>OpenStreetMap & CartoDB tiles</strong> (Dark Matter, Voyager, Streets, Satellite). You can navigate, track live buses, and monitor stops with zero API key configuration or billing!
              </p>
              {onSelectFreeMap && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectFreeMap();
                    onClose();
                  }}
                  className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Use Free Map Engine Now</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Status List */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Detected API Keys & System Components
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">Scanning application environment credentials...</span>
              </div>
            ) : (
              data?.keys.map(item => {
                const isHealthy = item.health === 'healthy';
                const isWarning = item.health === 'warning';
                const isError = item.health === 'error';

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      isHealthy
                        ? 'bg-[#111724]/90 border-emerald-500/30'
                        : isWarning
                        ? 'bg-[#1C1814]/90 border-amber-500/30'
                        : isError
                        ? 'bg-[#211417]/90 border-red-500/30'
                        : 'bg-[#111622] border-[#222B3D]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isHealthy
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isWarning
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : isError
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {item.id === 'free_maps' && <Layers className="w-4 h-4" />}
                          {item.id === 'gemini_ai' && <Sparkles className="w-4 h-4" />}
                          {item.id === 'google_maps' && <MapPin className="w-4 h-4" />}
                          {item.id === 'supabase_db' && <Database className="w-4 h-4" />}
                          {item.id === 'telephony_ivr' && <PhoneCall className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-white">{item.name}</h5>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                                isHealthy
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isWarning
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : isError
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.provider}</div>
                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{item.message}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0">
                        {item.id === 'gemini_ai' && isHealthy && (
                          <button
                            type="button"
                            onClick={handleTestGemini}
                            disabled={testingGemini}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${testingGemini ? 'animate-spin' : ''}`} />
                            <span>{testingGemini ? 'Testing...' : 'Test AI Ping'}</span>
                          </button>
                        )}

                        {item.id === 'google_maps' && (
                          <a
                            href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#1E2638] hover:bg-[#2B354C] text-blue-300 text-xs font-bold flex items-center gap-1.5 border border-blue-500/30 transition-all"
                          >
                            <span>Get Demo Key</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Gemini Live Test Output Display */}
                    {item.id === 'gemini_ai' && geminiTestResult && (
                      <div className="mt-3 bg-[#080B12] p-3 rounded-xl border border-purple-500/30 text-xs text-purple-200 font-mono leading-relaxed flex items-start gap-2">
                        <Terminal className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-purple-300 font-bold mb-1">Gemini Copilot Live Verification:</strong>
                          {geminiTestResult}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Explanatory FAQ */}
          <div className="bg-[#121622] border border-[#222A3B] rounded-2xl p-4 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-white font-bold">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>How are API Keys managed in this environment?</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              • <strong>NVIDIA Key vs Google Maps Key:</strong> If an NVIDIA key (<code className="text-amber-300">nvapi-...</code>) is pasted into Google Maps, it will fail authentication because Google Maps requires keys starting with <code className="text-blue-300">AIza...</code>.
              <br />
              • <strong>Free Maps Zero-Key Engine:</strong> You do not need any key! OpenStreetMap & CartoDB tiles are enabled by default across Passenger Tracking, Driver Cockpit, and Admin dispatch views.
              <br />
              • <strong>Gemini AI Integration:</strong> Provides real-time route query answering and automated conductor stop announcements across Karnataka.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#141824] border-t border-[#222838] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            KSRTC SmartTrack Diagnostics v3.8
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
