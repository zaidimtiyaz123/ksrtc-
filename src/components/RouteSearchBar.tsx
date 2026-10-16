import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Flag,
  ArrowLeftRight,
  X,
  Bus,
  RotateCcw,
  Radio,
  ChevronDown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Stop } from '../types';

export interface RouteSearchParams {
  from: string;
  to: string;
  routeNumber: string;
  query: string;
}

interface RouteSearchBarProps {
  onSearch: (params: RouteSearchParams) => void;
  initialParams?: Partial<RouteSearchParams>;
  totalRoutesCount: number;
  filteredRoutesCount: number;
  activeLiveBusesCount: number;
  availableStops?: Stop[];
  isLoading?: boolean;
}

export const RouteSearchBar: React.FC<RouteSearchBarProps> = ({
  onSearch,
  initialParams,
  totalRoutesCount,
  filteredRoutesCount,
  activeLiveBusesCount,
  availableStops = [],
  isLoading = false
}) => {
  const { t } = useLanguage();

  const [from, setFrom] = useState(initialParams?.from || '');
  const [to, setTo] = useState(initialParams?.to || '');
  const [routeNumber, setRouteNumber] = useState(initialParams?.routeNumber || '');
  const [query, setQuery] = useState(initialParams?.query || '');

  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) {
        setShowFromSuggestions(false);
      }
      if (toRef.current && !toRef.current.contains(e.target as Node)) {
        setShowToSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced trigger for search callback
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch({
        from: from.trim(),
        to: to.trim(),
        routeNumber: routeNumber.trim(),
        query: query.trim()
      });
    }, 280);

    return () => clearTimeout(handler);
  }, [from, to, routeNumber, query, onSearch]);

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleClearAll = () => {
    setFrom('');
    setTo('');
    setRouteNumber('');
    setQuery('');
  };

  const hasActiveFilters = Boolean(from || to || routeNumber || query);

  // Autocomplete matching against stops list
  const getSuggestions = (input: string) => {
    if (!input || input.trim().length < 1) {
      return availableStops.slice(0, 6);
    }
    const clean = input.toLowerCase().trim();
    return availableStops
      .filter(s =>
        s.name.toLowerCase().includes(clean) ||
        (s.name_kannada && s.name_kannada.toLowerCase().includes(clean)) ||
        (s.zone && s.zone.toLowerCase().includes(clean)) ||
        s.stop_code.toLowerCase().includes(clean)
      )
      .slice(0, 6);
  };

  const fromSuggestions = getSuggestions(from);
  const toSuggestions = getSuggestions(to);

  // Popular high-frequency Karnataka express corridors
  const popularCorridors = [
    { label: 'All Corridors', value: '' },
    { label: 'Route 152 (Tumkur)', value: '152' },
    { label: 'Route 302 (Mysuru)', value: '302' },
    { label: 'Route 201 (Hassan)', value: '201' },
    { label: 'Route 501 (Hubballi)', value: '501' },
    { label: 'Route 108 (Shivamogga)', value: '108' },
    { label: 'Route 405 (Mangaluru)', value: '405' },
    { label: 'Route 601 (Belagavi)', value: '601' }
  ];

  return (
    <div
      id="route-search-bar-container"
      className="bg-[#161922] border border-[#272C39] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
    >
      {/* Top Title & Live Status Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#232836] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {t('routes.search_bar_title', 'Find Bus Routes & Corridors')}
            </h2>
            <p className="text-[11px] text-slate-400">
              {t('routes.search_bar_subtitle', 'Instant real-time search by origin, destination, or route number')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeLiveBusesCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{activeLiveBusesCount} {t('routes.active_live_buses', 'Buses on Live GPS')}</span>
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-300 bg-[#1E2330] hover:bg-[#282F40] border border-[#30374A] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>{t('routes.clear_search', 'Reset')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Multi-Field Search Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        {/* 1. Source (From) */}
        <div ref={fromRef} className="relative md:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">
            {t('routes.from_label', 'Source / Origin Stop')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 flex items-center justify-center pointer-events-none">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              id="route-search-from"
              type="text"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setShowFromSuggestions(true);
              }}
              onFocus={() => setShowFromSuggestions(true)}
              placeholder={t('routes.from_placeholder', 'E.g., Tumkur, Majestic, Mysuru...')}
              className="w-full bg-[#0F1218] border border-[#2B3142] rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 shadow-inner"
            />
            {from && (
              <button
                type="button"
                onClick={() => setFrom('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* From Autocomplete Dropdown */}
          {showFromSuggestions && fromSuggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-[#1A1E29] border border-[#2E3547] rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
              <div className="px-3 py-1.5 bg-[#141720] border-b border-[#262C3C] text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Suggested Stops</span>
                <span className="text-slate-500">Pick to autofill</span>
              </div>
              {fromSuggestions.map(stop => (
                <button
                  key={`from-${stop.id}`}
                  type="button"
                  onClick={() => {
                    setFrom(stop.name);
                    setShowFromSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-600/20 hover:text-white text-slate-300 border-b border-[#232938] last:border-0 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="truncate">
                    <span className="font-semibold block">{stop.name}</span>
                    {stop.name_kannada && (
                      <span className="text-[10px] text-slate-400 block">{stop.name_kannada}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#10131B] text-slate-400 ml-2">
                    {stop.zone || `#${stop.stop_code}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button (between From and To) */}
        <div className="flex md:col-span-1 justify-center items-end pb-1 md:pb-0">
          <button
            type="button"
            onClick={handleSwap}
            title={t('routes.swap_direction', 'Swap Origin and Destination')}
            className="w-9 h-9 rounded-xl bg-[#1E2330] hover:bg-blue-600 border border-[#2E3547] hover:border-blue-500 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md cursor-pointer mt-0 md:mt-5"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Destination (To) */}
        <div ref={toRef} className="relative md:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">
            {t('routes.to_label', 'Destination / Arrival Stop')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 flex items-center justify-center pointer-events-none">
              <Flag className="w-4 h-4" />
            </div>
            <input
              id="route-search-to"
              type="text"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setShowToSuggestions(true);
              }}
              onFocus={() => setShowToSuggestions(true)}
              placeholder={t('routes.to_placeholder', 'E.g., Majestic, Yeshwanthpur, Hassan...')}
              className="w-full bg-[#0F1218] border border-[#2B3142] rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 shadow-inner"
            />
            {to && (
              <button
                type="button"
                onClick={() => setTo('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* To Autocomplete Dropdown */}
          {showToSuggestions && toSuggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-[#1A1E29] border border-[#2E3547] rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
              <div className="px-3 py-1.5 bg-[#141720] border-b border-[#262C3C] text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Suggested Stops</span>
                <span className="text-slate-500">Pick to autofill</span>
              </div>
              {toSuggestions.map(stop => (
                <button
                  key={`to-${stop.id}`}
                  type="button"
                  onClick={() => {
                    setTo(stop.name);
                    setShowToSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-600/20 hover:text-white text-slate-300 border-b border-[#232938] last:border-0 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="truncate">
                    <span className="font-semibold block">{stop.name}</span>
                    {stop.name_kannada && (
                      <span className="text-[10px] text-slate-400 block">{stop.name_kannada}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#10131B] text-slate-400 ml-2">
                    {stop.zone || `#${stop.stop_code}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Route Number / Keyword */}
        <div className="relative md:col-span-3">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">
            {t('routes.route_no_label', 'Route No. / Keyword')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 flex items-center justify-center pointer-events-none">
              <Bus className="w-4 h-4" />
            </div>
            <input
              id="route-search-number"
              type="text"
              value={routeNumber}
              onChange={(e) => setRouteNumber(e.target.value)}
              placeholder={t('routes.route_no_placeholder', 'E.g., 152, 302, Airavat...')}
              className="w-full bg-[#0F1218] border border-[#2B3142] rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 shadow-inner font-mono"
            />
            {routeNumber && (
              <button
                type="button"
                onClick={() => setRouteNumber('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Corridor Selection Chips */}
      <div className="pt-2 border-t border-[#232836]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {t('routes.popular_corridors', 'Quick Corridor Select:')}
          </span>
          <span className="text-[11px] text-slate-400">
            {isLoading ? (
              <span className="text-blue-400 animate-pulse font-medium">Searching live network...</span>
            ) : (
              <span>Showing <strong>{filteredRoutesCount}</strong> of {totalRoutesCount} routes</span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {popularCorridors.map((item) => {
            const isSelected = routeNumber.toLowerCase() === item.value.toLowerCase() && !from && !to;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setRouteNumber(item.value);
                  if (item.value === '') {
                    setFrom('');
                    setTo('');
                    setQuery('');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                    : 'bg-[#151821] hover:bg-[#1E2330] text-slate-300 border-[#2B3142] hover:border-slate-500'
                }`}
              >
                {item.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
