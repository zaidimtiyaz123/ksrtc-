import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Bus, Route, Driver, BusLocation, BusLiveStatus, Trip } from '../types';
import {
  Bus as BusIcon,
  MapPin,
  Clock,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  User,
  Radio,
  ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const BusDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{
    bus: Bus;
    activeTrip?: Trip;
    route?: Route;
    driver?: Driver;
    latestLocation?: BusLocation;
    liveStatus: BusLiveStatus;
    secondsAgo: number;
    locationTrail: BusLocation[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report Issue Modal
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportType, setReportType] = useState('wrong_eta');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getBusDetails(id)
      .then(res => {
        setData(res);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load bus details');
        setIsLoading(false);
      });
  }, [id]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.bus || !reportDesc) return;
    setReportError(null);
    try {
      await api.submitReport({
        bus_id: data.bus.id,
        trip_id: data.activeTrip?.id,
        report_type: reportType,
        description: reportDesc
      });
      setReportSuccess(true);
      setTimeout(() => {
        setIsReportOpen(false);
        setReportSuccess(false);
        setReportDesc('');
      }, 2000);
    } catch (e: any) {
      setReportError(e.message || 'Failed to submit report. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400 bg-[#0F1115]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-400">Loading Telemetry for Bus #{id}...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#0F1115]">
        <div className="max-w-md mx-auto p-8 text-center space-y-4 bg-[#15181E] rounded-2xl border border-[#222732]">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Bus Record Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'Unable to locate bus information.'}</p>
          <Link to="/track" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors">
            Return to Live Fleet Map
          </Link>
        </div>
      </div>
    );
  }

  const { bus, activeTrip, route, driver, latestLocation, liveStatus, secondsAgo, locationTrail } = data;

  const chartData = locationTrail.map((loc, i) => ({
    time: new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    speed: loc.speed
  }));

  const statusBadge =
    liveStatus === 'LIVE'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : liveStatus === 'STALE'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E0E0E0] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back button & Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/track"
              className="p-2 rounded-xl bg-[#15181E] border border-[#222732] hover:bg-[#1B1E26] text-slate-300 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold font-mono text-white">{bus.registration_number}</h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase ${statusBadge}`}>
                  {liveStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{bus.model} • Fleet #{bus.fleet_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTrip && (
              <Link
                to={`/track?bus=${bus.id}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/25 transition-colors"
              >
                <Radio className="w-4 h-4 text-white animate-pulse" />
                <span>Track On Live Map</span>
              </Link>
            )}

            <button
              onClick={() => setIsReportOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Report Grievance</span>
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#15181E] p-4 rounded-2xl border border-[#222732] shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold mb-1">
              <Gauge className="w-4 h-4 text-blue-400" />
              <span>Live Speed</span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-white">
              {latestLocation ? `${latestLocation.speed} km/h` : '0 km/h'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.round(secondsAgo / 60)}m ago`}
            </div>
          </div>

          <div className="bg-[#15181E] p-4 rounded-2xl border border-[#222732] shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold mb-1">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Next Stop ETA</span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400">
              {latestLocation?.eta_minutes ? `${latestLocation.eta_minutes} min` : 'Scheduled'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {latestLocation?.next_stop_name || 'Approaching destination'}
            </div>
          </div>

          <div className="bg-[#15181E] p-4 rounded-2xl border border-[#222732] shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold mb-1">
              <BusIcon className="w-4 h-4 text-blue-500" />
              <span>Assigned Route</span>
            </div>
            <div className="text-lg font-bold text-white truncate">
              {route ? `Route ${route.route_number}` : 'Unassigned'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">{route?.origin} → {route?.destination}</div>
          </div>

          <div className="bg-[#15181E] p-4 rounded-2xl border border-[#222732] shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold mb-1">
              <User className="w-4 h-4 text-amber-400" />
              <span>Driver On Duty</span>
            </div>
            <div className="text-base font-bold text-white truncate">
              {driver?.name || 'Assigned Crew'}
            </div>
            <div className="text-[11px] font-mono text-slate-500">{driver?.driver_code || 'KSRTC-CREW'}</div>
          </div>
        </div>

        {/* Main Details Grid: Stops Checklist + Speed Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Route Stops Sequence Checklist */}
          <div className="lg:col-span-2 bg-[#15181E] rounded-2xl p-6 border border-[#222732] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#222732] pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Trip Stop Sequence & Schedule</h2>
                <p className="text-xs text-slate-400">Live progression along the transit corridor</p>
              </div>
              {route && (
                <span className="text-xs font-bold text-slate-300 bg-[#1B1E26] border border-[#262B37] px-3 py-1 rounded-lg">
                  {route.distance_km} km • {route.estimated_duration_min} min
                </span>
              )}
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#262B37]">
              {route?.stops?.map((rs, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === (route.stops?.length || 1) - 1;
                const isNext = rs.stop?.name === latestLocation?.next_stop_name;

                return (
                  <div key={rs.id} className="relative flex items-start justify-between group">
                    <div className={`absolute -left-6 top-1 w-6 h-6 rounded-full border-2 border-[#15181E] flex items-center justify-center text-[10px] font-bold shadow-sm ${
                      isNext ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' : (isFirst || isLast ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200')
                    }`}>
                      {rs.stop_sequence}
                    </div>

                    <div className="pl-4">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-bold ${isNext ? 'text-emerald-400' : 'text-white'}`}>
                          {rs.stop?.name}
                        </h4>
                        {isNext && (
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                            Next Stop
                          </span>
                        )}
                      </div>
                      {rs.stop?.name_kannada && (
                        <p className="text-xs text-slate-400">{rs.stop.name_kannada}</p>
                      )}
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Stop ID: <Link to={`/stops/${rs.stop?.stop_code}`} className="font-mono text-blue-400 font-semibold hover:underline">#{rs.stop?.stop_code}</Link>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      {rs.scheduled_arrival && (
                        <div className="font-semibold text-slate-300">Arr: {rs.scheduled_arrival}</div>
                      )}
                      {rs.scheduled_departure && (
                        <div className="text-slate-500 text-[11px]">Dep: {rs.scheduled_departure}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Speed Chart & Vehicle Specs */}
          <div className="space-y-6">
            {/* Speed telemetry chart */}
            <div className="bg-[#15181E] rounded-2xl p-6 border border-[#222732] shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-white">Real-Time Speed Profile</h3>
              <div className="h-44 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222732" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1B1E26', borderColor: '#262B37', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="speed" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Speed history will graph as the bus travels along route.
                  </div>
                )}
              </div>
            </div>

            {/* Technical Specs Card */}
            <div className="bg-[#15181E] rounded-2xl p-6 border border-[#222732] shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-white">Vehicle Specifications</h3>
              <div className="divide-y divide-[#222732] text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Fleet Code</span>
                  <span className="font-mono font-bold text-white">{bus.fleet_number}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Seating Capacity</span>
                  <span className="font-bold text-white">{bus.capacity} Seats</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Operational Depot</span>
                  <span className="font-bold text-white">{bus.depot || 'Central Depot'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">GPS Transmitter</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Active Smartphone GPS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grievance Report Modal */}
        {isReportOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#15181E] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#222732] text-white">
              <div className="flex items-center justify-between border-b border-[#222732] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">Report Issue with Bus {bus.registration_number}</h3>
                </div>
                <button onClick={() => setIsReportOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {reportSuccess ? (
                <div className="p-6 text-center space-y-2 text-emerald-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto" />
                  <div className="font-bold text-sm">Report Logged Successfully</div>
                  <p className="text-xs text-slate-400">KSRTC Control Room will review this report.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4">
                  {reportError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                      {reportError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Issue Category</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full bg-[#1B1E26] border border-[#262B37] rounded-xl p-2.5 text-xs text-white font-medium focus:border-blue-500 focus:outline-none"
                    >
                      <option value="wrong_eta">Inaccurate ETA / Delay</option>
                      <option value="bus_not_moving">Bus Stationary / Broken Down</option>
                      <option value="incorrect_location">Incorrect GPS Location</option>
                      <option value="missed_stop">Bus Missed Designated Stop</option>
                      <option value="overcrowding">Overcrowded Vehicle</option>
                      <option value="other">Other Passenger Grievance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description Details</label>
                    <textarea
                      rows={3}
                      required
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      placeholder="Describe what you observed (e.g. Traffic jam near bypass, 15 min delay)..."
                      className="w-full bg-[#1B1E26] border border-[#262B37] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsReportOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1B1E26] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-colors"
                    >
                      Submit Report
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
