import React, { useState, useEffect } from 'react';
import { api, subscribeToLiveFleet } from '../services/api';
import { LiveBusTelemetry, Bus, Route, Driver, Stop, PassengerReport, SOSAlert, SOSEmergencyType } from '../types';
import { LiveMap } from '../maps/LiveMap';
import { HourlyPassengerDensityChart } from '../components/HourlyPassengerDensityChart';
import { RouteStopsManagerModal } from '../components/RouteStopsManagerModal';
import { GoogleWorkspaceHub } from '../components/GoogleWorkspaceHub';
import { AdminStaffManager } from '../components/AdminStaffManager';
import { DatabaseDiagnosticsManager } from '../components/DatabaseDiagnosticsManager';
import { SecurityFirewallPanel } from '../components/SecurityFirewallPanel';
import {
  ShieldCheck,
  Radio,
  Bus as BusIcon,
  Users,
  MapPin,
  Route as RouteIcon,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  RefreshCw,
  Clock,
  Gauge,
  QrCode,
  Printer,
  TrendingUp,
  Search,
  SlidersHorizontal,
  X,
  Layers,
  ArrowRight,
  Siren,
  PhoneCall,
  HeartPulse,
  ShieldAlert,
  Phone,
  Lock,
  Unlock,
  HardDrive,
  Database
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sos' | 'density' | 'buses' | 'drivers' | 'routes' | 'stops' | 'reports' | 'admins' | 'database' | 'workspace' | 'firewall'>('overview');

  // Core Data
  const [liveBuses, setLiveBuses] = useState<LiveBusTelemetry[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [reports, setReports] = useState<PassengerReport[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time Emergency SOS Alerts
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [selectedSOSForAction, setSelectedSOSForAction] = useState<SOSAlert | null>(null);
  const [sosActionModal, setSosActionModal] = useState<'acknowledge' | 'dispatch' | 'resolve' | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    responder_unit: 'Highway Police Patrol 112 & 108 Ambulance',
    estimated_arrival_min: 10,
    notes: 'Immediate assistance dispatched from nearest corridor depot'
  });
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingSOSAction, setIsSubmittingSOSAction] = useState(false);

  // Search and Filter States
  const [driverSearch, setDriverSearch] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [busSearch, setBusSearch] = useState('');
  const [stopSearch, setStopSearch] = useState('');
  const [sosFilterStatus, setSosFilterStatus] = useState<'all' | 'active' | 'dispatched' | 'resolved'>('all');

  // Route Stops Management Modal State
  const [selectedRouteForStops, setSelectedRouteForStops] = useState<Route | null>(null);

  // Route Create / Edit Modals
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
    route_number: '',
    route_name: '',
    origin: '',
    destination: '',
    distance_km: 70,
    estimated_duration_min: 90,
    selectedStops: [] as { stop_id: string; scheduled_arrival: string; scheduled_departure: string; distance_from_origin_km: number }[]
  });

  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  // Driver Create / Edit / Delete Modals
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [showDriverPassword, setShowDriverPassword] = useState(false);
  const [editDriverPassword, setEditDriverPassword] = useState('');
  const [newDriver, setNewDriver] = useState({
    name: '',
    driver_code: '',
    phone: '',
    password: '',
    assigned_bus_id: '',
    assigned_route_id: '',
    status: 'available' as const
  });

  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Bus Create / Edit Modals
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [newBus, setNewBus] = useState({
    registration_number: '',
    fleet_number: '',
    model: 'Airavat Club Class (Volvo Multi-Axle)',
    capacity: 45,
    depot: 'Bengaluru Central',
    status: 'active' as const
  });

  const [editingBus, setEditingBus] = useState<Bus | null>(null);

  // Stop Create / Edit / QR Modals
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [newStop, setNewStop] = useState({
    name: '',
    name_kannada: '',
    stop_code: '',
    latitude: 13.0,
    longitude: 77.0,
    zone: 'Central'
  });

  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [viewingQrStop, setViewingQrStop] = useState<Stop | null>(null);

  // General Notification / Status banner
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const playEmergencySiren = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {}
  };

  const loadAllAdminData = async () => {
    try {
      const [busesRes, routesRes, driversRes, stopsRes, reportsRes, liveRes, statsRes, sosRes] = await Promise.all([
        api.getBuses(),
        api.getRoutes(),
        api.getDrivers(),
        api.getStops(),
        api.getReports(),
        api.getLiveBuses(),
        api.getAnalytics(),
        api.getAdminSOSAlerts().catch(() => ({ alerts: [] }))
      ]);

      setBuses(busesRes.buses || []);
      setRoutes(routesRes.routes || []);
      setDrivers(driversRes.drivers || []);
      setStops(stopsRes.stops || []);
      setReports(reportsRes.reports || []);
      setLiveBuses(liveRes.buses || []);
      setAnalytics(statsRes.analytics || null);
      setSosAlerts(sosRes.alerts || []);
      setIsLoading(false);
    } catch (e) {
      console.error('Error loading admin data:', e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
    // Relaxed periodic synchronization interval (WebSocket pushes real-time events immediately)
    const interval = setInterval(() => {
      api.getAdminSOSAlerts().then(res => setSosAlerts(res.alerts || [])).catch(() => {});
    }, 30000);

    // WebSocket real-time subscription for live buses and SOS emergency events
    const unsub = subscribeToLiveFleet(
      (telemetry) => {
        setLiveBuses(prev => {
          const index = prev.findIndex(b => b.bus_id === telemetry.bus_id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...telemetry };
            return updated;
          }
          return prev;
        });
      },
      () => {},
      (newAlert) => {
        playEmergencySiren();
        setSosAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
        showStatus(`🚨 IMMEDIATE SOS ALERT: Bus ${newAlert.bus_registration || ''} (${newAlert.emergency_type.toUpperCase()})`, 'error');
      },
      (updatedAlert) => {
        setSosAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
      }
    );

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  // SOS ADMIN HANDLERS
  const handleAcknowledgeSOS = async (alertId: string) => {
    try {
      const res = await api.acknowledgeAdminSOS(alertId, 'Central Traffic Control Room');
      setSosAlerts(prev => prev.map(a => a.id === alertId ? res.alert : a));
      showStatus('Emergency SOS alert acknowledged by Central Dispatch.');
      if (selectedSOSForAction?.id === alertId) setSelectedSOSForAction(res.alert);
    } catch (err: any) {
      showStatus(err.message || 'Failed to acknowledge alert', 'error');
    }
  };

  const handleDispatchSOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSOSForAction) return;
    try {
      setIsSubmittingSOSAction(true);
      const res = await api.dispatchAdminSOS(selectedSOSForAction.id, {
        responder_unit: dispatchForm.responder_unit,
        estimated_arrival_min: Number(dispatchForm.estimated_arrival_min),
        notes: dispatchForm.notes
      });
      setSosAlerts(prev => prev.map(a => a.id === selectedSOSForAction.id ? res.alert : a));
      setSosActionModal(null);
      setSelectedSOSForAction(null);
      showStatus(`Response units dispatched! ETA: ${dispatchForm.estimated_arrival_min} mins`);
    } catch (err: any) {
      showStatus(err.message || 'Failed to record dispatch', 'error');
    } finally {
      setIsSubmittingSOSAction(false);
    }
  };

  const handleResolveSOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSOSForAction) return;
    try {
      setIsSubmittingSOSAction(true);
      const res = await api.resolveAdminSOS(selectedSOSForAction.id, {
        resolution_notes: resolutionNotes || 'Situation stabilized and incident cleared by local authorities.',
        resolved_by: 'Central Control Supervisor'
      });
      setSosAlerts(prev => prev.map(a => a.id === selectedSOSForAction.id ? res.alert : a));
      setSosActionModal(null);
      setSelectedSOSForAction(null);
      setResolutionNotes('');
      showStatus('Emergency SOS marked resolved and archived.');
    } catch (err: any) {
      showStatus(err.message || 'Failed to resolve emergency', 'error');
    } finally {
      setIsSubmittingSOSAction(false);
    }
  };

  // ROUTE HANDLERS
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRoute({
        route_number: newRoute.route_number,
        route_name: newRoute.route_name,
        origin: newRoute.origin,
        destination: newRoute.destination,
        distance_km: Number(newRoute.distance_km),
        estimated_duration_min: Number(newRoute.estimated_duration_min),
        stops: newRoute.selectedStops
      });
      setIsAddRouteOpen(false);
      setNewRoute({
        route_number: '',
        route_name: '',
        origin: '',
        destination: '',
        distance_km: 70,
        estimated_duration_min: 90,
        selectedStops: []
      });
      showStatus('Route corridor and stop sequence created successfully!');
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to create route', 'error');
    }
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    try {
      await api.updateRoute(editingRoute.id, {
        route_number: editingRoute.route_number,
        route_name: editingRoute.route_name,
        origin: editingRoute.origin,
        destination: editingRoute.destination,
        distance_km: Number(editingRoute.distance_km),
        estimated_duration_min: Number(editingRoute.estimated_duration_min),
        status: editingRoute.status
      });
      setEditingRoute(null);
      showStatus('Route details updated successfully!');
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to update route', 'error');
    }
  };

  const handleDeleteRoute = async (routeId: string, routeNumber: string) => {
    if (!confirm(`Are you sure you want to permanently delete Route ${routeNumber}? All linked stops, schedules, and driver assignments will be unlinked.`)) {
      return;
    }
    try {
      await api.deleteRoute(routeId);
      showStatus(`Route ${routeNumber} deleted successfully.`);
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to delete route', 'error');
    }
  };

  // DRIVER HANDLERS
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assignedPassword = newDriver.password.trim() || 'pass123';
      await api.createDriver({
        ...newDriver,
        password: assignedPassword
      });
      setIsAddDriverOpen(false);
      setNewDriver({
        name: '',
        driver_code: '',
        phone: '',
        password: '',
        assigned_bus_id: '',
        assigned_route_id: '',
        status: 'available'
      });
      showStatus(`Driver ${newDriver.driver_code} enrolled with login password: ${assignedPassword}`);
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to enroll driver', 'error');
    }
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    try {
      await api.updateDriver(editingDriver.id, {
        name: editingDriver.name,
        driver_code: editingDriver.driver_code,
        phone: editingDriver.phone,
        password: editDriverPassword.trim() ? editDriverPassword.trim() : undefined,
        status: editingDriver.status,
        assigned_bus_id: editingDriver.assigned_bus_id || null,
        assigned_route_id: editingDriver.assigned_route_id || null
      });
      setEditingDriver(null);
      setEditDriverPassword('');
      showStatus('Driver information and login credentials updated!');
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to update driver', 'error');
    }
  };

  const handleDeleteDriver = async (driverId: string, driverCode: string, driverName: string) => {
    if (!confirm(`Are you sure you want to permanently delete Driver ID ${driverCode} (${driverName}) from KSRTC records?`)) {
      return;
    }
    try {
      await api.deleteDriver(driverId);
      showStatus(`Driver ID ${driverCode} deleted from roster.`);
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to delete driver', 'error');
    }
  };

  const handleRevokeDriverAccess = async (driverId: string, driverCode: string, driverName: string) => {
    if (!confirm(`REVOKE ACCESS: Are you sure you want to revoke ALL cockpit permissions and access for Driver ${driverCode} (${driverName})? Any active trip will be terminated.`)) {
      return;
    }
    try {
      await api.revokeDriverAccess(driverId);
      showStatus(`Access REVOKED for Driver ${driverCode} (${driverName}). Driver is locked out.`);
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to revoke driver access', 'error');
    }
  };

  const handleRestoreDriverAccess = async (driverId: string, driverCode: string, driverName: string) => {
    try {
      await api.restoreDriverAccess(driverId);
      showStatus(`Access RESTORED for Driver ${driverCode} (${driverName}).`);
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to restore driver access', 'error');
    }
  };

  const handleRevokeAllDriversAccess = async () => {
    if (!confirm(`EMERGENCY FLEET LOCKDOWN: Are you sure you want to revoke access for ALL DRIVERS across the entire fleet? All active trips will be immediately cancelled.`)) {
      return;
    }
    try {
      await api.revokeAllDriversAccess();
      showStatus(`EMERGENCY LOCKDOWN COMPLETE: All driver access has been revoked.`);
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to execute emergency fleet lockdown', 'error');
    }
  };

  // BUS HANDLERS
  const handleCreateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBus(newBus);
      setIsAddBusOpen(false);
      showStatus('Vehicle registered to fleet!');
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to add bus', 'error');
    }
  };

  const handleUpdateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBus) return;
    try {
      await api.updateBus(editingBus.id, editingBus);
      setEditingBus(null);
      showStatus('Bus details updated successfully!');
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to update bus', 'error');
    }
  };

  const handleDeleteBus = async (id: string, regNumber: string) => {
    if (!confirm(`Are you sure you want to remove bus ${regNumber} from fleet registry?`)) return;
    try {
      await api.deleteBus(id);
      showStatus(`Bus ${regNumber} removed from registry.`);
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to delete bus', 'error');
    }
  };

  // STOP HANDLERS
  const handleCreateStop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createStop({
        ...newStop,
        latitude: Number(newStop.latitude),
        longitude: Number(newStop.longitude)
      });
      setIsAddStopOpen(false);
      setNewStop({ name: '', name_kannada: '', stop_code: '', latitude: 13.0, longitude: 77.0, zone: 'Central' });
      showStatus('Bus Stop created successfully!');
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to create stop', 'error');
    }
  };

  const handleUpdateStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStop) return;
    try {
      await api.updateStop(editingStop.id, {
        name: editingStop.name,
        name_kannada: editingStop.name_kannada,
        stop_code: editingStop.stop_code,
        latitude: Number(editingStop.latitude),
        longitude: Number(editingStop.longitude),
        zone: editingStop.zone
      });
      setEditingStop(null);
      showStatus('Stop details updated!');
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to update stop', 'error');
    }
  };

  const handleDeleteStop = async (id: string, stopName: string) => {
    if (!confirm(`Are you sure you want to delete stop "${stopName}"? It will be removed from all route corridors.`)) return;
    try {
      await api.deleteStop(id);
      showStatus(`Stop "${stopName}" removed successfully.`);
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to delete stop', 'error');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await api.resolveReport(reportId);
      showStatus('Passenger grievance marked as resolved.');
      loadAllAdminData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to resolve report', 'error');
    }
  };

  // Performance chart data
  const chartData = [
    { name: '06:00', trips: 12, onTime: 92 },
    { name: '09:00', trips: 28, onTime: 86 },
    { name: '12:00', trips: 20, onTime: 89 },
    { name: '15:00', trips: 24, onTime: 88 },
    { name: '18:00', trips: 32, onTime: 82 },
    { name: '21:00', trips: 16, onTime: 94 }
  ];

  // Filtered lists
  const filteredRoutes = routes.filter(r =>
    r.route_number.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.route_name.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.origin.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.destination.toLowerCase().includes(routeSearch.toLowerCase())
  );

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.driver_code.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.phone.includes(driverSearch)
  );

  const filteredBuses = buses.filter(b =>
    b.registration_number.toLowerCase().includes(busSearch.toLowerCase()) ||
    b.fleet_number.toLowerCase().includes(busSearch.toLowerCase()) ||
    b.model.toLowerCase().includes(busSearch.toLowerCase()) ||
    (b.depot || '').toLowerCase().includes(busSearch.toLowerCase())
  );

  const filteredStops = stops.filter(s =>
    s.name.toLowerCase().includes(stopSearch.toLowerCase()) ||
    (s.name_kannada || '').toLowerCase().includes(stopSearch.toLowerCase()) ||
    s.stop_code.toLowerCase().includes(stopSearch.toLowerCase()) ||
    (s.zone || '').toLowerCase().includes(stopSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-[#E0E0E0]">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#262B35] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">KSRTC Central Dispatch & Fleet Admin</h1>
            <p className="text-xs text-slate-400">Karnataka State Road Transport Advanced Route, Driver ID & Corridor Controller</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllAdminData}
            className="inline-flex items-center gap-1.5 bg-[#161920] hover:bg-[#1C212B] text-slate-200 border border-[#262B35] text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium ${
          statusMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CRITICAL REAL-TIME SOS EMERGENCY BANNER */}
      {sosAlerts.filter(a => a.status !== 'resolved').length > 0 && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-3xl p-5 shadow-2xl shadow-red-950/70 text-white space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/50 animate-bounce">
                <Siren className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-600 text-white">
                    CRITICAL: {sosAlerts.filter(a => a.status !== 'resolved').length} ACTIVE SOS EMERGENCY {sosAlerts.filter(a => a.status !== 'resolved').length > 1 ? 'ALERTS' : 'ALERT'}
                  </span>
                  <span className="text-xs text-red-300 font-mono font-bold animate-pulse">
                    PRIORITY 1 DISPATCH
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-1">
                  Immediate Response Required from Central Traffic Control Room
                </h2>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('sos')}
              className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/40 cursor-pointer self-start sm:self-auto transition-colors"
            >
              <span>Open Emergency SOS Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Urgent Alert Snippets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sosAlerts.filter(a => a.status !== 'resolved').slice(0, 2).map(alert => (
              <div key={alert.id} className="bg-black/60 p-3.5 rounded-2xl border border-red-500/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-sm">
                    {alert.bus_registration || 'KSRTC BUS'} (Route {alert.route_number || '152'})
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white uppercase">
                    {alert.emergency_type}
                  </span>
                </div>
                <div className="text-slate-300 flex items-center justify-between text-[11px]">
                  <span>Driver: <strong className="text-white">{alert.driver_name || 'Driver In-Charge'}</strong></span>
                  <span className="font-mono text-emerald-400">
                    GPS: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)} ({alert.speed || 0} km/h)
                  </span>
                </div>
                {alert.message && (
                  <div className="text-red-200 italic bg-red-950/40 p-2 rounded-lg border border-red-500/20 text-[11px]">
                    "{alert.message}"
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledgeSOS(alert.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedSOSForAction(alert);
                      setSosActionModal('dispatch');
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                  >
                    Dispatch Responders (112/108)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* SOS Alert Counter */}
        <div
          onClick={() => setActiveTab('sos')}
          className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
            sosAlerts.filter(a => a.status !== 'resolved').length > 0
              ? 'bg-red-950/40 border-red-500/60 ring-2 ring-red-500/50 hover:bg-red-950/60'
              : 'bg-[#161920] border-[#262B35] hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-bold text-red-400 uppercase flex items-center justify-between">
            <span>SOS Emergency</span>
            {sosAlerts.filter(a => a.status !== 'resolved').length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            )}
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-400 mt-1 flex items-center gap-2">
            <span>{sosAlerts.filter(a => a.status !== 'resolved').length}</span>
            {sosAlerts.filter(a => a.status !== 'resolved').length > 0 ? (
              <Siren className="w-5 h-5 text-red-400 animate-bounce" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {sosAlerts.filter(a => a.status !== 'resolved').length > 0 ? 'Urgent Alert Active' : 'All Fleet Normal'}
          </div>
        </div>

        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Live Active Buses</div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1 flex items-center gap-2">
            <span>{liveBuses.length}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Broadcasting GPS Live</div>
        </div>

        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Registered Fleet</div>
          <div className="text-2xl font-extrabold font-mono text-white mt-1">{buses.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across All Depots</div>
        </div>

        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Routes & Corridors</div>
          <div className="text-2xl font-extrabold font-mono text-blue-400 mt-1">{routes.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Configured Routes</div>
        </div>

        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Driver IDs Roster</div>
          <div className="text-2xl font-extrabold font-mono text-indigo-400 mt-1">{drivers.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Certified Crew Members</div>
        </div>

        <div className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Bus Stops & QR</div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1">{stops.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Mapped Geofences</div>
        </div>
      </div>

      {/* Mobile Tab Selector (Eliminates horizontal scrolling glitch on phone screens) */}
      <div className="block md:hidden bg-[#161920] p-3 rounded-2xl border border-[#262B35] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Active Workspace Tab</span>
          {sosAlerts.filter(a => a.status !== 'resolved').length > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
              <Siren className="w-3 h-3" />
              <span>{sosAlerts.filter(a => a.status !== 'resolved').length} SOS Alert Active</span>
            </span>
          )}
        </div>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full bg-[#1C212B] border border-[#2B3240] text-white font-bold text-xs py-3 px-3.5 rounded-xl focus:outline-none focus:border-blue-500"
        >
          <optgroup label="Operations & Fleet">
            <option value="overview">📡 Fleet Overview & Live Map</option>
            <option value="sos">🚨 SOS Emergency Alerts ({sosAlerts.filter(a => a.status !== 'resolved').length} active)</option>
            <option value="drivers">👨‍✈️ Drivers & Passwords (Duty Codes)</option>
            <option value="buses">🚌 Buses Fleet Inventory</option>
            <option value="routes">🗺️ Routes & Waypoints Builder</option>
            <option value="stops">📍 Stops & QR Signage</option>
          </optgroup>
          <optgroup label="Security & Management">
            <option value="admins">🛡️ Admin Officers & Staff Roster</option>
            <option value="firewall">🧱 Security Firewall (WAF Protection)</option>
            <option value="database">💾 Database State & Audit Trail</option>
            <option value="density">📈 Passenger Density Heatmap</option>
            <option value="reports">⚠️ Grievances & Commuter Reports</option>
            <option value="workspace">📁 Google Workspace Drive / Sheets</option>
          </optgroup>
        </select>
      </div>

      {/* Admin Tabs for Tablets & Desktops */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto border-b border-[#262B35] pb-2 text-xs font-bold scrollbar-none">
        {[
          {
            id: 'overview',
            label: 'Fleet Overview & Map',
            icon: Radio,
            badge: null,
            isEmergency: false
          },
          {
            id: 'sos',
            label: `SOS Emergency`,
            icon: Siren,
            badge: sosAlerts.filter(a => a.status !== 'resolved').length > 0
              ? `${sosAlerts.filter(a => a.status !== 'resolved').length} Active`
              : null,
            isEmergency: sosAlerts.filter(a => a.status !== 'resolved').length > 0
          },
          { id: 'routes', label: 'Routes & Stops Builder', icon: RouteIcon, badge: null, isEmergency: false },
          { id: 'drivers', label: 'Drivers & Driver IDs', icon: Users, badge: null, isEmergency: false },
          { id: 'buses', label: 'Buses Fleet', icon: BusIcon, badge: null, isEmergency: false },
          { id: 'stops', label: 'Stops & QR Signage', icon: MapPin, badge: null, isEmergency: false },
          { id: 'admins', label: 'Admin Fleet & Officers', icon: ShieldCheck, badge: 'Staff Roster', isEmergency: false },
          { id: 'database', label: 'Database & Audit Trail', icon: Database, badge: 'Live State', isEmergency: false },
          { id: 'density', label: 'Passenger Density', icon: TrendingUp, badge: null, isEmergency: false },
          {
            id: 'reports',
            label: `Grievances`,
            icon: AlertTriangle,
            badge: reports.filter(r => r.status === 'pending').length > 0
              ? `${reports.filter(r => r.status === 'pending').length}`
              : null,
            isEmergency: false
          },
          {
            id: 'workspace',
            label: 'Google Workspace',
            icon: HardDrive,
            badge: 'Connected',
            isEmergency: false
          },
          {
            id: 'firewall',
            label: 'Security Firewall',
            icon: ShieldAlert,
            badge: 'WAF Active',
            isEmergency: false
          }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors relative ${
                isActive
                  ? tab.isEmergency
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-blue-600 text-white shadow-sm'
                  : tab.isEmergency
                    ? 'bg-red-950/40 text-red-300 border border-red-500/50 hover:bg-red-900/50 animate-pulse'
                    : 'bg-[#161920] text-slate-400 hover:text-white hover:bg-[#1C212B] border border-[#262B35]'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.isEmergency && !isActive ? 'text-red-400' : ''}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  tab.isEmergency
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & MAP */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Map */}
            <div className="lg:col-span-2 bg-[#161920] rounded-3xl p-4 border border-[#262B35] shadow-sm h-[480px]">
              <LiveMap buses={liveBuses} stops={stops} className="w-full h-full rounded-2xl" />
            </div>

            {/* Daily Fleet Activity Chart */}
            <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Hourly Fleet Dispatch Activity</h3>
                <p className="text-xs text-slate-400 mt-0.5">Trips dispatched vs. On-time schedule reliability</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262B35" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#262B35" />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#262B35" />
                    <Tooltip contentStyle={{ backgroundColor: '#161920', borderColor: '#262B35', color: '#fff', borderRadius: '12px' }} />
                    <Bar dataKey="trips" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="text-xs text-slate-300 bg-[#1C212B] p-3 rounded-xl border border-[#262B35]">
                ⚡ <strong className="text-white">SmartTrack GPS Health:</strong> Satellite fix availability 99.4% across Tumkur, Mysuru, Hassan and Hubballi express corridors.
              </div>
            </div>
          </div>

          <HourlyPassengerDensityChart />
        </div>
      )}

      {/* TAB: SOS REAL-TIME EMERGENCY COMMAND CENTER */}
      {activeTab === 'sos' && (
        <div className="space-y-6">
          {/* SOS Command Header */}
          <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-lg shadow-red-600/20">
                  <Siren className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
                    <span>Emergency SOS Live Incident Command</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      LIVE TELEMETRY
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time driver distress triggers, instant GPS location lock, and inter-agency dispatch coordination.
                  </p>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-[#1C212B] p-1.5 rounded-2xl border border-[#262B35] text-xs font-bold">
                {[
                  { id: 'all', label: `All (${sosAlerts.length})` },
                  { id: 'active', label: `Active (${sosAlerts.filter(a => a.status === 'active' || a.status === 'acknowledged').length})` },
                  { id: 'dispatched', label: `Dispatched (${sosAlerts.filter(a => a.status === 'dispatched').length})` },
                  { id: 'resolved', label: `Resolved (${sosAlerts.filter(a => a.status === 'resolved').length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSosFilterStatus(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-colors ${
                      sosFilterStatus === f.id
                        ? f.id === 'active'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency Hotline Quick Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#262B35]">
              <a
                href="tel:112"
                className="flex items-center justify-between p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 hover:bg-red-900/40 text-xs font-bold transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Police Control (112)</span>
                </span>
                <PhoneCall className="w-3.5 h-3.5" />
              </a>

              <a
                href="tel:108"
                className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 text-xs font-bold transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-emerald-400" />
                  <span>Ambulance (108)</span>
                </span>
                <PhoneCall className="w-3.5 h-3.5" />
              </a>

              <a
                href="tel:101"
                className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 hover:bg-amber-900/40 text-xs font-bold transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Fire & Rescue (101)</span>
                </span>
                <PhoneCall className="w-3.5 h-3.5" />
              </a>

              <a
                href="tel:08022873333"
                className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-300 hover:bg-blue-900/40 text-xs font-bold transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span>KSRTC Central Helplines</span>
                </span>
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* SOS Incidents Grid */}
          <div className="space-y-4">
            {sosAlerts
              .filter(a => {
                if (sosFilterStatus === 'active') return a.status === 'active' || a.status === 'acknowledged';
                if (sosFilterStatus === 'dispatched') return a.status === 'dispatched';
                if (sosFilterStatus === 'resolved') return a.status === 'resolved';
                return true;
              })
              .length === 0 ? (
              <div className="bg-[#161920] rounded-3xl p-12 text-center border border-[#262B35] space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-white font-bold text-base">No Emergency Alerts Matching Filter</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  All running buses are transmitting regular telemetry on safe routes. Any driver distress signal will appear here instantaneously.
                </p>
              </div>
            ) : (
              sosAlerts
                .filter(a => {
                  if (sosFilterStatus === 'active') return a.status === 'active' || a.status === 'acknowledged';
                  if (sosFilterStatus === 'dispatched') return a.status === 'dispatched';
                  if (sosFilterStatus === 'resolved') return a.status === 'resolved';
                  return true;
                })
                .map(alert => {
                  const isActive = alert.status === 'active';
                  const isAck = alert.status === 'acknowledged';
                  const isDispatched = alert.status === 'dispatched';
                  const isResolved = alert.status === 'resolved';

                  return (
                    <div
                      key={alert.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        isActive
                          ? 'bg-red-950/30 border-red-500/60 shadow-xl shadow-red-950/40 ring-1 ring-red-500/40'
                          : isAck
                            ? 'bg-blue-950/30 border-blue-500/50 shadow-md'
                            : isDispatched
                              ? 'bg-amber-950/30 border-amber-500/50 shadow-md'
                              : 'bg-[#161920] border-[#262B35]'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Left Info Column */}
                        <div className="space-y-3 flex-1">
                          {/* Top Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                                isActive
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : isAck
                                    ? 'bg-blue-600 text-white'
                                    : isDispatched
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-emerald-600 text-white'
                              }`}
                            >
                              <Siren className="w-3.5 h-3.5" />
                              <span>{alert.status.toUpperCase()}</span>
                            </span>

                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#1C212B] text-slate-200 border border-[#262B35] uppercase font-mono">
                              Type: {alert.emergency_type}
                            </span>

                            <span className="text-xs text-slate-400 font-mono">
                              Reported: {new Date(alert.created_at).toLocaleTimeString()} ({new Date(alert.created_at).toLocaleDateString()})
                            </span>
                          </div>

                          {/* Bus & Driver Identity */}
                          <div>
                            <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                              <span>{alert.bus_registration || 'KSRTC BUS'}</span>
                              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                Route {alert.route_number || '152'}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-300 mt-0.5">
                              Driver: <strong className="text-white">{alert.driver_name || 'Driver In-Charge'}</strong> (ID: {alert.driver_id})
                            </p>
                          </div>

                          {/* Distress Message if any */}
                          {alert.message && (
                            <div className="p-3 rounded-2xl bg-red-950/50 border border-red-500/30 text-xs text-red-200">
                              <strong className="text-white block mb-0.5">Driver Distress Message:</strong>
                              "{alert.message}"
                            </div>
                          )}

                          {/* Live Telemetry & Coordinates */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="bg-[#1C212B] p-2.5 rounded-xl border border-[#262B35]">
                              <span className="text-[10px] text-slate-400 block">GPS Coordinates</span>
                              <span className="font-mono text-white font-bold">
                                {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                              </span>
                            </div>

                            <div className="bg-[#1C212B] p-2.5 rounded-xl border border-[#262B35]">
                              <span className="text-[10px] text-slate-400 block">Speed & Heading</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                {alert.speed || 0} km/h • {alert.heading || 0}°
                              </span>
                            </div>

                            <div className="bg-[#1C212B] p-2.5 rounded-xl border border-[#262B35]">
                              <span className="text-[10px] text-slate-400 block">Current Action</span>
                              <span className="text-slate-200 font-semibold truncate block">
                                {isDispatched
                                  ? `Dispatched (${alert.responder_unit || 'Units'})`
                                  : isAck
                                    ? 'Acknowledged'
                                    : isResolved
                                      ? 'Resolved & Closed'
                                      : 'Awaiting Action'}
                              </span>
                            </div>
                          </div>

                          {/* Dispatch Timeline Info */}
                          {isDispatched && (
                            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                              <div className="font-bold flex items-center justify-between">
                                <span>Dispatched: {alert.responder_unit}</span>
                                {alert.estimated_arrival_min && (
                                  <span className="bg-amber-500/20 px-2 py-0.5 rounded font-mono text-[11px]">
                                    ETA: {alert.estimated_arrival_min} Mins
                                  </span>
                                )}
                              </div>
                              {alert.notes && <p className="text-[11px] text-amber-300/90">{alert.notes}</p>}
                            </div>
                          )}

                          {/* Resolution Notes Info */}
                          {isResolved && alert.resolution_notes && (
                            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
                              <div className="font-bold">
                                Resolved by: {alert.resolved_by || 'Supervisor'} at {alert.resolved_at ? new Date(alert.resolved_at).toLocaleTimeString() : ''}
                              </div>
                              <p className="text-[11px] text-emerald-300/90">{alert.resolution_notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Right Actions Column */}
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:w-56 pt-2 lg:pt-0">
                          {/* Map Links */}
                          <a
                            href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 bg-[#1C212B] hover:bg-[#252C3A] text-slate-200 text-xs font-bold py-2 px-3 rounded-xl border border-[#262B35] transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                            <span>Locate on Google Maps</span>
                          </a>

                          {alert.driver_phone && (
                            <a
                              href={`tel:${alert.driver_phone}`}
                              className="inline-flex items-center justify-center gap-1.5 bg-[#1C212B] hover:bg-[#252C3A] text-emerald-300 text-xs font-bold py-2 px-3 rounded-xl border border-[#262B35] transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Call Driver ({alert.driver_phone})</span>
                            </a>
                          )}

                          {/* Action Step 1: Acknowledge */}
                          {isActive && (
                            <button
                              onClick={() => handleAcknowledgeSOS(alert.id)}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold py-2.5 px-3 rounded-xl shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Acknowledge SOS</span>
                            </button>
                          )}

                          {/* Action Step 2: Dispatch */}
                          {!isResolved && (
                            <button
                              onClick={() => {
                                setSelectedSOSForAction(alert);
                                setSosActionModal('dispatch');
                              }}
                              className={`w-full text-white text-xs font-extrabold py-2.5 px-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 ${
                                isDispatched
                                  ? 'bg-amber-700 hover:bg-amber-600'
                                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                              }`}
                            >
                              <ShieldAlert className="w-4 h-4" />
                              <span>{isDispatched ? 'Update Dispatch' : 'Dispatch Responders (112/108)'}</span>
                            </button>
                          )}

                          {/* Action Step 3: Resolve */}
                          {!isResolved && (
                            <button
                              onClick={() => {
                                setSelectedSOSForAction(alert);
                                setSosActionModal('resolve');
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold py-2 px-3 rounded-xl shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark Incident Resolved</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH EMERGENCY RESPONDERS */}
      {sosActionModal === 'dispatch' && selectedSOSForAction && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#141720] rounded-3xl max-w-lg w-full p-6 border border-[#262B3A] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262B35]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm">Dispatch Emergency Responders</h4>
                  <p className="text-[11px] text-slate-400">
                    Target: {selectedSOSForAction.bus_registration} ({selectedSOSForAction.emergency_type})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSosActionModal(null);
                  setSelectedSOSForAction(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchSOS} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Primary Responder Unit / Agency
                </label>
                <input
                  type="text"
                  required
                  value={dispatchForm.responder_unit}
                  onChange={e => setDispatchForm({ ...dispatchForm, responder_unit: e.target.value })}
                  placeholder="e.g. Highway Patrol 112 & 108 Ambulance"
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Highway Police Patrol 112',
                    '108 Emergency Ambulance',
                    'KSRTC Breakdown Heavy Crane',
                    'Fire & Rescue Services 101'
                  ].map(unit => (
                    <button
                      type="button"
                      key={unit}
                      onClick={() => setDispatchForm({ ...dispatchForm, responder_unit: unit })}
                      className="px-2 py-1 rounded-lg bg-[#1C212B] border border-[#262B35] text-[10px] text-slate-300 hover:text-white hover:border-slate-500"
                    >
                      + {unit}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Estimated Arrival Time (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  required
                  value={dispatchForm.estimated_arrival_min}
                  onChange={e => setDispatchForm({ ...dispatchForm, estimated_arrival_min: Number(e.target.value) })}
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Dispatch Instructions / Operational Notes
                </label>
                <textarea
                  rows={3}
                  value={dispatchForm.notes}
                  onChange={e => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  placeholder="Specific corridor instructions, nearest hospital coordination, etc."
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                <button
                  type="button"
                  onClick={() => {
                    setSosActionModal(null);
                    setSelectedSOSForAction(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSOSAction}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold transition-colors flex items-center gap-2"
                >
                  {isSubmittingSOSAction ? 'Transmitting Dispatch...' : 'Confirm & Transmit Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE EMERGENCY INCIDENT */}
      {sosActionModal === 'resolve' && selectedSOSForAction && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#141720] rounded-3xl max-w-lg w-full p-6 border border-[#262B3A] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262B35]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm">Resolve Emergency SOS Incident</h4>
                  <p className="text-[11px] text-slate-400">
                    Target: {selectedSOSForAction.bus_registration} ({selectedSOSForAction.emergency_type})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSosActionModal(null);
                  setSelectedSOSForAction(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSOS} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Incident Resolution & Debriefing Notes
                </label>
                <textarea
                  rows={4}
                  required
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="Explain how the emergency was resolved (e.g. Passengers safely transferred to alternate bus KA 01 CD 5678, medical assistance rendered at Tumkur District Hospital, mechanical issue repaired)."
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                <button
                  type="button"
                  onClick={() => {
                    setSosActionModal(null);
                    setSelectedSOSForAction(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSOSAction}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold transition-colors flex items-center gap-2"
                >
                  {isSubmittingSOSAction ? 'Archiving Incident...' : 'Close & Archive Emergency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ADVANCED ROUTES & STOPS BUILDER */}
      {activeTab === 'routes' && (
        <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Route Corridors & Stops Builder ({routes.length} Routes)</h3>
              <p className="text-xs text-slate-400">
                Manage bus corridors, configure every stop in the route sequence, and manage timetables.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search routes..."
                  value={routeSearch}
                  onChange={e => setRouteSearch(e.target.value)}
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setIsAddRouteOpen(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Route</span>
              </button>
            </div>
          </div>

          {/* Routes Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoutes.map(r => {
              const stopCount = (r.stops || []).length;
              const activeOnRoute = liveBuses.filter(b => b.route_id === r.id).length;

              return (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl border border-[#262B35] bg-[#1C212B] hover:border-slate-600 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 font-mono">
                        Route #{r.route_number}
                      </span>
                      <div className="flex items-center gap-2">
                        {activeOnRoute > 0 ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {activeOnRoute} Live Bus{activeOnRoute > 1 ? 'es' : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">0 active</span>
                        )}
                        <span className="text-xs text-slate-300 font-semibold">{r.distance_km} km</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm leading-snug">{r.route_name}</h4>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                        <span>{r.origin}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span>{r.destination}</span>
                      </div>
                    </div>

                    <div className="bg-[#161920] p-2.5 rounded-xl border border-[#262B35] text-[11px] flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <strong>{stopCount}</strong> Intermediate Stops
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.estimated_duration_min} min
                      </span>
                    </div>
                  </div>

                  {/* Route Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#262B35]">
                    <button
                      onClick={() => setSelectedRouteForStops(r)}
                      className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold py-2 rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Manage Stops ({stopCount})</span>
                    </button>

                    <button
                      onClick={() => setEditingRoute(r)}
                      title="Edit Route Info"
                      className="p-2 rounded-xl bg-[#262B35] text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRoute(r.id, r.route_number)}
                      title="Delete Route"
                      className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Route Modal with Multi-Stop Picker */}
          {isAddRouteOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#161920] rounded-3xl max-w-lg w-full p-6 space-y-4 border border-[#262B35] shadow-2xl text-[#E0E0E0] max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <RouteIcon className="w-4 h-4 text-blue-400" />
                    <span>Create New Route Corridor</span>
                  </h4>
                  <button onClick={() => setIsAddRouteOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateRoute} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Route Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 401"
                        value={newRoute.route_number}
                        onChange={e => setNewRoute({ ...newRoute, route_number: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Route Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mangaluru Express"
                        value={newRoute.route_name}
                        onChange={e => setNewRoute({ ...newRoute, route_name: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Origin City / Station</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mangaluru KSRTC Bus Stand"
                        value={newRoute.origin}
                        onChange={e => setNewRoute({ ...newRoute, origin: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Destination</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bengaluru Majestic"
                        value={newRoute.destination}
                        onChange={e => setNewRoute({ ...newRoute, destination: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Total Distance (km)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newRoute.distance_km}
                        onChange={e => setNewRoute({ ...newRoute, distance_km: Number(e.target.value) })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Est. Duration (mins)</label>
                      <input
                        type="number"
                        min="5"
                        required
                        value={newRoute.estimated_duration_min}
                        onChange={e => setNewRoute({ ...newRoute, estimated_duration_min: Number(e.target.value) })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-[#1C212B] rounded-2xl border border-[#262B35] text-[11px] text-slate-300">
                    💡 After creating this route corridor, you can instantly add and sequence all intermediate stops using the interactive <strong>Manage Stops</strong> tool!
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                    <button type="button" onClick={() => setIsAddRouteOpen(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow">Save Route</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Route Modal */}
          {editingRoute && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#161920] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#262B35] shadow-2xl text-[#E0E0E0]">
                <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
                  <h4 className="font-bold text-white text-base">Edit Route #{editingRoute.route_number}</h4>
                  <button onClick={() => setEditingRoute(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUpdateRoute} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Route Number</label>
                    <input
                      type="text"
                      required
                      value={editingRoute.route_number}
                      onChange={e => setEditingRoute({ ...editingRoute, route_number: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Route Name</label>
                    <input
                      type="text"
                      required
                      value={editingRoute.route_name}
                      onChange={e => setEditingRoute({ ...editingRoute, route_name: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Origin</label>
                      <input
                        type="text"
                        required
                        value={editingRoute.origin}
                        onChange={e => setEditingRoute({ ...editingRoute, origin: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Destination</label>
                      <input
                        type="text"
                        required
                        value={editingRoute.destination}
                        onChange={e => setEditingRoute({ ...editingRoute, destination: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Distance (km)</label>
                      <input
                        type="number"
                        value={editingRoute.distance_km}
                        onChange={e => setEditingRoute({ ...editingRoute, distance_km: Number(e.target.value) })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Duration (min)</label>
                      <input
                        type="number"
                        value={editingRoute.estimated_duration_min}
                        onChange={e => setEditingRoute({ ...editingRoute, estimated_duration_min: Number(e.target.value) })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                    <button type="button" onClick={() => setEditingRoute(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">Update Route</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DRIVERS & DRIVER IDS */}
      {activeTab === 'drivers' && (
        <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Certified Driver & Staff Roster ({drivers.length} Drivers)</h3>
              <p className="text-xs text-slate-400">
                Enroll drivers with custom Driver IDs, manage duty status, assign vehicles and corridors, or delete inactive IDs.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Driver Name / Staff ID..."
                  value={driverSearch}
                  onChange={e => setDriverSearch(e.target.value)}
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRevokeAllDriversAccess}
                  title="Emergency Lockdown: Revoke access for all drivers"
                  className="inline-flex items-center gap-1.5 bg-red-950/70 border border-red-600/50 hover:bg-red-900 text-red-300 text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow shrink-0"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Revoke All Driver Access</span>
                </button>

                <button
                  onClick={() => setIsAddDriverOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll Driver</span>
                </button>
              </div>
            </div>
          </div>

          {/* Drivers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1C212B] text-slate-400 uppercase text-[10px] font-bold border-b border-[#262B35]">
                <tr>
                  <th className="py-3 px-4">Driver Staff ID</th>
                  <th className="py-3 px-4">Driver Full Name</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Login Password</th>
                  <th className="py-3 px-4">Assigned Bus</th>
                  <th className="py-3 px-4">Assigned Corridor</th>
                  <th className="py-3 px-4">Duty Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B35] text-slate-300">
                {filteredDrivers.map(d => {
                  const assignedB = buses.find(b => b.id === d.assigned_bus_id);
                  const assignedR = routes.find(r => r.id === d.assigned_route_id);
                  const isRevoked = d.access_revoked || d.status === 'suspended';
                  return (
                    <tr key={d.id} className="hover:bg-[#1C212B]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        <span className="bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                          {d.driver_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{d.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{d.phone}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                        <span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                          {d.password || 'pass123'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {assignedB ? (
                          <span className="text-white font-medium">{assignedB.registration_number} ({assignedB.fleet_number})</span>
                        ) : (
                          <span className="text-slate-500 italic">None Assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {assignedR ? (
                          <span className="text-slate-200 font-medium">Route {assignedR.route_number} - {assignedR.route_name}</span>
                        ) : (
                          <span className="text-slate-500 italic">None Assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isRevoked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-red-400" />
                            <span>ACCESS REVOKED</span>
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            d.status === 'on_trip'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : d.status === 'available'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {d.status.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRevoked ? (
                            <button
                              onClick={() => handleRestoreDriverAccess(d.id, d.driver_code, d.name)}
                              title="Restore Cockpit Access"
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-colors flex items-center gap-1 font-bold text-[11px]"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Restore Access</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRevokeDriverAccess(d.id, d.driver_code, d.name)}
                              title="Revoke All Driver Access & Terminate Trip"
                              className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors flex items-center gap-1 font-bold text-[11px]"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Revoke Access</span>
                            </button>
                          )}

                          <button
                            onClick={() => setEditingDriver(d)}
                            title="Edit Driver"
                            className="p-1.5 rounded-lg bg-[#262B35] text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteDriver(d.id, d.driver_code, d.name)}
                            title="Delete Driver ID"
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Enroll Driver Modal */}
          {isAddDriverOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#161920] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#262B35] shadow-2xl text-[#E0E0E0]">
                <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
                  <h4 className="font-bold text-white text-base">Enroll New Driver</h4>
                  <button onClick={() => setIsAddDriverOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Driver Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Gowda"
                      value={newDriver.name}
                      onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Driver ID / Badge Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DRV-106"
                      value={newDriver.driver_code}
                      onChange={e => setNewDriver({ ...newDriver, driver_code: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none uppercase"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Driver can log in using this ID with default pin <strong>pass123</strong>.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Mobile Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9845012345"
                      value={newDriver.phone}
                      onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">
                      Driver Login Password
                    </label>
                    <div className="relative">
                      <input
                        type={showDriverPassword ? 'text' : 'password'}
                        required
                        placeholder="Assign password (e.g. pass123 or karnataka@106)"
                        value={newDriver.password}
                        onChange={e => setNewDriver({ ...newDriver, password: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 pr-10 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDriverPassword(!showDriverPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showDriverPassword ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-emerald-400 mt-1 block">
                      Driver will log in with their Driver Code & this password on the mobile app.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Assigned Vehicle</label>
                    <select
                      value={newDriver.assigned_bus_id}
                      onChange={e => setNewDriver({ ...newDriver, assigned_bus_id: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- No Bus Assigned --</option>
                      {buses.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.registration_number} ({b.fleet_number} - {b.model})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Assigned Route Corridor</label>
                    <select
                      value={newDriver.assigned_route_id}
                      onChange={e => setNewDriver({ ...newDriver, assigned_route_id: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- No Route Assigned --</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>
                          Route {r.route_number} - {r.route_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                    <button type="button" onClick={() => setIsAddDriverOpen(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">Enroll Driver</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Driver Modal */}
          {editingDriver && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#161920] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#262B35] shadow-2xl text-[#E0E0E0]">
                <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
                  <h4 className="font-bold text-white text-base">Edit Driver Profile</h4>
                  <button onClick={() => setEditingDriver(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUpdateDriver} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Driver Full Name</label>
                    <input
                      type="text"
                      required
                      value={editingDriver.name}
                      onChange={e => setEditingDriver({ ...editingDriver, name: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Driver ID / Code</label>
                    <input
                      type="text"
                      required
                      value={editingDriver.driver_code}
                      onChange={e => setEditingDriver({ ...editingDriver, driver_code: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white focus:border-blue-500 focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      value={editingDriver.phone}
                      onChange={e => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Duty Status</label>
                    <select
                      value={editingDriver.status}
                      onChange={e => setEditingDriver({ ...editingDriver, status: e.target.value as any })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="available">Available / Active</option>
                      <option value="on_trip">On Active Trip</option>
                      <option value="off_duty">Off Duty / Rest</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Assigned Vehicle</label>
                    <select
                      value={editingDriver.assigned_bus_id || ''}
                      onChange={e => setEditingDriver({ ...editingDriver, assigned_bus_id: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- No Bus Assigned --</option>
                      {buses.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.registration_number} ({b.fleet_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Assigned Corridor</label>
                    <select
                      value={editingDriver.assigned_route_id || ''}
                      onChange={e => setEditingDriver({ ...editingDriver, assigned_route_id: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- No Route Assigned --</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>
                          Route {r.route_number} - {r.route_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">
                      Reset / Change Driver Password
                    </label>
                    <input
                      type="text"
                      placeholder={`Current: ${editingDriver.password || 'pass123'} (Enter new password to change)`}
                      value={editDriverPassword}
                      onChange={e => setEditDriverPassword(e.target.value)}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Leave blank to retain current password.
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                    <button type="button" onClick={() => setEditingDriver(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BUSES FLEET */}
      {activeTab === 'buses' && (
        <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Vehicle Fleet Registry ({buses.length} Buses)</h3>
              <p className="text-xs text-slate-400">Fleet telemetry, depot assignment, and maintenance control.</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Registration / Depot..."
                  value={busSearch}
                  onChange={e => setBusSearch(e.target.value)}
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setIsAddBusOpen(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vehicle</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1C212B] text-slate-400 uppercase text-[10px] font-bold border-b border-[#262B35]">
                <tr>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Fleet Code</th>
                  <th className="py-3 px-4">Model & Class</th>
                  <th className="py-3 px-4">Depot</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B35] text-slate-300">
                {filteredBuses.map(b => (
                  <tr key={b.id} className="hover:bg-[#1C212B]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">{b.registration_number}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{b.fleet_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">{b.model}</td>
                    <td className="py-3 px-4">{b.depot}</td>
                    <td className="py-3 px-4">{b.capacity} Seats</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        b.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingBus(b)}
                          className="p-1.5 rounded-lg bg-[#262B35] text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBus(b.id, b.registration_number)}
                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Bus Modal */}
          {isAddBusOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#161920] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#262B35] shadow-2xl text-[#E0E0E0]">
                <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
                  <h4 className="font-bold text-white text-base">Add New Bus to Fleet</h4>
                  <button onClick={() => setIsAddBusOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateBus} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Registration Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KA 01 F 9988"
                      value={newBus.registration_number}
                      onChange={e => setNewBus({ ...newBus, registration_number: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Fleet Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KSRTC-BLR-120"
                      value={newBus.fleet_number}
                      onChange={e => setNewBus({ ...newBus, fleet_number: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Model / Service Class</label>
                    <input
                      type="text"
                      value={newBus.model}
                      onChange={e => setNewBus({ ...newBus, model: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Depot</label>
                      <input
                        type="text"
                        value={newBus.depot}
                        onChange={e => setNewBus({ ...newBus, depot: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Capacity</label>
                      <input
                        type="number"
                        value={newBus.capacity}
                        onChange={e => setNewBus({ ...newBus, capacity: Number(e.target.value) })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                    <button type="button" onClick={() => setIsAddBusOpen(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">Save Bus</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Bus Modal */}
          {editingBus && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#161920] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#262B35] shadow-2xl text-[#E0E0E0]">
                <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
                  <h4 className="font-bold text-white text-base">Edit Bus {editingBus.registration_number}</h4>
                  <button onClick={() => setEditingBus(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleUpdateBus} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Registration Number</label>
                    <input
                      type="text"
                      required
                      value={editingBus.registration_number}
                      onChange={e => setEditingBus({ ...editingBus, registration_number: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Model</label>
                    <input
                      type="text"
                      value={editingBus.model}
                      onChange={e => setEditingBus({ ...editingBus, model: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Status</label>
                    <select
                      value={editingBus.status}
                      onChange={e => setEditingBus({ ...editingBus, status: e.target.value as any })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="in_service">In Service</option>
                      <option value="active">Active Standby</option>
                      <option value="maintenance">Maintenance / Depot</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                    <button type="button" onClick={() => setEditingBus(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">Update Bus</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STOPS & QR SIGNAGE */}
      {activeTab === 'stops' && (
        <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Bus Stops & Shelter Signage ({stops.length} Stops)</h3>
              <p className="text-xs text-slate-400">Manage 4-digit Stop codes, GPS locations, Kannada labels, and printable QR codes.</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Stop Name / Code..."
                  value={stopSearch}
                  onChange={e => setStopSearch(e.target.value)}
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setIsAddStopOpen(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Stop</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredStops.map(s => (
              <div key={s.id} className="p-4 rounded-2xl border border-[#262B35] bg-[#1C212B] flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                      Stop ID #{s.stop_code}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{s.zone || 'Central'}</span>
                  </div>
                  <div className="font-bold text-sm text-white pt-1">{s.name}</div>
                  {s.name_kannada && <div className="text-xs text-slate-400">{s.name_kannada}</div>}
                  <div className="text-[10px] font-mono text-slate-500">
                    GPS: {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#262B35] text-xs">
                  <button
                    onClick={() => setViewingQrStop(s)}
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-[11px]"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Print QR Code</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingStop(s)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStop(s.id, s.name)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Stop Modal */}
          {isAddStopOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#161920] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#262B35] shadow-2xl text-[#E0E0E0]">
                <div className="flex items-center justify-between border-b border-[#262B35] pb-3">
                  <h4 className="font-bold text-white text-base">Add New Bus Stop</h4>
                  <button onClick={() => setIsAddStopOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateStop} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Stop Name (English)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mandya Bus Stand"
                      value={newStop.name}
                      onChange={e => setNewStop({ ...newStop, name: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Stop Name (Kannada)</label>
                    <input
                      type="text"
                      placeholder="e.g. ಮಂಡ್ಯ ಬಸ್ ನಿಲ್ದಾಣ"
                      value={newStop.name_kannada}
                      onChange={e => setNewStop({ ...newStop, name_kannada: e.target.value })}
                      className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">4-Digit Stop Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1006"
                        value={newStop.stop_code}
                        onChange={e => setNewStop({ ...newStop, stop_code: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Zone / Sector</label>
                      <input
                        type="text"
                        placeholder="e.g. South Corridor"
                        value={newStop.zone}
                        onChange={e => setNewStop({ ...newStop, zone: e.target.value })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={newStop.latitude}
                        onChange={e => setNewStop({ ...newStop, latitude: Number(e.target.value) })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-400 uppercase mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={newStop.longitude}
                        onChange={e => setNewStop({ ...newStop, longitude: Number(e.target.value) })}
                        className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-mono text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-[#262B35]">
                    <button type="button" onClick={() => setIsAddStopOpen(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">Save Stop</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* QR Code Modal for Printable Signage */}
          {viewingQrStop && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-[#141720] rounded-3xl max-w-sm w-full p-6 border border-[#262B3A] shadow-2xl text-center space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => setViewingQrStop(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-white p-4 rounded-2xl mx-auto inline-block shadow-lg">
                  {/* Generated clean QR SVG representation */}
                  <div className="w-48 h-48 bg-slate-900 flex flex-col items-center justify-center rounded-xl p-3 text-white text-center">
                    <QrCode className="w-24 h-24 text-blue-400" />
                    <span className="text-[10px] font-mono text-slate-300 mt-2 font-bold">KSRTC SMARTTRACK</span>
                    <span className="text-xs font-mono font-extrabold text-amber-400">STOP #{viewingQrStop.stop_code}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white text-base">{viewingQrStop.name}</h4>
                  {viewingQrStop.name_kannada && (
                    <p className="text-xs text-slate-400">{viewingQrStop.name_kannada}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Scan for instant Kannada & English live bus arrivals and IVR voice updates.
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Shelter Signage</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ADMIN FLEET & OFFICERS ROSTER */}
      {activeTab === 'admins' && (
        <AdminStaffManager onStatusMessage={showStatus} />
      )}

      {/* TAB: ENTERPRISE DATABASE & AUDIT TRAIL */}
      {activeTab === 'database' && (
        <DatabaseDiagnosticsManager buses={buses} onStatusMessage={showStatus} />
      )}

      {/* TAB 6: DENSITY TRENDS */}
      {activeTab === 'density' && (
        <div className="space-y-6">
          <HourlyPassengerDensityChart />
        </div>
      )}

      {/* TAB 7: GRIEVANCES & PASSENGER REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
          <h3 className="font-bold text-white text-base">Passenger Grievances & Service Reports</h3>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No open passenger grievances reported.</div>
            ) : (
              reports.map(r => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-[#262B35] bg-[#1C212B] flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase font-mono">
                        {r.report_type.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-200">{r.description}</p>
                    <div className="text-[11px] font-mono text-slate-400">
                      Bus ID: {r.bus_id || 'N/A'} • Status: <strong className="uppercase text-slate-200">{r.status}</strong>
                    </div>
                  </div>

                  {r.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolveReport(r.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-colors shrink-0 shadow"
                    >
                      Resolve Grievance
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 8: GOOGLE WORKSPACE (DRIVE, TASKS, DOCS) */}
      {activeTab === 'workspace' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GoogleWorkspaceHub />
        </div>
      )}

      {/* TAB 9: SECURITY FIREWALL & WAF */}
      {activeTab === 'firewall' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <SecurityFirewallPanel />
        </div>
      )}

      {/* Route Stops Manager Modal */}
      {selectedRouteForStops && (
        <RouteStopsManagerModal
          route={selectedRouteForStops}
          allStops={stops}
          onClose={() => setSelectedRouteForStops(null)}
          onUpdate={() => {
            loadAllAdminData();
            // Also refresh selected route in state
            api.getRoutes().then(res => {
              const updated = (res.routes || []).find(r => r.id === selectedRouteForStops.id);
              if (updated) setSelectedRouteForStops(updated);
            });
          }}
        />
      )}
    </div>
  );
};
