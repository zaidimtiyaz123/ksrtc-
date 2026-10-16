import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Stop, Route, LiveBusTelemetry } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import {
  MapPin,
  QrCode,
  PhoneCall,
  Bus,
  Clock,
  Radio,
  Download,
  Printer,
  ChevronRight,
  Search,
  ArrowRight,
  Heart
} from 'lucide-react';

export const StopDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [stopData, setStopData] = useState<{
    stop: Stop;
    servicingRoutes: Route[];
    approachingBuses: (LiveBusTelemetry & { eta_to_this_stop_min: number; distance_to_this_stop_km: number })[];
    qrUrl: string;
    ivrInstructions: { tollFreeNumber: string; stopCode: string; instructions: string };
  } | null>(null);

  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.getStopDetails(id)
        .then(res => {
          setStopData(res);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      api.getStops()
        .then(res => {
          setAllStops(res.stops || []);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [id]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleFavoriteStop = async (stopId: string) => {
    await api.addFavorite(undefined, stopId);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePrintQR = () => {
    window.print();
  };

  // Single Stop View with Approaching Buses, QR Code & IVR
  if (id && stopData) {
    const { stop, servicingRoutes, approachingBuses, ivrInstructions } = stopData;
    const fullStopUrl = `${window.location.origin}/stops/${stop.stop_code}`;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-[#E0E0E0]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-mono font-extrabold text-lg shadow-lg shadow-blue-600/30">
              #{stop.stop_code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{stop.name}</h1>
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                  Zone: {stop.zone || 'Karnataka Corridor'}
                </span>
              </div>
              {stop.name_kannada && (
                <p className="text-xs sm:text-sm text-slate-400 font-medium">{stop.name_kannada}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFavoriteStop(stop.id)}
              className={`inline-flex items-center gap-1.5 border border-[#262B35] text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition-colors ${
                savedSuccess ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-[#161920] hover:bg-[#1C212B] text-slate-300 hover:text-rose-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${savedSuccess ? 'text-rose-400 fill-rose-400' : 'text-rose-500'}`} />
              <span>{savedSuccess ? 'Saved to Favorites!' : 'Save Favorite'}</span>
            </button>

            <button
              onClick={handlePrintQR}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Printer className="w-4 h-4 text-blue-200" />
              <span>Print Shelter QR Signage</span>
            </button>
          </div>
        </div>

        {/* Approaching Buses Section */}
        <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <h2 className="text-base font-bold text-white">Live Approaching Buses at this Stop</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {approachingBuses.length} active vehicle(s)
            </span>
          </div>

          {approachingBuses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2 bg-[#1C212B] rounded-2xl border border-[#262B35]">
              <Bus className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="font-bold text-slate-200">No live buses currently approaching this stop</div>
              <p className="text-slate-400">Live telemetry starts when a driver begins a scheduled trip on a servicing route.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approachingBuses.map(bus => (
                <div
                  key={bus.bus_id}
                  className="bg-[#1C212B] hover:bg-[#232936] rounded-2xl p-4 border border-[#262B35] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded border border-slate-700">
                          {bus.registration_number}
                        </span>
                        <span className="text-xs font-bold text-blue-400 font-mono">Route {bus.route_number}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {bus.eta_to_this_stop_min} min away
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white">{bus.route_name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Distance: <strong className="text-slate-200">{bus.distance_to_this_stop_km} km</strong> • Current Speed: <strong className="text-slate-200">{bus.speed} km/h</strong>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#262B35] flex items-center justify-between text-xs">
                    <Link
                      to={`/buses/${bus.bus_id}`}
                      className="font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <span>Bus Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to={`/track?bus=${bus.bus_id}`}
                      className="font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Track on Map</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Code Shelter Signage Card & Non-Smartphone IVR Audio Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code Shelter Signage */}
          <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Bus Shelter Quick-Scan QR Code</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scan with any smartphone camera at this physical bus shelter to instantly view real-time countdown arrivals.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#1C212B] p-4 rounded-2xl border border-[#262B35]">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <QRCodeSVG
                  value={fullStopUrl}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-white font-mono">Stop ID #{stop.stop_code}</div>
                <div className="text-slate-300 font-medium">{stop.name}</div>
                <div className="text-[11px] font-mono text-blue-400 truncate max-w-[200px]">{fullStopUrl}</div>
                <div className="text-[10px] text-slate-400 pt-1">
                  Official KSRTC SmartTrack Passenger Portal
                </div>
              </div>
            </div>
          </div>

          {/* Non-Smartphone IVR Voice Box */}
          <div className="bg-gradient-to-br from-amber-500/10 to-[#161920] rounded-3xl p-6 border border-amber-500/30 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PhoneCall className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Non-Smartphone IVR Voice Helpline</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                For commuters without smartphones or mobile internet. Call the toll-free number from any standard keypad phone and enter this Stop ID.
              </p>
            </div>

            <div className="bg-[#1C212B] rounded-2xl p-4 border border-amber-500/20 space-y-2">
              <div className="text-xs text-slate-400">Toll-Free Dial Hotline:</div>
              <div className="font-mono text-xl font-extrabold text-amber-400">080-2222-1234</div>
              <div className="text-xs text-slate-300">
                Enter Stop ID: <strong className="font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">#{stop.stop_code}</strong>
              </div>
              <div className="pt-2">
                <Link
                  to={`/ivr?stop=${stop.stop_code}`}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Access Audio IVR Helpline</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Servicing Routes List */}
        <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-[#262B35] pb-2">
            Routes Serving this Stop ({servicingRoutes.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {servicingRoutes.map(r => (
              <Link
                key={r.id}
                to={`/routes/${r.id}`}
                className="p-3 rounded-xl border border-[#262B35] hover:border-blue-500/40 hover:bg-[#1C212B] transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-extrabold text-xs text-blue-400 font-mono">Route {r.route_number}</span>
                  <div className="font-bold text-xs text-slate-200 group-hover:text-blue-300 transition-colors mt-0.5">
                    {r.route_name}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // All Stops Directory View
  const filtered = allStops.filter(s => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
      s.stop_code.includes(q) ||
      (s.name_kannada && s.name_kannada.includes(q)) ||
      (s.zone && s.zone.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-[#E0E0E0]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">KSRTC Bus Stops & QR Code Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Unique 4-digit Stop IDs for mobile scan and phone IVR inquiries</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="stops-search-input"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search stop name or Stop ID..."
            className="w-full bg-[#161920] border border-[#262B35] rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(stop => (
          <Link
            key={stop.id}
            to={`/stops/${stop.stop_code}`}
            className="bg-[#161920] rounded-2xl p-5 border border-[#262B35] hover:border-blue-500/40 hover:shadow-lg transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/20">
                  Stop ID #{stop.stop_code}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">{stop.zone || 'General'}</span>
              </div>

              <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-300 transition-colors leading-snug">
                {stop.name}
              </h3>
              {stop.name_kannada && (
                <p className="text-xs text-slate-400 mt-0.5">{stop.name_kannada}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#262B35] flex items-center justify-between text-xs font-bold text-blue-400">
              <span className="flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>View QR & Live ETA</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
