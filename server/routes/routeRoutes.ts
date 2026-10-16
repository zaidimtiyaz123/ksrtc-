import { Router } from 'express';
import { db } from '../db/database.js';
import { getLiveFleetTelemetry } from '../websocket/liveServer.js';

export const routeRouter = Router();

// List all routes with complete stops sequence and active bus count
routeRouter.get('/', (req, res) => {
  const liveBuses = getLiveFleetTelemetry();

  const routesWithMeta = db.routes.map(r => {
    const routeWithStops = db.getRouteWithStops(r.id);
    const stops = routeWithStops?.stops || [];
    const activeBusesOnRoute = liveBuses.filter(b => b.route_id === r.id);

    return {
      ...r,
      stops_count: stops.length,
      stops,
      active_buses_count: activeBusesOnRoute.length,
      active_buses: activeBusesOnRoute
    };
  });

  res.json({ routes: routesWithMeta });
});

// Search routes with rich multi-field filtering (source, destination, route number, keyword)
routeRouter.get('/search', (req, res) => {
  const { from, to, route_number, q } = req.query;

  const liveBuses = getLiveFleetTelemetry();
  const qStr = String(q || '').toLowerCase().trim();
  const fromStr = String(from || '').toLowerCase().trim();
  const toStr = String(to || '').toLowerCase().trim();
  const routeNumStr = String(route_number || '').toLowerCase().trim();

  // If no filters provided, return all routes with metadata
  if (!fromStr && !toStr && !routeNumStr && !qStr) {
    const allRoutes = db.routes.map(r => {
      const routeWithStops = db.getRouteWithStops(r.id);
      const activeBuses = liveBuses.filter(b => b.route_id === r.id);
      return {
        ...r,
        stops_count: routeWithStops?.stops?.length || 0,
        stops: routeWithStops?.stops || [],
        active_buses_count: activeBuses.length,
        active_buses: activeBuses
      };
    });
    return res.json({ count: allRoutes.length, routes: allRoutes });
  }

  const matchedRoutes = db.routes.filter(r => {
    const routeWithStops = db.getRouteWithStops(r.id);
    const stops = routeWithStops?.stops || [];

    // Helper to check if a text matches any stop in English or Kannada
    const matchStop = (searchTerm: string, stopList = stops) => {
      if (!searchTerm) return true;
      return stopList.some(s => {
        const nameEng = (s.stop?.name || '').toLowerCase();
        const nameKan = (s.stop?.name_kannada || '').toLowerCase();
        const code = (s.stop?.stop_code || '').toLowerCase();
        return nameEng.includes(searchTerm) || nameKan.includes(searchTerm) || code.includes(searchTerm);
      });
    };

    // 1. Route Number filter
    if (routeNumStr) {
      const cleanRouteNum = routeNumStr.replace(/^route\s*/i, '');
      const numMatch = r.route_number.toLowerCase().includes(cleanRouteNum) ||
        cleanRouteNum.includes(r.route_number.toLowerCase());
      if (!numMatch) return false;
    }

    // 2. Freeform keyword filter (q)
    if (qStr) {
      const cleanQ = qStr.replace(/^route\s*/i, '');
      const matchesBasic =
        r.route_number.toLowerCase().includes(cleanQ) ||
        r.route_name.toLowerCase().includes(qStr) ||
        r.origin.toLowerCase().includes(qStr) ||
        r.destination.toLowerCase().includes(qStr);

      const matchesAnyStop = matchStop(qStr, stops);

      if (!matchesBasic && !matchesAnyStop) return false;
    }

    // 3. From (Source) & To (Destination) filter
    const matchesFrom = !fromStr ||
      r.origin.toLowerCase().includes(fromStr) ||
      matchStop(fromStr, stops);

    const matchesTo = !toStr ||
      r.destination.toLowerCase().includes(toStr) ||
      matchStop(toStr, stops);

    if (!matchesFrom || !matchesTo) return false;

    // 4. Directional validation when both from and to are specified
    if (fromStr && toStr && stops.length > 1) {
      // Find index of first stop matching 'from' and 'to'
      const fromIdx = stops.findIndex(s => {
        const nameEng = (s.stop?.name || '').toLowerCase();
        const nameKan = (s.stop?.name_kannada || '').toLowerCase();
        return r.origin.toLowerCase().includes(fromStr) || nameEng.includes(fromStr) || nameKan.includes(fromStr);
      });

      const toIdx = stops.findIndex(s => {
        const nameEng = (s.stop?.name || '').toLowerCase();
        const nameKan = (s.stop?.name_kannada || '').toLowerCase();
        return r.destination.toLowerCase().includes(toStr) || nameEng.includes(toStr) || nameKan.includes(toStr);
      });

      // If both stops are found in this route, ensure 'from' comes before 'to'
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx >= toIdx) {
        return false; // Wrong direction for this route
      }
    }

    return true;
  });

  const results = matchedRoutes.map(r => {
    const rWithStops = db.getRouteWithStops(r.id);
    const activeBuses = liveBuses.filter(b => b.route_id === r.id);
    return {
      ...r,
      stops_count: rWithStops?.stops?.length || 0,
      stops: rWithStops?.stops || [],
      active_buses_count: activeBuses.length,
      active_buses: activeBuses
    };
  });

  res.json({ count: results.length, routes: results });
});

// Single route details with full ordered stops and active live bus positions
routeRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const route = db.getRouteWithStops(id);

  if (!route) {
    return res.status(404).json({ error: 'Route not found' });
  }

  const liveBuses = getLiveFleetTelemetry().filter(b => b.route_id === route.id);

  res.json({
    route,
    activeBuses: liveBuses
  });
});
