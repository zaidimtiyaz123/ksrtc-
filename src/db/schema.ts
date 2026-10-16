import { pgTable, text, integer, timestamp, serial, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table (Linked via Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name'),
  email: text('email').notNull(),
  phone: text('phone'),
  role: text('role').default('passenger').notNull(), // 'passenger', 'driver', 'admin'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Buses Table
export const buses = pgTable('buses', {
  id: text('id').primaryKey(),
  registrationNumber: text('registration_number').notNull().unique(),
  fleetNumber: text('fleet_number').notNull(),
  model: text('model').notNull(),
  capacity: integer('capacity').default(45).notNull(),
  status: text('status').default('active').notNull(),
  depot: text('depot'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Drivers Table
export const drivers = pgTable('drivers', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  driverCode: text('driver_code').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  status: text('status').default('available').notNull(),
  assignedBusId: text('assigned_bus_id').references(() => buses.id),
  assignedRouteId: text('assigned_route_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Routes Table
export const routes = pgTable('routes', {
  id: text('id').primaryKey(),
  routeNumber: text('route_number').notNull().unique(),
  routeName: text('route_name').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  distanceKm: text('distance_km').notNull(),
  estimatedDurationMin: integer('estimated_duration_min').notNull(),
  routeGeometry: text('route_geometry').notNull(), // JSON array [[lat, lng], ...]
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bus Stops Table
export const stops = pgTable('stops', {
  id: text('id').primaryKey(),
  stopCode: text('stop_code').notNull().unique(),
  name: text('name').notNull(),
  nameKannada: text('name_kannada'),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  zone: text('zone'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Route Stops Junction Table
export const routeStops = pgTable('route_stops', {
  id: text('id').primaryKey(),
  routeId: text('route_id').notNull().references(() => routes.id),
  stopId: text('stop_id').notNull().references(() => stops.id),
  stopSequence: integer('stop_sequence').notNull(),
  scheduledArrival: text('scheduled_arrival'),
  scheduledDeparture: text('scheduled_departure'),
  distanceFromOriginKm: text('distance_from_origin_km'),
});

// Trips Table
export const trips = pgTable('trips', {
  id: text('id').primaryKey(),
  busId: text('bus_id').notNull().references(() => buses.id),
  driverId: text('driver_id').notNull().references(() => drivers.id),
  routeId: text('route_id').notNull().references(() => routes.id),
  startTime: timestamp('start_time').defaultNow(),
  endTime: timestamp('end_time'),
  status: text('status').default('in_progress').notNull(),
});

// Passenger Reports / Grievances Table
export const passengerReports = pgTable('passenger_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  userName: text('user_name'),
  userPhone: text('user_phone'),
  busId: text('bus_id').references(() => buses.id),
  registrationNumber: text('registration_number'),
  tripId: text('trip_id').references(() => trips.id),
  reportType: text('report_type').notNull(),
  description: text('description').notNull(),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Favorites Table
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  routeId: text('route_id').references(() => routes.id),
  stopId: text('stop_id').references(() => stops.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notifications Table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  readStatus: boolean('read_status').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  reports: many(passengerReports),
  favorites: many(favorites),
  notifications: many(notifications),
}));

export const busesRelations = relations(buses, ({ many }) => ({
  trips: many(trips),
  reports: many(passengerReports),
}));

export const driversRelations = relations(drivers, ({ many }) => ({
  trips: many(trips),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  routeStops: many(routeStops),
  trips: many(trips),
}));

export const stopsRelations = relations(stops, ({ many }) => ({
  routeStops: many(routeStops),
}));

export const routeStopsRelations = relations(routeStops, ({ one }) => ({
  route: one(routes, {
    fields: [routeStops.routeId],
    references: [routes.id],
  }),
  stop: one(stops, {
    fields: [routeStops.stopId],
    references: [stops.id],
  }),
}));

export const tripsRelations = relations(trips, ({ one }) => ({
  bus: one(buses, {
    fields: [trips.busId],
    references: [buses.id],
  }),
  driver: one(drivers, {
    fields: [trips.driverId],
    references: [drivers.id],
  }),
  route: one(routes, {
    fields: [trips.routeId],
    references: [routes.id],
  }),
}));
