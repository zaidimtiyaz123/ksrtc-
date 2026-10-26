import { Router } from 'express';
import { db } from '../db/database.js';
import { getLiveFleetTelemetry } from '../websocket/liveServer.js';
import { PythonPredictorService } from '../services/pythonPredictorService.js';

export const busRouter = Router();

// Get all live tracking buses currently on active trips
busRouter.get('/live', (req, res) => {
  const liveTelemetry = getLiveFleetTelemetry();
  res.json({
    count: liveTelemetry.length,
    buses: liveTelemetry
  });
});

// Get all registered fleet buses
busRouter.get('/', (req, res) => {
  const busesWithStatus = db.buses.map(bus => {
    const activeTrip = db.trips.find(
      t => t.bus_id === bus.id && (t.status === 'in_progress' || t.status === 'paused')
    );
    const latestLoc = db.getLatestLocation(bus.id);
    const assignedDriver = db.drivers.find(d => d.assigned_bus_id === bus.id);

    return {
      ...bus,
      active_trip: activeTrip,
      latest_location: latestLoc,
      assigned_driver: assignedDriver
    };
  });

  res.json({ buses: busesWithStatus });
});

// Get single bus detailed info, active trip, telemetry history, and route progress
busRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const bus = db.buses.find(
    b => b.id === id || b.registration_number.replace(/\s+/g, '').toUpperCase() === id.replace(/\s+/g, '').toUpperCase()
  );

  if (!bus) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const activeTrip = db.trips.find(
    t => t.bus_id === bus.id && (t.status === 'in_progress' || t.status === 'paused')
  );

  const route = activeTrip ? db.getRouteWithStops(activeTrip.route_id) : undefined;
  const driver = activeTrip ? db.drivers.find(d => d.id === activeTrip.driver_id) : undefined;
  const latestLoc = db.getLatestLocation(bus.id);

  // Get last 20 location breadcrumbs for speed and position trail
  const locationTrail = db.busLocations
    .filter(l => l.bus_id === bus.id && l.is_valid)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-20);

  // Compute live freshness
  let liveStatus: 'LIVE' | 'STALE' | 'OFFLINE' = 'OFFLINE';
  let secondsAgo = 0;
  if (latestLoc) {
    const locTime = new Date(latestLoc.timestamp).getTime();
    secondsAgo = Math.max(0, Math.round((Date.now() - locTime) / 1000));
    if (secondsAgo < 30) liveStatus = 'LIVE';
    else if (secondsAgo <= 120) liveStatus = 'STALE';
  }

  // Enrich latestLocation with Python predictive pipeline analytics
  let enrichedLocation: any = latestLoc ? { ...latestLoc } : null;
  if (latestLoc && route) {
    try {
      const prediction = await PythonPredictorService.predictForBus(
        bus.id,
        latestLoc.latitude,
        latestLoc.longitude,
        latestLoc.speed,
        latestLoc.heading || 0,
        route
      );
      enrichedLocation = {
        ...enrichedLocation,
        delay_minutes: prediction.delay_minutes,
        delay_category: prediction.delay_category,
        confidence_score: prediction.confidence_score,
        interval: prediction.interval,
        delay_cause: prediction.primary_cause,
        corridor_bottleneck: prediction.corridor_metrics?.bottleneck_node,
        calibrated_speed_kmh: prediction.corridor_metrics?.calibrated_speed_kmh,
        pipeline_engine: prediction.source
      };
    } catch {
      // In-memory fallback if needed
    }
  }

  res.json({
    bus,
    activeTrip,
    route,
    driver,
    latestLocation: enrichedLocation,
    liveStatus,
    secondsAgo,
    locationTrail
  });
});
