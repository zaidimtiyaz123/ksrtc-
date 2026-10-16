import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, PhoneCall, ShieldAlert, Heart, QrCode, Radio, ShieldCheck, MapPin, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#070A10] text-slate-400 text-sm border-t border-[#182030] mt-auto">
      {/* Official Government of Karnataka Fleet Ribbon */}
      <div className="border-b border-[#141A26] bg-[#05070C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-amber-400">ಕರ್ನಾಟಕ ಸರ್ಕಾರ</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold">Government of Karnataka Undertaking</span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline">Public Transport e-Governance Mission</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span>Kempegowda Majestic Control Room</span>
            <span className="text-emerald-400 font-bold">24x7 Active</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Official Brand Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-700 via-red-600 to-blue-700 flex items-center justify-center shadow-lg shadow-red-900/30 ring-1 ring-amber-500/30 shrink-0">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-black text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>KSRTC SmartTrack</span>
                </div>
                <div className="text-[10px] text-amber-400 font-semibold tracking-wide">ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official real-time fleet telemetry, GPS satellite tracking, and multi-modal transit accessibility platform serving the citizens and passengers of Karnataka.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Authoritative Satellite Stream • Zero Mock Fallbacks</span>
            </div>
          </div>

          {/* Col 2: Passenger Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Passenger Services</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/track" className="hover:text-blue-400 transition-colors flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-emerald-400" /> Live Fleet Tracking Map</Link></li>
              <li><Link to="/routes" className="hover:text-blue-400 transition-colors flex items-center gap-1.5"><Bus className="w-3.5 h-3.5 text-blue-400" /> Timetables & Express Routes</Link></li>
              <li><Link to="/stops" className="hover:text-blue-400 transition-colors flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5 text-cyan-400" /> Bus Stop QR Directory</Link></li>
              <li><Link to="/favorites" className="hover:text-blue-400 transition-colors flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400" /> Saved Routes & Bookmarks</Link></li>
              <li><Link to="/reports" className="hover:text-blue-400 transition-colors flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Passenger Grievance Portal</Link></li>
            </ul>
          </div>

          {/* Col 3: Operations & Accessibility */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Accessibility & Crew</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/ivr" className="hover:text-amber-400 transition-colors flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5 text-amber-400" /> IVR Non-Smartphone Voice Hotline</Link></li>
              <li><Link to="/driver" className="hover:text-blue-400 transition-colors flex items-center gap-1.5 text-blue-300 font-medium"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Driver GPS Smartphone Cockpit</Link></li>
              <li><Link to="/admin" className="hover:text-amber-400 transition-colors flex items-center gap-1.5 text-amber-300 font-medium"><ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Central Dispatch Control Room</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors flex items-center gap-1.5 text-slate-300"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Official Authentication Gateway</Link></li>
              <li className="text-[11px] text-slate-500 pt-1">Bilingual: ಕನ್ನಡ, English, हिंदी Supported</li>
            </ul>
          </div>

          {/* Col 4: Official Helpline */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>KSRTC Control Helpline</span>
            </h4>
            <div className="bg-[#0E131F] border border-[#1E2536] rounded-2xl p-4 space-y-2.5 text-xs shadow-inner">
              <div className="text-slate-300 font-semibold flex items-center justify-between">
                <span>Central Control Room:</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">24/7 Toll-Free</span>
              </div>
              <div className="font-mono text-emerald-400 font-bold text-base tracking-wide">
                080-2222-1234
              </div>
              <div className="font-mono text-slate-300 text-xs">
                Sarige Samparka: <span className="text-amber-300 font-bold">7760990034</span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-[#1E2536]">
                Kempegowda Bus Station (Majestic), Bengaluru - 560009
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright and compliance row */}
        <div className="pt-8 mt-8 border-t border-[#182030] text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Karnataka State Road Transport Corporation. Government of Karnataka.</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] bg-[#0E131F] border border-[#1E2536] px-3 py-1 rounded-full text-slate-400">
              ISO 9001:2015 Fleet Certified
            </span>
            <span className="text-[11px] bg-[#0E131F] border border-[#1E2536] px-3 py-1 rounded-full text-emerald-400 font-mono">
              Live Satellite Sync
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
