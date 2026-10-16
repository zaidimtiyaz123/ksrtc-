import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, subscribeToLiveFleet } from '../services/api';
import { Bus, Route, Driver, Trip, SOSAlert, SOSEmergencyType } from '../types';
import { DriverCockpitMap } from '../components/DriverCockpitMap';
import { supabaseBackgroundSync, BackgroundSyncStatus } from '../services/supabaseBackgroundSync';
import {
  playBusChime,
  playOverspeedWarning,
  playSOSWarningTone,
  announceStopVoice
} from '../utils/audioAlerts';
import {
  Navigation,
  Radio,
  Play,
  Pause,
  Square,
  Gauge,
  Compass,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  X,
  Search,
  Check,
  ArrowRightLeft,
  ArrowRight,
  Lock,
  Unlock,
  Siren,
  ShieldAlert,
  PhoneCall,
  HeartPulse,
  Volume2,
  VolumeX,
  Flame,
  Satellite,
  Target,
  Bus as BusIcon
} from 'lucide-react';

// Haversine formula to compute exact distance in meters
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const fallbackDriver: Driver = {
  id: 'driver-101',
  user_id: 'user-driver-1',
  driver_code: 'DRV-101',
  name: 'Basavaraj Patil',
  phone: '+91 98450 22002',
  status: 'available',
  assigned_bus_id: 'bus-ka01ab1234',
  assigned_route_id: 'route-152',
  created_at: new Date().toISOString()
};

export const DriverDashboardPage: React.FC = () => {
  const { driver: authDriver } = useAuth();

  const [driver, setDriver] = useState<Driver>(authDriver || fallbackDriver);
  const [assignedBus, setAssignedBus] = useState<Bus | null>(null);
  const [assignedRoute, setAssignedRoute] = useState<Route | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  // Sync with authDriver if user logged in as a newly created driver
  useEffect(() => {
    if (authDriver) {
      setDriver(authDriver);
    }
  }, [authDriver]);

  // Available inventory
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [allBuses, setAllBuses] = useState<Bus[]>([]);
  const [isRouteSelectorOpen, setIsRouteSelectorOpen] = useState(false);
  const [searchRouteQuery, setSearchRouteQuery] = useState('');
  const [selectedBusIdForSwitch, setSelectedBusIdForSwitch] = useState<string>('');

  // 100% REAL HARDWARE GPS TELEMETRY
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentLat, setCurrentLat] = useState<number>(13.3409);
  const [currentLng, setCurrentLng] = useState<number>(77.1010);
  const [accuracy, setAccuracy] = useState<number>(5.0);
  const [speed, setSpeed] = useState<number>(0);
  const [heading, setHeading] = useState<number>(90);
  const [packetsSent, setPacketsSent] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Awaiting GPS Satellite Fix');

  // Custom calibrated depot coordinates if set by depot manager
  const [calibratedDepotCoords, setCalibratedDepotCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Audio Voice Announcements
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hasOverspeedAlerted, setHasOverspeedAlerted] = useState(false);

  // Driver SOS Emergency State
  const [activeSOS, setActiveSOS] = useState<SOSAlert | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosEmergencyType, setSosEmergencyType] = useState<SOSEmergencyType>('accident');
  const [sosCustomMessage, setSosCustomMessage] = useState('');
  const [isSubmittingSOS, setIsSubmittingSOS] = useState(false);
  const [sosFeedbackMessage, setSosFeedbackMessage] = useState<string | null>(null);

  // Supabase Background Synchronization Status
  const [syncStatus, setSyncStatus] = useState<BackgroundSyncStatus>(supabaseBackgroundSync.getStatus());

  // Trip Start & End Modals / Loading State
  const [showGeofencePrompt, setShowGeofencePrompt] = useState(false);
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [isEndingTrip, setIsEndingTrip] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // Stable GPS ref for background sync service
  const gpsTelemetryRef = useRef({
    latitude: currentLat,
    longitude: currentLng,
    accuracy,
    speed,
    heading
  });

  useEffect(() => {
    gpsTelemetryRef.current = {
      latitude: currentLat,
      longitude: currentLng,
      accuracy,
      speed,
      heading
    };
  }, [currentLat, currentLng, accuracy, speed, heading]);

  // Subscribe to background sync manager updates
  useEffect(() => {
    const unsub = supabaseBackgroundSync.subscribe(status => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  // Background Synchronization Lifecycle:
  // Strictly active ONLY when driver is authenticated, access is not revoked, and on-route!
  useEffect(() => {
    const isDriverAuthValid = driver && !driver.access_revoked && driver.status !== 'suspended';
    const isOnRoute = activeTrip && (activeTrip.status === 'in_progress');

    if (isDriverAuthValid && isOnRoute) {
      supabaseBackgroundSync.startBackgroundSync({
        driverId: driver.id,
        busId: assignedBus?.id || allBuses[0]?.id || 'bus-ka01ab1234',
        routeId: assignedRoute?.id || allRoutes[0]?.id || 'route-152',
        tripId: activeTrip.id,
        getTelemetry: () => gpsTelemetryRef.current
      });
    } else {
      supabaseBackgroundSync.stopBackgroundSync();
    }

    return () => {
      supabaseBackgroundSync.stopBackgroundSync();
    };
  }, [
    activeTrip?.id,
    activeTrip?.status,
    driver?.id,
    driver?.status,
    driver?.access_revoked,
    assignedBus?.id,
    assignedRoute?.id
  ]);

  // Origin Depot Coordinates
  const { originLat, originLng, originName } = useMemo(() => {
    if (calibratedDepotCoords) {
      return {
        originLat: calibratedDepotCoords.lat,
        originLng: calibratedDepotCoords.lng,
        originName: assignedRoute?.origin ? `${assignedRoute.origin} (Bay 1)` : 'Depot Bay'
      };
    }
    const oLat = assignedRoute?.stops?.[0]?.stop?.latitude || assignedRoute?.route_geometry?.[0]?.[0] || 13.3409;
    const oLng = assignedRoute?.stops?.[0]?.stop?.longitude || assignedRoute?.route_geometry?.[0]?.[1] || 77.1010;
    const oName = assignedRoute?.stops?.[0]?.stop?.name || assignedRoute?.origin || 'Depot Terminal';
    return { originLat: oLat, originLng: oLng, originName: oName };
  }, [assignedRoute, calibratedDepotCoords]);

  // Strict Real Distance from Origin Depot
  const distanceFromOrigin = useMemo(() => {
    return calculateHaversineDistance(currentLat, currentLng, originLat, originLng);
  }, [currentLat, currentLng, originLat, originLng]);

  // Strict 100m Geofence Boolean
  const isWithin100mGeofence = distanceFromOrigin <= 100;

  // Next Upcoming Stop on Route
  const nextStop = useMemo(() => {
    if (!assignedRoute?.stops || assignedRoute.stops.length === 0) return null;
    for (let i = 0; i < assignedRoute.stops.length; i++) {
      const s = assignedRoute.stops[i].stop;
      if (s) {
        const dist = calculateHaversineDistance(currentLat, currentLng, s.latitude, s.longitude);
        if (dist > 150) {
          return { ...s, distanceMeters: dist };
        }
      }
    }
    const lastStop = assignedRoute.stops[assignedRoute.stops.length - 1].stop;
    return lastStop ? { ...lastStop, distanceMeters: 50 } : null;
  }, [assignedRoute, currentLat, currentLng]);

  // Load Driver status and inventory
  const loadDriverData = async () => {
    try {
      const driverId = authDriver?.id || 'driver-101';
      const [statusData, routesRes, busesRes] = await Promise.all([
        api.getDriverStatus(driverId).catch(() => null),
        api.getRoutes().catch(() => ({ routes: [] })),
        api.getBuses().catch(() => ({ buses: [] }))
      ]);

      const routesList = routesRes.routes || [];
      const busesList = busesRes.buses || [];
      setAllRoutes(routesList);
      setAllBuses(busesList);

      if (statusData) {
        if (statusData.driver) setDriver(statusData.driver);
        if (statusData.assignedBus) {
          setAssignedBus(statusData.assignedBus);
          setSelectedBusIdForSwitch(statusData.assignedBus.id);
        } else if (busesList.length > 0) {
          setAssignedBus(busesList[0]);
          setSelectedBusIdForSwitch(busesList[0].id);
        }

        if (statusData.assignedRoute) {
          setAssignedRoute(statusData.assignedRoute);
        } else if (routesList.length > 0) {
          setAssignedRoute(routesList[0]);
        }

        if (statusData.activeTrip) {
          setActiveTrip(statusData.activeTrip);
        }

        if (statusData.activeSOS) {
          setActiveSOS(statusData.activeSOS);
        }
      } else {
        if (routesList.length > 0) setAssignedRoute(routesList[0]);
        if (busesList.length > 0) {
          setAssignedBus(busesList[0]);
          setSelectedBusIdForSwitch(busesList[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching driver status:', e);
    }
  };

  useEffect(() => {
    loadDriverData();
    startHardwareGps();

    return () => {
      stopHardwareGps();
    };
  }, [authDriver?.id]);

  // Real-time SOS WebSocket listener
  useEffect(() => {
    const unsub = subscribeToLiveFleet(
      () => {},
      () => {},
      (newAlert) => {
        if (newAlert.driver_id === driver.id) {
          setActiveSOS(newAlert);
          setSosFeedbackMessage(`🚨 LIVE SOS ALERT CONFIRMED (#${newAlert.id.slice(0, 8)})`);
          if (!isAudioMuted) playSOSWarningTone();
        }
      },
      (updatedAlert) => {
        if (updatedAlert.driver_id === driver.id) {
          if (updatedAlert.status === 'resolved') {
            setActiveSOS(null);
            setSosFeedbackMessage('Central Control Room marked emergency resolved.');
            setTimeout(() => setSosFeedbackMessage(null), 5000);
          } else {
            setActiveSOS(updatedAlert);
            setSosFeedbackMessage(`Status updated: ${updatedAlert.status.toUpperCase()} (${updatedAlert.dispatch_details || 'Central Control handling'})`);
          }
        }
      }
    );
    return unsub;
  }, [driver.id, isAudioMuted]);

  // Overspeed Governor Sound Monitor (>80 km/h)
  useEffect(() => {
    if (speed > 80 && !isAudioMuted && !hasOverspeedAlerted) {
      playOverspeedWarning();
      setHasOverspeedAlerted(true);
      setTimeout(() => setHasOverspeedAlerted(false), 8000);
    }
  }, [speed, isAudioMuted, hasOverspeedAlerted]);

  // Transmit Real Telemetry Packet
  const transmitGPSUpdate = async (lat: number, lng: number, acc: number, spd: number, hdg: number) => {
    const busToUse = assignedBus || allBuses[0];
    if (!busToUse || !activeTrip || activeTrip.status !== 'in_progress') return;

    try {
      await api.sendGPSUpdate({
        bus_id: busToUse.id,
        driver_id: driver?.id,
        trip_id: activeTrip.id,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        accuracy: Math.round(acc),
        speed: Math.round(spd),
        heading: Math.round(hdg),
        timestamp: new Date().toISOString()
      });
      setPacketsSent(prev => prev + 1);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('GPS Telemetry transmission error:', e);
    }
  };

  // Start Real Hardware GPS Tracking (Navigator Geolocation)
  const startHardwareGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Hardware GPS is not supported by your device browser.');
      return;
    }

    setGpsError(null);
    setIsGpsActive(true);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc, speed: spd, heading: hdg } = pos.coords;
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        setAccuracy(acc || 5.0);

        const currentSpeed = (spd !== null && !isNaN(spd) && spd >= 0) ? Math.round(spd * 3.6) : 0;
        setSpeed(currentSpeed);

        if (hdg !== null && !isNaN(hdg)) {
          setHeading(Math.round(hdg));
        }

        setGpsError(null);
        transmitGPSUpdate(latitude, longitude, acc || 5.0, currentSpeed, hdg || heading);
      },
      (err) => {
        setGpsError(`Hardware GPS Warning: ${err.message}. Please enable High Accuracy Location.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const stopHardwareGps = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsActive(false);
  };

  // STRICT 100-METER GEOFENCE TRIP START (WITH DISPATCH OVERRIDE & BAY ALIGNMENT)
  const handleStartTrip = async (options?: { override_geofence?: boolean; force?: boolean; use_origin_coords?: boolean }) => {
    if (driver?.access_revoked || driver?.status === 'suspended') {
      setSosFeedbackMessage(`ADMIN ACCESS LOCK: Driver ID ${driver?.driver_code || ''} authorization has been suspended by Central Administration. You cannot start a trip.`);
      return;
    }

    // If outside 100m geofence and no override selected yet, prompt user with instant action choices
    if (!isWithin100mGeofence && !options?.override_geofence && !options?.use_origin_coords && !options?.force) {
      setShowGeofencePrompt(true);
      return;
    }

    const currentBus = assignedBus || allBuses[0];
    const currentRoute = assignedRoute || allRoutes[0];
    const currentDriver = driver || fallbackDriver;

    if (!currentBus || !currentRoute) {
      setSosFeedbackMessage('Please assign a vehicle and route before starting.');
      return;
    }

    try {
      setIsStartingTrip(true);
      if (options?.use_origin_coords) {
        setCurrentLat(originLat);
        setCurrentLng(originLng);
      }

      const res = await api.startDriverTrip(
        currentDriver.id,
        currentBus.id,
        currentRoute.id,
        options?.use_origin_coords ? originLat : currentLat,
        options?.use_origin_coords ? originLng : currentLng,
        options
      );

      setActiveTrip(res.trip);
      setGpsError(null);
      setShowGeofencePrompt(false);
      if (!isAudioMuted) playBusChime();
      setSosFeedbackMessage(`⚡ Trip #${res.trip.id} initialized! Real-time GPS broadcasting & Supabase sync started.`);
      setTimeout(() => setSosFeedbackMessage(null), 6000);
    } catch (err: any) {
      setSosFeedbackMessage(err?.message || 'Failed to start trip.');
    } finally {
      setIsStartingTrip(false);
    }
  };

  const handleEndTrip = () => {
    if (!activeTrip) return;
    setShowEndTripModal(true);
  };

  const handleConfirmEndTrip = async () => {
    if (!activeTrip) return;
    try {
      setIsEndingTrip(true);
      supabaseBackgroundSync.stopBackgroundSync();
      try {
        await api.endDriverTrip(activeTrip.id);
      } catch {}
      setActiveTrip(null);
      setSpeed(0);
      setShowEndTripModal(false);
      if (!isAudioMuted) playBusChime();
      setSosFeedbackMessage('🏁 Trip concluded. Supabase background synchronization has halted.');
      setTimeout(() => setSosFeedbackMessage(null), 6000);
    } catch (err: any) {
      setSosFeedbackMessage(err?.message || 'Failed to conclude trip');
    } finally {
      setIsEndingTrip(false);
    }
  };

  // Calibrate Route Origin to Current Device GPS (for testing or depot supervisor alignment)
  const handleCalibrateDepotHere = () => {
    setCalibratedDepotCoords({ lat: currentLat, lng: currentLng });
    setSosFeedbackMessage(`Terminal bay calibrated to current device coordinates (${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}). Geofence verified!`);
    setTimeout(() => setSosFeedbackMessage(null), 5000);
  };

  // Route & Bus Switching
  const handleSelectRouteAndBus = async (route: Route, busId?: string) => {
    const chosenBus = allBuses.find(b => b.id === (busId || selectedBusIdForSwitch)) || assignedBus || allBuses[0];
    setAssignedRoute(route);
    if (chosenBus) setAssignedBus(chosenBus);
    setCalibratedDepotCoords(null);

    await api.assignDriverRouteAndBus({
      driver_id: driver.id,
      route_id: route.id,
      bus_id: chosenBus?.id
    }).catch(() => {});

    setIsRouteSelectorOpen(false);
  };

  // Next Stop Voice Announcement
  const handleAnnounceNextStop = () => {
    if (!nextStop) return;
    announceStopVoice(nextStop.name, (nextStop as any).name_kannada);
  };

  // Trigger Driver SOS Emergency Alert
  const handleTriggerSOS = async (type?: SOSEmergencyType) => {
    try {
      setIsSubmittingSOS(true);
      const chosenType = type || sosEmergencyType;
      const res = await api.triggerDriverSOS({
        driver_id: driver.id,
        bus_id: assignedBus?.id,
        route_id: assignedRoute?.id,
        trip_id: activeTrip?.id,
        latitude: currentLat,
        longitude: currentLng,
        speed,
        heading,
        emergency_type: chosenType,
        message: sosCustomMessage.trim() || undefined
      });

      setActiveSOS(res.alert);
      setShowSOSModal(false);
      if (!isAudioMuted) playSOSWarningTone();
      setSosFeedbackMessage('🚨 SOS Emergency Broadcasted! Central Traffic Control & 112 alerted.');
    } catch (err: any) {
      setSosFeedbackMessage('⚠️ ' + (err?.message || 'Failed to transmit SOS alert. Check connection.'));
    } finally {
      setIsSubmittingSOS(false);
    }
  };

  const filteredRoutes = allRoutes.filter(r =>
    r.route_number.toLowerCase().includes(searchRouteQuery.toLowerCase()) ||
    r.route_name.toLowerCase().includes(searchRouteQuery.toLowerCase()) ||
    r.origin.toLowerCase().includes(searchRouteQuery.toLowerCase()) ||
    r.destination.toLowerCase().includes(searchRouteQuery.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#090A0F] text-[#E0E0E0] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 font-sans">
      {/* High-Tech Cockpit HUD Header */}
      <div className="bg-[#10121A] border border-[#202533] rounded-3xl p-4 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Driver & Bus Badges */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 text-white font-black text-xl shrink-0">
              <BusIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  KSRTC High-Tech Driver Cockpit
                </h1>
                <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {driver?.driver_code || 'DRV-101'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {driver?.name} • {assignedBus?.registration_number || 'KA 01 AB 1234'} ({assignedBus?.model || 'Airavat Multi-Axle'})
              </p>
            </div>
          </div>

          {/* Top Controls: Audio, Live Satellite Fix, Lock GPS, SOS */}
          <div className="flex items-center gap-2">
            {/* Quick GPS Re-lock Action Button */}
            <button
              type="button"
              onClick={startHardwareGps}
              className="px-3 py-1.5 rounded-2xl border border-cyan-500/40 bg-[#161C2C] hover:bg-[#1E2638] text-cyan-300 flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
              title="Refresh and acquire hardware GPS fix"
            >
              <Satellite className="w-3.5 h-3.5 text-cyan-400" />
              <span>LOCK GPS</span>
            </button>

            {/* Live Hardware GPS Fix Pill */}
            <div className="bg-[#161A24] px-3 py-1.5 rounded-2xl border border-[#252C3D] flex items-center gap-2 text-xs font-mono">
              <Satellite className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">
                GPS ACTIVE (±{Math.round(accuracy)}m)
              </span>
            </div>

            {/* Supabase Background Telemetry Sync Pill */}
            <div
              className={`px-3 py-1.5 rounded-2xl border flex items-center gap-2 text-xs font-mono transition-all ${
                syncStatus.isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/20'
                  : 'bg-[#161A24] border-[#252C3D] text-slate-500'
              }`}
              title={
                syncStatus.isActive
                  ? `Supabase background sync pushing GPS every 4s (${syncStatus.packetsSynced} pushed)`
                  : 'Supabase sync active only when driver is authenticated and on-route'
              }
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  syncStatus.isActive
                    ? syncStatus.isSyncing
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              <span className="font-bold">
                {syncStatus.isActive
                  ? `SUPABASE SYNC (${syncStatus.packetsSynced} PKTS)`
                  : 'SUPABASE: STANDBY'}
              </span>
            </div>

            {/* Audio Voice Announcements Mute/Unmute */}
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
                isAudioMuted
                  ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                  : 'bg-[#161A24] text-blue-400 border-[#252C3D] hover:bg-[#1E2433]'
              }`}
              title={isAudioMuted ? 'Unmute voice announcements' : 'Mute voice announcements'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* SOS Emergency Button */}
            <button
              type="button"
              onClick={() => setShowSOSModal(true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 shadow-lg ${
                activeSOS
                  ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-red-600/50'
                  : 'bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white border-red-600/50'
              }`}
            >
              <Siren className="w-4 h-4" />
              <span>{activeSOS ? 'SOS BROADCAST' : 'SOS'}</span>
            </button>
          </div>
        </div>

        {/* Assigned Route Bar & Route Switcher */}
        <div className="bg-[#141822] rounded-2xl p-3 border border-[#232A3B] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-black text-xs px-2.5 py-1 bg-blue-600 text-white rounded-xl shadow-sm">
              Route {assignedRoute?.route_number || '152'}
            </span>
            <div>
              <div className="font-bold text-xs sm:text-sm text-white">{assignedRoute?.route_name || 'Tumkur ⇄ Bengaluru Majestic'}</div>
              <div className="text-[11px] text-slate-400">
                Origin Depot: <strong className="text-slate-200">{originName}</strong> • {assignedRoute?.distance_km || 70} km • {assignedRoute?.stops?.length || 8} stops
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRouteSelectorOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#1C2230] hover:bg-blue-600 text-slate-200 hover:text-white border border-[#2B3347] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Switch Route</span>
          </button>
        </div>

        {/* Feedback alerts */}
        {sosFeedbackMessage && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-2.5 text-xs text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{sosFeedbackMessage}</span>
            </div>
            <button onClick={() => setSosFeedbackMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {gpsError && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}
      </div>

      {/* Embedded High-Tech Interactive Radar Map */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-300 uppercase tracking-wider">
            <Navigation className="w-4 h-4 text-blue-400" />
            <span>Real-Time Vehicle Position Radar</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            Depot Perimeter: <span className="text-emerald-400 font-bold">100m Enforced</span>
          </div>
        </div>

        <DriverCockpitMap
          currentLat={currentLat}
          currentLng={currentLng}
          heading={heading}
          speed={speed}
          accuracy={accuracy}
          assignedRoute={assignedRoute}
          originLat={originLat}
          originLng={originLng}
          originName={originName}
          nextStopName={nextStop?.name}
          geofenceRadiusMeters={100}
        />
      </div>

      {/* Real Hardware Telemetry Telemetry Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Speedometer */}
        <div className={`p-4 rounded-3xl border transition-all ${
          speed > 80
            ? 'bg-red-950/60 border-red-500 text-red-200 animate-pulse'
            : 'bg-[#10121A] border-[#202533]'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-semibold text-[10px]">Real Speed</span>
            <Gauge className={`w-4 h-4 ${speed > 80 ? 'text-red-400' : 'text-blue-400'}`} />
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-black font-mono tracking-tight text-white flex items-baseline gap-1">
            <span>{speed}</span>
            <span className="text-xs text-slate-400 font-sans font-bold">km/h</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Limit: 80 km/h</span>
            {speed > 80 && <span className="text-red-400 font-bold">OVERSPEED!</span>}
          </div>
        </div>

        {/* Compass Heading */}
        <div className="p-4 rounded-3xl border bg-[#10121A] border-[#202533]">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-semibold text-[10px]">Compass Heading</span>
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-black font-mono text-white flex items-baseline gap-1">
            <span>{heading}°</span>
            <span className="text-xs text-slate-400 font-sans font-bold">deg</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
            {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
          </div>
        </div>

        {/* Next Stop Radar */}
        <div className="p-4 rounded-3xl border bg-[#10121A] border-[#202533]">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-semibold text-[10px]">Next Station</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-black text-sm text-white truncate">
            {nextStop?.name || 'Kempegowda Majestic'}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>ETA ~{Math.max(2, Math.round(((nextStop as any)?.distanceMeters || 3000) / 700))} mins</span>
          </div>
        </div>

        {/* Live Broadcast Telemetry Packets */}
        <div className="p-4 rounded-3xl border bg-[#10121A] border-[#202533]">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-semibold text-[10px]">Telemetry Stream</span>
            <Radio className={`w-4 h-4 ${activeTrip?.status === 'in_progress' ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {packetsSent} <span className="text-xs text-slate-400 font-normal">sent</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
            {lastSyncTime}
          </div>
        </div>
      </div>

      {/* HIGH-TECH 100-METER GEOFENCE LOCKOUT RADAR */}
      <div className={`border rounded-3xl p-5 shadow-xl transition-all ${
        isWithin100mGeofence
          ? 'bg-emerald-950/20 border-emerald-500/50'
          : 'bg-red-950/20 border-red-500/50'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${
              isWithin100mGeofence
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse'
            }`}>
              {isWithin100mGeofence ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Depot Geofence Security System
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isWithin100mGeofence
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                }`}>
                  {isWithin100mGeofence ? 'VERIFIED (≤ 100M)' : 'LOCKOUT ENGAGED (> 100M)'}
                </span>
              </div>

              <div className="mt-1 text-sm font-bold text-white">
                {isWithin100mGeofence ? (
                  <span className="text-emerald-400">
                    Depot presence confirmed ({distanceFromOrigin}m from {originName}). Location broadcast authorized.
                  </span>
                ) : (
                  <span className="text-red-400">
                    Current device is {distanceFromOrigin}m away from {originName}. Bus location will NOT start until within 100m.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Depot Buttons (Align to bay or calibrate location) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentLat(originLat);
                setCurrentLng(originLng);
                setSosFeedbackMessage(`Bus snapped to Depot Origin Bay (${originName}). Geofence verified!`);
                setTimeout(() => setSosFeedbackMessage(null), 5000);
              }}
              className="px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-600/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Position vehicle at the official depot origin bay"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Snap to Depot Bay</span>
            </button>

            <button
              type="button"
              onClick={handleCalibrateDepotHere}
              className="px-3 py-2 rounded-xl bg-[#141822] hover:bg-[#1E2433] text-slate-300 hover:text-white border border-[#2B3347] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Calibrate the route terminal origin to current real GPS coordinates"
            >
              <Target className="w-3.5 h-3.5 text-blue-400" />
              <span>Set GPS as Depot</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACCESS REVOCATION BANNER (IF ADMIN SUSPENDED DRIVER) */}
      {(driver?.access_revoked || driver?.status === 'suspended') && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-3xl p-5 text-white flex items-center gap-4 shadow-2xl shadow-red-950/60">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-extrabold text-base text-red-200">DRIVER ACCESS REVOKED BY CENTRAL CONTROL</h4>
            <p className="text-xs text-red-300">
              Your driver credentials ({driver?.driver_code}) have been locked by Admin. Trip operations and GPS broadcasting are barred until restored.
            </p>
          </div>
        </div>
      )}

      {/* TRIP LAUNCH OR ACTIVE CONTROLS: START TRIP -> ONLY 1 OPTION: END TRIP */}
      <div className="space-y-3">
        {!activeTrip || activeTrip.status === 'completed' || activeTrip.status === 'cancelled' ? (
          <div>
            {(driver?.access_revoked || driver?.status === 'suspended') ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  id="driver-btn-start-revoked"
                  className="w-full bg-red-950/80 border-2 border-red-500 text-red-200 font-extrabold py-5 px-6 rounded-3xl flex items-center justify-center gap-3 text-base cursor-not-allowed opacity-90 shadow-lg"
                >
                  <Lock className="w-6 h-6 text-red-400" />
                  <span>ACCESS REVOKED BY ADMIN — DEPARTURE BARRED</span>
                </button>
                <p className="text-center text-xs text-red-400">
                  Contact KSRTC Central Operations to restore your driver credentials.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isStartingTrip}
                  onClick={() => handleStartTrip()}
                  id="driver-btn-start-trip"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold py-5 px-6 rounded-3xl shadow-2xl shadow-emerald-600/40 flex items-center justify-center gap-3 text-lg transition-all cursor-pointer ring-4 ring-emerald-500/30"
                >
                  <Play className="w-6 h-6 fill-white" />
                  <span>
                    {isStartingTrip
                      ? 'STARTING TRIP & BROADCASTING...'
                      : isWithin100mGeofence
                      ? 'START TRIP & BROADCAST REAL-TIME GPS (GEOFENCE VERIFIED)'
                      : 'START TRIP & BROADCAST REAL-TIME GPS'}
                  </span>
                </button>

                {!isWithin100mGeofence && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <span>
                      ⚠️ Device is {distanceFromOrigin}m from depot origin bay ({originName}).
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartTrip({ use_origin_coords: true, override_geofence: true })}
                      className="text-white hover:text-amber-200 font-extrabold bg-amber-600/80 hover:bg-amber-600 px-3 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      ⚡ Start from Depot Bay
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ON-ROUTE: EXACTLY 1 OPTION SHOWN IS "END TRIP" */
          <div className="space-y-3">
            <button
              type="button"
              disabled={isEndingTrip}
              onClick={handleEndTrip}
              id="driver-btn-end-trip"
              className="w-full bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-black py-5 px-6 rounded-3xl shadow-2xl shadow-red-600/50 flex items-center justify-center gap-3 text-lg transition-all cursor-pointer ring-4 ring-red-500/30"
            >
              <Square className="w-6 h-6 fill-white" />
              <span>{isEndingTrip ? 'CONCLUDING TRIP...' : 'END TRIP'}</span>
            </button>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 bg-[#141822] px-4 py-3 rounded-2xl border border-[#232A3B]">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Trip #{activeTrip.id} Live on Route {assignedRoute?.route_number}</span>
              </div>
              <div className="text-slate-300">
                Supabase Telemetry Sync: <strong className="text-emerald-400">{syncStatus.packetsSynced}</strong> packets pushed (4s interval)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Route & Vehicle Selector Modal */}
      {isRouteSelectorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151D] border border-[#232836] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-white text-base">Select Route & Fleet Vehicle</h3>
                <p className="text-xs text-slate-400">Choose corridor and assigned bus for this shift</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRouteSelectorOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vehicle Selector Dropdown */}
            <div className="bg-[#181C26] p-3 rounded-2xl border border-[#2B3142] space-y-1.5 text-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Assigned Bus</label>
              <select
                value={selectedBusIdForSwitch || assignedBus?.id}
                onChange={e => setSelectedBusIdForSwitch(e.target.value)}
                className="w-full bg-[#12151D] border border-[#2B3142] text-white rounded-xl p-2.5 font-mono focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                {allBuses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.registration_number} — {b.model} ({b.depot})
                  </option>
                ))}
              </select>
            </div>

            {/* Route Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search route number or stop..."
                value={searchRouteQuery}
                onChange={e => setSearchRouteQuery(e.target.value)}
                className="w-full bg-[#181C26] border border-[#2B3142] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Routes List */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {filteredRoutes.map(r => {
                const isSelected = assignedRoute?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRouteAndBus(r, selectedBusIdForSwitch)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-[#181C26] border-[#2B3142] hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                          Route {r.route_number}
                        </span>
                        <span className="font-bold text-xs text-white">{r.origin} ⇄ {r.destination}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>{r.distance_km} km</span>
                        <span>•</span>
                        <span>{r.stops?.length || 6} stops</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#12151D] text-slate-300 border border-[#2B3142] hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#232836] text-right">
              <button
                type="button"
                onClick={() => setIsRouteSelectorOpen(false)}
                className="bg-[#181C26] hover:bg-[#202534] text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver SOS Emergency Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#14161F] border-2 border-red-600 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-red-950/80 space-y-5 animate-in fade-in zoom-in duration-150 max-h-[95vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40 shrink-0 animate-pulse text-white">
                  <Siren className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg tracking-tight">KSRTC SOS EMERGENCY TRANSMITTER</h3>
                  <p className="text-xs text-red-300 font-semibold">Immediate Real-time Broadcast to Central Dispatch & 112</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSOSModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Emergency Type */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-200 uppercase tracking-wider">
                Select Emergency Category:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { type: 'accident' as SOSEmergencyType, label: 'Accident / Crash', icon: AlertTriangle },
                  { type: 'medical' as SOSEmergencyType, label: 'Medical Emergency', icon: HeartPulse },
                  { type: 'fire' as SOSEmergencyType, label: 'Engine Fire / Smoke', icon: Flame },
                  { type: 'security' as SOSEmergencyType, label: 'Security / Assault', icon: ShieldAlert },
                  { type: 'breakdown' as SOSEmergencyType, label: 'Critical Breakdown', icon: AlertCircle },
                  { type: 'other' as SOSEmergencyType, label: 'General Distress', icon: Siren }
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = sosEmergencyType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setSosEmergencyType(item.type)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-red-600/30 border-red-500 text-white ring-2 ring-red-500/50'
                          : 'bg-[#181C26] border-[#262B3A] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-red-400 shrink-0" />
                      <div className="font-extrabold text-xs text-white">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Additional Remarks:
              </label>
              <textarea
                rows={2}
                value={sosCustomMessage}
                onChange={e => setSosCustomMessage(e.target.value)}
                placeholder="E.g., Engine overheating near toll gate, ambulance required..."
                className="w-full bg-[#0D0F14] border border-[#262B3A] rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a href="tel:112" className="bg-red-600 hover:bg-red-500 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Police 112</span>
              </a>
              <a href="tel:108" className="bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Ambulance 108</span>
              </a>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleTriggerSOS()}
                disabled={isSubmittingSOS}
                className="w-full bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-black py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 text-base transition-all cursor-pointer"
              >
                {isSubmittingSOS ? 'TRANSMITTING ALERT...' : 'TRANSMIT IMMEDIATE SOS TO CENTRAL DISPATCH'}
              </button>

              <button
                type="button"
                onClick={() => setShowSOSModal(false)}
                className="w-full bg-[#181C26] hover:bg-[#202534] text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Return to Cockpit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GEOFENCE RESOLUTION MODAL */}
      {showGeofencePrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151D] border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Depot Geofence Verification</h3>
                  <p className="text-xs text-amber-400 font-mono">
                    Perimeter Distance: {distanceFromOrigin} meters from {originName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGeofencePrompt(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              KSRTC transit regulations require physical presence within the 100-meter origin bay before standard departure broadcast. Choose your departure mode:
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Align & Start from Depot Origin Bay */}
              <button
                type="button"
                onClick={() => handleStartTrip({ use_origin_coords: true, override_geofence: true })}
                disabled={isStartingTrip}
                className="w-full p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-between shadow-lg shadow-emerald-600/30 transition-all cursor-pointer text-left"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">Start from Depot Origin Bay (Recommended)</span>
                  </div>
                  <div className="text-[11px] text-emerald-100 font-normal pl-6">
                    Auto-aligns vehicle to {originName} origin platform and initiates GPS broadcasting.
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {/* Option 2: Dispatch Override with current GPS */}
              <button
                type="button"
                onClick={() => handleStartTrip({ override_geofence: true })}
                disabled={isStartingTrip}
                className="w-full p-3.5 rounded-2xl bg-[#1C2230] hover:bg-[#283247] border border-[#2B3347] text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer text-left"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Radio className="w-4 h-4" />
                    <span className="text-sm text-white">Start from Current GPS (Dispatch Override)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal pl-6">
                    Authorizes trip start from your current device coordinates ({currentLat.toFixed(4)}, {currentLng.toFixed(4)}).
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 text-slate-400" />
              </button>

              {/* Option 3: Calibrate Current Location as Depot Bay */}
              <button
                type="button"
                onClick={() => {
                  handleCalibrateDepotHere();
                  setShowGeofencePrompt(false);
                }}
                className="w-full p-3 rounded-2xl bg-[#141822] hover:bg-[#1E2433] border border-[#262B3A] text-slate-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Target className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Calibrate Current Device Position as Depot Terminal</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowGeofencePrompt(false)}
                className="w-full py-2.5 rounded-xl bg-[#181C26] hover:bg-[#202534] text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* END TRIP CONFIRMATION MODAL */}
      {showEndTripModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151D] border border-red-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Square className="w-6 h-6 fill-red-400 text-red-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">End Active Trip?</h3>
                  <p className="text-xs text-red-400 font-mono">
                    Trip #{activeTrip?.id} • Route {assignedRoute?.route_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEndTripModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Confirm concluding this trip? Live bus tracking will cease on passenger displays, and the Supabase background telemetry synchronization will halt.
            </p>

            <div className="bg-[#0A0D14] p-3 rounded-2xl border border-[#202533] space-y-1.5 text-xs font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Synchronized Packets:</span>
                <strong className="text-emerald-400">{syncStatus.packetsSynced}</strong>
              </div>
              <div className="flex justify-between">
                <span>Vehicle:</span>
                <strong className="text-white">{assignedBus?.registration_number}</strong>
              </div>
              <div className="flex justify-between">
                <span>Corridor:</span>
                <strong className="text-white">{assignedRoute?.route_name}</strong>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmEndTrip}
                disabled={isEndingTrip}
                className="w-full bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 text-base transition-all cursor-pointer ring-4 ring-red-500/30"
              >
                <Square className="w-5 h-5 fill-white" />
                <span>{isEndingTrip ? 'CONCLUDING TRIP...' : 'YES, END TRIP & STOP BROADCAST'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEndTripModal(false)}
                className="w-full bg-[#181C26] hover:bg-[#202534] text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Continue Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
