import React, { useState } from 'react';
import { Route, Stop, RouteStop } from '../types';
import { api } from '../services/api';
import {
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';

interface RouteStopsManagerModalProps {
  route: Route;
  allStops: Stop[];
  onClose: () => void;
  onUpdate: () => void;
}

export const RouteStopsManagerModal: React.FC<RouteStopsManagerModalProps> = ({
  route,
  allStops,
  onClose,
  onUpdate
}) => {
  const [currentRoute, setCurrentRoute] = useState<Route>(route);
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [scheduledArrival, setScheduledArrival] = useState<string>('08:30');
  const [scheduledDeparture, setScheduledDeparture] = useState<string>('08:35');
  const [distanceKm, setDistanceKm] = useState<number>(15);
  const [isAddingStop, setIsAddingStop] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter out stops that might not already be on this route for quick add
  const assignedStopIds = new Set((currentRoute.stops || []).map(rs => rs.stop_id));
  const availableStops = allStops.filter(s => !assignedStopIds.has(s.id));

  const sortedStops = [...(currentRoute.stops || [])].sort((a, b) => a.stop_sequence - b.stop_sequence);

  // Add Stop to this Route
  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStopId) return;

    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await api.addStopToRoute(currentRoute.id, {
        stop_id: selectedStopId,
        scheduled_arrival: scheduledArrival,
        scheduled_departure: scheduledDeparture,
        distance_from_origin_km: Number(distanceKm),
        stop_sequence: sortedStops.length + 1
      });

      if (res.route) {
        setCurrentRoute(res.route);
      }
      setSelectedStopId('');
      setIsAddingStop(false);
      setFeedback({ type: 'success', message: 'Stop added to route corridor successfully!' });
      onUpdate();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add stop' });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove Stop from this Route
  const handleRemoveStop = async (stopId: string, stopName: string) => {
    if (!confirm(`Remove stop "${stopName}" from Route ${currentRoute.route_number}?`)) return;

    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await api.removeStopFromRoute(currentRoute.id, stopId);
      if (res.route) {
        setCurrentRoute(res.route);
      }
      setFeedback({ type: 'success', message: `Removed stop "${stopName}" from corridor.` });
      onUpdate();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove stop' });
    } finally {
      setIsLoading(false);
    }
  };

  // Move Stop Up in sequence
  const handleMoveStop = async (index: number, direction: 'up' | 'down') => {
    const newStops = [...sortedStops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStops.length) return;

    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;

    const orderedStopIds = newStops.map(s => s.stop_id);

    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await api.reorderRouteStops(currentRoute.id, orderedStopIds);
      if (res.route) {
        setCurrentRoute(res.route);
      }
      onUpdate();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reorder stops' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-[#141720] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-[#262B3A] shadow-2xl text-[#E0E0E0] overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#232836] flex items-center justify-between bg-[#181C26]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-lg">
                Route {currentRoute.route_number}
              </span>
              <h3 className="font-bold text-white text-base sm:text-lg">{currentRoute.route_name}</h3>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{currentRoute.origin}</span>
              <span>⇄</span>
              <span>{currentRoute.destination}</span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">{currentRoute.distance_km} km</span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">{currentRoute.estimated_duration_min} mins</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#232836] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Body: Stops List & Interactive Sequence */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span>Intermediate Stops Sequence ({sortedStops.length} Stops)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Manage every stop on this corridor. Reorder stops up/down or add intermediate waypoints.
              </p>
            </div>

            <button
              onClick={() => setIsAddingStop(!isAddingStop)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingStop ? 'Cancel' : 'Add Stop to Corridor'}</span>
            </button>
          </div>

          {/* Add Stop Form Dropdown */}
          {isAddingStop && (
            <form onSubmit={handleAddStop} className="p-4 rounded-2xl bg-[#1A1F2C] border border-[#2D3446] space-y-3">
              <div className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Add Intermediate Waypoint / Bus Stop</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">Select Bus Stop</label>
                  <select
                    required
                    value={selectedStopId}
                    onChange={e => setSelectedStopId(e.target.value)}
                    className="w-full bg-[#141720] border border-[#2D3446] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Stop from Catalog ({availableStops.length} Available) --</option>
                    {availableStops.map(s => (
                      <option key={s.id} value={s.id}>
                        Stop #{s.stop_code} - {s.name} {s.name_kannada ? `(${s.name_kannada})` : ''} - {s.zone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">Scheduled Arrival Time</label>
                  <input
                    type="time"
                    value={scheduledArrival}
                    onChange={e => setScheduledArrival(e.target.value)}
                    className="w-full bg-[#141720] border border-[#2D3446] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">Scheduled Departure Time</label>
                  <input
                    type="time"
                    value={scheduledDeparture}
                    onChange={e => setScheduledDeparture(e.target.value)}
                    className="w-full bg-[#141720] border border-[#2D3446] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">Distance from Origin (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={distanceKm}
                    onChange={e => setDistanceKm(Number(e.target.value))}
                    className="w-full bg-[#141720] border border-[#2D3446] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingStop(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !selectedStopId}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow disabled:opacity-50"
                >
                  {isLoading ? 'Inserting Stop...' : 'Insert Stop into Sequence'}
                </button>
              </div>
            </form>
          )}

          {/* Stops List */}
          <div className="space-y-2.5">
            {sortedStops.length === 0 ? (
              <div className="p-8 text-center bg-[#181C26] rounded-2xl border border-dashed border-[#2D3446] text-xs text-slate-400">
                No stops configured for this corridor yet. Click "Add Stop to Corridor" above.
              </div>
            ) : (
              sortedStops.map((rs, idx) => {
                const stopObj = rs.stop || allStops.find(s => s.id === rs.stop_id);
                const isFirst = idx === 0;
                const isLast = idx === sortedStops.length - 1;

                return (
                  <div
                    key={rs.id || rs.stop_id}
                    className="p-3.5 rounded-2xl bg-[#181C26] border border-[#262B3A] hover:border-slate-600 transition-all flex items-center justify-between gap-3"
                  >
                    {/* Sequence Badge & Stop Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#222838] border border-[#2D3446] flex items-center justify-center font-mono font-bold text-xs text-blue-400 shrink-0">
                        {rs.stop_sequence || idx + 1}
                      </div>

                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs truncate">
                            {stopObj?.name || 'Bus Stop'}
                          </span>
                          {stopObj?.name_kannada && (
                            <span className="text-[11px] text-slate-400">
                              ({stopObj.name_kannada})
                            </span>
                          )}
                          <span className="text-[10px] font-mono bg-[#222838] text-slate-300 px-1.5 py-0.2 rounded border border-[#2D3446]">
                            Stop #{stopObj?.stop_code || 'N/A'}
                          </span>
                          {isFirst && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                              ORIGIN
                            </span>
                          )}
                          {isLast && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded">
                              TERMINUS
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono text-slate-300">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Arr: {rs.scheduled_arrival || '--:--'}</span>
                            <span className="text-slate-500">|</span>
                            <span>Dep: {rs.scheduled_departure || '--:--'}</span>
                          </span>
                          <span>•</span>
                          <span>{rs.distance_from_origin_km || 0} km from origin</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Move Up, Move Down, Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveStop(idx, 'up')}
                        disabled={isFirst || isLoading}
                        title="Move Stop Up"
                        className="p-1.5 rounded-lg bg-[#222838] border border-[#2D3446] text-slate-300 hover:text-white hover:bg-[#2D3446] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveStop(idx, 'down')}
                        disabled={isLast || isLoading}
                        title="Move Stop Down"
                        className="p-1.5 rounded-lg bg-[#222838] border border-[#2D3446] text-slate-300 hover:text-white hover:bg-[#2D3446] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveStop(rs.stop_id, stopObj?.name || 'Stop')}
                        disabled={isLoading}
                        title="Remove Stop from Corridor"
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#232836] bg-[#181C26] flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Changes to stop sequence update passenger timetables and ETA calculations immediately.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
