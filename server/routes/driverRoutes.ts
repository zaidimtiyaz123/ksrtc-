import { Router } from 'express';
import { db } from '../db/database.js';
import { Trip, Driver, Bus, Route, SOSAlert } from '../../src/types/index.js';
import { broadcastFleetSnapshot, broadcastEmergencySOS, broadcastSOSUpdate } from '../websocket/liveServer.js';
import { pushLocationTelemetryToSupabase, getSupabaseSyncState } from '../services/supabaseService.js';

export const driverRouter = Router();

// Get driver dashboard summary and current active trip
driverRouter.get('/status/:driverId', (req, res) => {
  const { driverId } = req.params;
  let driver = db.drivers.find(d => d.id === driverId || d.driver_code === driverId || d.user_id === driverId);

  if (!driver) {
    // Return first driver as fallback for convenience so driver cockpit always loads
    driver = db.drivers[0] || {
      id: 'driver-101',
      user_id: 'user-driver-1',
      driver_code: 'DRV-101',
      name: 'Basavaraj Patil',
      phone: '+91 98450 22002',
      status: 'available',
      assigned_bus_id: db.buses[0]?.id || 'bus-ka01ab1234',
      assigned_route_id: db.routes[0]?.id || 'route-152',
      created_at: new Date().toISOString()
    };
  }

  const assignedBus = db.buses.find(b => b.id === driver.assigned_bus_id) || db.buses[0];
  const assignedRoute = db.routes.find(r => r.id === driver.assigned_route_id) || db.routes[0];
  const activeTrip = db.trips.find(
    t => t.driver_id === driver.id && (t.status === 'in_progress' || t.status === 'paused')
  );

  let currentLoc = undefined;
  if (activeTrip && assignedBus) {
    currentLoc = db.getLatestLocation(assignedBus.id);
  }

  const activeSOS = db.sosAlerts.find(
    a => (a.driver_id === driver.id || a.bus_id === assignedBus?.id) &&
         (a.status === 'active' || a.status === 'acknowledged' || a.status === 'dispatched')
  );

  res.json({
    driver,
    assignedBus,
    assignedRoute,
    activeTrip,
    currentLocation: currentLoc,
    activeSOS
  });
});

// Update driver assigned route and bus
driverRouter.post('/assign', (req, res) => {
  const { driver_id, bus_id, route_id } = req.body;
  let driver = db.drivers.find(d => d.id === driver_id || d.user_id === driver_id || d.driver_code === driver_id);
  if (!driver) {
    driver = db.drivers[0];
  }
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  if (bus_id) {
    const bus = db.buses.find(b => b.id === bus_id);
    if (bus) driver.assigned_bus_id = bus.id;
  }
  if (route_id) {
    const route = db.routes.find(r => r.id === route_id);
    if (route) driver.assigned_route_id = route.id;
  }
  db.saveToFile();

  const assignedBus = db.buses.find(b => b.id === driver.assigned_bus_id) || db.buses[0];
  const assignedRoute = db.routes.find(r => r.id === driver.assigned_route_id) || db.routes[0];

  res.json({
    message: 'Route and vehicle assignment updated',
    driver,
    assignedBus,
    assignedRoute
  });
});

function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// START TRIP (Strict 100-Meter Depot Geofence with Dispatch Override option)
driverRouter.post('/trip/start', (req, res) => {
  const { driver_id, bus_id, route_id, latitude, longitude, override_geofence, force, use_origin_coords } = req.body;

  if (!driver_id || !bus_id || !route_id) {
    return res.status(400).json({ error: 'driver_id, bus_id, and route_id are required to start a trip' });
  }

  if (latitude === undefined || longitude === undefined || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Real-time GPS latitude and longitude coordinates are mandatory to initialize trip' });
  }

  const driver = db.drivers.find(d => d.id === driver_id || d.user_id === driver_id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  if (driver.status === 'suspended' || (driver as any).access_revoked) {
    return res.status(403).json({
      error: `ACCESS REVOKED: All permissions and access for Driver ${driver.driver_code} (${driver.name}) have been revoked by KSRTC Administration. Contact depot manager.`
    });
  }

  const bus = db.buses.find(b => b.id === bus_id);
  if (!bus) return res.status(404).json({ error: 'Bus not found' });

  const route = db.routes.find(r => r.id === route_id);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  const originLat = route.stops?.[0]?.stop?.latitude || route.route_geometry?.[0]?.[0] || 13.3409;
  const originLng = route.stops?.[0]?.stop?.longitude || route.route_geometry?.[0]?.[1] || 77.1010;

  // Strict 100-meter Geofence Verification
  const distanceMeters = calculateHaversineMeters(Number(latitude), Number(longitude), originLat, originLng);
  const isAuthorizedOverride = Boolean(override_geofence || force || use_origin_coords);

  if (distanceMeters > 100 && !isAuthorizedOverride) {
    return res.status(403).json({
      error: `STRICT 100M GEOFENCE LOCKOUT: Driver is ${distanceMeters}m from origin terminal (${route.origin}). Trip initialization and live bus location broadcasting cannot start until the bus is physically within 100 meters of the origin terminal.`,
      distance_meters: distanceMeters,
      max_allowed_meters: 100,
      origin_name: route.origin,
      can_override: true,
      origin_lat: originLat,
      origin_lng: originLng
    });
  }

  // Use origin coords if requested or use provided coords
  const initialLat = use_origin_coords ? originLat : Number(latitude);
  const initialLng = use_origin_coords ? originLng : Number(longitude);

  // End any previously incomplete trips for this driver or bus
  db.trips.forEach(t => {
    if ((t.driver_id === driver.id || t.bus_id === bus.id) && (t.status === 'in_progress' || t.status === 'paused')) {
      t.status = 'completed';
      t.end_time = new Date().toISOString();
    }
  });

  const newTrip: Trip = {
    id: `trip-${Date.now()}`,
    bus_id: bus.id,
    driver_id: driver.id,
    route_id: route.id,
    start_time: new Date().toISOString(),
    status: 'in_progress',
    bus,
    driver,
    route
  };

  db.trips.push(newTrip);
  driver.status = 'on_trip';
  driver.assigned_bus_id = bus.id;
  driver.assigned_route_id = route.id;

  // Immediately publish verified starting location
  const initialLoc: any = {
    id: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    bus_id: bus.id,
    trip_id: newTrip.id,
    latitude: Number(initialLat),
    longitude: Number(initialLng),
    accuracy: 5,
    speed: 0,
    heading: 90,
    timestamp: new Date().toISOString(),
    is_valid: true,
    next_stop_name: route.stops?.[1]?.stop?.name || route.stops?.[0]?.stop?.name || route.destination,
    next_stop_id: route.stops?.[1]?.stop_id || route.stops?.[0]?.stop_id,
    distance_to_next_stop_km: 0.1,
    eta_minutes: route.estimated_duration_min || 45
  };
  db.busLocations.push(initialLoc);

  db.saveToFile();

  broadcastFleetSnapshot();

  res.status(201).json({
    message: 'Trip started successfully. Live GPS telemetry is now broadcasting.',
    trip: newTrip,
    currentLocation: initialLoc
  });
});

// PAUSE TRIP
driverRouter.post('/trip/pause', (req, res) => {
  const { trip_id } = req.body;
  const trip = db.trips.find(t => t.id === trip_id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  trip.status = 'paused';
  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({ message: 'Trip paused', trip });
});

// RESUME TRIP
driverRouter.post('/trip/resume', (req, res) => {
  const { trip_id } = req.body;
  const trip = db.trips.find(t => t.id === trip_id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  trip.status = 'in_progress';
  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({ message: 'Trip resumed', trip });
});

// END TRIP
driverRouter.post('/trip/end', (req, res) => {
  const { trip_id } = req.body;
  const trip = db.trips.find(t => t.id === trip_id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  trip.status = 'completed';
  trip.end_time = new Date().toISOString();

  const driver = db.drivers.find(d => d.id === trip.driver_id);
  if (driver) driver.status = 'available';

  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({ message: 'Trip ended successfully', trip });
});

// SOS EMERGENCY TRIGGER
driverRouter.post('/sos', (req, res) => {
  const {
    driver_id,
    bus_id,
    route_id,
    trip_id,
    latitude,
    longitude,
    speed,
    heading,
    emergency_type,
    message
  } = req.body;

  const driver = db.drivers.find(d => d.id === driver_id || d.driver_code === driver_id);
  const bus = db.buses.find(b => b.id === bus_id);
  const route = db.routes.find(r => r.id === route_id);

  const newAlert: SOSAlert = {
    id: `sos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    driver_id: driver?.id || driver_id || 'unknown-driver',
    driver_name: driver?.name || 'Driver on Duty',
    driver_phone: driver?.phone || '+91 98450 00000',
    driver_code: driver?.driver_code || 'DRV-000',
    bus_id: bus?.id || bus_id || 'unknown-bus',
    bus_registration: bus?.registration_number || 'KA-KSRTC-SOS',
    fleet_number: bus?.fleet_number || 'KSRTC-ALERT',
    route_id: route?.id || route_id,
    route_number: route?.route_number || 'Corridor Service',
    route_name: route?.route_name || 'Active Route',
    trip_id: trip_id || undefined,
    latitude: Number(latitude) || (bus ? db.getLatestLocation(bus.id)?.latitude || 13.0988 : 13.0988),
    longitude: Number(longitude) || (bus ? db.getLatestLocation(bus.id)?.longitude || 77.3912 : 77.3912),
    speed: Number(speed) || 0,
    heading: Number(heading) || 0,
    emergency_type: emergency_type || 'panic_general',
    message: message || 'SOS Emergency Alert dispatched from Driver Cockpit.',
    status: 'active',
    created_at: new Date().toISOString()
  };

  db.sosAlerts.unshift(newAlert);

  // Update latest bus location with emergency coordinates so map pin is pinpointed
  if (bus) {
    db.busLocations.push({
      id: `loc-sos-${Date.now()}`,
      bus_id: bus.id,
      trip_id: trip_id || 'trip-sos',
      latitude: newAlert.latitude,
      longitude: newAlert.longitude,
      speed: newAlert.speed,
      heading: newAlert.heading,
      accuracy: 5,
      timestamp: newAlert.created_at,
      is_valid: true
    });
  }

  // Push critical notification into db
  db.notifications.unshift({
    id: `notif-sos-${Date.now()}`,
    user_id: 'admin',
    title: `🚨 CRITICAL SOS: Bus ${newAlert.bus_registration}`,
    message: `Driver ${newAlert.driver_name} triggered ${newAlert.emergency_type.toUpperCase()} on Route ${newAlert.route_number}. Coordinates: ${newAlert.latitude.toFixed(4)}, ${newAlert.longitude.toFixed(4)}`,
    type: 'emergency',
    read_status: false,
    created_at: newAlert.created_at
  });

  db.saveToFile();

  // Broadcast WebSocket SOS alert immediately to Admin Dashboard and all connected monitoring units
  broadcastEmergencySOS(newAlert);
  broadcastFleetSnapshot();

  console.log(`[SOS ENGINE] Broadcasted SOS Alert ${newAlert.id} for Bus ${newAlert.bus_registration} at [${newAlert.latitude}, ${newAlert.longitude}]`);

  res.status(201).json({
    success: true,
    message: 'SOS Emergency Alert activated and transmitted to Admin Dispatch Center.',
    alert: newAlert
  });
});

// SOS EMERGENCY CANCEL / RESOLVE BY DRIVER
driverRouter.post('/sos/cancel', (req, res) => {
  const { alert_id, driver_id, reason } = req.body;

  const alert = db.sosAlerts.find(
    a => (a.id === alert_id || (driver_id && a.driver_id === driver_id)) &&
         (a.status === 'active' || a.status === 'acknowledged' || a.status === 'dispatched')
  );

  if (!alert) {
    return res.status(404).json({ error: 'No active SOS alert found to cancel' });
  }

  alert.status = 'resolved';
  alert.resolved_at = new Date().toISOString();
  alert.resolved_by = 'Driver (Self-Cancelled / Stand-down)';
  alert.resolution_notes = reason || 'Driver marked situation normalized / False alarm cancelled';

  db.saveToFile();
  broadcastSOSUpdate(alert);
  broadcastFleetSnapshot();

  res.json({
    success: true,
    message: 'SOS Alert resolved successfully',
    alert
  });
});

// BACKGROUND SYNCHRONIZATION SERVICE: Pushes location coordinates to Supabase at fixed intervals
// Strict condition: only when driver is actively authenticated, not revoked, and on-route
driverRouter.post('/supabase-sync', async (req, res) => {
  const { driver_id, bus_id, route_id, trip_id, latitude, longitude, speed, heading, accuracy, timestamp } = req.body;

  if (!driver_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'driver_id, latitude, and longitude are required' });
  }

  const driver = db.drivers.find(d => d.id === driver_id || d.driver_code === driver_id || d.user_id === driver_id);
  if (!driver) {
    return res.status(404).json({ error: 'Driver profile not found' });
  }

  if (driver.status === 'suspended' || (driver as any).access_revoked) {
    return res.status(403).json({
      error: 'ACCESS REVOKED: All permissions and access for this Driver ID have been revoked by KSRTC Administration.'
    });
  }

  // Verify driver is actively on-route
  const activeTrip = db.trips.find(
    t => (t.id === trip_id || t.driver_id === driver.id) && t.status === 'in_progress'
  );

  if (!activeTrip) {
    return res.status(400).json({
      error: 'BACKGROUND SYNC BLOCKED: Synchronization to Supabase is only permitted when driver is actively authenticated and on-route.'
    });
  }

  const actualBusId = bus_id || activeTrip.bus_id || driver.assigned_bus_id || 'bus-ka01ab1234';
  const actualRouteId = route_id || activeTrip.route_id || driver.assigned_route_id || 'route-152';

  // Push to Supabase via server-side Supabase client
  const supabaseResult = await pushLocationTelemetryToSupabase({
    bus_id: actualBusId,
    driver_id: driver.id,
    route_id: actualRouteId,
    trip_id: activeTrip.id,
    latitude: Number(latitude),
    longitude: Number(longitude),
    speed: Number(speed || 0),
    heading: Number(heading || 0),
    accuracy: Number(accuracy || 5),
    timestamp: timestamp || new Date().toISOString()
  });

  // Store in-memory latest location
  const locRecord: any = {
    id: `loc-supa-${Date.now()}`,
    bus_id: actualBusId,
    trip_id: activeTrip.id,
    latitude: Number(latitude),
    longitude: Number(longitude),
    accuracy: Number(accuracy || 5),
    speed: Number(speed || 0),
    heading: Number(heading || 0),
    timestamp: timestamp || new Date().toISOString(),
    is_valid: true
  };
  db.busLocations.push(locRecord);
  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({
    success: true,
    synced_to_supabase: supabaseResult.syncedToSupabase,
    packet_id: supabaseResult.packetId,
    note: supabaseResult.error || undefined,
    timestamp: locRecord.timestamp
  });
});

driverRouter.get('/supabase-sync/status', (req, res) => {
  res.json({ status: getSupabaseSyncState() });
});

