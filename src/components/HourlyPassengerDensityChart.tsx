import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Filter,
  BarChart3,
  Flame,
  CheckCircle2,
  Bus,
  Sparkles
} from 'lucide-react';

interface HourlyDataPoint {
  hour: string;
  displayTime: string;
  passengers: number;
  occupancyRate: number; // percentage 0 - 100
  busesOperating: number;
  standeeLoad: number; // extra standing passengers
  isPeak: boolean;
}

// Realistic passenger density dataset across KSRTC major corridors
const corridorDatasets: Record<string, { name: string; routeNumber: string; data: HourlyDataPoint[] }> = {
  all: {
    name: 'All Corridors (System-Wide)',
    routeNumber: 'ALL-FLEET',
    data: [
      { hour: '05:00', displayTime: '5 AM', passengers: 320, occupancyRate: 38, busesOperating: 14, standeeLoad: 0, isPeak: false },
      { hour: '06:00', displayTime: '6 AM', passengers: 680, occupancyRate: 58, busesOperating: 22, standeeLoad: 4, isPeak: false },
      { hour: '07:00', displayTime: '7 AM', passengers: 1140, occupancyRate: 78, busesOperating: 30, standeeLoad: 12, isPeak: false },
      { hour: '08:00', displayTime: '8 AM', passengers: 1680, occupancyRate: 92, busesOperating: 38, standeeLoad: 28, isPeak: true },
      { hour: '09:00', displayTime: '9 AM', passengers: 1940, occupancyRate: 97, busesOperating: 42, standeeLoad: 35, isPeak: true },
      { hour: '10:00', displayTime: '10 AM', passengers: 1520, occupancyRate: 86, busesOperating: 36, standeeLoad: 18, isPeak: true },
      { hour: '11:00', displayTime: '11 AM', passengers: 980, occupancyRate: 64, busesOperating: 28, standeeLoad: 0, isPeak: false },
      { hour: '12:00', displayTime: '12 PM', passengers: 850, occupancyRate: 59, busesOperating: 26, standeeLoad: 0, isPeak: false },
      { hour: '13:00', displayTime: '1 PM', passengers: 910, occupancyRate: 62, busesOperating: 27, standeeLoad: 0, isPeak: false },
      { hour: '14:00', displayTime: '2 PM', passengers: 890, occupancyRate: 60, busesOperating: 26, standeeLoad: 0, isPeak: false },
      { hour: '15:00', displayTime: '3 PM', passengers: 1080, occupancyRate: 71, busesOperating: 30, standeeLoad: 6, isPeak: false },
      { hour: '16:00', displayTime: '4 PM', passengers: 1350, occupancyRate: 82, busesOperating: 34, standeeLoad: 16, isPeak: false },
      { hour: '17:00', displayTime: '5 PM', passengers: 1780, occupancyRate: 94, busesOperating: 40, standeeLoad: 32, isPeak: true },
      { hour: '18:00', displayTime: '6 PM', passengers: 2150, occupancyRate: 98, busesOperating: 45, standeeLoad: 42, isPeak: true },
      { hour: '19:00', displayTime: '7 PM', passengers: 1890, occupancyRate: 93, busesOperating: 42, standeeLoad: 30, isPeak: true },
      { hour: '20:00', displayTime: '8 PM', passengers: 1420, occupancyRate: 81, busesOperating: 34, standeeLoad: 14, isPeak: false },
      { hour: '21:00', displayTime: '9 PM', passengers: 1020, occupancyRate: 68, busesOperating: 28, standeeLoad: 0, isPeak: false },
      { hour: '22:00', displayTime: '10 PM', passengers: 650, occupancyRate: 51, busesOperating: 20, standeeLoad: 0, isPeak: false },
      { hour: '23:00', displayTime: '11 PM', passengers: 380, occupancyRate: 39, busesOperating: 12, standeeLoad: 0, isPeak: false }
    ]
  },
  'route-152': {
    name: 'Route 152: Tumkur ⇄ Bengaluru Express',
    routeNumber: '152',
    data: [
      { hour: '05:00', displayTime: '5 AM', passengers: 90, occupancyRate: 42, busesOperating: 3, standeeLoad: 0, isPeak: false },
      { hour: '06:00', displayTime: '6 AM', passengers: 180, occupancyRate: 65, busesOperating: 5, standeeLoad: 2, isPeak: false },
      { hour: '07:00', displayTime: '7 AM', passengers: 320, occupancyRate: 85, busesOperating: 7, standeeLoad: 10, isPeak: false },
      { hour: '08:00', displayTime: '8 AM', passengers: 490, occupancyRate: 96, busesOperating: 9, standeeLoad: 20, isPeak: true },
      { hour: '09:00', displayTime: '9 AM', passengers: 540, occupancyRate: 99, busesOperating: 10, standeeLoad: 24, isPeak: true },
      { hour: '10:00', displayTime: '10 AM', passengers: 380, occupancyRate: 84, busesOperating: 8, standeeLoad: 8, isPeak: true },
      { hour: '11:00', displayTime: '11 AM', passengers: 240, occupancyRate: 60, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '12:00', displayTime: '12 PM', passengers: 210, occupancyRate: 55, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '13:00', displayTime: '1 PM', passengers: 230, occupancyRate: 58, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '14:00', displayTime: '2 PM', passengers: 220, occupancyRate: 56, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '15:00', displayTime: '3 PM', passengers: 270, occupancyRate: 68, busesOperating: 7, standeeLoad: 4, isPeak: false },
      { hour: '16:00', displayTime: '4 PM', passengers: 360, occupancyRate: 80, busesOperating: 8, standeeLoad: 12, isPeak: false },
      { hour: '17:00', displayTime: '5 PM', passengers: 480, occupancyRate: 94, busesOperating: 9, standeeLoad: 22, isPeak: true },
      { hour: '18:00', displayTime: '6 PM', passengers: 560, occupancyRate: 99, busesOperating: 10, standeeLoad: 28, isPeak: true },
      { hour: '19:00', displayTime: '7 PM', passengers: 490, occupancyRate: 92, busesOperating: 9, standeeLoad: 18, isPeak: true },
      { hour: '20:00', displayTime: '8 PM', passengers: 350, occupancyRate: 79, busesOperating: 8, standeeLoad: 6, isPeak: false },
      { hour: '21:00', displayTime: '9 PM', passengers: 240, occupancyRate: 64, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '22:00', displayTime: '10 PM', passengers: 150, occupancyRate: 48, busesOperating: 4, standeeLoad: 0, isPeak: false },
      { hour: '23:00', displayTime: '11 PM', passengers: 85, occupancyRate: 35, busesOperating: 3, standeeLoad: 0, isPeak: false }
    ]
  },
  'route-302': {
    name: 'Route 302: Mysuru ⇄ Bengaluru Expressway',
    routeNumber: '302',
    data: [
      { hour: '05:00', displayTime: '5 AM', passengers: 110, occupancyRate: 45, busesOperating: 4, standeeLoad: 0, isPeak: false },
      { hour: '06:00', displayTime: '6 AM', passengers: 240, occupancyRate: 68, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '07:00', displayTime: '7 AM', passengers: 410, occupancyRate: 82, busesOperating: 8, standeeLoad: 6, isPeak: false },
      { hour: '08:00', displayTime: '8 AM', passengers: 580, occupancyRate: 94, busesOperating: 11, standeeLoad: 18, isPeak: true },
      { hour: '09:00', displayTime: '9 AM', passengers: 670, occupancyRate: 98, busesOperating: 12, standeeLoad: 25, isPeak: true },
      { hour: '10:00', displayTime: '10 AM', passengers: 510, occupancyRate: 88, busesOperating: 10, standeeLoad: 12, isPeak: true },
      { hour: '11:00', displayTime: '11 AM', passengers: 340, occupancyRate: 68, busesOperating: 8, standeeLoad: 0, isPeak: false },
      { hour: '12:00', displayTime: '12 PM', passengers: 310, occupancyRate: 64, busesOperating: 8, standeeLoad: 0, isPeak: false },
      { hour: '13:00', displayTime: '1 PM', passengers: 330, occupancyRate: 66, busesOperating: 8, standeeLoad: 0, isPeak: false },
      { hour: '14:00', displayTime: '2 PM', passengers: 320, occupancyRate: 65, busesOperating: 8, standeeLoad: 0, isPeak: false },
      { hour: '15:00', displayTime: '3 PM', passengers: 390, occupancyRate: 75, busesOperating: 9, standeeLoad: 5, isPeak: false },
      { hour: '16:00', displayTime: '4 PM', passengers: 490, occupancyRate: 86, busesOperating: 10, standeeLoad: 14, isPeak: false },
      { hour: '17:00', displayTime: '5 PM', passengers: 640, occupancyRate: 96, busesOperating: 12, standeeLoad: 24, isPeak: true },
      { hour: '18:00', displayTime: '6 PM', passengers: 750, occupancyRate: 100, busesOperating: 13, standeeLoad: 32, isPeak: true },
      { hour: '19:00', displayTime: '7 PM', passengers: 660, occupancyRate: 95, busesOperating: 12, standeeLoad: 22, isPeak: true },
      { hour: '20:00', displayTime: '8 PM', passengers: 480, occupancyRate: 84, busesOperating: 10, standeeLoad: 8, isPeak: false },
      { hour: '21:00', displayTime: '9 PM', passengers: 360, occupancyRate: 72, busesOperating: 8, standeeLoad: 0, isPeak: false },
      { hour: '22:00', displayTime: '10 PM', passengers: 220, occupancyRate: 56, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '23:00', displayTime: '11 PM', passengers: 130, occupancyRate: 42, busesOperating: 4, standeeLoad: 0, isPeak: false }
    ]
  },
  'route-201': {
    name: 'Route 201: Hassan ⇄ Bengaluru Highway',
    routeNumber: '201',
    data: [
      { hour: '05:00', displayTime: '5 AM', passengers: 60, occupancyRate: 35, busesOperating: 3, standeeLoad: 0, isPeak: false },
      { hour: '06:00', displayTime: '6 AM', passengers: 140, occupancyRate: 52, busesOperating: 4, standeeLoad: 0, isPeak: false },
      { hour: '07:00', displayTime: '7 AM', passengers: 230, occupancyRate: 72, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '08:00', displayTime: '8 AM', passengers: 320, occupancyRate: 88, busesOperating: 7, standeeLoad: 8, isPeak: true },
      { hour: '09:00', displayTime: '9 AM', passengers: 380, occupancyRate: 93, busesOperating: 8, standeeLoad: 14, isPeak: true },
      { hour: '10:00', displayTime: '10 AM', passengers: 310, occupancyRate: 82, busesOperating: 7, standeeLoad: 4, isPeak: true },
      { hour: '11:00', displayTime: '11 AM', passengers: 210, occupancyRate: 62, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '12:00', displayTime: '12 PM', passengers: 180, occupancyRate: 56, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '13:00', displayTime: '1 PM', passengers: 190, occupancyRate: 58, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '14:00', displayTime: '2 PM', passengers: 190, occupancyRate: 58, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '15:00', displayTime: '3 PM', passengers: 230, occupancyRate: 67, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '16:00', displayTime: '4 PM', passengers: 280, occupancyRate: 78, busesOperating: 7, standeeLoad: 4, isPeak: false },
      { hour: '17:00', displayTime: '5 PM', passengers: 360, occupancyRate: 90, busesOperating: 8, standeeLoad: 10, isPeak: true },
      { hour: '18:00', displayTime: '6 PM', passengers: 420, occupancyRate: 96, busesOperating: 9, standeeLoad: 16, isPeak: true },
      { hour: '19:00', displayTime: '7 PM', passengers: 380, occupancyRate: 91, busesOperating: 8, standeeLoad: 12, isPeak: true },
      { hour: '20:00', displayTime: '8 PM', passengers: 290, occupancyRate: 77, busesOperating: 7, standeeLoad: 2, isPeak: false },
      { hour: '21:00', displayTime: '9 PM', passengers: 210, occupancyRate: 64, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '22:00', displayTime: '10 PM', passengers: 130, occupancyRate: 46, busesOperating: 4, standeeLoad: 0, isPeak: false },
      { hour: '23:00', displayTime: '11 PM', passengers: 70, occupancyRate: 32, busesOperating: 3, standeeLoad: 0, isPeak: false }
    ]
  },
  'route-501': {
    name: 'Route 501: Hubballi ⇄ Bengaluru Executive',
    routeNumber: '501',
    data: [
      { hour: '05:00', displayTime: '5 AM', passengers: 60, occupancyRate: 32, busesOperating: 4, standeeLoad: 0, isPeak: false },
      { hour: '06:00', displayTime: '6 AM', passengers: 120, occupancyRate: 48, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '07:00', displayTime: '7 AM', passengers: 180, occupancyRate: 66, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '08:00', displayTime: '8 AM', passengers: 290, occupancyRate: 86, busesOperating: 8, standeeLoad: 6, isPeak: true },
      { hour: '09:00', displayTime: '9 AM', passengers: 350, occupancyRate: 92, busesOperating: 9, standeeLoad: 10, isPeak: true },
      { hour: '10:00', displayTime: '10 AM', passengers: 320, occupancyRate: 85, busesOperating: 8, standeeLoad: 4, isPeak: true },
      { hour: '11:00', displayTime: '11 AM', passengers: 190, occupancyRate: 62, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '12:00', displayTime: '12 PM', passengers: 150, occupancyRate: 52, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '13:00', displayTime: '1 PM', passengers: 160, occupancyRate: 54, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '14:00', displayTime: '2 PM', passengers: 160, occupancyRate: 54, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '15:00', displayTime: '3 PM', passengers: 190, occupancyRate: 63, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '16:00', displayTime: '4 PM', passengers: 220, occupancyRate: 74, busesOperating: 7, standeeLoad: 0, isPeak: false },
      { hour: '17:00', displayTime: '5 PM', passengers: 300, occupancyRate: 89, busesOperating: 8, standeeLoad: 8, isPeak: true },
      { hour: '18:00', displayTime: '6 PM', passengers: 420, occupancyRate: 97, busesOperating: 10, standeeLoad: 18, isPeak: true },
      { hour: '19:00', displayTime: '7 PM', passengers: 360, occupancyRate: 91, busesOperating: 9, standeeLoad: 12, isPeak: true },
      { hour: '20:00', displayTime: '8 PM', passengers: 300, occupancyRate: 80, busesOperating: 7, standeeLoad: 4, isPeak: false },
      { hour: '21:00', displayTime: '9 PM', passengers: 210, occupancyRate: 65, busesOperating: 6, standeeLoad: 0, isPeak: false },
      { hour: '22:00', displayTime: '10 PM', passengers: 150, occupancyRate: 52, busesOperating: 5, standeeLoad: 0, isPeak: false },
      { hour: '23:00', displayTime: '11 PM', passengers: 95, occupancyRate: 40, busesOperating: 4, standeeLoad: 0, isPeak: false }
    ]
  }
};

export const HourlyPassengerDensityChart: React.FC = () => {
  const [selectedCorridor, setSelectedCorridor] = useState<string>('all');
  const [metricMode, setMetricMode] = useState<'composite' | 'occupancy' | 'volume'>('composite');
  const [activeDayFilter, setActiveDayFilter] = useState<'today' | 'weekday' | 'weekend'>('today');

  const currentDataset = corridorDatasets[selectedCorridor] || corridorDatasets.all;

  // Apply day filter multiplier
  const chartData = useMemo(() => {
    const multiplier = activeDayFilter === 'weekend' ? 1.18 : activeDayFilter === 'weekday' ? 0.96 : 1.0;
    return currentDataset.data.map(item => ({
      ...item,
      passengers: Math.round(item.passengers * multiplier),
      occupancyRate: Math.min(100, Math.round(item.occupancyRate * (activeDayFilter === 'weekend' ? 1.08 : 1.0)))
    }));
  }, [currentDataset, activeDayFilter]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalPassengers = chartData.reduce((acc, curr) => acc + curr.passengers, 0);
    const avgOccupancy = Math.round(chartData.reduce((acc, curr) => acc + curr.occupancyRate, 0) / chartData.length);
    const peakSlot = [...chartData].sort((a, b) => b.passengers - a.passengers)[0];
    const highLoadCount = chartData.filter(d => d.occupancyRate >= 85).length;
    return { totalPassengers, avgOccupancy, peakSlot, highLoadCount };
  }, [chartData]);

  // Custom Tooltip Formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: HourlyDataPoint = payload[0].payload;
      const isHighLoad = data.occupancyRate >= 85;
      return (
        <div className="bg-[#161920] border border-[#262B35] rounded-2xl p-4 shadow-2xl text-xs space-y-2.5 min-w-[220px] backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-[#262B35] pb-2">
            <span className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{data.hour} ({data.displayTime})</span>
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              isHighLoad
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {isHighLoad ? 'PEAK CRUSH LOAD' : 'NORMAL DEMAND'}
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Passenger Volume:</span>
              <span className="font-bold text-white text-sm">{data.passengers.toLocaleString()} riders</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Fleet Occupancy:</span>
              <span className={`font-bold ${isHighLoad ? 'text-amber-400' : 'text-emerald-400'}`}>
                {data.occupancyRate}%
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Buses in Service:</span>
              <span className="text-blue-400 font-bold">{data.busesOperating} vehicles</span>
            </div>
            {data.standeeLoad > 0 && (
              <div className="flex justify-between items-center text-rose-400 pt-1 border-t border-[#262B35]">
                <span>Standee Overflow:</span>
                <span className="font-bold">+{data.standeeLoad} / bus avg</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 pt-1 border-t border-[#262B35]">
            {isHighLoad
              ? '⚠️ High density surge: Supplemental dispatch recommended.'
              : '✅ Optimal frequency and seat availability maintained.'}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-6 text-[#E0E0E0]">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#262B35] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-600/10">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base tracking-tight">Hourly Bus Passenger Density Trends</h3>
              <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Recharts Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time commuter volume, fleet seat occupancy rate, and peak load surges</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {/* Corridor Dropdown */}
          <div className="relative">
            <select
              value={selectedCorridor}
              onChange={e => setSelectedCorridor(e.target.value)}
              className="bg-[#1C212B] border border-[#262B35] text-white text-xs font-semibold rounded-xl px-3 py-2 focus:border-blue-500 focus:outline-none pr-8 cursor-pointer"
            >
              <option value="all">All Corridors (System-Wide)</option>
              <option value="route-152">Route 152: Tumkur ⇄ Bengaluru</option>
              <option value="route-302">Route 302: Mysuru ⇄ Bengaluru</option>
              <option value="route-201">Route 201: Hassan ⇄ Bengaluru</option>
              <option value="route-501">Route 501: Hubballi ⇄ Bengaluru</option>
            </select>
          </div>

          {/* Day Baseline Toggle */}
          <div className="flex bg-[#1C212B] p-1 rounded-xl border border-[#262B35] text-xs font-bold">
            {(['today', 'weekday', 'weekend'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveDayFilter(mode)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  activeDayFilter === mode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'today' ? 'Today Live' : mode}
              </button>
            ))}
          </div>

          {/* View Metric Mode */}
          <div className="flex bg-[#1C212B] p-1 rounded-xl border border-[#262B35] text-xs font-bold">
            <button
              onClick={() => setMetricMode('composite')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                metricMode === 'composite' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dual Trend
            </button>
            <button
              onClick={() => setMetricMode('occupancy')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                metricMode === 'occupancy' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Occupancy %
            </button>
            <button
              onClick={() => setMetricMode('volume')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                metricMode === 'volume' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Boardings
            </button>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C212B] p-4 rounded-2xl border border-[#262B35]">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Total Daily Ridership</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-white mt-1">
            {stats.totalPassengers.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across 19 Operating Hours</div>
        </div>

        <div className="bg-[#1C212B] p-4 rounded-2xl border border-[#262B35]">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Peak Density Window</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-400 mt-1">
            {stats.peakSlot.displayTime} ({stats.peakSlot.occupancyRate}%)
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{stats.peakSlot.passengers.toLocaleString()} passengers / hr</div>
        </div>

        <div className="bg-[#1C212B] p-4 rounded-2xl border border-[#262B35]">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Avg Fleet Occupancy</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-300 mt-1">
            {stats.avgOccupancy}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Seat Load Factor</div>
        </div>

        <div className="bg-[#1C212B] p-4 rounded-2xl border border-[#262B35]">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Overcrowd Alert Hours</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
            {stats.highLoadCount} Hours &gt;85%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Morning & Evening Rush</div>
        </div>
      </div>

      {/* Main Recharts Visualization */}
      <div className="h-[340px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="passengerVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#262B35" vertical={false} />
            <XAxis
              dataKey="displayTime"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              stroke="#262B35"
              tickLine={false}
            />

            {/* Left Y-Axis for Volume */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              stroke="#262B35"
              tickLine={false}
              tickFormatter={(v) => `${v}`}
              domain={[0, 'auto']}
            />

            {/* Right Y-Axis for Occupancy % */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#F59E0B' }}
              stroke="#262B35"
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
              formatter={(value) => <span className="text-slate-300 font-semibold">{value}</span>}
            />

            {/* Peak Window Marker Lines */}
            <ReferenceLine
              yAxisId="right"
              x="9 AM"
              stroke="#EF4444"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{ value: 'AM Peak', fill: '#EF4444', fontSize: 10, position: 'insideTopLeft' }}
            />
            <ReferenceLine
              yAxisId="right"
              x="6 PM"
              stroke="#EF4444"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{ value: 'PM Peak', fill: '#EF4444', fontSize: 10, position: 'insideTopLeft' }}
            />

            {/* Reference Line for 85% Overcrowd Threshold */}
            <ReferenceLine
              yAxisId="right"
              y={85}
              label={{ value: '85% High Density Threshold', fill: '#F59E0B', fontSize: 10, position: 'insideTopRight' }}
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* Volume Bar / Area */}
            {(metricMode === 'composite' || metricMode === 'volume') && (
              <Bar
                yAxisId="left"
                dataKey="passengers"
                name="Hourly Passenger Boardings"
                fill="#3B82F6"
                radius={[6, 6, 0, 0]}
                barSize={18}
              />
            )}

            {/* Occupancy Line / Area */}
            {(metricMode === 'composite' || metricMode === 'occupancy') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="occupancyRate"
                name="Fleet Occupancy Rate (%)"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={{ r: 4, fill: '#F59E0B', strokeWidth: 1.5, stroke: '#161920' }}
                activeDot={{ r: 7, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Informational Insights Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs border-t border-[#262B35]">
        <div className="bg-[#1C212B] p-3 rounded-xl border border-[#262B35] flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white">Morning Peak (08:00 - 10:00)</div>
            <div className="text-slate-400 text-[11px]">Heavy inbound commuter flow towards Bengaluru Majestic and Yeshwanthpur TTMC.</div>
          </div>
        </div>

        <div className="bg-[#1C212B] p-3 rounded-xl border border-[#262B35] flex items-start gap-2.5">
          <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white">Evening Peak (17:30 - 20:00)</div>
            <div className="text-slate-400 text-[11px]">Maximum corridor crush load (98% occupancy). Express supplemental fleet actively deployed.</div>
          </div>
        </div>

        <div className="bg-[#1C212B] p-3 rounded-xl border border-[#262B35] flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white">Off-Peak (11:00 - 15:00)</div>
            <div className="text-slate-400 text-[11px]">Balanced seat availability (55-64% load). Standard 15-minute headway maintained.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
