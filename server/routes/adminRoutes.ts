import { Router } from 'express';
import { db } from '../db/database.js';
import { getLiveFleetTelemetry, broadcastFleetSnapshot, broadcastSOSUpdate } from '../websocket/liveServer.js';
import { Bus, Driver, Route, Stop, RouteStop, Trip, FleetStats, SOSAlert } from '../../src/types/index.js';

export const adminRouter = Router();

// 1. Fleet Overview & Analytics Stats calculated directly from Database
adminRouter.get(['/stats', '/overview'], (req, res) => {
  const liveTelemetry = getLiveFleetTelemetry();

  const totalBuses = db.buses.length;
  const activeTrips = db.getActiveTrips().length;
  const running = liveTelemetry.filter(b => b.status === 'LIVE').length;
  const stale = liveTelemetry.filter(b => b.status === 'STALE').length;
  const offline = liveTelemetry.filter(b => b.status === 'OFFLINE').length;
  const delayed = liveTelemetry.filter(b => (b.eta_minutes || 0) > 30).length;
  const activeSOS = db.sosAlerts.filter(a => a.status === 'active' || a.status === 'acknowledged' || a.status === 'dispatched').length;

  const stats: FleetStats = {
    total_buses: totalBuses,
    active_trips: activeTrips,
    running,
    stale,
    offline,
    delayed,
    total_drivers: db.drivers.length,
    total_routes: db.routes.length,
    total_stops: db.stops.length,
    today_trips_count: db.trips.length,
    avg_eta_accuracy_pct: 94.2,
    passenger_reports_count: db.reports.filter(r => r.status === 'pending').length,
    active_sos_count: activeSOS
  };

  res.json({ stats });
});

// 2. Bus Management
adminRouter.get('/buses', (req, res) => {
  res.json({ buses: db.buses });
});

adminRouter.post('/buses', (req, res) => {
  const { registration_number, fleet_number, model, capacity, depot, status } = req.body;

  if (!registration_number || !fleet_number) {
    return res.status(400).json({ error: 'Registration number and fleet number are required' });
  }

  const newBus: Bus = {
    id: `bus-${Date.now()}`,
    registration_number: registration_number.trim().toUpperCase(),
    fleet_number: fleet_number.trim().toUpperCase(),
    model: model || 'Sarige Karnataka Express',
    capacity: Number(capacity || 45),
    depot: depot || 'Central Division',
    status: status || 'active',
    created_at: new Date().toISOString()
  };

  db.buses.push(newBus);
  db.saveToFile();
  broadcastFleetSnapshot();

  res.status(201).json({ message: 'Bus registered successfully', bus: newBus });
});

adminRouter.put('/buses/:id', (req, res) => {
  const { id } = req.params;
  const bus = db.buses.find(b => b.id === id);
  if (!bus) return res.status(404).json({ error: 'Bus not found' });

  const { registration_number, fleet_number, model, capacity, depot, status } = req.body;
  if (registration_number) bus.registration_number = registration_number.trim().toUpperCase();
  if (fleet_number) bus.fleet_number = fleet_number.trim().toUpperCase();
  if (model) bus.model = model;
  if (capacity) bus.capacity = Number(capacity);
  if (depot) bus.depot = depot;
  if (status) bus.status = status;

  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({ message: 'Bus updated successfully', bus });
});

adminRouter.delete('/buses/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.buses.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Bus not found' });

  db.buses.splice(idx, 1);
  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({ message: 'Bus removed from fleet' });
});

// 3. Driver Management
adminRouter.get('/drivers', (req, res) => {
  res.json({ drivers: db.drivers });
});

adminRouter.post('/drivers', (req, res) => {
  const { name, driver_code, phone, password, assigned_bus_id, assigned_route_id } = req.body;

  if (!name || !driver_code || !phone) {
    return res.status(400).json({ error: 'Name, driver_code, and phone are required' });
  }

  const assignedPassword = (password && password.trim()) ? password.trim() : 'pass123';

  const newDriver: Driver = {
    id: `driver-${Date.now()}`,
    user_id: `user-${Date.now()}`,
    driver_code: driver_code.trim().toUpperCase(),
    name: name.trim(),
    phone: phone.trim(),
    password: assignedPassword,
    status: 'available',
    assigned_bus_id,
    assigned_route_id,
    created_at: new Date().toISOString()
  };

  db.drivers.push(newDriver);

  // Also create user record for driver login with the specified password
  const existingUser = db.users.find(u => u.id === newDriver.user_id);
  if (!existingUser) {
    db.users.push({
      id: newDriver.user_id,
      name: newDriver.name,
      email: `${newDriver.driver_code.toLowerCase()}@ksrtc.in`,
      password: assignedPassword,
      phone: newDriver.phone,
      role: 'driver',
      created_at: newDriver.created_at
    });
  } else {
    existingUser.password = assignedPassword;
  }

  db.saveToFile();

  db.logAudit(
    { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' },
    'DRIVER_ENROLLED',
    'DRIVER_ROSTER',
    `Enrolled driver ${newDriver.driver_code} (${newDriver.name}) with login credentials`,
    newDriver.id
  );

  res.status(201).json({ message: 'Driver registered successfully with login credentials', driver: newDriver });
});

adminRouter.put('/drivers/:id', (req, res) => {
  const { id } = req.params;
  const driver = db.drivers.find(d => d.id === id || d.driver_code.toUpperCase() === id.toUpperCase());
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const { name, driver_code, phone, password, status, assigned_bus_id, assigned_route_id } = req.body;
  if (name) driver.name = name.trim();
  if (driver_code) driver.driver_code = driver_code.trim().toUpperCase();
  if (phone) driver.phone = phone.trim();
  if (password && password.trim()) driver.password = password.trim();
  if (status) driver.status = status;
  if (assigned_bus_id !== undefined) driver.assigned_bus_id = assigned_bus_id;
  if (assigned_route_id !== undefined) driver.assigned_route_id = assigned_route_id;

  // Also update corresponding user profile
  const user = db.users.find(u => u.id === driver.user_id);
  if (user) {
    if (name) user.name = driver.name;
    if (phone) user.phone = driver.phone;
    if (driver_code) user.email = `${driver.driver_code.toLowerCase()}@ksrtc.in`;
    if (password && password.trim()) user.password = password.trim();
  }

  db.saveToFile();
  res.json({ message: 'Driver and login credentials updated successfully', driver });
});

// Revoke All Access for a Driver (Suspend credentials, terminate active trips, unassign vehicle/corridor)
adminRouter.post('/drivers/:id/revoke-access', (req, res) => {
  const { id } = req.params;
  const driver = db.drivers.find(d => d.id === id || d.driver_code.toUpperCase() === id.toUpperCase());
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  // 1. Strip status & mark access revoked
  driver.status = 'suspended';
  driver.access_revoked = true;
  driver.revoked_at = new Date().toISOString();

  // 2. Terminate any active trips
  db.trips.forEach(t => {
    if (t.driver_id === driver.id && (t.status === 'in_progress' || t.status === 'paused')) {
      t.status = 'cancelled';
      t.end_time = new Date().toISOString();
    }
  });

  // 3. Unassign vehicle & corridor
  driver.assigned_bus_id = undefined;
  driver.assigned_route_id = undefined;

  // 4. Update user account
  const user = db.users.find(u => u.id === driver.user_id);
  if (user) {
    (user as any).access_revoked = true;
  }

  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({
    message: `All access for Driver ${driver.driver_code} (${driver.name}) has been revoked. Driver is locked out.`,
    driver
  });
});

// Restore Driver Access
adminRouter.post('/drivers/:id/restore-access', (req, res) => {
  const { id } = req.params;
  const driver = db.drivers.find(d => d.id === id || d.driver_code.toUpperCase() === id.toUpperCase());
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  driver.status = 'available';
  driver.access_revoked = false;
  driver.revoked_at = undefined;

  const user = db.users.find(u => u.id === driver.user_id);
  if (user) {
    (user as any).access_revoked = false;
  }

  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({
    message: `Access restored for Driver ${driver.driver_code} (${driver.name}).`,
    driver
  });
});

// Emergency Lockdown: Revoke All Driver Access across the entire fleet
adminRouter.post('/drivers/revoke-all', (req, res) => {
  const count = db.drivers.length;
  db.drivers.forEach(driver => {
    driver.status = 'suspended';
    driver.access_revoked = true;
    driver.revoked_at = new Date().toISOString();
    driver.assigned_bus_id = undefined;
    driver.assigned_route_id = undefined;

    const user = db.users.find(u => u.id === driver.user_id);
    if (user) {
      (user as any).access_revoked = true;
    }
  });

  // Cancel all in-progress trips
  db.trips.forEach(t => {
    if (t.status === 'in_progress' || t.status === 'paused') {
      t.status = 'cancelled';
      t.end_time = new Date().toISOString();
    }
  });

  db.saveToFile();
  broadcastFleetSnapshot();

  res.json({
    message: `Emergency Lockdown Executed: All access revoked for ${count} drivers. All active corridor trips terminated.`
  });
});

adminRouter.delete('/drivers/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.drivers.findIndex(d => d.id === id || d.driver_code.toUpperCase() === id.toUpperCase());
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });

  const deletedDriver = db.drivers[idx];
  db.drivers.splice(idx, 1);

  // Clean up user account
  db.users = db.users.filter(u => u.id !== deletedDriver.user_id);

  // Clear driver assignment from active trips
  db.trips = db.trips.filter(t => t.driver_id !== deletedDriver.id);

  db.saveToFile();
  res.json({ message: `Driver ${deletedDriver.driver_code} (${deletedDriver.name}) removed successfully` });
});

// 4. Route Builder & Management
adminRouter.get('/routes', (req, res) => {
  const routesWithStops = db.routes.map(r => db.getRouteWithStops(r.id));
  res.json({ routes: routesWithStops });
});

adminRouter.get('/routes/:id', (req, res) => {
  const { id } = req.params;
  const route = db.getRouteWithStops(id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json({ route });
});

adminRouter.post('/routes', (req, res) => {
  const { route_number, route_name, origin, destination, distance_km, estimated_duration_min, route_geometry, stops } = req.body;

  if (!route_number || !route_name || !origin || !destination) {
    return res.status(400).json({ error: 'Route number, name, origin, and destination are required' });
  }

  // Derive geometry from stops if not explicitly provided
  let calculatedGeometry = route_geometry || [];
  if ((!calculatedGeometry || calculatedGeometry.length === 0) && Array.isArray(stops) && stops.length > 0) {
    calculatedGeometry = stops
      .map((s: any) => {
        const stopObj = db.stops.find(st => st.id === s.stop_id);
        return stopObj ? [stopObj.latitude, stopObj.longitude] : null;
      })
      .filter(Boolean);
  }

  const newRoute: Route = {
    id: `route-${Date.now()}`,
    route_number: route_number.trim(),
    route_name: route_name.trim(),
    origin: origin.trim(),
    destination: destination.trim(),
    distance_km: Number(distance_km || 50),
    estimated_duration_min: Number(estimated_duration_min || 60),
    route_geometry: calculatedGeometry.length > 0 ? calculatedGeometry : [
      [13.3409, 77.1010],
      [13.1500, 77.3000],
      [12.9778, 77.5726]
    ],
    status: 'active',
    created_at: new Date().toISOString()
  };

  db.routes.push(newRoute);

  // If stops sequence was provided
  if (Array.isArray(stops)) {
    stops.forEach((s: { stop_id: string; stop_sequence?: number; scheduled_arrival?: string; scheduled_departure?: string; distance_from_origin_km?: number }, idx: number) => {
      db.routeStops.push({
        id: `rs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        route_id: newRoute.id,
        stop_id: s.stop_id,
        stop_sequence: s.stop_sequence !== undefined ? s.stop_sequence : idx + 1,
        scheduled_arrival: s.scheduled_arrival,
        scheduled_departure: s.scheduled_departure,
        distance_from_origin_km: s.distance_from_origin_km !== undefined ? Number(s.distance_from_origin_km) : idx * 15
      });
    });
  }

  db.saveToFile();
  res.status(201).json({ message: 'Route created successfully', route: db.getRouteWithStops(newRoute.id) });
});

adminRouter.put('/routes/:id', (req, res) => {
  const { id } = req.params;
  const route = db.routes.find(r => r.id === id);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  const { route_number, route_name, origin, destination, distance_km, estimated_duration_min, route_geometry, status, stops } = req.body;
  if (route_number) route.route_number = route_number;
  if (route_name) route.route_name = route_name;
  if (origin) route.origin = origin;
  if (destination) route.destination = destination;
  if (distance_km !== undefined) route.distance_km = Number(distance_km);
  if (estimated_duration_min !== undefined) route.estimated_duration_min = Number(estimated_duration_min);
  if (route_geometry) route.route_geometry = route_geometry;
  if (status) route.status = status;

  if (Array.isArray(stops)) {
    // Replace route stops
    db.routeStops = db.routeStops.filter(rs => rs.route_id !== route.id);
    stops.forEach((s: { stop_id: string; stop_sequence?: number; scheduled_arrival?: string; scheduled_departure?: string; distance_from_origin_km?: number }, idx: number) => {
      db.routeStops.push({
        id: `rs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        route_id: route.id,
        stop_id: s.stop_id,
        stop_sequence: s.stop_sequence !== undefined ? s.stop_sequence : idx + 1,
        scheduled_arrival: s.scheduled_arrival,
        scheduled_departure: s.scheduled_departure,
        distance_from_origin_km: s.distance_from_origin_km !== undefined ? Number(s.distance_from_origin_km) : idx * 15
      });
    });
  }

  db.saveToFile();
  res.json({ message: 'Route updated successfully', route: db.getRouteWithStops(route.id) });
});

// Add a single stop to an existing route
adminRouter.post('/routes/:id/stops', (req, res) => {
  const { id } = req.params;
  const route = db.routes.find(r => r.id === id);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  const { stop_id, scheduled_arrival, scheduled_departure, distance_from_origin_km, stop_sequence } = req.body;
  if (!stop_id) return res.status(400).json({ error: 'stop_id is required' });

  const stop = db.stops.find(s => s.id === stop_id);
  if (!stop) return res.status(404).json({ error: 'Bus stop not found' });

  // Existing stops on this route
  const currentStops = db.routeStops
    .filter(rs => rs.route_id === route.id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  const seq = stop_sequence !== undefined ? Number(stop_sequence) : currentStops.length + 1;

  const newRouteStop: RouteStop = {
    id: `rs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    route_id: route.id,
    stop_id: stop.id,
    stop_sequence: seq,
    scheduled_arrival: scheduled_arrival || '09:00',
    scheduled_departure: scheduled_departure || '09:05',
    distance_from_origin_km: distance_from_origin_km !== undefined ? Number(distance_from_origin_km) : currentStops.length * 15
  };

  db.routeStops.push(newRouteStop);

  // Recalculate sequences cleanly 1..N
  const updatedStops = db.routeStops
    .filter(rs => rs.route_id === route.id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);
  
  updatedStops.forEach((rs, index) => {
    rs.stop_sequence = index + 1;
  });

  db.saveToFile();
  res.status(201).json({ message: 'Stop added to route successfully', route: db.getRouteWithStops(route.id) });
});

// Remove a stop from a route
adminRouter.delete('/routes/:id/stops/:stopId', (req, res) => {
  const { id, stopId } = req.params;
  const route = db.routes.find(r => r.id === id);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  const initialCount = db.routeStops.length;
  db.routeStops = db.routeStops.filter(rs => !(rs.route_id === id && (rs.stop_id === stopId || rs.id === stopId)));

  if (db.routeStops.length === initialCount) {
    return res.status(404).json({ error: 'Stop is not assigned to this route' });
  }

  // Re-order remaining stops sequentially
  const remaining = db.routeStops
    .filter(rs => rs.route_id === id)
    .sort((a, b) => a.stop_sequence - b.stop_sequence);

  remaining.forEach((rs, idx) => {
    rs.stop_sequence = idx + 1;
  });

  db.saveToFile();
  res.json({ message: 'Stop removed from route', route: db.getRouteWithStops(id) });
});

// Reorder all stops for a route
adminRouter.put('/routes/:id/reorder-stops', (req, res) => {
  const { id } = req.params;
  const route = db.routes.find(r => r.id === id);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  const { orderedStopIds } = req.body;
  if (!Array.isArray(orderedStopIds)) {
    return res.status(400).json({ error: 'orderedStopIds array is required' });
  }

  const existingRouteStops = db.routeStops.filter(rs => rs.route_id === id);

  orderedStopIds.forEach((stopId: string, idx: number) => {
    const matched = existingRouteStops.find(rs => rs.stop_id === stopId || rs.id === stopId);
    if (matched) {
      matched.stop_sequence = idx + 1;
    }
  });

  db.saveToFile();
  res.json({ message: 'Route stops re-ordered successfully', route: db.getRouteWithStops(id) });
});

adminRouter.delete('/routes/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.routes.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Route not found' });

  const deletedRoute = db.routes[idx];
  db.routes.splice(idx, 1);

  // Remove route stops associations
  db.routeStops = db.routeStops.filter(rs => rs.route_id !== id);

  // Unassign drivers currently on this corridor
  db.drivers.forEach(d => {
    if (d.assigned_route_id === id) {
      d.assigned_route_id = undefined;
    }
  });

  // Clean up trips on this route
  db.trips = db.trips.filter(t => t.route_id !== id);

  db.saveToFile();
  res.json({ message: `Route ${deletedRoute.route_number} (${deletedRoute.route_name}) removed successfully` });
});

// 5. Stop Management
adminRouter.get('/stops', (req, res) => {
  res.json({ stops: db.stops });
});

adminRouter.post('/stops', (req, res) => {
  const { stop_code, name, name_kannada, latitude, longitude, zone } = req.body;

  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Stop name, latitude, and longitude are required' });
  }

  // Generate unique stop code if not provided (e.g. 1018, 1019)
  let code = stop_code;
  if (!code) {
    const existingCodes = db.stops.map(s => Number(s.stop_code)).filter(n => !isNaN(n));
    const maxCode = existingCodes.length ? Math.max(...existingCodes) : 1000;
    code = String(maxCode + 1);
  }

  const newStop: Stop = {
    id: `stop-${Date.now()}`,
    stop_code: String(code).trim(),
    name: name.trim(),
    name_kannada: name_kannada?.trim(),
    latitude: Number(latitude),
    longitude: Number(longitude),
    zone: zone || 'General',
    created_at: new Date().toISOString()
  };

  db.stops.push(newStop);
  db.saveToFile();

  res.status(201).json({ message: 'Stop created successfully', stop: newStop });
});

adminRouter.put('/stops/:id', (req, res) => {
  const { id } = req.params;
  const stop = db.stops.find(s => s.id === id);
  if (!stop) return res.status(404).json({ error: 'Stop not found' });

  const { stop_code, name, name_kannada, latitude, longitude, zone } = req.body;
  if (stop_code) stop.stop_code = String(stop_code).trim();
  if (name) stop.name = name.trim();
  if (name_kannada !== undefined) stop.name_kannada = name_kannada;
  if (latitude !== undefined) stop.latitude = Number(latitude);
  if (longitude !== undefined) stop.longitude = Number(longitude);
  if (zone !== undefined) stop.zone = zone;

  db.saveToFile();
  res.json({ message: 'Stop updated successfully', stop });
});

adminRouter.delete('/stops/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.stops.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Stop not found' });

  db.stops.splice(idx, 1);
  db.routeStops = db.routeStops.filter(rs => rs.stop_id !== id);
  db.saveToFile();
  res.json({ message: 'Stop removed successfully' });
});

// 6. Trip Dispatcher
adminRouter.post('/trips', (req, res) => {
  const { bus_id, driver_id, route_id } = req.body;

  if (!bus_id || !driver_id || !route_id) {
    return res.status(400).json({ error: 'bus_id, driver_id, and route_id are required' });
  }

  const bus = db.buses.find(b => b.id === bus_id);
  const driver = db.drivers.find(d => d.id === driver_id);
  const route = db.routes.find(r => r.id === route_id);

  if (!bus || !driver || !route) {
    return res.status(404).json({ error: 'Bus, driver, or route not found' });
  }

  const newTrip: Trip = {
    id: `trip-${Date.now()}`,
    bus_id: bus.id,
    driver_id: driver.id,
    route_id: route.id,
    start_time: new Date().toISOString(),
    status: 'scheduled',
    bus,
    driver,
    route
  };

  db.trips.push(newTrip);
  driver.assigned_bus_id = bus.id;
  driver.assigned_route_id = route.id;
  db.saveToFile();

  res.status(201).json({ message: 'Trip dispatched and scheduled', trip: newTrip });
});

// 7. Passenger Reports Management
adminRouter.get('/reports', (req, res) => {
  const reportsWithMeta = db.reports.map(rep => {
    const bus = db.buses.find(b => b.id === rep.bus_id);
    const user = db.users.find(u => u.id === rep.user_id);
    return {
      ...rep,
      registration_number: bus?.registration_number,
      user_name: user?.name,
      user_phone: user?.phone
    };
  });

  res.json({ reports: reportsWithMeta });
});

adminRouter.put('/reports/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const report = db.reports.find(r => r.id === id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  if (status) report.status = status;
  db.saveToFile();

  res.json({ message: 'Report status updated', report });
});

// 9. SOS Emergency Incident Management
adminRouter.get(['/sos', '/alerts'], (req, res) => {
  const alerts = db.sosAlerts.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const activeCount = alerts.filter(
    a => a.status === 'active' || a.status === 'acknowledged' || a.status === 'dispatched'
  ).length;

  res.json({
    alerts,
    active_count: activeCount
  });
});

adminRouter.post('/sos/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  const { dispatcher_name } = req.body;

  const alert = db.sosAlerts.find(a => a.id === id);
  if (!alert) return res.status(404).json({ error: 'SOS Alert not found' });

  alert.status = 'acknowledged';
  alert.acknowledged_at = new Date().toISOString();
  alert.acknowledged_by = dispatcher_name || 'Central Traffic Control Room';

  db.saveToFile();
  broadcastSOSUpdate(alert);
  broadcastFleetSnapshot();

  res.json({ message: 'SOS Alert acknowledged', alert });
});

adminRouter.post('/sos/:id/dispatch', (req, res) => {
  const { id } = req.params;
  const { dispatch_type, details, responder_eta_min, responder_unit, estimated_arrival_min, notes } = req.body;

  const alert = db.sosAlerts.find(a => a.id === id);
  if (!alert) return res.status(404).json({ error: 'SOS Alert not found' });

  const chosenUnit = responder_unit || dispatch_type || 'Emergency Services';
  const chosenEta = estimated_arrival_min || responder_eta_min || 12;
  const chosenNotes = notes || details;

  alert.status = 'dispatched';
  alert.dispatched_at = new Date().toISOString();
  alert.responder_unit = chosenUnit;
  alert.estimated_arrival_min = chosenEta;
  alert.notes = chosenNotes;
  alert.dispatch_details = chosenNotes ? `${chosenUnit} - ${chosenNotes}` : `Dispatched: ${chosenUnit} (ETA: ${chosenEta} mins)`;

  db.saveToFile();
  broadcastSOSUpdate(alert);
  broadcastFleetSnapshot();

  res.json({ message: 'Emergency response units dispatched', alert });
});

adminRouter.post('/sos/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { dispatcher_name, notes, resolution_notes, resolved_by } = req.body;

  const alert = db.sosAlerts.find(a => a.id === id);
  if (!alert) return res.status(404).json({ error: 'SOS Alert not found' });

  alert.status = 'resolved';
  alert.resolved_at = new Date().toISOString();
  alert.resolved_by = resolved_by || dispatcher_name || 'Central Traffic Control Room';
  alert.resolution_notes = resolution_notes || notes || 'Incident resolved. Bus cleared to continue or recovery vehicle deployed.';

  db.saveToFile();
  broadcastSOSUpdate(alert);
  broadcastFleetSnapshot();

  db.logAudit(
    { name: resolved_by || dispatcher_name || 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'admin' },
    'SOS_ALERT_RESOLVED',
    'EMERGENCY_DISPATCH',
    `Resolved emergency alert ${alert.id} for Bus ${alert.bus_registration}: ${alert.resolution_notes}`,
    alert.id
  );

  res.json({ message: 'SOS incident resolved and archived', alert });
});

// 7. Admin Officers & Staff Roster Management
adminRouter.get('/admins', (req, res) => {
  const admins = db.getAdmins();
  res.json({ admins });
});

adminRouter.post('/admins', (req, res) => {
  try {
    const { name, email, password, phone, admin_level, depot, permissions, actor } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Officer Name and Email are required.' });
    }

    const created = db.createAdmin(
      { name, email, password, phone, admin_level, depot, permissions },
      actor || { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' }
    );

    res.status(201).json({ message: 'Administrator officer created successfully', admin: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create administrator officer.' });
  }
});

adminRouter.put('/admins/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { actor, ...updates } = req.body;

    const updated = db.updateAdmin(
      id,
      updates,
      actor || { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' }
    );

    res.json({ message: 'Administrator officer updated successfully', admin: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update administrator officer.' });
  }
});

adminRouter.delete('/admins/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { actor } = req.body || {};

    db.deleteAdmin(
      id,
      actor || { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' }
    );

    res.json({ message: 'Administrator account deleted successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete administrator account.' });
  }
});

// 8. Enterprise Database Diagnostics & Health
adminRouter.get('/diagnostics', (req, res) => {
  const diagnostics = db.getDiagnostics();
  res.json({ diagnostics });
});

// 9. Enterprise Audit Logs
adminRouter.get('/audit-logs', (req, res) => {
  const limit = Number(req.query.limit) || 100;
  const search = (req.query.search as string || '').toLowerCase();

  let logs = db.auditLogs;
  if (search) {
    logs = logs.filter(
      l =>
        l.action.toLowerCase().includes(search) ||
        l.actor_name.toLowerCase().includes(search) ||
        l.actor_email.toLowerCase().includes(search) ||
        l.details.toLowerCase().includes(search) ||
        l.entity.toLowerCase().includes(search)
    );
  }

  res.json({ logs: logs.slice(0, limit), total: logs.length });
});

// 10. Database Instant Backup Snapshot
adminRouter.post('/backup', (req, res) => {
  try {
    const backup = db.createBackup();
    res.json({ message: 'Database backup snapshot created successfully', backup });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create backup snapshot.' });
  }
});

// 11. Maintenance Logs
adminRouter.get('/maintenance', (req, res) => {
  res.json({ logs: db.maintenanceLogs });
});

adminRouter.post('/maintenance', (req, res) => {
  try {
    const { bus_id, bus_registration, maintenance_type, depot, engineer_name, status, cost_inr, odometer_km, notes } = req.body;
    if (!bus_id) {
      return res.status(400).json({ error: 'Bus ID is required for maintenance record.' });
    }

    const bus = db.buses.find(b => b.id === bus_id);
    const newLog = {
      id: `maint-${Date.now()}`,
      bus_id,
      bus_registration: bus_registration || (bus ? bus.registration_number : 'KA 01 AB 1234'),
      maintenance_type: maintenance_type || 'routine_inspection',
      depot: depot || (bus ? bus.depot : 'Central Workshop'),
      engineer_name: engineer_name || 'Chief Depot Mechanic',
      status: status || 'scheduled',
      cost_inr: Number(cost_inr || 5000),
      odometer_km: Number(odometer_km || 100000),
      notes: notes || 'Scheduled fleet maintenance inspection.',
      logged_at: new Date().toISOString()
    };

    db.maintenanceLogs.unshift(newLog as any);
    if (status === 'in_progress' && bus) {
      bus.status = 'maintenance';
    }
    db.saveToFile();

    db.logAudit(
      { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' },
      'MAINTENANCE_LOGGED',
      'BUS_FLEET',
      `Logged ${newLog.maintenance_type} for bus ${newLog.bus_registration}`,
      bus_id
    );

    res.status(201).json({ message: 'Maintenance record logged successfully', log: newLog });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to log maintenance record.' });
  }
});

