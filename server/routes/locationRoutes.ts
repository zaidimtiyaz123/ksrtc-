import { Router } from 'express';
import { db } from '../db/database.js';
import { validateGPSUpdate } from '../services/gpsValidator.js';
import { ETAService } from '../services/etaService.js';
import { broadcastLocationUpdate, broadcastFleetSnapshot } from '../websocket/liveServer.js';
import { BusLocation, LiveBusTelemetry } from '../../src/types/index.js';

export const locationRouter = Router();

// Single GPS telemetry update ingestion from driver device
locationRouter.post('/update', (req, res) => {
  const { bus_id, driver_id, trip_id, latitude, longitude, accuracy, speed, heading, timestamp } = req.body;

  if (!bus_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing required GPS fields (bus_id, latitude, longitude)' });
  }

  // Find associated trip and route
  const activeTrip = db.trips.find(
    t => (t.id === trip_id || t.bus_id === bus_id) && (t.status === 'in_progress' || t.status === 'paused')
  );

  const route = activeTrip ? db.routes.find(r => r.id === activeTrip.route_id) : undefined;
  const bus = db.buses.find(b => b.id === bus_id);
  const driver = driver_id ? db.drivers.find(d => d.id === driver_id) : (activeTrip ? db.drivers.find(d => d.id === activeTrip.driver_id) : undefined);

  // Validate GPS update
  const validation = validateGPSUpdate(
    bus_id,
    trip_id || activeTrip?.id || '',
    Number(latitude),
    Number(longitude),
    Number(accuracy || 10),
    Number(speed || 0),
    timestamp || new Date().toISOString(),
    route
  );

  if (!validation.isValid) {
    console.warn(`[GPS Ingestion] Rejected invalid GPS update for bus ${bus_id}: ${validation.reason}`);
    return res.status(422).json({
      success: false,
      error: validation.reason,
      bus_id
    });
  }

  // Calculate Next Stop & ETA if route is active
  let etaInfo = undefined;
  if (route) {
    // Collect recent 5 speeds for rolling average
    const recentLocs = db.busLocations.filter(l => l.bus_id === bus_id).slice(-5);
    const recentSpeeds = recentLocs.map(l => l.speed);
    etaInfo = ETAService.calculateETA(
      Number(latitude),
      Number(longitude),
      validation.speed,
      route,
      recentSpeeds
    );
  }

  // Create BusLocation record
  const locationRecord: BusLocation = {
    id: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    bus_id,
    trip_id: trip_id || activeTrip?.id || '',
    latitude: Number(latitude),
    longitude: Number(longitude),
    accuracy: Number(accuracy || 10),
    speed: validation.speed,
    heading: Number(heading || 0),
    timestamp: timestamp || new Date().toISOString(),
    is_valid: true,
    deviation_flag: validation.deviationFlag,
    next_stop_name: etaInfo?.nextStop,
    next_stop_id: etaInfo?.nextStopId,
    eta_minutes: etaInfo?.etaMinutes,
    distance_to_next_stop_km: etaInfo?.distanceKm
  };

  db.busLocations.push(locationRecord);
  // Cap location history per bus to last 300 points to keep database memory optimal
  if (db.busLocations.length > 5000) {
    db.busLocations = db.busLocations.slice(-3000);
  }
  db.saveToFile();

  // If trip is active, construct telemetry packet and broadcast in real-time
  if (activeTrip && bus && route) {
    const telemetry: LiveBusTelemetry = {
      bus_id: bus.id,
      registration_number: bus.registration_number,
      fleet_number: bus.fleet_number,
      model: bus.model,
      trip_id: activeTrip.id,
      driver_name: driver?.name || 'Driver',
      driver_code: driver?.driver_code || 'DRV-000',
      route_id: route.id,
      route_number: route.route_number,
      route_name: route.route_name,
      origin: route.origin,
      destination: route.destination,
      latitude: locationRecord.latitude,
      longitude: locationRecord.longitude,
      accuracy: locationRecord.accuracy,
      speed: locationRecord.speed,
      heading: locationRecord.heading,
      timestamp: locationRecord.timestamp,
      status: 'LIVE',
      seconds_ago: 0,
      next_stop: locationRecord.next_stop_name,
      next_stop_id: locationRecord.next_stop_id,
      eta_minutes: locationRecord.eta_minutes,
      distance_to_next_km: locationRecord.distance_to_next_stop_km,
      trip_status: activeTrip.status
    };

    broadcastLocationUpdate(telemetry);
  }

  res.status(200).json({
    success: true,
    location: locationRecord,
    eta: etaInfo,
    deviation_alert: validation.deviationFlag
  });
});

// Offline queue batch synchronization
locationRouter.post('/batch', (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Array of updates expected' });
  }

  let acceptedCount = 0;
  let lastAcceptedLoc: BusLocation | null = null;

  for (const item of updates) {
    const activeTrip = db.trips.find(
      t => (t.id === item.trip_id || t.bus_id === item.bus_id) && (t.status === 'in_progress' || t.status === 'paused')
    );
    const route = activeTrip ? db.routes.find(r => r.id === activeTrip.route_id) : undefined;

    const validation = validateGPSUpdate(
      item.bus_id,
      item.trip_id || '',
      Number(item.latitude),
      Number(item.longitude),
      Number(item.accuracy || 10),
      Number(item.speed || 0),
      item.timestamp,
      route
    );

    if (validation.isValid) {
      const loc: BusLocation = {
        id: `loc-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        bus_id: item.bus_id,
        trip_id: item.trip_id || '',
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        accuracy: Number(item.accuracy || 10),
        speed: validation.speed,
        heading: Number(item.heading || 0),
        timestamp: item.timestamp,
        is_valid: true,
        deviation_flag: validation.deviationFlag
      };
      db.busLocations.push(loc);
      lastAcceptedLoc = loc;
      acceptedCount++;
    }
  }

  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({
    success: true,
    accepted: acceptedCount,
    total: updates.length,
    latestLocation: lastAcceptedLoc
  });
});

// Location history for a bus or trip
locationRouter.get('/history/:busId', (req, res) => {
  const { busId } = req.params;
  const history = db.busLocations
    .filter(l => l.bus_id === busId && l.is_valid)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-100);

  res.json({ history });
});
