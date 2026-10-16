// Comprehensive TypeScript definitions for KSRTC SmartTrack

export type UserRole = 'passenger' | 'driver' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  user_id: string;
  driver_code: string;
  name: string;
  phone: string;
  password?: string;
  status: 'available' | 'on_trip' | 'off_duty' | 'suspended';
  assigned_bus_id?: string;
  assigned_route_id?: string;
  access_revoked?: boolean;
  revoked_at?: string;
  created_at: string;
}

export interface Bus {
  id: string;
  registration_number: string; // e.g. KA01AB1234
  fleet_number: string; // e.g. KSRTC-NW-4082
  model: string; // e.g. Airavat Club Class (Volvo Multi-Axle), Rajahamsa, Sarige
  status: 'active' | 'maintenance' | 'inactive';
  capacity: number;
  depot?: string;
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  stop_id: string;
  stop_sequence: number;
  scheduled_arrival?: string;
  scheduled_departure?: string;
  distance_from_origin_km?: number;
  stop?: Stop;
}

export interface Route {
  id: string;
  route_number: string; // e.g. "152", "302"
  route_name: string; // e.g. "Tumkur to Bengaluru Majestic"
  origin: string;
  destination: string;
  distance_km: number;
  estimated_duration_min: number;
  route_geometry: [number, number][]; // Coordinates polyline [[lat, lng], ...]
  status: 'active' | 'inactive';
  created_at: string;
  stops?: RouteStop[];
}

export interface Stop {
  id: string;
  stop_code: string; // Unique numeric Stop ID e.g. "1001", "1002"
  name: string; // e.g. "Tumkur Bus Stand"
  name_kannada?: string; // e.g. "ತುಮಕೂರು ಬಸ್ ನಿಲ್ದಾಣ"
  latitude: number;
  longitude: number;
  zone?: string;
  created_at: string;
  routes_count?: number;
}

export type TripStatus = 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  bus_id: string;
  driver_id: string;
  route_id: string;
  start_time: string;
  end_time?: string;
  status: TripStatus;
  bus?: Bus;
  driver?: Driver;
  route?: Route;
  current_location?: BusLocation;
  eta_info?: ETAInfo;
}

export interface BusLocation {
  id: string;
  bus_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  speed: number; // in km/h
  heading: number; // in degrees 0-360
  timestamp: string;
  is_valid: boolean;
  deviation_flag?: boolean;
  next_stop_name?: string;
  next_stop_id?: string;
  eta_minutes?: number;
  distance_to_next_stop_km?: number;
}

export type BusLiveStatus = 'LIVE' | 'STALE' | 'OFFLINE' | 'DELAYED';

export interface LiveBusTelemetry {
  bus_id: string;
  registration_number: string;
  fleet_number: string;
  model: string;
  trip_id: string;
  driver_name: string;
  driver_code: string;
  route_id: string;
  route_number: string;
  route_name: string;
  origin: string;
  destination: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: string;
  status: BusLiveStatus;
  seconds_ago: number;
  next_stop?: string;
  next_stop_name?: string;
  next_stop_id?: string;
  eta_minutes?: number;
  distance_to_next_km?: number;
  trip_status: TripStatus;
}

export interface ETAInfo {
  etaMinutes: number;
  distanceKm: number;
  nextStop: string;
  nextStopId?: string;
  estimatedArrivalTime?: string;
  currentSpeedKmH: number;
}

export interface PassengerReport {
  id: string;
  user_id?: string;
  user_name?: string;
  user_phone?: string;
  bus_id?: string;
  registration_number?: string;
  trip_id?: string;
  report_type: 'bus_not_moving' | 'incorrect_location' | 'missed_stop' | 'wrong_eta' | 'overcrowding' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'delay' | 'approaching' | 'disruption' | 'general' | 'emergency';
  read_status: boolean;
  created_at: string;
}

export interface FavoriteItem {
  id: string;
  user_id: string;
  route_id?: string;
  stop_id?: string;
  route?: Route;
  stop?: Stop;
  created_at: string;
}

export interface IVRResponse {
  step: 'welcome' | 'stop_entry' | 'route_selection' | 'bus_details' | 'error';
  language: 'en' | 'kn' | 'hi';
  speechText: string;
  speechTextKannada?: string;
  speechTextHindi?: string;
  speechTextKannadaPhonetic?: string;
  speechTextHindiPhonetic?: string;
  speechTextEnglishPhonetic?: string;
  speechParts?: {
    lang: 'en' | 'kn' | 'hi';
    text: string;
    phonetic?: string;
    label?: string;
  }[];
  options: { key: string; label: string; action: string }[];
  stopData?: Stop;
  approachingBuses?: {
    bus_id: string;
    registration_number: string;
    route_number: string;
    route_name: string;
    eta_minutes: number;
    distance_km: number;
  }[];
  smsSent?: boolean;
  smsText?: string;
  targetPhone?: string;
}

export interface FleetStats {
  total_buses: number;
  active_trips: number;
  running: number;
  stale: number;
  offline: number;
  delayed: number;
  total_drivers: number;
  total_routes: number;
  total_stops: number;
  today_trips_count: number;
  avg_eta_accuracy_pct: number;
  passenger_reports_count: number;
  active_sos_count?: number;
}

export type SOSEmergencyType = 'accident' | 'medical' | 'mechanical_breakdown' | 'security_threat' | 'panic_general';
export type SOSAlertStatus = 'active' | 'acknowledged' | 'dispatched' | 'resolved';

export interface SOSAlert {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone?: string;
  driver_code?: string;
  bus_id: string;
  bus_registration: string;
  fleet_number?: string;
  route_id?: string;
  route_number?: string;
  route_name?: string;
  trip_id?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  emergency_type: SOSEmergencyType;
  message: string;
  status: SOSAlertStatus;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  dispatched_at?: string;
  dispatch_details?: string;
  responder_unit?: string;
  estimated_arrival_min?: number;
  notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export interface SystemKeyDiagnostic {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'error' | 'unconfigured' | 'missing' | 'local_storage';
  isKeyRequired: boolean;
  health: 'healthy' | 'warning' | 'error' | 'info';
  message: string;
  action: string;
}

export interface SystemKeysResponse {
  keys: SystemKeyDiagnostic[];
  freeMapAvailable: boolean;
  aiCopilotAvailable: boolean;
}

export type AdminLevel = 'super_admin' | 'divisional_controller' | 'depot_master' | 'safety_officer';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'admin';
  admin_level: AdminLevel;
  depot: string;
  permissions: string[];
  status: 'active' | 'suspended';
  created_at: string;
  last_login?: string;
  created_by?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity: string;
  entity_id?: string;
  details: string;
  ip_address?: string;
}

export interface MaintenanceLog {
  id: string;
  bus_id: string;
  bus_registration: string;
  maintenance_type: 'routine_inspection' | 'engine_overhaul' | 'brake_service' | 'tire_replacement' | 'electrical_system' | 'ac_servicing';
  depot: string;
  engineer_name: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  cost_inr: number;
  odometer_km: number;
  notes: string;
  logged_at: string;
  completed_at?: string;
}

export interface DatabaseDiagnostics {
  status: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE';
  engine: string;
  uptime_seconds: number;
  total_records: number;
  collections: {
    users: number;
    admins: number;
    drivers: number;
    buses: number;
    routes: number;
    stops: number;
    route_stops: number;
    trips: number;
    sos_alerts: number;
    reports: number;
    audit_logs: number;
    maintenance_logs: number;
  };
  storage_bytes: number;
  storage_file: string;
  last_snapshot_at: string;
  active_connections: number;
  persistence_mode: string;
  last_backup_status: string;
}

// ---------------------------------------------------------------------------
// A-to-B TRIP PLANNER TYPES
// ---------------------------------------------------------------------------

export interface TripLegLiveBus {
  busId: string;
  registrationNumber: string;
  fleetNumber: string;
  model: string;
  driverName: string;
  driverCode: string;
  currentSpeed: number;
  latitude: number;
  longitude: number;
  heading: number;
  distanceToOriginKm: number;
  etaToOriginMinutes: number;
  status: BusLiveStatus;
  secondsAgo: number;
  occupancyStatus: 'seats_available' | 'standing_only' | 'crowded';
}

export interface TripLeg {
  legIndex: number;
  routeId: string;
  routeNumber: string;
  routeName: string;
  originStop: Stop;
  destinationStop: Stop;
  intermediateStops: Stop[];
  intermediateCount: number;
  distanceKm: number;
  durationMinutes: number;
  scheduledDepartureTime: string;
  scheduledArrivalTime: string;
  busServiceType: string; // e.g. 'Airavat Club Class (Volvo Multi-Axle)', 'Rajahamsa Executive', 'Karnataka Sarige Express'
  estimatedFare: number;
  polyline: [number, number][];
  liveBus?: TripLegLiveBus;
  frequencyDescription: string;
}

export interface TripPlanOption {
  id: string;
  type: 'direct' | 'transfer';
  totalDurationMinutes: number;
  totalDistanceKm: number;
  totalFare: number;
  departureTime: string;
  arrivalTime: string;
  legs: TripLeg[];
  transferStation?: Stop;
  transferWaitMinutes?: number;
  carbonSavedKg: number;
  hasLiveBus: boolean;
  earliestLiveArrivalMinutes?: number;
  recommendationBadge?: 'Fastest' | 'Live Bus Approaching' | 'Best Value' | 'Direct Non-Stop';
  summary: string;
}

export interface TripPlanRequest {
  originStopId?: string;
  destinationStopId?: string;
  originQuery?: string;
  destinationQuery?: string;
  userLat?: number;
  userLng?: number;
  departureTime?: string;
  directOnly?: boolean;
  serviceTypeFilter?: string;
  sortBy?: 'recommended' | 'fastest' | 'earliest_departure' | 'lowest_fare';
}

export interface TripPlanResponse {
  origin: Stop;
  destination: Stop;
  directOptionsCount: number;
  transferOptionsCount: number;
  options: TripPlanOption[];
  liveBusesActiveCount: number;
  timestamp: string;
}

export interface PopularTripItem {
  id: string;
  originStopId: string;
  originName: string;
  originNameKannada?: string;
  destinationStopId: string;
  destinationName: string;
  destinationNameKannada?: string;
  routeNumber: string;
  distanceKm: number;
  typicalDurationMin: number;
  activeBusesCount: number;
  minFare: number;
}


