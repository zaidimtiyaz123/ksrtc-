import { db } from '../db/database.js';
import { broadcastLocationUpdate, broadcastFleetSnapshot, broadcastEmergencySOS, broadcastSOSUpdate } from '../websocket/liveServer.js';
import { BusLocation, LiveBusTelemetry, SOSAlert } from '../../src/types/index.js';

interface SimulatedBusState {
  busId: string;
  routeId: string;
  driverId: string;
  tripId: string;
  progress: number; // 0.0 to 1.0 along the route geometry
  direction: 1 | -1; // 1 = origin to destination, -1 = return trip
  baseSpeed: number; // km/h
  currentSpeed: number;
  trafficDelayMinutes: number;
  hasDeviation: boolean;
  sosAlertId?: string;
  passengerCount: number;
  status: 'LIVE' | 'STALE' | 'OFFLINE';
}

class FleetSimulationService {
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private tickIntervalMs: number = 2500; // 2.5 seconds per tick
  private speedMultiplier: number = 2.0; // 2x simulation speed for lively map experience
  private busStates: Map<string, SimulatedBusState> = new Map();
  private lastTickTime: number = Date.now();

  constructor() {
    this.initDefaultFleet();
  }

  private initDefaultFleet() {
    // Setup initial states for realistic routes
    const defaultConfigs: Array<{ busId: string; routeId: string; driverId: string; tripId: string; initProgress: number; baseSpeed: number }> = [
      {
        busId: 'bus-ka01ab1234',
        routeId: 'route-152', // Tumkur ⇄ Bengaluru
        driverId: 'driver-101',
        tripId: 'trip-152-101',
        initProgress: 0.35,
        baseSpeed: 58
      },
      {
        busId: 'bus-ka09cd5678',
        routeId: 'route-302', // Mysuru ⇄ Bengaluru
        driverId: 'driver-102',
        tripId: 'trip-302-102',
        initProgress: 0.52,
        baseSpeed: 72
      },
      {
        busId: 'bus-ka13ef9012',
        routeId: 'route-201', // Hassan ⇄ Bengaluru
        driverId: 'driver-103',
        tripId: 'trip-201-103',
        initProgress: 0.22,
        baseSpeed: 60
      },
      {
        busId: 'bus-ka25gh3456',
        routeId: 'route-501', // Hubballi/Davanagere ⇄ Bengaluru
        driverId: 'driver-104',
        tripId: 'trip-501-104',
        initProgress: 0.70,
        baseSpeed: 65
      }
    ];

    for (const cfg of defaultConfigs) {
      this.busStates.set(cfg.busId, {
        busId: cfg.busId,
        routeId: cfg.routeId,
        driverId: cfg.driverId,
        tripId: cfg.tripId,
        progress: cfg.initProgress,
        direction: 1,
        baseSpeed: cfg.baseSpeed,
        currentSpeed: cfg.baseSpeed,
        trafficDelayMinutes: 0,
        hasDeviation: false,
        passengerCount: Math.floor(Math.random() * 20) + 24,
        status: 'LIVE'
      });
    }
  }

  public start() {
    this.stop();
    console.log('[Simulation Engine] Simulation disabled for production deployment.');
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[Simulation Engine] Paused fleet simulation');
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public setSpeed(multiplier: number) {
    this.speedMultiplier = Math.max(0.5, Math.min(20, multiplier));
    console.log(`[Simulation Engine] Set speed multiplier to ${this.speedMultiplier}x`);
  }

  public getStatus() {
    return {
      running: this.isRunning,
      speedMultiplier: this.speedMultiplier,
      tickIntervalMs: this.tickIntervalMs,
      activeBusesCount: this.busStates.size,
      buses: Array.from(this.busStates.values()).map(s => {
        const bus = db.buses.find(b => b.id === s.busId);
        const route = db.routes.find(r => r.id === s.routeId);
        return {
          busId: s.busId,
          registration: bus?.registration_number,
          routeNumber: route?.route_number,
          routeName: route?.route_name,
          progressPercent: Math.round(s.progress * 100),
          speedKmH: s.currentSpeed,
          status: s.status,
          hasDeviation: s.hasDeviation,
          sosAlertId: s.sosAlertId,
          trafficDelayMinutes: s.trafficDelayMinutes,
          passengerCount: s.passengerCount
        };
      })
    };
  }

  public resetAll() {
    for (const state of this.busStates.values()) {
      state.progress = 0.05;
      state.direction = 1;
      state.trafficDelayMinutes = 0;
      state.hasDeviation = false;
      state.sosAlertId = undefined;
    }
    this.tick();
  }

  public triggerSOS(busId: string = 'bus-ka01ab1234', reason: string = 'Simulated Emergency: Medical Assistance Required'): SOSAlert {
    let state = this.busStates.get(busId);
    if (!state) {
      state = Array.from(this.busStates.values())[0];
    }
    if (!state) throw new Error('No simulated bus found');

    const bus = db.buses.find(b => b.id === state.busId);
    const route = db.routes.find(r => r.id === state.routeId);
    const driver = db.drivers.find(d => d.id === state.driverId);
    const latestLoc = db.getLatestLocation(state.busId);

    const alertId = `sos-sim-${Date.now()}`;
    const alert: SOSAlert = {
      id: alertId,
      bus_id: state.busId,
      driver_id: state.driverId,
      trip_id: state.tripId,
      route_id: state.routeId,
      latitude: latestLoc?.latitude || 13.0988,
      longitude: latestLoc?.longitude || 77.3912,
      speed: state.currentSpeed,
      heading: 90,
      driver_name: driver?.name || 'Basavaraj Patil',
      driver_phone: driver?.phone || '+91 98450 22002',
      bus_registration: bus?.registration_number || 'KA 01 AB 1234',
      fleet_number: bus?.fleet_number || 'KSRTC-EXP-101',
      route_name: route?.route_name || 'Tumkur ⇄ Bengaluru',
      emergency_type: 'medical',
      status: 'active',
      message: `${reason} (Near ${latestLoc?.next_stop_name || 'Highway Corridor'})`,
      created_at: new Date().toISOString()
    };

    db.sosAlerts.unshift(alert);
    state.sosAlertId = alertId;
    broadcastEmergencySOS(alert);
    return alert;
  }

  public resolveSOS(alertId?: string) {
    const alert = alertId 
      ? db.sosAlerts.find(a => a.id === alertId)
      : db.sosAlerts.find(a => a.status === 'active');

    if (alert) {
      alert.status = 'resolved';
      alert.resolved_at = new Date().toISOString();
      alert.resolution_notes = 'Simulated Emergency Drill cleared by Central Dispatch Controller.';
      broadcastSOSUpdate(alert);

      for (const s of this.busStates.values()) {
        if (s.sosAlertId === alert.id) {
          s.sosAlertId = undefined;
        }
      }
    }
  }

  public triggerTraffic(routeId: string = 'route-152', delayMinutes: number = 20) {
    for (const state of this.busStates.values()) {
      if (state.routeId === routeId) {
        state.trafficDelayMinutes = delayMinutes;
        state.currentSpeed = Math.max(12, Math.round(state.baseSpeed * 0.35));
      }
    }
  }

  public triggerDeviation(busId: string = 'bus-ka01ab1234') {
    const state = this.busStates.get(busId);
    if (state) {
      state.hasDeviation = !state.hasDeviation;
    }
  }

  // Core Simulation Tick Loop
  private tick() {
    const now = Date.now();
    const dtSeconds = Math.max(1, (now - this.lastTickTime) / 1000);
    this.lastTickTime = now;

    const timestamp = new Date().toISOString();

    for (const [busId, state] of this.busStates.entries()) {
      const bus = db.buses.find(b => b.id === busId);
      const route = db.routes.find(r => r.id === state.routeId);
      const driver = db.drivers.find(d => d.id === state.driverId);

      if (!bus || !route || !route.route_geometry || route.route_geometry.length < 2) {
        continue;
      }

      // 1. Advance Progress
      const distanceKm = route.distance_km || 100;
      // speed in km/h -> km/s = speed / 3600
      let effectiveSpeed = state.baseSpeed;
      if (state.trafficDelayMinutes > 0) {
        effectiveSpeed = Math.max(14, state.baseSpeed * 0.4);
      }
      // Add slight organic highway speed jitter (+/- 4 km/h)
      effectiveSpeed += (Math.random() - 0.5) * 6;
      effectiveSpeed = Math.round(Math.max(15, Math.min(85, effectiveSpeed)));
      state.currentSpeed = effectiveSpeed;

      const progressStep = (effectiveSpeed * this.speedMultiplier * (dtSeconds / 3600)) / distanceKm;
      state.progress += progressStep * state.direction;

      // Handle round-trip turnaround at terminus
      if (state.progress >= 0.98) {
        state.progress = 0.98;
        state.direction = -1; // turnaround towards origin
      } else if (state.progress <= 0.02) {
        state.progress = 0.02;
        state.direction = 1; // start heading to destination
      }

      // 2. Interpolate Coordinate along Route Polyline
      const { lat, lng, heading, nextStop, nextStopId, distanceToNextStopKm, etaMinutes } =
        this.interpolateRoutePosition(route, state.progress, state.direction, effectiveSpeed, state.hasDeviation);

      // 3. Store in db.busLocations
      const locationRecord: BusLocation = {
        id: `loc-sim-${bus.id}-${Date.now()}`,
        bus_id: bus.id,
        trip_id: state.tripId,
        latitude: lat,
        longitude: lng,
        accuracy: 4.5,
        speed: effectiveSpeed,
        heading: Math.round(heading),
        timestamp: timestamp,
        is_valid: true,
        deviation_flag: state.hasDeviation,
        next_stop_name: nextStop,
        next_stop_id: nextStopId,
        eta_minutes: etaMinutes + (state.trafficDelayMinutes || 0),
        distance_to_next_stop_km: distanceToNextStopKm
      };

      // Add to database locations
      db.busLocations.push(locationRecord);
      // Trim excessive breadcrumbs
      if (db.busLocations.length > 3000) {
        db.busLocations = db.busLocations.slice(-2000);
      }

      // Ensure active trip exists in db.trips
      let activeTrip = db.trips.find(t => t.id === state.tripId);
      if (!activeTrip) {
        activeTrip = {
          id: state.tripId,
          bus_id: bus.id,
          driver_id: state.driverId,
          route_id: route.id,
          status: 'in_progress',
          start_time: new Date(Date.now() - 30 * 60000).toISOString()
        };
        db.trips.push(activeTrip);
      } else {
        activeTrip.status = 'in_progress';
      }

      // 4. Construct live telemetry
      const telemetry: LiveBusTelemetry = {
        bus_id: bus.id,
        registration_number: bus.registration_number,
        fleet_number: bus.fleet_number,
        model: bus.model,
        trip_id: state.tripId,
        driver_name: driver?.name || 'KSRTC Pilot',
        driver_code: driver?.driver_code || 'DRV-101',
        route_id: route.id,
        route_number: route.route_number,
        route_name: route.route_name,
        origin: route.origin,
        destination: route.destination,
        latitude: lat,
        longitude: lng,
        accuracy: 4.5,
        speed: effectiveSpeed,
        heading: Math.round(heading),
        timestamp: timestamp,
        status: 'LIVE',
        seconds_ago: 0,
        next_stop: nextStop,
        next_stop_id: nextStopId,
        eta_minutes: etaMinutes + (state.trafficDelayMinutes || 0),
        distance_to_next_km: distanceToNextStopKm,
        trip_status: 'in_progress'
      };

      // Broadcast single bus update
      broadcastLocationUpdate(telemetry);
    }

    // Also broadcast updated fleet snapshot to all clients
    broadcastFleetSnapshot();
  }

  // Calculate coordinates & next stop along route geometry
  private interpolateRoutePosition(
    route: any,
    progress: number,
    direction: 1 | -1,
    speedKmH: number,
    simulateDeviation: boolean
  ) {
    const coords: [number, number][] = route.route_geometry;
    const n = coords.length;

    // Fractional index across geometry points
    const totalSegments = n - 1;
    const effectiveProgress = direction === 1 ? progress : 1.0 - progress;
    const floatIdx = Math.max(0, Math.min(totalSegments, effectiveProgress * totalSegments));
    const segIdx = Math.min(totalSegments - 1, Math.floor(floatIdx));
    const t = floatIdx - segIdx;

    const p1 = coords[segIdx];
    const p2 = coords[Math.min(n - 1, segIdx + 1)];

    let lat = p1[0] + (p2[0] - p1[0]) * t;
    let lng = p1[1] + (p2[1] - p1[1]) * t;

    // Calculate heading (bearing)
    const dLat = p2[0] - p1[0];
    const dLng = p2[1] - p1[1];
    let heading = Math.atan2(dLng, dLat) * (180 / Math.PI);
    if (heading < 0) heading += 360;
    if (direction === -1) {
      heading = (heading + 180) % 360;
    }

    // If simulating deviation, shift bus 350 meters off-road
    if (simulateDeviation) {
      lat += 0.0035;
      lng -= 0.0030;
    }

    // Next Stop Determination
    const routeStops = db.getRouteWithStops(route.id)?.stops || [];
    let nextStop = 'En Route';
    let nextStopId = undefined;
    let distanceToNextStopKm = 4.2;
    let etaMinutes = 6;

    if (routeStops.length > 0) {
      // Find nearest forward stop
      const sortedStops = direction === 1 ? [...routeStops] : [...routeStops].reverse();
      const currentStopIndex = Math.min(
        sortedStops.length - 1,
        Math.floor(effectiveProgress * sortedStops.length)
      );
      const targetStopItem = sortedStops[Math.min(sortedStops.length - 1, currentStopIndex + 1)] || sortedStops[sortedStops.length - 1];
      const stopEntity = targetStopItem.stop || db.stops.find(s => s.id === targetStopItem.stop_id);

      nextStop = stopEntity?.name || 'En Route';
      nextStopId = stopEntity?.id || targetStopItem.stop_id;

      // Distance estimation based on remaining progress
      const remainingProgressToStop = Math.max(0.02, 1 / sortedStops.length);
      distanceToNextStopKm = Math.round((route.distance_km || 80) * remainingProgressToStop * 10) / 10;
      etaMinutes = Math.max(2, Math.round((distanceToNextStopKm / Math.max(20, speedKmH)) * 60));
    }

    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      heading: Math.round(heading),
      nextStop,
      nextStopId,
      distanceToNextStopKm,
      etaMinutes
    };
  }
}

export const fleetSimulation = new FleetSimulationService();
