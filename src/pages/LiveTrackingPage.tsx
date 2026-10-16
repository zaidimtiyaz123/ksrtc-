import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LiveMap } from '../maps/LiveMap';
import { api, subscribeToLiveFleet } from '../services/api';
import { LiveBusTelemetry, Route, Stop, BusLiveStatus } from '../types';
import {
  Radio,
  Search,
  Filter,
  Bus,
  MapPin,
  Clock,
  Gauge,
  Navigation,
  RefreshCw,
  Info,
  Heart,
  ShieldAlert,
  ChevronRight,
  X,
  ExternalLink,
  Volume2,
  Sparkles,
  Crosshair,
  Compass,
  Layers
} from 'lucide-react';
import { TransitCopilotModal } from '../components/TransitCopilotModal';

// Haversine calculation for exact distance
function getDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const LiveTrackingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBusId = searchParams.get('bus');
  const initialRouteId = searchParams.get('route');

  const [liveBuses, setLiveBuses] = useState<LiveBusTelemetry[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(initialBusId);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(initialRouteId || 'all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BusLiveStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [activeRouteGeometry, setActiveRouteGeometry] = useState<[number, number][] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [connectionState, setConnectionState] = useState<{ status: string; latency?: number }>({ status: 'connecting' });
  const wsSubRef = React.useRef<any>(null);

  const handlePlayVoiceAnnouncement = (bus: LiveBusTelemetry) => {
    if (!('speechSynthesis' in window)) {
      setActionFeedback('Speech synthesis is not supported on this device/browser.');
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    window.speechSynthesis.cancel();
    const text = `Attention KSRTC passenger. Bus ${bus.registration_number}, Route number ${bus.route_number}, is approaching ${bus.next_stop || bus.destination}. Estimated arrival time is ${bus.eta_minutes || 0} minutes. Current speed is ${bus.speed} kilometers per hour.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Load initial routes and stops
  useEffect(() => {
    Promise.allSettled([
      api.getRoutes(),
      api.getStops(),
      api.getLiveBuses()
    ]).then(([routesResult, stopsResult, busesResult]) => {
      const routesList = routesResult.status === 'fulfilled' && routesResult.value.routes?.length 
        ? routesResult.value.routes 
        : [];
      const stopsList = stopsResult.status === 'fulfilled' && stopsResult.value.stops?.length 
        ? stopsResult.value.stops 
        : [];
      const busesList = busesResult.status === 'fulfilled' && busesResult.value.buses?.length 
        ? busesResult.value.buses 
        : [];

      setRoutes(routesList);
      setStops(stopsList);
      setLiveBuses(busesList);
      setIsLoading(false);
      setLastRefreshed(new Date());

      if (initialRouteId) {
        const found = routesList.find(r => r.id === initialRouteId);
        if (found) setActiveRouteGeometry(found.route_geometry);
      }
    }).catch(err => {
      console.warn('Notice loading tracking data:', err);
      setIsLoading(false);
    });

    // Subscribe to real-time WebSocket location events with high-efficiency selective routing
    const unsubscribe = subscribeToLiveFleet(
      (telemetryUpdate) => {
        setLiveBuses(prev => {
          const idx = prev.findIndex(b => b.bus_id === telemetryUpdate.bus_id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = telemetryUpdate;
            return copy;
          } else {
            return [telemetryUpdate, ...prev];
          }
        });
        setLastRefreshed(new Date());
      },
      (fleetSnapshot) => {
        setLiveBuses(fleetSnapshot);
        setLastRefreshed(new Date());
      },
      undefined,
      undefined,
      {
        routeId: initialRouteId,
        busId: initialBusId,
        onConnectionChange: (status, latencyMs) => {
          setConnectionState({ status, latency: latencyMs });
        }
      }
    );

    wsSubRef.current = unsubscribe;

    return () => {
      wsSubRef.current = null;
      unsubscribe();
    };
  }, []);

  // Update geometry when selected route changes
  useEffect(() => {
    if (selectedRouteId && selectedRouteId !== 'all') {
      const found = routes.find(r => r.id === selectedRouteId);
      if (found) {
        setActiveRouteGeometry(found.route_geometry);
      }
    } else if (selectedBusId) {
      const bus = liveBuses.find(b => b.bus_id === selectedBusId);
      if (bus) {
        const found = routes.find(r => r.id === bus.route_id);
        if (found) setActiveRouteGeometry(found.route_geometry);
      }
    } else {
      setActiveRouteGeometry(undefined);
    }

    // Dynamic selective routing: only subscribe to what user is looking at to save bandwidth
    if (wsSubRef.current?.setFilter) {
      wsSubRef.current.setFilter({
        routeId: selectedRouteId !== 'all' ? selectedRouteId : null,
        busId: selectedBusId || null
      });
    }
  }, [selectedRouteId, selectedBusId, routes, liveBuses]);

  // Request user location if query params specify
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      setUserLocation({ latitude: Number(lat), longitude: Number(lng) });
    }
  }, [searchParams]);

  // Filtered buses list
  const filteredBuses = liveBuses.filter(bus => {
    if (statusFilter !== 'ALL' && bus.status !== statusFilter) return false;
    if (selectedRouteId !== 'all' && bus.route_id !== selectedRouteId) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesReg = bus.registration_number.toLowerCase().includes(query);
      const matchesRoute = bus.route_number.toLowerCase().includes(query) || bus.route_name.toLowerCase().includes(query);
      const matchesStop = bus.next_stop?.toLowerCase().includes(query);
      return matchesReg || matchesRoute || matchesStop;
    }
    return true;
  });

  const selectedBus = liveBuses.find(b => b.bus_id === selectedBusId);

  const handleSelectBus = (bus: LiveBusTelemetry) => {
    setSelectedBusId(bus.bus_id);
    setSearchParams({ bus: bus.bus_id });
    setMobileView('map');
  };

  const handleSelectClosestBus = () => {
    if (!userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setUserLocation(coords);
            findNearestToCoords(coords);
          },
          () => {
            setActionFeedback('Please allow location access to find closest bus.');
            setTimeout(() => setActionFeedback(null), 3500);
          },
          { enableHighAccuracy: true }
        );
      }
      return;
    }
    findNearestToCoords(userLocation);
  };

  const findNearestToCoords = (coords: { latitude: number; longitude: number }) => {
    let closest: LiveBusTelemetry | null = null;
    let minDist = Infinity;
    liveBuses.forEach(b => {
      if (!isNaN(b.latitude) && !isNaN(b.longitude)) {
        const d = getDistKm(coords.latitude, coords.longitude, b.latitude, b.longitude);
        if (d < minDist) {
          minDist = d;
          closest = b;
        }
      }
    });

    if (closest) {
      handleSelectBus(closest);
      const distStr = minDist < 1 ? `${Math.round(minDist * 1000)} m` : `${minDist.toFixed(1)} km`;
      setActionFeedback(`Nearest Bus: ${(closest as LiveBusTelemetry).registration_number} (${distStr} away)`);
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      setActionFeedback('No active buses found nearby.');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleSaveFavorite = async (routeId: string) => {
    try {
      await api.addFavorite(routeId);
      setActionFeedback('Route added to saved favorites!');
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback('Saved to local favorites');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] w-full bg-[#0A0D14] text-[#E0E0E0] overflow-hidden">
      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="fixed top-20 right-6 z-50 bg-[#0A0D14]/95 text-cyan-300 border border-cyan-500/50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Mobile Map / List Toggle */}
      <div className="md:hidden flex items-center justify-around bg-[#10141F] border-b border-[#1E2638] p-2 text-xs font-bold">
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all ${
            mobileView === 'map' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>3D Live Map</span>
        </button>
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all ${
            mobileView === 'list' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400'
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>Buses List ({filteredBuses.length})</span>
        </button>
      </div>

      {/* Sidebar: 3D Bus Command & Filtering Deck */}
      <aside className={`w-full md:w-96 flex-shrink-0 bg-[#0E121B] border-r border-[#1E2638] flex flex-col h-full overflow-hidden ${
        mobileView === 'list' ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Top Header Card */}
        <div className="p-4 border-b border-[#1E2638] space-y-3 bg-[#10141F]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
              <h1 className="font-extrabold text-sm text-white tracking-wide uppercase font-mono flex items-center gap-1.5">
                <span>Live Fleet Radar</span>
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5 transition-colors ${
                connectionState.status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : connectionState.status === 'reconnecting'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  connectionState.status === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400 animate-ping'
                }`} />
                <span>
                  {connectionState.status === 'connected'
                    ? `LIVE WS${connectionState.latency ? ` • ${connectionState.latency}ms` : ''}`
                    : connectionState.status === 'reconnecting'
                    ? 'RECONNECTING'
                    : 'ADAPTIVE'}
                </span>
              </span>
              <span className="text-[10px] font-mono bg-[#161C2C] text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                {liveBuses.length} Active
              </span>
            </div>
          </div>

          {/* 1-Click Nearest Bus Quick Locator */}
          <button
            onClick={handleSelectClosestBus}
            className="w-full btn-3d bg-gradient-to-r from-cyan-900/60 via-blue-900/40 to-[#161C2C] hover:from-cyan-800/80 hover:to-[#1E2638] border border-cyan-500/40 text-cyan-300 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
          >
            <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Find Closest Bus to My Location</span>
          </button>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="map-search-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bus registration, route, or stop..."
              className="w-full bg-[#161C2C] border border-[#26334A] focus:border-cyan-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Route filter & Status filter */}
          <div className="space-y-2">
            <select
              id="map-route-filter"
              value={selectedRouteId}
              onChange={(e) => {
                setSelectedRouteId(e.target.value);
                if (e.target.value !== 'all') {
                  setSearchParams({ route: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="w-full bg-[#161C2C] border border-[#26334A] text-xs text-slate-200 rounded-xl p-2 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Express Corridors ({routes.length})</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  Route {r.route_number}: {r.origin} → {r.destination}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {(['ALL', 'LIVE', 'STALE', 'OFFLINE'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                      : 'bg-[#161C2C] text-slate-400 hover:text-white border border-[#222E42]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Buses List Section */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
              <div>Connecting to live satellite fleet...</div>
            </div>
          ) : filteredBuses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-3 bg-[#10141F] rounded-2xl border border-[#1E2638] m-2">
              <div className="w-10 h-10 rounded-full bg-[#161C2C] text-cyan-400 flex items-center justify-center mx-auto border border-[#26334A]">
                <Bus className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-200">No active buses on this filter</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Live GPS telemetry requires an authenticated driver to start a trip from their cockpit.
              </p>
              <Link
                to="/driver"
                className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-md shadow-cyan-600/20"
              >
                Go to Driver Cockpit to Transmit GPS →
              </Link>
            </div>
          ) : (
            filteredBuses.map(bus => {
              const isSelected = bus.bus_id === selectedBusId;
              const statusBg =
                bus.status === 'LIVE'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : bus.status === 'STALE'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700';

              // Calculate distance to user if userLocation is available
              const distFromUser = userLocation && !isNaN(bus.latitude) && !isNaN(bus.longitude)
                ? getDistKm(userLocation.latitude, userLocation.longitude, bus.latitude, bus.longitude)
                : null;

              return (
                <div
                  key={bus.bus_id}
                  onClick={() => handleSelectBus(bus)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border card-3d ${
                    isSelected
                      ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                      : 'border-[#1E2638] hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-xs text-white bg-[#161C2C] px-2 py-0.5 rounded-lg border border-[#26334A]">
                        {bus.registration_number}
                      </span>
                      <span className="text-[11px] font-bold text-cyan-400">Route {bus.route_number}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusBg}`}>
                      {bus.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-medium truncate mb-2">
                    {bus.route_name}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0A0D14] p-2 rounded-xl border border-[#1E2638]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-semibold text-white font-mono">{bus.speed} km/h</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 justify-end">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-emerald-400 font-mono">ETA: {bus.eta_minutes || 0}m</span>
                    </div>
                  </div>

                  {distFromUser !== null && (
                    <div className="mt-2 text-[10px] font-mono text-cyan-400 flex items-center justify-between pt-1 border-t border-[#1E2638]">
                      <span>Distance from you:</span>
                      <strong className="text-white">
                        {distFromUser < 1 ? `${Math.round(distFromUser * 1000)} m` : `${distFromUser.toFixed(1)} km`}
                      </strong>
                    </div>
                  )}

                  {bus.next_stop && (
                    <div className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>Next: <strong className="text-slate-200">{bus.next_stop}</strong></span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer timestamp */}
        <div className="p-3 bg-[#0A0D14] border-t border-[#1E2638] text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>Synced: {lastRefreshed.toLocaleTimeString()}</span>
          <span>Karnataka KSRTC SmartTrack</span>
        </div>
      </aside>

      {/* Main 3D Map View & Selected Bus Floating Drawer */}
      <main className={`flex-1 relative h-full min-h-0 ${mobileView === 'map' ? 'flex flex-col' : 'hidden md:flex flex-col'}`}>
        <LiveMap
          buses={filteredBuses}
          selectedBusId={selectedBusId}
          onSelectBus={handleSelectBus}
          stops={stops}
          routeGeometry={activeRouteGeometry}
          userLocation={userLocation}
          onUserLocationDetected={(coords) => setUserLocation({ latitude: coords.latitude, longitude: coords.longitude })}
          className="w-full h-full"
        />

        {/* Floating 3D Telemetry Drawer for Selected Bus */}
        {selectedBus && (
          <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:w-96 bg-[#0E121B]/95 backdrop-blur-md border border-[#1E2638] text-white rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-30 space-y-3 animate-in fade-in slide-in-from-bottom-4 border-t-2 border-t-cyan-400">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-sm text-white bg-[#161C2C] px-2 py-0.5 rounded-lg border border-[#26334A]">
                    {selectedBus.registration_number}
                  </span>
                  <span className="text-xs font-bold text-cyan-400">Route {selectedBus.route_number}</span>
                </div>
                <div className="text-xs text-slate-300 mt-1 font-medium">{selectedBus.model}</div>
              </div>
              <button
                onClick={() => setSelectedBusId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#161C2C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center bg-[#0A0D14] p-2.5 rounded-xl border border-[#1E2638]">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Live Speed</div>
                <div className="text-sm font-bold font-mono text-cyan-300">{selectedBus.speed} km/h</div>
              </div>
              <div className="border-x border-[#1E2638]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Next Stop ETA</div>
                <div className="text-sm font-bold font-mono text-emerald-400">{selectedBus.eta_minutes || 0} min</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Freshness</div>
                <div className="text-xs font-bold font-mono text-emerald-300">{selectedBus.seconds_ago}s ago</div>
              </div>
            </div>

            {/* Next Stop Callout */}
            <div className="text-xs text-slate-300 bg-[#161C2C] p-2.5 rounded-xl border border-[#26334A] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Approaching Next Stop:</div>
                <div className="font-bold text-white text-xs">{selectedBus.next_stop || selectedBus.destination}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Distance</div>
                <div className="font-mono font-semibold text-xs text-slate-200">{selectedBus.distance_to_next_km || 0} km</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Link
                to={`/buses/${selectedBus.bus_id}`}
                className="flex-1 btn-3d-cyan text-xs py-2.5 px-3 rounded-xl text-center shadow transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Full Telemetry & Stops</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => handlePlayVoiceAnnouncement(selectedBus)}
                className={`p-2.5 rounded-xl border border-[#26334A] transition-all cursor-pointer ${
                  isSpeaking
                    ? 'bg-purple-600 text-white animate-pulse shadow-lg shadow-purple-600/40'
                    : 'bg-[#161C2C] hover:bg-[#1E2638] text-purple-400 hover:text-purple-300'
                }`}
                title="Hear Next Stop Voice Announcement (Kannada/English)"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsCopilotOpen(true)}
                className="p-2.5 bg-[#161C2C] hover:bg-[#1E2638] text-cyan-300 rounded-xl border border-cyan-500/30 transition-colors shadow cursor-pointer"
                title="Ask AI Transit Copilot about this Bus"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </button>
              <button
                onClick={() => handleSaveFavorite(selectedBus.route_id)}
                className="p-2.5 bg-[#161C2C] hover:bg-[#1E2638] text-rose-400 rounded-xl border border-[#26334A] transition-colors cursor-pointer"
                title="Save Route to Favorites"
              >
                <Heart className="w-4 h-4" />
              </button>
              <Link
                to={`/reports?bus=${selectedBus.bus_id}`}
                className="p-2.5 bg-[#161C2C] hover:bg-[#1E2638] text-amber-400 rounded-xl border border-[#26334A] transition-colors"
                title="Report Issue with this Bus"
              >
                <ShieldAlert className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <TransitCopilotModal
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
        />
      </main>
    </div>
  );
};
