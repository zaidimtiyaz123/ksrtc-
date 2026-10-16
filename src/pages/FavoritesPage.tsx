import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Route, Stop } from '../types';
import { Heart, Trash2, Bus, MapPin, Radio, ArrowRight } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<{ routes: Route[]; stops: Stop[] }>({ routes: [], stops: [] });
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      const data = await api.getFavorites();
      setFavorites(data);
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (favId: string) => {
    await api.removeFavorite(favId);
    loadFavorites();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#E0E0E0]">
      <div className="border-b border-[#262B35] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Your Saved Routes & Bus Stops</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">Quick-access bookmarks for your daily commute and transit hubs</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading saved bookmarks...</div>
      ) : favorites.routes.length === 0 && favorites.stops.length === 0 ? (
        <div className="bg-[#161920] rounded-3xl p-12 text-center border border-[#262B35] space-y-3">
          <Heart className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="font-bold text-slate-200 text-sm">No Saved Favorites Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click the heart icon on any route or bus stop page to save it here for instant one-click live tracking.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/routes" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow">Browse Routes</Link>
            <Link to="/stops" className="bg-[#1C212B] hover:bg-[#232936] text-slate-200 border border-[#262B35] font-bold text-xs px-4 py-2 rounded-xl transition-colors">Browse Stops</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Saved Routes */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bus className="w-4 h-4 text-blue-400" />
              <span>Saved Corridors ({favorites.routes.length})</span>
            </h2>

            <div className="space-y-3">
              {favorites.routes.map(r => (
                <div
                  key={r.id}
                  className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] hover:border-blue-500/40 shadow-sm transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                      Route {r.route_number}
                    </span>
                    <h4 className="font-bold text-xs text-white mt-1">{r.route_name}</h4>
                    <div className="text-[11px] text-slate-400">{r.origin} ⇄ {r.destination}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/track?route=${r.id}`}
                      className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold transition-colors border border-blue-500/20"
                      title="Track Live on Map"
                    >
                      <Radio className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleRemove(r.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Stops */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Saved Bus Stops ({favorites.stops.length})</span>
            </h2>

            <div className="space-y-3">
              {favorites.stops.map(s => (
                <div
                  key={s.id}
                  className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] hover:border-blue-500/40 shadow-sm transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                      Stop ID #{s.stop_code}
                    </span>
                    <h4 className="font-bold text-xs text-white mt-1">{s.name}</h4>
                    {s.name_kannada && <div className="text-[11px] text-slate-400">{s.name_kannada}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/stops/${s.stop_code}`}
                      className="p-2 bg-[#1C212B] hover:bg-[#232936] text-blue-400 rounded-xl text-xs font-bold transition-colors border border-[#262B35]"
                      title="View Live Schedule"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleRemove(s.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
