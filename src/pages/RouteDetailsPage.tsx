import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Route, LiveBusTelemetry, Stop } from '../types';
import { LiveMap } from '../maps/LiveMap';
import { useLanguage } from '../contexts/LanguageContext';
import { RouteSearchBar, RouteSearchParams } from '../components/RouteSearchBar';
import {
  Bus,
  MapPin,
  Clock,
  ArrowRight,
  Radio,
  Heart,
  ChevronRight,
  Search,
  CheckCircle2,
  Navigation,
  Sparkles,
  Info,
  Compass,
  AlertCircle
} from 'lucide-react';

export const RouteDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const fromQuery = searchParams.get('from');
  const toQuery = searchParams.get('to');
  const routeNumQuery = searchParams.get('route');
  const { t, language, isKannada } = useLanguage();

  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [availableStops, setAvailableStops] = useState<Stop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [previewRouteId, setPreviewRouteId] = useState<string>('');
  const [activeBuses, setActiveBuses] = useState<LiveBusTelemetry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load available stops and initial full routes list once
  useEffect(() => {
    api.getStops().then(res => {
      if (res?.stops) setAvailableStops(res.stops);
    }).catch(console.error);

    api.getRoutes().then(res => {
      if (res?.routes) {
        setAllRoutes(res.routes);
      }
    }).catch(console.error);
  }, []);

  // Handler for search updates from the RouteSearchBar
  const handleSearch = useCallback((params: RouteSearchParams) => {
    if (id) return; // In single route view, don't execute list search

    setIsSearching(true);
    api.searchRoutes(params.from, params.to, params.routeNumber, params.query)
      .then(res => {
        const fetched = res.routes || [];
        setRoutes(fetched);
        if (fetched.length > 0) {
          setPreviewRouteId(prev => (fetched.some(r => r.id === prev) ? prev : fetched[0].id));
        } else {
          setPreviewRouteId('');
        }
        setIsSearching(false);
      })
      .catch(() => {
        setIsSearching(false);
      });
  }, [id]);

  useEffect(() => {
    if (id) {
      // Single route view
      setIsLoading(true);
      api.getRouteDetails(id).then(res => {
        setSelectedRoute(res.route);
        setActiveBuses(res.activeBuses || []);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    } else {
      // Initial load of routes directory
      setIsLoading(true);
      api.searchRoutes(fromQuery || undefined, toQuery || undefined, routeNumQuery || undefined).then(res => {
        const fetchedRoutes = res.routes || [];
        setRoutes(fetchedRoutes);
        if (fetchedRoutes.length > 0) {
          setPreviewRouteId(fetchedRoutes[0].id);
        }
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
  }, [id, fromQuery, toQuery, routeNumQuery]);

  const handleFavoriteRoute = async (routeId: string) => {
    await api.addFavorite(routeId);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Preview route for the directory map
  const activePreviewRoute = routes.find(r => r.id === previewRouteId) || routes[0];
  const previewStops = activePreviewRoute?.stops?.map(rs => rs.stop).filter(Boolean) as Stop[] || [];

  // Count total active live buses across currently filtered routes
  const totalActiveLiveBuses = routes.reduce((acc, r) => acc + ((r as any).active_buses_count || 0), 0);

  // -------------------------------------------------------------
  // 1. Single Route Dedicated Detail & Map Page
  // -------------------------------------------------------------
  if (id && selectedRoute) {
    const stopsList = (selectedRoute.stops || [])
      .map(rs => rs.stop)
      .filter((s): s is Stop => Boolean(s && s.latitude && s.longitude));

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-[#E0E0E0]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm px-3 py-1 rounded-lg bg-blue-600 text-white shadow-sm font-mono tracking-wider">
                {t('routes.stop_number', 'Route')} {selectedRoute.route_number}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {selectedRoute.route_name}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
              <span>{selectedRoute.origin}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedRoute.destination}</span>
              <span className="text-slate-600">•</span>
              <span>{selectedRoute.distance_km} {t('routes.km', 'km')}</span>
              <span className="text-slate-600">•</span>
              <span>~{selectedRoute.estimated_duration_min} {t('routes.minutes', 'minutes')}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="fav-route-btn"
              onClick={() => handleFavoriteRoute(selectedRoute.id)}
              className={`inline-flex items-center gap-1.5 border border-[#262B35] text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition-colors ${
                savedSuccess ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-[#161920] hover:bg-[#1C212B] text-slate-300 hover:text-rose-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${savedSuccess ? 'text-rose-400 fill-rose-400' : 'text-rose-500'}`} />
              <span>{savedSuccess ? t('routes.saved_favorite', 'Saved to Favorites!') : t('routes.save_favorite', 'Save Favorite')}</span>
            </button>
            <Link
              to={`/track?route=${selectedRoute.id}`}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>{t('routes.track_live', 'Track Live Buses')}</span>
            </Link>
          </div>
        </div>

        {/* Active Buses Broadcast Banner */}
        {activeBuses.length > 0 ? (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-300">
                  {activeBuses.length} {t('routes.active_buses_count', 'Bus(es) Currently Live on Route')} {selectedRoute.route_number}
                </h4>
                <p className="text-xs text-emerald-400/80">
                  {t('routes.driver_gps_active', 'Driver GPS actively broadcasting live speed and next stop ETAs')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeBuses.map(b => (
                <Link
                  key={b.bus_id}
                  to={`/buses/${b.bus_id}`}
                  className="bg-[#161920] border border-emerald-500/40 hover:border-emerald-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors group"
                >
                  <Bus className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="font-mono">{b.registration_number}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-normal">{b.speed || 0} km/h</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#161920] border border-[#262B35] rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-3">
            <Bus className="w-5 h-5 text-slate-500 shrink-0" />
            <span>{t('routes.no_active_buses', 'No live buses are currently transmitting GPS on this corridor. Timetable stops are listed below.')}</span>
          </div>
        )}

        {/* Route Map Preview & Stops Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Column (7 cols) */}
          <div className="lg:col-span-7 bg-[#161920] rounded-3xl p-3 sm:p-4 border border-[#262B35] shadow-xl flex flex-col h-[520px]">
            <div className="flex items-center justify-between px-2 pb-2 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-400" />
                <span>Corridor Trajectory Map & Geofenced Stops</span>
              </span>
              <span className="text-[11px] text-slate-500">{stopsList.length} Stops Plotted</span>
            </div>
            <div className="flex-1 w-full h-full rounded-2xl overflow-hidden">
              <LiveMap
                buses={activeBuses}
                stops={stopsList}
                routeGeometry={selectedRoute.route_geometry}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Stops Timeline (5 cols) */}
          <div className="lg:col-span-5 bg-[#161920] rounded-3xl p-5 border border-[#262B35] shadow-xl flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#262B35]">
              <h3 className="font-bold text-white text-sm">
                {t('routes.stop_sequence', 'Route Stop Sequence')} ({selectedRoute.stops?.length || 0} {t('routes.stops_count', 'Stops')})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Origin ➔ Destination</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 mt-3 space-y-2.5">
              {selectedRoute.stops?.map((rs, idx) => {
                const stop = rs.stop;
                const isFirst = idx === 0;
                const isLast = idx === (selectedRoute.stops?.length || 0) - 1;

                const primaryName = (isKannada && stop?.name_kannada) ? stop.name_kannada : (stop?.name || 'Bus Stop');
                const secondaryName = (isKannada && stop?.name_kannada) ? stop.name : (stop?.name_kannada || '');

                return (
                  <div
                    key={rs.id}
                    className="p-3 rounded-2xl border border-[#262B35] hover:border-blue-500/40 hover:bg-[#1C212B] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl font-mono font-bold text-xs flex items-center justify-center border shadow-sm transition-colors ${
                        isFirst ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : (
                          isLast ? 'bg-rose-600/20 text-rose-400 border-rose-500/30' : 'bg-[#1C212B] text-slate-300 border-[#262B35] group-hover:bg-blue-600 group-hover:text-white'
                        )
                      }`}>
                        {rs.stop_sequence}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-200 group-hover:text-white transition-colors leading-tight">
                          {primaryName}
                        </h4>
                        {secondaryName && (
                          <p className="text-[11px] text-slate-400 font-medium">{secondaryName}</p>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
                          {rs.scheduled_departure && <span>Dep: {rs.scheduled_departure}</span>}
                          {rs.distance_from_origin_km !== undefined && <span>• {rs.distance_from_origin_km} km</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <Link
                        to={`/stops/${stop?.stop_code}`}
                        className="text-[11px] font-mono font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg"
                        title="View Shelter Schedule & QR"
                      >
                        #{stop?.stop_code}
                      </Link>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. All Routes Directory + Interactive Corridor Map View
  // -------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-[#E0E0E0]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {t('routes.title', 'KSRTC Express Bus Routes & Timetables')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('routes.subtitle', 'Database of active scheduled corridors with live GPS satellite tracking')}
          </p>
        </div>
      </div>

      {/* Robust Route Search Bar Component */}
      <RouteSearchBar
        onSearch={handleSearch}
        initialParams={{
          from: fromQuery || '',
          to: toQuery || '',
          routeNumber: routeNumQuery || '',
          query: ''
        }}
        totalRoutesCount={allRoutes.length || routes.length}
        filteredRoutesCount={routes.length}
        activeLiveBusesCount={totalActiveLiveBuses}
        availableStops={availableStops}
        isLoading={isSearching}
      />

      {/* Interactive Corridor Map Explorer Banner */}
      {activePreviewRoute && (
        <div className="bg-[#161920] rounded-3xl p-4 sm:p-5 border border-[#262B35] shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#262B35]">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono">
                Corridor {activePreviewRoute.route_number}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {activePreviewRoute.route_name}
              </h3>
              <span className="text-xs text-slate-400 hidden md:inline">
                ({activePreviewRoute.origin} ⇄ {activePreviewRoute.destination})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/routes/${activePreviewRoute.id}`}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow"
              >
                <span>{t('routes.view_schedule', 'View All Stops')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="h-[360px] w-full rounded-2xl overflow-hidden border border-[#222732]">
            <LiveMap
              routeGeometry={activePreviewRoute.route_geometry}
              stops={previewStops}
              buses={(activePreviewRoute as any).active_buses || []}
              className="w-full h-full"
            />
          </div>
          <p className="text-[11px] text-slate-400 italic">
            💡 {t('routes.corridor_hint', 'Click any route card below to switch the corridor map preview, or view individual stop schedules.')}
          </p>
        </div>
      )}

      {/* Empty State when no routes match search filters */}
      {routes.length === 0 && !isLoading && !isSearching && (
        <div className="bg-[#161922] border border-[#262B38] rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Bus Routes Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No active KSRTC corridors matched your search criteria. Try searching by origin city (e.g. Tumkur, Mysuru, Hassan, Hubballi) or corridor number.
          </p>
          <button
            onClick={() => handleSearch({ from: '', to: '', routeNumber: '', query: '' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <span>Show All Network Corridors</span>
          </button>
        </div>
      )}

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {routes.map(route => {
          const isSelected = route.id === previewRouteId;
          const liveBusesCount = (route as any).active_buses_count || 0;

          return (
            <div
              key={route.id}
              onClick={() => setPreviewRouteId(route.id)}
              className={`bg-[#161920] rounded-2xl p-5 border cursor-pointer transition-all space-y-4 shadow-lg ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-[#191D26]'
                  : 'border-[#262B35] hover:border-blue-500/40 hover:bg-[#181B23]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                    Route {route.route_number}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {route.distance_km} km • ~{route.estimated_duration_min} min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {liveBusesCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {liveBusesCount} Live
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavoriteRoute(route.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-[#1C212B] transition-colors"
                    title="Save Favorite"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-white leading-snug">{route.route_name}</h3>
                <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-2 font-medium">
                  <span>{route.origin}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{route.destination}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#262B35] flex items-center justify-between text-xs">
                <Link
                  to={`/routes/${route.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-slate-300 hover:text-blue-400 flex items-center gap-1 transition-colors group"
                >
                  <span>{t('routes.view_schedule', 'View Stops & Schedule')}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to={`/track?route=${route.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('routes.track_live', 'Track Live')}</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
