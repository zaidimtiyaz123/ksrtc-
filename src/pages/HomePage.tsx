import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Route, Stop, LiveBusTelemetry } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Bus,
  Search,
  MapPin,
  Radio,
  Navigation,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  ShieldCheck,
  PhoneCall,
  QrCode,
  Sparkles,
  ChevronRight,
  History,
  Trash2,
  X,
  Crosshair,
  Compass,
  Navigation2,
  CheckCircle2,
  Layers,
  Activity,
  Ticket,
  Smartphone,
  ExternalLink
} from 'lucide-react';

interface RecentSearchItem {
  id: string;
  from: string;
  to: string;
  query?: string;
  date?: string;
  timestamp: number;
}

const DEFAULT_RECENT_SEARCHES: RecentSearchItem[] = [];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, role, login } = useAuth();

  // Search & Planner form state
  const [activeTab, setActiveTab] = useState<'planner' | 'route'>('planner');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [routeQuery, setRouteQuery] = useState('');
  const [travelDate, setTravelDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Autocomplete lists & Data
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [liveBuses, setLiveBuses] = useState<LiveBusTelemetry[]>([]);
  
  // Autocomplete dropdown focus
  const [isFromFocused, setIsFromFocused] = useState(false);
  const [isToFocused, setIsToFocused] = useState(false);

  // GPS location detection
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Recent Searches
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => {
    try {
      const saved = localStorage.getItem('ksrtc_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 6);
        }
      }
      return DEFAULT_RECENT_SEARCHES;
    } catch {
      return DEFAULT_RECENT_SEARCHES;
    }
  });

  useEffect(() => {
    Promise.all([
      api.getStops().then(res => setAllStops(res.stops || [])).catch(() => {}),
      api.getRoutes().then(res => setRoutes(res.routes || [])).catch(() => {}),
      api.getLiveBuses().then(res => setLiveBuses(res.buses || [])).catch(() => {})
    ]);
  }, []);

  const saveRecentSearch = (from: string, to: string) => {
    if (!from && !to) return;
    const newItem: RecentSearchItem = {
      id: `search-${Date.now()}`,
      from: from.trim(),
      to: to.trim(),
      date: travelDate,
      timestamp: Date.now()
    };

    const filtered = recentSearches.filter(
      s => !(s.from.toLowerCase() === from.toLowerCase() && s.to.toLowerCase() === to.toLowerCase())
    );

    const updated = [newItem, ...filtered].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('ksrtc_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent search', e);
    }
  };

  const removeRecentSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s.id !== id);
    setRecentSearches(updated);
    try {
      localStorage.setItem('ksrtc_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update localStorage', e);
    }
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('ksrtc_recent_searches');
    } catch (e) {
      console.warn('Failed to clear recent searches', e);
    }
  };

  const handleApplyRecentSearch = (item: RecentSearchItem) => {
    setFromLocation(item.from);
    setToLocation(item.to);
    navigate(`/planner?from=${encodeURIComponent(item.from)}&to=${encodeURIComponent(item.to)}`);
  };

  const handleSwapStops = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const handlePlannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromLocation || toLocation) {
      saveRecentSearch(fromLocation, toLocation);
      navigate(`/planner?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}`);
    } else {
      navigate('/planner');
    }
  };

  const handleRouteSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeQuery.trim()) {
      navigate(`/routes?q=${encodeURIComponent(routeQuery.trim())}`);
    } else {
      navigate('/routes');
    }
  };

  // High-accuracy Geolocation detector for Origin input
  const handleDetectOriginLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      setTimeout(() => setLocationStatus(null), 4000);
      return;
    }

    setIsLocating(true);
    setLocationStatus('Acquiring high-precision GPS satellites...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        api.getNearbyStops(latitude, longitude, 30).then(res => {
          setIsLocating(false);
          if (res.stops && res.stops.length > 0) {
            const nearest = res.stops[0];
            setFromLocation(nearest.name);
            setLocationStatus(`GPS Locked: ${nearest.name} (±${Math.round(accuracy)}m)`);
          } else {
            setFromLocation(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
            setLocationStatus(`GPS Locked: ±${Math.round(accuracy)}m`);
          }
          setTimeout(() => setLocationStatus(null), 5000);
        }).catch(() => {
          setIsLocating(false);
          setFromLocation(`GPS Coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setLocationStatus('GPS Coordinates Locked.');
          setTimeout(() => setLocationStatus(null), 4000);
        });
      },
      (err) => {
        setIsLocating(false);
        setLocationStatus(`Could not detect location: ${err.message}`);
        setTimeout(() => setLocationStatus(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const filteredFromStops = fromLocation.trim()
    ? allStops.filter(s =>
        s.name.toLowerCase().includes(fromLocation.toLowerCase()) ||
        s.stop_code.includes(fromLocation) ||
        (s.name_kannada && s.name_kannada.includes(fromLocation))
      ).slice(0, 5)
    : [];

  const filteredToStops = toLocation.trim()
    ? allStops.filter(s =>
        s.name.toLowerCase().includes(toLocation.toLowerCase()) ||
        s.stop_code.includes(toLocation) ||
        (s.name_kannada && s.name_kannada.includes(toLocation))
      ).slice(0, 5)
    : [];

  const popularCorridors = [
    {
      title: 'Tumkur ➔ Bengaluru Majestic',
      from: 'Tumkur KSRTC Bus Stand',
      to: 'Bengaluru Kempegowda Majestic (KSRTC Terminal 1)',
      routeNo: '152',
      service: 'Airavat Club Class (Volvo)',
      duration: '75 min',
      fare: '₹140'
    },
    {
      title: 'Mysuru ➔ Bengaluru Majestic',
      from: 'Mysuru Central Suburban Bus Stand',
      to: 'Bengaluru Kempegowda Majestic (KSRTC Terminal 1)',
      routeNo: '302',
      service: 'Airavat Diamond Class (Scania)',
      duration: '140 min',
      fare: '₹310'
    },
    {
      title: 'Hassan ➔ Bengaluru Majestic',
      from: 'Hassan KSRTC Central Stand',
      to: 'Bengaluru Kempegowda Majestic (KSRTC Terminal 1)',
      routeNo: '201',
      service: 'Rajahamsa Executive',
      duration: '180 min',
      fare: '₹225'
    },
    {
      title: 'Hubballi ⇄ Bengaluru Majestic',
      from: 'Hubballi Old Bus Stand',
      to: 'Bengaluru Kempegowda Majestic (KSRTC Terminal 1)',
      routeNo: '501',
      service: 'Executive Express',
      duration: '420 min',
      fare: '₹620'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#E0E0E0] selection:bg-blue-600 selection:text-white">
      {/* Official Dignified Hero Section */}
      <section className="relative bg-gradient-to-b from-[#0D121D] via-[#0F1524] to-[#0A0D14] text-white pt-10 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#1E2536]">
        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Official Emblem & State Badge */}
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141B2B] border border-[#222E46] text-xs font-medium text-slate-300 mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ</span>
              <span className="text-slate-600">·</span>
              <span className="text-blue-300 font-semibold">KSRTC SmartTrack Live Portal</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Karnataka State Road Transport Corporation
            </h1>
            
            <p className="mt-3 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              SmartTrack — Real-time bus tracking, A-to-B intelligent trip planning, satellite GPS ETAs, and verified station schedules.
            </p>

            {/* Quick telemetry indicators */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Radio className="w-3.5 h-3.5" />
                <span>Satellite Telemetry Active</span>
              </span>
              <span className="text-slate-600">·</span>
              <span>4 Major Express Corridors</span>
              <span className="text-slate-600">·</span>
              <span>17 Monitored Bus Stops</span>
              <span className="text-slate-600">·</span>
              <span>Toll-Free IVR: <strong className="text-amber-300 font-mono">080-2222-1234</strong></span>
            </div>
          </div>

          {/* Central Interactive Search & Planner Deck */}
          <div className="max-w-4xl mx-auto bg-[#111622] rounded-2xl border border-[#1E2536] shadow-2xl p-5 sm:p-7">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-[#1E2536] pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('planner')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'planner'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-[#182030]'
                }`}
              >
                <Navigation2 className="w-3.5 h-3.5 text-cyan-300" />
                <span>A-to-B Trip Planner</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('route')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'route'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-[#182030]'
                }`}
              >
                <Bus className="w-3.5 h-3.5 text-amber-300" />
                <span>Search by Route / Bus Number</span>
              </button>
            </div>

            {/* TAB 1: A-TO-B TRIP PLANNER */}
            {activeTab === 'planner' ? (
              <form onSubmit={handlePlannerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  
                  {/* Origin Field */}
                  <div className="md:col-span-5 relative">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>From Origin</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleDetectOriginLocation}
                        disabled={isLocating}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Crosshair className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                        <span>{isLocating ? 'Detecting...' : 'Near Me'}</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      id="planner-from-input"
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      onFocus={() => setIsFromFocused(true)}
                      onBlur={() => setTimeout(() => setIsFromFocused(false), 200)}
                      placeholder="e.g. Tumkur Bus Stand, Kunigal..."
                      className="w-full bg-[#151C2C] border border-[#222E44] focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm font-medium text-white placeholder-slate-500 transition-colors outline-none"
                    />

                    {/* Autocomplete suggestions */}
                    {isFromFocused && filteredFromStops.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#131926] border border-[#222E44] rounded-xl shadow-2xl py-1 z-30 max-h-48 overflow-y-auto">
                        {filteredFromStops.map(stop => (
                          <div
                            key={stop.id}
                            onMouseDown={() => {
                              setFromLocation(stop.name);
                              setIsFromFocused(false);
                            }}
                            className="px-3.5 py-2 hover:bg-[#1A2336] cursor-pointer flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-200">{stop.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Stop #{stop.stop_code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Swap Button */}
                  <div className="md:col-span-1 flex justify-center pb-1">
                    <button
                      type="button"
                      onClick={handleSwapStops}
                      title="Swap Origin and Destination"
                      className="w-9 h-9 rounded-xl bg-[#182032] hover:bg-[#202B42] border border-[#26344E] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>

                  {/* Destination Field */}
                  <div className="md:col-span-4 relative">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                      <span>To Destination</span>
                    </label>

                    <input
                      type="text"
                      id="planner-to-input"
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      onFocus={() => setIsToFocused(true)}
                      onBlur={() => setTimeout(() => setIsToFocused(false), 200)}
                      placeholder="e.g. Bengaluru Majestic, Mysuru..."
                      className="w-full bg-[#151C2C] border border-[#222E44] focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-sm font-medium text-white placeholder-slate-500 transition-colors outline-none"
                    />

                    {/* Autocomplete suggestions */}
                    {isToFocused && filteredToStops.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#131926] border border-[#222E44] rounded-xl shadow-2xl py-1 z-30 max-h-48 overflow-y-auto">
                        {filteredToStops.map(stop => (
                          <div
                            key={stop.id}
                            onMouseDown={() => {
                              setToLocation(stop.name);
                              setIsToFocused(false);
                            }}
                            className="px-3.5 py-2 hover:bg-[#1A2336] cursor-pointer flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-200">{stop.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Stop #{stop.stop_code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Plan Button */}
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      id="btn-plan-trip"
                      className="w-full h-[42px] bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation2 className="w-4 h-4" />
                      <span>Plan Trip</span>
                    </button>
                  </div>
                </div>

                {locationStatus && (
                  <div className="text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-3 py-2 rounded-xl flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{locationStatus}</span>
                  </div>
                )}
              </form>
            ) : (
              /* TAB 2: ROUTE SEARCH */
              <form onSubmit={handleRouteSearchSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-amber-400" />
                      <span>Route Number, City or Bus Registration</span>
                    </label>
                    <input
                      type="text"
                      value={routeQuery}
                      onChange={(e) => setRouteQuery(e.target.value)}
                      placeholder="e.g. Route 152, KA 01 AB 1234, Tumkur..."
                      className="w-full bg-[#151C2C] border border-[#222E44] focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-sm font-medium text-white placeholder-slate-500 transition-colors outline-none"
                    />
                  </div>
                  <div className="sm:self-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto h-[42px] px-6 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                      <span>Search Routes</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Popular Karnataka Corridors Quick Chips */}
            <div className="mt-5 pt-4 border-t border-[#1E2536]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3 h-3 text-cyan-400" />
                  <span>Popular Express Corridors</span>
                </span>
                <Link to="/planner" className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                  <span>Open Full Trip Planner</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {popularCorridors.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFromLocation(c.from);
                      setToLocation(c.to);
                      navigate(`/planner?from=${encodeURIComponent(c.from)}&to=${encodeURIComponent(c.to)}`);
                    }}
                    className="p-2.5 rounded-xl bg-[#141B2B] hover:bg-[#1A2336] border border-[#222E44] hover:border-blue-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-white group-hover:text-blue-300 transition-colors">
                        Route {c.routeNo}
                      </span>
                      <span className="text-slate-400 font-mono">{c.fare}</span>
                    </div>
                    <div className="text-xs font-medium text-slate-300 truncate">
                      {c.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                      <span className="truncate">{c.service}</span>
                      <span className="font-mono text-cyan-400">{c.duration}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches Bar */}
            {recentSearches.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#1E2536] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1">
                    <History className="w-3 h-3 text-slate-400" />
                    <span>Recent:</span>
                  </span>
                  {recentSearches.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleApplyRecentSearch(item)}
                      className="px-2.5 py-1 rounded-lg bg-[#141B2B] hover:bg-[#1A2336] border border-[#222E44] text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{item.from}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                      <span>{item.to}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearAllRecentSearches}
                  className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Live Fleet Spotlight Banner */}
      <section className="py-8 bg-[#0D111A] border-b border-[#1E2536] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Live Broadcasting KSRTC Fleet</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Driver cockpits broadcasting GPS coordinates in real-time across Karnataka highway corridors.
              </p>
            </div>
            <Link
              to="/track"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#161E2E] hover:bg-[#1E273A] border border-[#24314A] text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors self-start sm:self-auto"
            >
              <span>View Full Fleet On Live Map</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {liveBuses.slice(0, 4).map(bus => (
              <Link
                key={bus.bus_id}
                to={`/track?bus=${bus.bus_id}`}
                className="p-3.5 rounded-xl bg-[#121724] hover:bg-[#171E2E] border border-[#1E2536] hover:border-emerald-500/40 transition-all block group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-950 text-blue-300 border border-blue-800">
                    Route {bus.route_number}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{bus.speed} km/h</span>
                  </span>
                </div>
                <div className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors truncate">
                  {bus.registration_number}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {bus.route_name}
                </div>
                <div className="mt-2 pt-2 border-t border-[#1C2333] flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate">Next: <strong className="text-slate-300">{bus.next_stop}</strong></span>
                  <span className="font-mono text-amber-300 font-bold ml-1">~{bus.eta_minutes}m</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Core Pillars of KSRTC Public Transport */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Comprehensive Public Transit Infrastructure
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Built for accessibility, high-frequency state express corridors, and real-time reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1: A-to-B Planner */}
          <div className="bg-[#111622] border border-[#1E2536] rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/40 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Navigation2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                A-to-B Smart Trip Planner
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Computes optimal direct express corridors and 1-transfer connections across Karnataka with live GPS bus locations, arrival ETAs, and fare calculations.
              </p>
            </div>
            <Link to="/planner" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300">
              <span>Start Planning</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 2: Satellite Live GPS */}
          <div className="bg-[#111622] border border-[#1E2536] rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Satellite GPS Radar Map
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Follow real-time telemetry streaming directly from KSRTC driver cockpits with live speed, direction heading, next-stop ETAs, and route geometry.
              </p>
            </div>
            <Link to="/track" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300">
              <span>Open Live Map</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 3: Smart Shelter QR */}
          <div className="bg-[#111622] border border-[#1E2536] rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Bus Shelter QR Directory
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Each bus shelter is equipped with an official QR code. Scan with any smartphone to instantly see upcoming arrivals, bay numbers, and delay advisories.
              </p>
            </div>
            <Link to="/stops" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300">
              <span>View Stops & QR Codes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pillar 4: IVR Voice Accessibility */}
          <div className="bg-[#111622] border border-[#1E2536] rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Toll-Free Voice IVR
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accessible for non-smartphone users. Dial 080-2222-1234 from any standard mobile phone, enter the 4-digit shelter code, and hear spoken bus ETAs in Kannada, English, or Hindi.
              </p>
            </div>
            <Link to="/ivr" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300">
              <span>Access IVR Terminal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Role Access / Operations Hub Banner */}
      <section className="py-12 bg-[#0E131E] border-t border-[#1E2536] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#121826] via-[#161F33] to-[#121826] border border-[#222E46]">
            <div>
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                Authorized Personnel & Passenger Access
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                KSRTC Portal & Operations Gateways
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl">
                Dedicated interfaces for passengers, on-duty drivers transmitting GPS telemetry, and depot supervisors managing schedule dispatch.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/login/passenger"
                className="px-4 py-2.5 rounded-xl bg-[#1C2538] hover:bg-[#232F46] border border-[#2B3B58] text-xs font-bold text-white flex items-center gap-2 transition-colors"
              >
                <Ticket className="w-4 h-4 text-blue-400" />
                <span>Passenger Portal</span>
              </Link>

              <Link
                to="/login/driver"
                className="px-4 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/50 text-xs font-bold text-emerald-300 flex items-center gap-2 transition-colors"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Driver Cockpit</span>
              </Link>

              <Link
                to="/login/admin"
                className="px-4 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/50 text-xs font-bold text-amber-300 flex items-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Fleet Admin</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
