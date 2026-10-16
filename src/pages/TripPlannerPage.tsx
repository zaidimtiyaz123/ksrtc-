import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Stop,
  TripPlanOption,
  TripPlanResponse,
  PopularTripItem,
  TripLeg
} from '../types';
import { TripPlannerMap } from '../components/TripPlannerMap';
import {
  MapPin,
  ArrowRight,
  ArrowLeftRight,
  Clock,
  Bus,
  Radio,
  Navigation2,
  Calendar,
  Sparkles,
  Volume2,
  VolumeX,
  Share2,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldCheck,
  Leaf,
  Layers,
  Search,
  ExternalLink,
  Compass
} from 'lucide-react';

export const TripPlannerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();

  // Stops list for autocomplete & lookup
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [popularCorridors, setPopularCorridors] = useState<PopularTripItem[]>([]);
  const [isLoadingStops, setIsLoadingStops] = useState(true);

  // Form State
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<Stop | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Stop | null>(null);
  const [departureTime, setDepartureTime] = useState<string>('');
  const [isLeaveNow, setIsLeaveNow] = useState(true);
  const [directOnly, setDirectOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'fastest' | 'earliest_departure' | 'lowest_fare'>('recommended');

  // Autocomplete dropdowns
  const [isOriginFocused, setIsOriginFocused] = useState(false);
  const [isDestFocused, setIsDestFocused] = useState(false);

  // Results State
  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<TripPlanResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UI helpers
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [speakingTripId, setSpeakingTripId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  // Fetch initial stops and popular corridors
  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoadingStops(true);
        const [stopsRes, popularRes] = await Promise.all([
          api.getStops(),
          api.getPopularTrips().catch(() => ({ corridors: [] }))
        ]);

        const stops = stopsRes.stops || [];
        setAllStops(stops);
        setPopularCorridors(popularRes.corridors || []);

        // Check if URL query params exist (e.g. ?from=stop-1001&to=stop-1006 or ?from=Tumkur&to=Majestic)
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');

        let initOrigin: Stop | null = null;
        let initDest: Stop | null = null;

        const findStopFlexible = (query: string): Stop | null => {
          const q = query.trim().toLowerCase();
          return stops.find(s => 
            s.id.toLowerCase() === q ||
            s.stop_code.toLowerCase() === q ||
            s.name.toLowerCase() === q ||
            s.name.toLowerCase().includes(q) ||
            (s.name_kannada && s.name_kannada.includes(query.trim()))
          ) || null;
        };

        if (fromParam) {
          initOrigin = findStopFlexible(fromParam);
          if (initOrigin) {
            setSelectedOrigin(initOrigin);
            setOriginQuery(initOrigin.name);
          } else {
            setOriginQuery(fromParam);
          }
        } else if (stops.length > 0) {
          // Default origin: Tumkur Bus Stand
          const defaultOrg = stops.find(s => s.stop_code === '1001') || stops[0];
          setSelectedOrigin(defaultOrg);
          setOriginQuery(defaultOrg.name);
          initOrigin = defaultOrg;
        }

        if (toParam) {
          initDest = findStopFlexible(toParam);
          if (initDest) {
            setSelectedDestination(initDest);
            setDestinationQuery(initDest.name);
          } else {
            setDestinationQuery(toParam);
          }
        } else if (stops.length > 0) {
          // Default destination: Majestic
          const defaultDest = stops.find(s => s.stop_code === '1006') || stops[Math.min(5, stops.length - 1)];
          setSelectedDestination(defaultDest);
          setDestinationQuery(defaultDest.name);
          initDest = defaultDest;
        }

        // Auto plan if both are selected
        if (initOrigin && initDest) {
          executePlan(initOrigin.id, initDest.id, false, 'recommended');
        }
      } catch (err: any) {
        console.error('Failed to load initial stops data:', err);
      } finally {
        setIsLoadingStops(false);
      }
    }

    loadInitialData();
  }, []);

  // Filtered stops for autocomplete
  const filteredOriginStops = useMemo(() => {
    if (!originQuery.trim()) return allStops.slice(0, 7);
    const q = originQuery.toLowerCase();
    return allStops
      .filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.name_kannada && s.name_kannada.toLowerCase().includes(q)) ||
        s.stop_code.includes(q) ||
        (s.zone && s.zone.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allStops, originQuery]);

  const filteredDestStops = useMemo(() => {
    if (!destinationQuery.trim()) return allStops.slice(0, 7);
    const q = destinationQuery.toLowerCase();
    return allStops
      .filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.name_kannada && s.name_kannada.toLowerCase().includes(q)) ||
        s.stop_code.includes(q) ||
        (s.zone && s.zone.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allStops, destinationQuery]);

  // Execute trip planning
  const executePlan = async (
    orgId?: string,
    destId?: string,
    onlyDirect = directOnly,
    sortMode = sortBy
  ) => {
    const oId = orgId || selectedOrigin?.id;
    const dId = destId || selectedDestination?.id;

    if (!oId || !dId) {
      setErrorMessage('Please select both Origin and Destination stops.');
      return;
    }

    if (oId === dId) {
      setErrorMessage('Origin and Destination cannot be the same stop.');
      return;
    }

    setErrorMessage(null);
    setIsPlanning(true);

    try {
      const res = await api.planTrip({
        originStopId: oId,
        destinationStopId: dId,
        departureTime: isLeaveNow ? undefined : departureTime,
        directOnly: onlyDirect,
        sortBy: sortMode
      });

      setPlanResult(res);
      if (res.options && res.options.length > 0) {
        setSelectedOptionId(res.options[0].id);
        setExpandedTimelineId(res.options[0].id);
      } else {
        setSelectedOptionId(null);
      }
    } catch (err: any) {
      console.error('Trip plan failed:', err);
      setErrorMessage(err.message || 'Unable to find routes between these stations.');
      setPlanResult(null);
    } finally {
      setIsPlanning(false);
    }
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const prevOrg = selectedOrigin;
    const prevOrgQ = originQuery;

    setSelectedOrigin(selectedDestination);
    setOriginQuery(destinationQuery);

    setSelectedDestination(prevOrg);
    setDestinationQuery(prevOrgQ);

    if (selectedDestination && prevOrg) {
      executePlan(selectedDestination.id, prevOrg.id);
    }
  };

  // Handle Geolocation to find closest stop
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        // Find closest stop
        let closest: Stop | null = null;
        let minD = Infinity;

        allStops.forEach(s => {
          const d = Math.hypot(s.latitude - latitude, s.longitude - longitude);
          if (d < minD) {
            minD = d;
            closest = s;
          }
        });

        if (closest) {
          setSelectedOrigin(closest);
          setOriginQuery(closest.name);
          if (selectedDestination) {
            executePlan(closest.id, selectedDestination.id);
          }
        }
      },
      () => {
        alert('Could not determine your GPS location. Please select a boarding station.');
      },
      { timeout: 8000 }
    );
  };

  // Handle Quick Corridor Click
  const handleSelectCorridor = (item: PopularTripItem) => {
    const org = allStops.find(s => s.id === item.originStopId);
    const dest = allStops.find(s => s.id === item.destinationStopId);

    if (org && dest) {
      setSelectedOrigin(org);
      setOriginQuery(org.name);
      setSelectedDestination(dest);
      setDestinationQuery(dest.name);
      executePlan(org.id, dest.id);
    }
  };

  // Currently selected option for map display
  const currentOption = useMemo(() => {
    if (!planResult || !selectedOptionId) return null;
    return planResult.options.find(o => o.id === selectedOptionId) || planResult.options[0] || null;
  }, [planResult, selectedOptionId]);

  // Copy itinerary to clipboard
  const handleShareTrip = (option: TripPlanOption) => {
    const leg1 = option.legs[0];
    const text = `🚌 KSRTC SmartTrack Trip Plan\n` +
      `From: ${option.legs[0].originStop.name}\n` +
      `To: ${option.legs[option.legs.length - 1].destinationStop.name}\n` +
      `Departure: ${option.departureTime} · Arrival: ${option.arrivalTime}\n` +
      `Duration: ${Math.floor(option.totalDurationMinutes / 60)}h ${option.totalDurationMinutes % 60}m (${option.totalDistanceKm} km)\n` +
      `Fare: ₹${option.totalFare} · Type: ${option.type === 'direct' ? 'Direct Bus' : '1 Transfer'}\n` +
      `Service: ${leg1.busServiceType}\n` +
      (option.hasLiveBus ? `⚡ Live GPS Bus actively tracked on route!` : '') +
      `\nTrack live at: ${window.location.origin}/track`;

    navigator.clipboard.writeText(text);
    setCopiedTripId(option.id);
    setTimeout(() => setCopiedTripId(null), 2500);
  };

  // Save Route to Favorites
  const handleSaveFavorite = async (option: TripPlanOption) => {
    try {
      const routeId = option.legs[0].routeId;
      await api.addFavorite(routeId, undefined, user?.id || 'user-passenger-1');
      setSavedTripId(option.id);
      setTimeout(() => setSavedTripId(null), 3000);
    } catch (_) {}
  };

  // Multilingual Voice Output (Kannada / English / Hindi)
  const handleSpeakItinerary = (option: TripPlanOption) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech Synthesis not supported in this browser.');
      return;
    }

    if (speakingTripId === option.id) {
      window.speechSynthesis.cancel();
      setSpeakingTripId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const leg1 = option.legs[0];
    const orgName = option.legs[0].originStop.name;
    const destName = option.legs[option.legs.length - 1].destinationStop.name;
    const durHours = Math.floor(option.totalDurationMinutes / 60);
    const durMins = option.totalDurationMinutes % 60;

    let textToSpeak = '';
    let voiceLang = 'en-IN';

    if (language === 'kn') {
      voiceLang = 'kn-IN';
      const orgKn = option.legs[0].originStop.name_kannada || orgName;
      const destKn = option.legs[option.legs.length - 1].destinationStop.name_kannada || destName;
      textToSpeak = `${orgKn} ನಿಂದ ${destKn} ವರೆಗೆ. ಬಸ್ ಮಾರ್ಗ ಸಂಖ್ಯೆ ${leg1.routeNumber}. ಅಂದಾಜು ಪ್ರಯಾಣ ಸಮಯ ${durHours > 0 ? durHours + ' ಗಂಟೆ ' : ''}${durMins} ನಿಮಿಷಗಳು. ಟಿಕೆಟ್ ದರ ${option.totalFare} ರೂಪಾಯಿಗಳು. ${option.hasLiveBus ? 'ಲೈವ್ ಬಸ್ ಮಾರ್ಗದಲ್ಲಿದೆ.' : ''} ಶುಭ ಪ್ರಯಾಣ.`;
    } else if (language === 'hi') {
      voiceLang = 'hi-IN';
      textToSpeak = `${orgName} से ${destName} के लिए यात्रा योजना। बस रूट नंबर ${leg1.routeNumber}. कुल यात्रा समय ${durHours > 0 ? durHours + ' घंटे ' : ''}${durMins} मिनट। किराया ${option.totalFare} रुपये। ${option.hasLiveBus ? 'लाइव बस ट्रैक हो रही है।' : ''} सुखद यात्रा।`;
    } else {
      voiceLang = 'en-IN';
      textToSpeak = `KSRTC Trip plan from ${orgName} to ${destName}. Bus Route number ${leg1.routeNumber}. Total journey duration is ${durHours > 0 ? durHours + ' hours and ' : ''}${durMins} minutes. Estimated fare is ${option.totalFare} rupees. ${option.hasLiveBus ? 'A live GPS bus is approaching your boarding stop.' : ''} Have a safe journey with KSRTC.`;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = voiceLang;
    utterance.rate = 0.95;

    // Smart voice selection
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang === voiceLang || v.lang.startsWith(voiceLang.slice(0, 2)));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => setSpeakingTripId(null);
    utterance.onerror = () => setSpeakingTripId(null);

    setSpeakingTripId(option.id);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[#0A0D15] text-[#E0E0E0] pb-24">
      {/* Official Header Banner */}
      <section className="bg-gradient-to-b from-[#111726] to-[#0A0D15] border-b border-[#1A2233] pt-7 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">ಕರ್ನಾಟಕ ಸಾರಿಗೆ ಪ್ರಯಾಣ ಯೋಜಕ</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400">Intelligent Transit Router</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <Navigation2 className="w-7 h-7 text-blue-500" />
                <span>A-to-B Trip Planner</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Plan optimal KSRTC bus routes across Karnataka with real-time GPS locations, live ETA countdowns, platform interchange guidance, and fare calculations.
              </p>
            </div>

            {/* Live Telemetry Status Capsule */}
            <div className="flex items-center gap-3 bg-[#121824] px-4 py-2.5 rounded-2xl border border-[#1E293B] shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-slate-200">Real-Time Fleet Sync</div>
                <div className="text-[11px] font-mono text-emerald-400">
                  {planResult?.liveBusesActiveCount || 4} buses broadcasting live telemetry
                </div>
              </div>
            </div>
          </div>

          {/* Popular Karnataka Corridors Quick-Picks */}
          <div className="mt-6 pt-5 border-t border-[#1A2233]/70">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Popular Corridors (Direct 1-Click Planning)</span>
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {popularCorridors.map(corridor => (
                <button
                  key={corridor.id}
                  onClick={() => handleSelectCorridor(corridor)}
                  className="shrink-0 group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121824] hover:bg-[#1C2436] border border-[#1E293B] hover:border-blue-500/50 text-xs text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
                >
                  <span className="font-bold text-amber-400 font-mono">Rt {corridor.routeNumber}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-medium truncate max-w-[130px]">{corridor.originName.split(' ')[0]}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  <span className="font-medium truncate max-w-[130px]">{corridor.destinationName.split(' ')[0]}</span>
                  {corridor.activeBusesCount > 0 && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{corridor.activeBusesCount} Live</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Work Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Search Panel Card */}
        <div className="bg-[#10141E] rounded-2xl border border-[#1E2536] p-4 sm:p-6 shadow-2xl mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Origin Stop Input */}
            <div className="relative lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Origin (Boarding Stop A)</span>
                </span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Detect nearest KSRTC terminal"
                >
                  <Compass className="w-3 h-3" />
                  <span>Nearby GPS</span>
                </button>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={originQuery}
                  onChange={e => {
                    setOriginQuery(e.target.value);
                    setSelectedOrigin(null);
                  }}
                  onFocus={() => setIsOriginFocused(true)}
                  placeholder="e.g. Tumkur, Mysuru, Nelamangala..."
                  className="w-full bg-[#0A0D15] border border-[#222B3D] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-all font-medium"
                />
                <MapPin className="absolute right-3 top-3 w-4 h-4 text-emerald-400 pointer-events-none" />
              </div>

              {/* Autocomplete Menu */}
              {isOriginFocused && filteredOriginStops.length > 0 && (
                <div
                  className="absolute left-0 right-0 mt-1.5 bg-[#121824] border border-[#222B3D] rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 divide-y divide-[#1A2233]"
                  onMouseDown={e => e.preventDefault()}
                >
                  {filteredOriginStops.map(stop => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        setSelectedOrigin(stop);
                        setOriginQuery(stop.name);
                        setIsOriginFocused(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#1A2336] transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                          {stop.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {stop.name_kannada ? `${stop.name_kannada} · ` : ''}Stop #{stop.stop_code} · {stop.zone || 'KSRTC'}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-[#0A0D15] px-2 py-0.5 rounded border border-[#1E2536]">
                        #{stop.stop_code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="lg:col-span-1 flex justify-center py-1 lg:py-0">
              <button
                type="button"
                onClick={handleSwap}
                className="w-10 h-10 rounded-xl bg-[#182030] hover:bg-[#202B40] border border-[#263248] text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                title="Swap Origin & Destination"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Stop Input */}
            <div className="relative lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Destination (Arrival Stop B)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={destinationQuery}
                  onChange={e => {
                    setDestinationQuery(e.target.value);
                    setSelectedDestination(null);
                  }}
                  onFocus={() => setIsDestFocused(true)}
                  placeholder="e.g. Majestic, Yeshwanthpur, Hassan..."
                  className="w-full bg-[#0A0D15] border border-[#222B3D] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-all font-medium"
                />
                <MapPin className="absolute right-3 top-3 w-4 h-4 text-rose-400 pointer-events-none" />
              </div>

              {/* Autocomplete Menu */}
              {isDestFocused && filteredDestStops.length > 0 && (
                <div
                  className="absolute left-0 right-0 mt-1.5 bg-[#121824] border border-[#222B3D] rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 divide-y divide-[#1A2233]"
                  onMouseDown={e => e.preventDefault()}
                >
                  {filteredDestStops.map(stop => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        setSelectedDestination(stop);
                        setDestinationQuery(stop.name);
                        setIsDestFocused(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#1A2336] transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                          {stop.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {stop.name_kannada ? `${stop.name_kannada} · ` : ''}Stop #{stop.stop_code} · {stop.zone || 'KSRTC'}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-[#0A0D15] px-2 py-0.5 rounded border border-[#1E2536]">
                        #{stop.stop_code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action / Search Button */}
            <div className="lg:col-span-3 flex flex-col justify-end mt-2 lg:mt-0">
              <label className="hidden lg:block text-xs font-semibold text-transparent mb-1.5">Action</label>
              <button
                type="button"
                onClick={() => executePlan()}
                disabled={isPlanning}
                className="w-full py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isPlanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Corridors...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Find Routes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Advanced Filter Bar (Departure Time & Direct Preference) */}
          <div className="mt-4 pt-4 border-t border-[#1C2434] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              {/* Departure Timing */}
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-medium">Departure:</span>
                <button
                  type="button"
                  onClick={() => setIsLeaveNow(true)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                    isLeaveNow ? 'bg-blue-600 text-white font-bold' : 'bg-[#182030] text-slate-300 hover:text-white'
                  }`}
                >
                  Leave Now
                </button>
                <input
                  type="time"
                  value={departureTime}
                  onChange={e => {
                    setDepartureTime(e.target.value);
                    setIsLeaveNow(false);
                  }}
                  className={`bg-[#0A0D15] border border-[#222B3D] px-2 py-1 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 ${
                    !isLeaveNow ? 'border-blue-500 text-blue-400' : ''
                  }`}
                />
              </div>

              {/* Direct Only Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={e => {
                    setDirectOnly(e.target.checked);
                    executePlan(undefined, undefined, e.target.checked);
                  }}
                  className="w-4 h-4 rounded border-[#263248] text-blue-600 focus:ring-0 bg-[#0A0D15] cursor-pointer"
                />
                <span className="text-slate-300 hover:text-white">Direct Non-Stop Only</span>
              </label>
            </div>

            {/* Mobile View Toggle (Itineraries vs Map) */}
            <div className="flex lg:hidden items-center gap-1 bg-[#182030] p-1 rounded-xl border border-[#263248]">
              <button
                type="button"
                onClick={() => setMobileTab('list')}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                  mobileTab === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Itineraries
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('map')}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                  mobileTab === 'map' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Map View
              </button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Route Search Advisory:</span> {errorMessage}
            </div>
          </div>
        )}

        {/* Results Layout: 2 Columns on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Itinerary Results & Timeline */}
          <div className={`lg:col-span-7 space-y-4 ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
            {/* Results Header with Sorting Tabs */}
            {planResult && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#10141E] px-4 py-3 rounded-2xl border border-[#1E2536]">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{planResult.options.length} Routes Discovered</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 font-normal">
                      {planResult.directOptionsCount} Direct, {planResult.transferOptionsCount} Connecting
                    </span>
                  </div>
                </div>

                {/* Sorting Controls */}
                <div className="flex items-center gap-1 bg-[#182030] p-1 rounded-xl border border-[#222B3D] text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('recommended');
                      executePlan(undefined, undefined, undefined, 'recommended');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      sortBy === 'recommended' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Recommended
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('fastest');
                      executePlan(undefined, undefined, undefined, 'fastest');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      sortBy === 'fastest' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fastest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('earliest_departure');
                      executePlan(undefined, undefined, undefined, 'earliest_departure');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      sortBy === 'earliest_departure' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Live Arrival
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('lowest_fare');
                      executePlan(undefined, undefined, undefined, 'lowest_fare');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      sortBy === 'lowest_fare' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Lowest Fare
                  </button>
                </div>
              </div>
            )}

            {/* List of Option Cards */}
            {isPlanning ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-[#10141E] rounded-2xl border border-[#1E2536] p-6 animate-pulse space-y-4">
                    <div className="h-5 bg-slate-800 rounded w-1/3" />
                    <div className="h-4 bg-slate-800/60 rounded w-1/2" />
                    <div className="h-10 bg-slate-800/40 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : planResult && planResult.options.length > 0 ? (
              <div className="space-y-4">
                {planResult.options.map(option => {
                  const isSelected = selectedOptionId === option.id;
                  const isExpanded = expandedTimelineId === option.id;
                  const leg1 = option.legs[0];
                  const finalLeg = option.legs[option.legs.length - 1];

                  return (
                    <div
                      key={option.id}
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`group bg-[#10141E] rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-blue-500 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/50'
                          : 'border-[#1E2536] hover:border-[#2E3B54]'
                      }`}
                    >
                      {/* Card Top Details */}
                      <div className="p-4 sm:p-5">
                        {/* Top Line: Timings, Route ID, Badge */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-xl sm:text-2xl font-black text-white font-mono">
                              {option.departureTime}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-500" />
                            <span className="text-xl sm:text-2xl font-black text-white font-mono">
                              {option.arrivalTime}
                            </span>
                            <span className="text-xs font-medium text-slate-400 ml-1">
                              ({Math.floor(option.totalDurationMinutes / 60)}h {option.totalDurationMinutes % 60}m)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {option.recommendationBadge && (
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                option.recommendationBadge === 'Live Bus Approaching'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse'
                                  : option.recommendationBadge === 'Fastest'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                              }`}>
                                {option.recommendationBadge}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Route Title & Class */}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-200 mb-2">
                          <span className="px-2 py-0.5 rounded bg-blue-600/30 border border-blue-500/40 text-blue-300 font-mono">
                            Route {leg1.routeNumber}
                            {option.type === 'transfer' && ` ➔ ${finalLeg.routeNumber}`}
                          </span>
                          <span className="text-slate-300">{leg1.busServiceType}</span>
                        </div>

                        {/* Unboxed Metadata Discipline */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3 font-medium">
                          <span>{option.totalDistanceKm} km corridor</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-400 font-bold font-mono">₹{option.totalFare} tariff</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {option.type === 'direct'
                              ? `${leg1.intermediateCount} stops`
                              : `1 transfer at ${option.transferStation?.name || 'Hub'}`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-400/90 flex items-center gap-1">
                            <Leaf className="w-3 h-3 text-emerald-400" />
                            <span>{option.carbonSavedKg} kg CO₂ saved</span>
                          </span>
                        </div>

                        {/* Real-Time Live Bus Alert Box (If Active GPS Bus Found) */}
                        {option.hasLiveBus && leg1.liveBus && (
                          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 mb-3 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                              <div>
                                <div className="font-bold flex items-center gap-2 text-emerald-300">
                                  <span>LIVE BUS EN-ROUTE</span>
                                  <span className="font-mono font-semibold text-[11px] text-white bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                    {leg1.liveBus.registrationNumber}
                                  </span>
                                </div>
                                <div className="text-[11px] text-emerald-400/80 mt-0.5">
                                  Speed: {leg1.liveBus.currentSpeed} km/h · Driver: {leg1.liveBus.driverName}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <div className="text-xs font-bold text-white font-mono">
                                  ETA: ~{leg1.liveBus.etaToOriginMinutes} min
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {leg1.liveBus.distanceToOriginKm} km to boarding
                                </div>
                              </div>
                              <Link
                                to={`/track?bus=${leg1.liveBus.busId}`}
                                onClick={e => e.stopPropagation()}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <span>Radar</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* Action Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1A2233]">
                          <div className="flex items-center gap-1.5">
                            {/* Voice button */}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleSpeakItinerary(option);
                              }}
                              className={`p-2 rounded-lg border transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
                                speakingTripId === option.id
                                  ? 'bg-amber-600 text-white border-amber-500 animate-pulse'
                                  : 'bg-[#161D2B] text-slate-300 hover:text-white border-[#222C3E]'
                              }`}
                              title="Listen to trip itinerary"
                            >
                              {speakingTripId === option.id ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Voice</span>
                                </>
                              )}
                            </button>

                            {/* Share button */}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleShareTrip(option);
                              }}
                              className="p-2 rounded-lg bg-[#161D2B] hover:bg-[#1E273A] text-slate-300 hover:text-white border border-[#222C3E] transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                              title="Share Itinerary"
                            >
                              {copiedTripId === option.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Share</span>
                                </>
                              )}
                            </button>

                            {/* Bookmark button */}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleSaveFavorite(option);
                              }}
                              className="p-2 rounded-lg bg-[#161D2B] hover:bg-[#1E273A] text-slate-300 hover:text-white border border-[#222C3E] transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                              title="Save Route"
                            >
                              {savedTripId === option.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-purple-400" />
                                  <span className="text-purple-400 font-bold">Saved!</span>
                                </>
                              ) : (
                                <>
                                  <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Save</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Toggle Timeline Accordion */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedTimelineId(isExpanded ? null : option.id);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer py-1"
                          >
                            <span>{isExpanded ? 'Hide Itinerary' : 'View Stop Timeline'}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Detailed Timeline */}
                      {isExpanded && (
                        <div className="bg-[#0B0E16] border-t border-[#1A2233] p-4 sm:p-5">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Step-by-Step Boarding & Transfer Timeline
                          </div>

                          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#222C3E]">
                            {option.legs.map((leg, lIdx) => (
                              <div key={lIdx} className="space-y-4">
                                {/* Boarding Stop */}
                                <div className="relative">
                                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0B0E16]" />
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-white">
                                        Board at {leg.originStop.name}
                                      </span>
                                      <span className="text-xs font-mono font-bold text-emerald-400">
                                        {leg.scheduledDepartureTime}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      {leg.originStop.name_kannada} · Stop #{leg.originStop.stop_code}
                                    </div>
                                    <div className="mt-1.5 px-2.5 py-1 rounded bg-[#121824] border border-[#1E293B] text-[11px] text-slate-300 font-medium inline-block">
                                      Ride {leg.busServiceType} (Route {leg.routeNumber}) for {leg.durationMinutes} mins ({leg.distanceKm} km)
                                    </div>
                                  </div>
                                </div>

                                {/* Intermediate Stops Accordion / Preview */}
                                {leg.intermediateStops.length > 0 && (
                                  <div className="relative pl-2 text-[11px] text-slate-500">
                                    <div className="flex items-center gap-1.5 py-1">
                                      <Bus className="w-3 h-3 text-slate-600" />
                                      <span>Passes {leg.intermediateStops.length} intermediate stops: </span>
                                      <span className="text-slate-400">
                                        {leg.intermediateStops.map(s => s.name.split(' ')[0]).join(' ➔ ')}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* If transfer leg follows */}
                                {lIdx === 0 && option.type === 'transfer' && option.transferStation && (
                                  <div className="relative my-3 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                                    <div className="absolute -left-6 top-4 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-[#0B0E16]" />
                                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Interchange at {option.transferStation.name}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      Arrival: {leg.scheduledArrivalTime} · Change bus to Route {option.legs[1].routeNumber}
                                    </div>
                                    <div className="text-[11px] text-amber-400/90 font-mono mt-1 font-semibold">
                                      {option.transferWaitMinutes} mins comfortable platform transfer buffer
                                    </div>
                                  </div>
                                )}

                                {/* Final Leg Destination Arrival */}
                                {lIdx === option.legs.length - 1 && (
                                  <div className="relative">
                                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#0B0E16]" />
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white">
                                          Alight at {leg.destinationStop.name}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-rose-400">
                                          {leg.scheduledArrivalTime}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {leg.destinationStop.name_kannada} · Stop #{leg.destinationStop.stop_code}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#10141E] rounded-2xl border border-[#1E2536] p-8 text-center">
                <Navigation2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white">No Routes Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Try searching between major interchange stations such as Bengaluru Majestic (#1006) or Nelamangala (#1004).
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Leaflet Map */}
          <div className={`lg:col-span-5 ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}`}>
            <div className="sticky top-20 bg-[#10141E] rounded-2xl border border-[#1E2536] p-3 shadow-2xl space-y-3">
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Interactive Route & Fleet Radar</span>
                </div>
                {currentOption && (
                  <span className="text-[11px] font-mono text-blue-400">
                    {currentOption.totalDistanceKm} km
                  </span>
                )}
              </div>

              {/* Map Container */}
              <div className="h-[460px] sm:h-[540px] w-full rounded-xl overflow-hidden border border-[#1E2536]">
                <TripPlannerMap selectedOption={currentOption} className="h-full w-full" />
              </div>

              {/* Map Legend */}
              <div className="p-2.5 bg-[#0B0E16] rounded-xl border border-[#1A2233] text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>A: Boarding</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>B: Alighting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>⇄: Transfer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-mono font-bold">● LIVE Bus</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
