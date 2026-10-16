import { Router } from 'express';
import { db } from '../db/database.js';
import { ETAService } from '../services/etaService.js';
import { calculateHaversineDistance } from '../services/gpsValidator.js';
import { getLiveFleetTelemetry } from '../websocket/liveServer.js';

export const stopRouter = Router();

// Get all stops with routes count
stopRouter.get('/', (req, res) => {
  const stopsWithMeta = db.stops.map(s => {
    const routeStops = db.routeStops.filter(rs => rs.stop_id === s.id);
    return {
      ...s,
      routes_count: routeStops.length
    };
  });

  res.json({ stops: stopsWithMeta });
});

// Find nearby stops by user coordinates
stopRouter.get('/nearby', (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radius || 25);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query params required' });
  }

  const nearbyStops = db.stops
    .map(s => {
      const distanceKm = calculateHaversineDistance(lat, lng, s.latitude, s.longitude);
      const routesCount = db.routeStops.filter(rs => rs.stop_id === s.id).length;
      return {
        ...s,
        distance_from_user_km: Number(distanceKm.toFixed(2)),
        routes_count: routesCount
      };
    })
    .filter(s => s.distance_from_user_km <= radiusKm)
    .sort((a, b) => a.distance_from_user_km - b.distance_from_user_km);

  res.json({ stops: nearbyStops });
});

// Get single stop by stop_code (e.g. 1001) or UUID id
stopRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const stop = db.getStopByCodeOrId(id);

  if (!stop) {
    return res.status(404).json({ error: 'Bus stop not found' });
  }

  // Find all routes that service this stop
  const routeStops = db.routeStops.filter(rs => rs.stop_id === stop.id);
  const servicingRoutes = routeStops.map(rs => {
    const r = db.routes.find(route => route.id === rs.route_id);
    return {
      ...r,
      stop_sequence: rs.stop_sequence,
      scheduled_arrival: rs.scheduled_arrival,
      scheduled_departure: rs.scheduled_departure
    };
  }).filter(Boolean);

  // Find all active live buses currently heading toward or servicing this stop
  const liveTelemetry = getLiveFleetTelemetry();
  const servicingRouteIds = servicingRoutes.map(r => r?.id);

  const approachingBuses = liveTelemetry
    .filter(b => servicingRouteIds.includes(b.route_id))
    .map(b => {
      const eta = ETAService.calculateETAToStop(b.latitude, b.longitude, b.speed, stop);
      return {
        ...b,
        eta_to_this_stop_min: eta.etaMinutes,
        distance_to_this_stop_km: eta.distanceKm
      };
    })
    .sort((a, b) => a.eta_to_this_stop_min - b.eta_to_this_stop_min);

  res.json({
    stop,
    servicingRoutes,
    approachingBuses,
    qrUrl: `/stops/${stop.stop_code}`,
    ivrInstructions: {
      tollFreeNumber: '+91 80 2222 1234',
      stopCode: stop.stop_code,
      instructions: `Call +91 80 2222 1234, press 1 for English (2 for Kannada), then enter Stop ID ${stop.stop_code} followed by #`
    }
  });
});
