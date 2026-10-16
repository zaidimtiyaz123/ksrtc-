import fs from 'fs';
import path from 'path';
import {
  User,
  Driver,
  Bus,
  Route,
  Stop,
  RouteStop,
  Trip,
  BusLocation,
  NotificationItem,
  FavoriteItem,
  PassengerReport,
  SOSAlert,
  AdminUser,
  AuditLog,
  MaintenanceLog,
  DatabaseDiagnostics,
  AdminLevel
} from '../../src/types/index.js';

export interface UserRecord extends User {
  password?: string;
  admin_level?: AdminLevel;
  depot?: string;
  permissions?: string[];
  status?: 'active' | 'suspended';
  last_login?: string;
  created_by?: string;
}

// Realistic KSRTC Seed Data
const initialStops: Stop[] = [
  { id: 'stop-1001', stop_code: '1001', name: 'Tumkur KSRTC Bus Stand', name_kannada: 'ತುಮಕೂರು ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಬಸ್ ನಿಲ್ದಾಣ', latitude: 13.3409, longitude: 77.1010, zone: 'Tumkur', created_at: new Date().toISOString() },
  { id: 'stop-1002', stop_code: '1002', name: 'Kunigal Bypass Circle', name_kannada: 'ಕುಣಿಗಲ್ ಬೈಪಾಸ್ ವೃತ್ತ', latitude: 13.0238, longitude: 77.0274, zone: 'Tumkur', created_at: new Date().toISOString() },
  { id: 'stop-1003', stop_code: '1003', name: 'Yediyur Siddhalingeshwara Temple Stop', name_kannada: 'ಯಡಿಯೂರು ಸಿದ್ಧಲಿಂಗೇಶ್ವರ ಕ್ಷೇತ್ರ', latitude: 12.9995, longitude: 76.8834, zone: 'Kunigal', created_at: new Date().toISOString() },
  { id: 'stop-1004', stop_code: '1004', name: 'Nelamangala Toll Plaza Stop', name_kannada: 'ನೆಲಮಂಗಲ ಟೋಲ್ ಪ್ಲಾಜಾ', latitude: 13.0988, longitude: 77.3912, zone: 'Bengaluru Rural', created_at: new Date().toISOString() },
  { id: 'stop-1005', stop_code: '1005', name: 'Yeshwanthpur TTMC Bus Terminal', name_kannada: 'ಯಶವಂತಪುರ ಟಿ.ಟಿ.ಎಂ.ಸಿ', latitude: 13.0232, longitude: 77.5503, zone: 'Bengaluru Urban', created_at: new Date().toISOString() },
  { id: 'stop-1006', stop_code: '1006', name: 'Bengaluru Kempegowda Majestic (KSRTC Terminal 1)', name_kannada: 'ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ (ಮೆಜೆಸ್ಟಿಕ್)', latitude: 12.9774, longitude: 77.5708, zone: 'Bengaluru Urban', created_at: new Date().toISOString() },
  { id: 'stop-1007', stop_code: '1007', name: 'Mysuru Central Suburban Bus Stand', name_kannada: 'ಮೈಸೂರು ಉಪನಗರ ಬಸ್ ನಿಲ್ದಾಣ', latitude: 12.3118, longitude: 76.6552, zone: 'Mysuru', created_at: new Date().toISOString() },
  { id: 'stop-1008', stop_code: '1008', name: 'Mandya Highway KSRTC Stop', name_kannada: 'ಮಂಡ್ಯ ಹೆದ್ದಾರಿ ನಿಲ್ದಾಣ', latitude: 12.5238, longitude: 76.8967, zone: 'Mandya', created_at: new Date().toISOString() },
  { id: 'stop-1009', stop_code: '1009', name: 'Maddur Tiffany Stop', name_kannada: 'ಮದ್ದೂರು ಟಿಫಾನಿ ನಿಲ್ದಾಣ', latitude: 12.5843, longitude: 77.0450, zone: 'Mandya', created_at: new Date().toISOString() },
  { id: 'stop-1010', stop_code: '1010', name: 'Channapatna Toys City Stop', name_kannada: 'ಚನ್ನಪಟ್ಟಣ ಬೊಂಬೆಗಳ ನಗರಿ', latitude: 12.6518, longitude: 77.2089, zone: 'Ramanagara', created_at: new Date().toISOString() },
  { id: 'stop-1011', stop_code: '1011', name: 'Ramanagara Bus Depot Circle', name_kannada: 'ರಾಮನಗರ ಬಸ್ ಡಿಪೋ', latitude: 12.7150, longitude: 77.2810, zone: 'Ramanagara', created_at: new Date().toISOString() },
  { id: 'stop-1012', stop_code: '1012', name: 'Kengeri Satellite Bus Station', name_kannada: 'ಕೆಂಗೇರಿ ಉಪಗ್ರಹ ಬಸ್ ನಿಲ್ದಾಣ', latitude: 12.9135, longitude: 77.4831, zone: 'Bengaluru Urban', created_at: new Date().toISOString() },
  { id: 'stop-1013', stop_code: '1013', name: 'Hassan KSRTC Central Stand', name_kannada: 'ಹಾಸನ ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ನಿಲ್ದಾಣ', latitude: 13.0033, longitude: 76.1004, zone: 'Hassan', created_at: new Date().toISOString() },
  { id: 'stop-1014', stop_code: '1014', name: 'Channarayapatna Bus Stand', name_kannada: 'ಚನ್ನರಾಯಪಟ್ಟಣ ಬಸ್ ನಿಲ್ದಾಣ', latitude: 12.9062, longitude: 76.3908, zone: 'Hassan', created_at: new Date().toISOString() },
  { id: 'stop-1015', stop_code: '1015', name: 'Davanagere KSRTC Stand', name_kannada: 'ದಾವಣಗೆರೆ ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ನಿಲ್ದಾಣ', latitude: 14.4644, longitude: 75.9218, zone: 'Davanagere', created_at: new Date().toISOString() },
  { id: 'stop-1016', stop_code: '1016', name: 'Chitradurga Fort View Stand', name_kannada: 'ಚಿತ್ರದುರ್ಗ ಕೋಟೆ ನಿಲ್ದಾಣ', latitude: 14.2251, longitude: 76.3980, zone: 'Chitradurga', created_at: new Date().toISOString() },
  { id: 'stop-1017', stop_code: '1017', name: 'Hubballi Old Bus Stand', name_kannada: 'ಹುಬ್ಬಳ್ಳಿ ಹಳೆ ಬಸ್ ನಿಲ್ದಾಣ', latitude: 15.3526, longitude: 75.1436, zone: 'Dharwad', created_at: new Date().toISOString() }
];

const initialRoutes: Route[] = [
  {
    id: 'route-152',
    route_number: '152',
    route_name: 'Tumkur ⇄ Bengaluru Majestic (Express via NH48)',
    origin: 'Tumkur KSRTC Bus Stand',
    destination: 'Bengaluru Kempegowda Majestic',
    distance_km: 72.5,
    estimated_duration_min: 90,
    status: 'active',
    created_at: new Date().toISOString(),
    route_geometry: [
      [13.3409, 77.1010],
      [13.2500, 77.1800],
      [13.1600, 77.2700],
      [13.0988, 77.3912],
      [13.0500, 77.4800],
      [13.0232, 77.5503],
      [12.9774, 77.5708]
    ]
  },
  {
    id: 'route-302',
    route_number: '302',
    route_name: 'Mysuru ⇄ Bengaluru (Airavat Expressway Non-Stop & Express)',
    origin: 'Mysuru Central Suburban Bus Stand',
    destination: 'Bengaluru Kempegowda Majestic',
    distance_km: 144.0,
    estimated_duration_min: 140,
    status: 'active',
    created_at: new Date().toISOString(),
    route_geometry: [
      [12.3118, 76.6552],
      [12.4200, 76.7800],
      [12.5238, 76.8967],
      [12.5843, 77.0450],
      [12.6518, 77.2089],
      [12.7150, 77.2810],
      [12.8200, 77.3800],
      [12.9135, 77.4831],
      [12.9774, 77.5708]
    ]
  },
  {
    id: 'route-201',
    route_number: '201',
    route_name: 'Hassan ⇄ Bengaluru Majestic (via NH75)',
    origin: 'Hassan KSRTC Central Stand',
    destination: 'Bengaluru Kempegowda Majestic',
    distance_km: 182.0,
    estimated_duration_min: 210,
    status: 'active',
    created_at: new Date().toISOString(),
    route_geometry: [
      [13.0033, 76.1004],
      [12.9500, 76.2400],
      [12.9062, 76.3908],
      [12.9600, 76.6200],
      [12.9995, 76.8834],
      [13.0238, 77.0274],
      [13.0988, 77.3912],
      [12.9774, 77.5708]
    ]
  },
  {
    id: 'route-501',
    route_number: '501',
    route_name: 'Hubballi ⇄ Bengaluru (Rajahamsa Executive)',
    origin: 'Hubballi Old Bus Stand',
    destination: 'Bengaluru Kempegowda Majestic',
    distance_km: 410.0,
    estimated_duration_min: 420,
    status: 'active',
    created_at: new Date().toISOString(),
    route_geometry: [
      [15.3526, 75.1436],
      [14.7900, 75.4000],
      [14.4644, 75.9218],
      [14.2251, 76.3980],
      [13.8000, 76.7000],
      [13.3409, 77.1010],
      [13.0988, 77.3912],
      [12.9774, 77.5708]
    ]
  }
];

const initialRouteStops: RouteStop[] = [
  // Route 152: Tumkur to Bengaluru
  { id: 'rs-152-1', route_id: 'route-152', stop_id: 'stop-1001', stop_sequence: 1, scheduled_departure: '08:00', distance_from_origin_km: 0 },
  { id: 'rs-152-2', route_id: 'route-152', stop_id: 'stop-1004', stop_sequence: 2, scheduled_arrival: '08:50', scheduled_departure: '08:55', distance_from_origin_km: 48.0 },
  { id: 'rs-152-3', route_id: 'route-152', stop_id: 'stop-1005', stop_sequence: 3, scheduled_arrival: '09:15', scheduled_departure: '09:20', distance_from_origin_km: 65.0 },
  { id: 'rs-152-4', route_id: 'route-152', stop_id: 'stop-1006', stop_sequence: 4, scheduled_arrival: '09:30', distance_from_origin_km: 72.5 },

  // Route 302: Mysuru to Bengaluru
  { id: 'rs-302-1', route_id: 'route-302', stop_id: 'stop-1007', stop_sequence: 1, scheduled_departure: '07:30', distance_from_origin_km: 0 },
  { id: 'rs-302-2', route_id: 'route-302', stop_id: 'stop-1008', stop_sequence: 2, scheduled_arrival: '08:15', scheduled_departure: '08:20', distance_from_origin_km: 44.0 },
  { id: 'rs-302-3', route_id: 'route-302', stop_id: 'stop-1009', stop_sequence: 3, scheduled_arrival: '08:35', scheduled_departure: '08:40', distance_from_origin_km: 62.0 },
  { id: 'rs-302-4', route_id: 'route-302', stop_id: 'stop-1010', stop_sequence: 4, scheduled_arrival: '08:55', scheduled_departure: '09:00', distance_from_origin_km: 79.0 },
  { id: 'rs-302-5', route_id: 'route-302', stop_id: 'stop-1011', stop_sequence: 5, scheduled_arrival: '09:15', scheduled_departure: '09:20', distance_from_origin_km: 96.0 },
  { id: 'rs-302-6', route_id: 'route-302', stop_id: 'stop-1012', stop_sequence: 6, scheduled_arrival: '09:40', scheduled_departure: '09:45', distance_from_origin_km: 130.0 },
  { id: 'rs-302-7', route_id: 'route-302', stop_id: 'stop-1006', stop_sequence: 7, scheduled_arrival: '10:00', distance_from_origin_km: 144.0 },

  // Route 201: Hassan to Bengaluru
  { id: 'rs-201-1', route_id: 'route-201', stop_id: 'stop-1013', stop_sequence: 1, scheduled_departure: '06:30', distance_from_origin_km: 0 },
  { id: 'rs-201-2', route_id: 'route-201', stop_id: 'stop-1014', stop_sequence: 2, scheduled_arrival: '07:15', scheduled_departure: '07:20', distance_from_origin_km: 37.0 },
  { id: 'rs-201-3', route_id: 'route-201', stop_id: 'stop-1003', stop_sequence: 3, scheduled_arrival: '08:00', scheduled_departure: '08:05', distance_from_origin_km: 88.0 },
  { id: 'rs-201-4', route_id: 'route-201', stop_id: 'stop-1002', stop_sequence: 4, scheduled_arrival: '08:25', scheduled_departure: '08:30', distance_from_origin_km: 110.0 },
  { id: 'rs-201-5', route_id: 'route-201', stop_id: 'stop-1004', stop_sequence: 5, scheduled_arrival: '09:15', scheduled_departure: '09:20', distance_from_origin_km: 158.0 },
  { id: 'rs-201-6', route_id: 'route-201', stop_id: 'stop-1006', stop_sequence: 6, scheduled_arrival: '09:50', distance_from_origin_km: 182.0 },

  // Route 501: Hubballi to Bengaluru
  { id: 'rs-501-1', route_id: 'route-501', stop_id: 'stop-1017', stop_sequence: 1, scheduled_departure: '05:00', distance_from_origin_km: 0 },
  { id: 'rs-501-2', route_id: 'route-501', stop_id: 'stop-1015', stop_sequence: 2, scheduled_arrival: '07:30', scheduled_departure: '07:45', distance_from_origin_km: 145.0 },
  { id: 'rs-501-3', route_id: 'route-501', stop_id: 'stop-1016', stop_sequence: 3, scheduled_arrival: '08:45', scheduled_departure: '08:55', distance_from_origin_km: 210.0 },
  { id: 'rs-501-4', route_id: 'route-501', stop_id: 'stop-1001', stop_sequence: 4, scheduled_arrival: '10:45', scheduled_departure: '10:55', distance_from_origin_km: 338.0 },
  { id: 'rs-501-5', route_id: 'route-501', stop_id: 'stop-1006', stop_sequence: 5, scheduled_arrival: '12:00', distance_from_origin_km: 410.0 }
];

const initialBuses: Bus[] = [
  { id: 'bus-ka01ab1234', registration_number: 'KA 01 AB 1234', fleet_number: 'KSRTC-TU-104', model: 'Airavat Club Class (Volvo Multi-Axle)', status: 'active', capacity: 48, depot: 'Tumkur Central Depot', created_at: new Date().toISOString() },
  { id: 'bus-ka09cd5678', registration_number: 'KA 09 CD 5678', fleet_number: 'KSRTC-MY-208', model: 'Airavat Diamond Class (Scania Metrolink)', status: 'active', capacity: 45, depot: 'Mysuru Suburban Depot', created_at: new Date().toISOString() },
  { id: 'bus-ka13ef9012', registration_number: 'KA 13 EF 9012', fleet_number: 'KSRTC-HN-312', model: 'Rajahamsa Executive (Ashok Leyland)', status: 'active', capacity: 40, depot: 'Hassan Division Depot', created_at: new Date().toISOString() },
  { id: 'bus-ka25gh3456', registration_number: 'KA 25 GH 3456', fleet_number: 'KSRTC-NW-419', model: 'Sarige Karnataka Express', status: 'active', capacity: 54, depot: 'Hubballi Central Depot', created_at: new Date().toISOString() },
  { id: 'bus-ka01ij7890', registration_number: 'KA 01 IJ 7890', fleet_number: 'KSRTC-BN-522', model: 'Ambaari Dream Class (Volvo Sleeper)', status: 'maintenance', capacity: 36, depot: 'Majestic Central Workshop', created_at: new Date().toISOString() }
];

const initialUsers: UserRecord[] = [
  {
    id: 'user-admin-imtiyaz',
    name: 'Mohammed Imtiyaz (Chief Transport Controller & Super Admin)',
    email: 'moadimtiyaz@gmail.com',
    password: '9945323328@imti',
    phone: '+91 99453 23328',
    role: 'admin',
    admin_level: 'super_admin',
    depot: 'Karnataka State HQ - Majestic Central Command',
    permissions: ['all', 'fleet_manage', 'driver_manage', 'admin_manage', 'sos_dispatch', 'system_config', 'audit_view'],
    status: 'active',
    created_at: new Date().toISOString()
  },
  { id: 'user-driver-1', name: 'Basavaraj Patil', email: 'driver1@ksrtc.in', phone: '+91 98450 22002', role: 'driver', created_at: new Date().toISOString() },
  { id: 'user-driver-2', name: 'Manjunath Gowda', email: 'driver2@ksrtc.in', phone: '+91 98450 22003', role: 'driver', created_at: new Date().toISOString() },
  { id: 'user-driver-3', name: 'Shivakumar Hiremath', email: 'driver3@ksrtc.in', phone: '+91 98450 22004', role: 'driver', created_at: new Date().toISOString() },
  { id: 'user-driver-4', name: 'Venkatesh Naik', email: 'driver4@ksrtc.in', phone: '+91 98450 22005', role: 'driver', created_at: new Date().toISOString() },
  { id: 'user-driver-5', name: 'Anand Kumar', email: 'driver5@ksrtc.in', phone: '+91 98450 22006', role: 'driver', created_at: new Date().toISOString() }
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit-boot-1',
    timestamp: new Date().toISOString(),
    actor_name: 'Mohammed Imtiyaz',
    actor_email: 'moadimtiyaz@gmail.com',
    actor_role: 'super_admin',
    action: 'SYSTEM_INITIALIZATION',
    entity: 'DATABASE_ENGINE',
    details: 'KSRTC Enterprise Transit Database Engine initialized with real-time indexing & atomic file persistence.'
  },
  {
    id: 'audit-boot-2',
    timestamp: new Date().toISOString(),
    actor_name: 'Mohammed Imtiyaz',
    actor_email: 'moadimtiyaz@gmail.com',
    actor_role: 'super_admin',
    action: 'SUPER_ADMIN_VERIFIED',
    entity: 'ADMIN_ROSTER',
    details: 'Super Administrator credentials provisioned for Majestic Central Command.'
  }
];

const initialMaintenanceLogs: MaintenanceLog[] = [
  {
    id: 'maint-101',
    bus_id: 'bus-ka01ij7890',
    bus_registration: 'KA 01 IJ 7890',
    maintenance_type: 'routine_inspection',
    depot: 'Majestic Central Workshop',
    engineer_name: 'Prakash Rao (Chief Depot Engineer)',
    status: 'in_progress',
    cost_inr: 12500,
    odometer_km: 184500,
    notes: 'Pneumatic air suspension inspection and dual-circuit air brake calibration.',
    logged_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'maint-102',
    bus_id: 'bus-ka01ab1234',
    bus_registration: 'KA 01 AB 1234',
    maintenance_type: 'ac_servicing',
    depot: 'Tumkur Central Depot',
    engineer_name: 'M. S. Murthy',
    status: 'completed',
    cost_inr: 8500,
    odometer_km: 92300,
    notes: 'HVAC cabin coolant filter replacement & climate diagnostics.',
    logged_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

const initialDrivers: Driver[] = [
  { id: 'driver-101', user_id: 'user-driver-1', driver_code: 'DRV-101', name: 'Basavaraj Patil', phone: '+91 98450 22002', status: 'on_trip', assigned_bus_id: 'bus-ka01ab1234', assigned_route_id: 'route-152', created_at: new Date().toISOString() },
  { id: 'driver-102', user_id: 'user-driver-2', driver_code: 'DRV-102', name: 'Manjunath Gowda', phone: '+91 98450 22003', status: 'on_trip', assigned_bus_id: 'bus-ka09cd5678', assigned_route_id: 'route-302', created_at: new Date().toISOString() },
  { id: 'driver-103', user_id: 'user-driver-3', driver_code: 'DRV-103', name: 'Shivakumar Hiremath', phone: '+91 98450 22004', status: 'on_trip', assigned_bus_id: 'bus-ka13ef9012', assigned_route_id: 'route-201', created_at: new Date().toISOString() },
  { id: 'driver-104', user_id: 'user-driver-4', driver_code: 'DRV-104', name: 'Venkatesh Naik', phone: '+91 98450 22005', status: 'on_trip', assigned_bus_id: 'bus-ka25gh3456', assigned_route_id: 'route-501', created_at: new Date().toISOString() },
  { id: 'driver-105', user_id: 'user-driver-5', driver_code: 'DRV-105', name: 'Anand Kumar', phone: '+91 98450 22006', status: 'available', assigned_bus_id: 'bus-ka01ij7890', assigned_route_id: 'route-152', created_at: new Date().toISOString() }
];

export const initialTrips: Trip[] = [
  {
    id: 'trip-152-101',
    bus_id: 'bus-ka01ab1234',
    driver_id: 'driver-101',
    route_id: 'route-152',
    status: 'in_progress',
    start_time: new Date(Date.now() - 40 * 60000).toISOString()
  },
  {
    id: 'trip-302-102',
    bus_id: 'bus-ka09cd5678',
    driver_id: 'driver-102',
    route_id: 'route-302',
    status: 'in_progress',
    start_time: new Date(Date.now() - 55 * 60000).toISOString()
  },
  {
    id: 'trip-201-103',
    bus_id: 'bus-ka13ef9012',
    driver_id: 'driver-103',
    route_id: 'route-201',
    status: 'in_progress',
    start_time: new Date(Date.now() - 80 * 60000).toISOString()
  },
  {
    id: 'trip-501-104',
    bus_id: 'bus-ka25gh3456',
    driver_id: 'driver-104',
    route_id: 'route-501',
    status: 'in_progress',
    start_time: new Date(Date.now() - 170 * 60000).toISOString()
  }
];

export const initialBusLocations: BusLocation[] = [
  {
    id: 'loc-init-1',
    bus_id: 'bus-ka01ab1234',
    trip_id: 'trip-152-101',
    latitude: 13.0988,
    longitude: 77.3912,
    accuracy: 8,
    speed: 62,
    heading: 135,
    timestamp: new Date().toISOString(),
    is_valid: true,
    next_stop_name: 'Yeshwanthpur TTMC Bus Terminal',
    next_stop_id: 'stop-1005',
    eta_minutes: 18,
    distance_to_next_stop_km: 17.5
  },
  {
    id: 'loc-init-2',
    bus_id: 'bus-ka09cd5678',
    trip_id: 'trip-302-102',
    latitude: 12.6518,
    longitude: 77.2089,
    accuracy: 6,
    speed: 76,
    heading: 65,
    timestamp: new Date().toISOString(),
    is_valid: true,
    next_stop_name: 'Ramanagara Bus Depot Circle',
    next_stop_id: 'stop-1011',
    eta_minutes: 14,
    distance_to_next_stop_km: 16.8
  },
  {
    id: 'loc-init-3',
    bus_id: 'bus-ka13ef9012',
    trip_id: 'trip-201-103',
    latitude: 13.0238,
    longitude: 77.0274,
    accuracy: 10,
    speed: 58,
    heading: 98,
    timestamp: new Date().toISOString(),
    is_valid: true,
    next_stop_name: 'Nelamangala Toll Plaza Stop',
    next_stop_id: 'stop-1004',
    eta_minutes: 32,
    distance_to_next_stop_km: 48.0
  },
  {
    id: 'loc-init-4',
    bus_id: 'bus-ka25gh3456',
    trip_id: 'trip-501-104',
    latitude: 14.2251,
    longitude: 76.3980,
    accuracy: 12,
    speed: 65,
    heading: 145,
    timestamp: new Date().toISOString(),
    is_valid: true,
    next_stop_name: 'Tumkur KSRTC Bus Stand',
    next_stop_id: 'stop-1001',
    eta_minutes: 95,
    distance_to_next_stop_km: 128.0
  }
];

// In-Memory & File-backed Store to guarantee high performance & instant responsiveness
class DatabaseStore {
  users: UserRecord[] = [...initialUsers];
  drivers: Driver[] = [...initialDrivers];
  buses: Bus[] = [...initialBuses];
  routes: Route[] = [...initialRoutes];
  stops: Stop[] = [...initialStops];
  routeStops: RouteStop[] = [...initialRouteStops];
  trips: Trip[] = [...initialTrips];
  busLocations: BusLocation[] = [...initialBusLocations];
  notifications: NotificationItem[] = [];
  favourites: FavoriteItem[] = [];
  reports: PassengerReport[] = [];
  sosAlerts: SOSAlert[] = [];
  auditLogs: AuditLog[] = [...initialAuditLogs];
  maintenanceLogs: MaintenanceLog[] = [...initialMaintenanceLogs];

  private storageFile = path.join(process.cwd(), 'database_state.json');
  private backupFile = path.join(process.cwd(), 'database_state.backup.json');
  private bootTime = Date.now();
  private transactionCount = 0;
  private lastSnapshotAt = new Date().toISOString();

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const data = JSON.parse(raw);
        if (data.users?.length) this.users = data.users;
        if (data.drivers?.length) this.drivers = data.drivers;
        if (data.buses?.length) this.buses = data.buses;
        if (data.routes?.length) {
          this.routes = data.routes;
          for (const r of initialRoutes) {
            if (!this.routes.some(existing => existing.id === r.id)) {
              this.routes.push(r);
            }
          }
        }
        if (data.stops?.length) {
          this.stops = data.stops;
          for (const s of initialStops) {
            if (!this.stops.some(existing => existing.id === s.id)) {
              this.stops.push(s);
            }
          }
        }
        if (data.routeStops?.length) {
          this.routeStops = data.routeStops;
          for (const rs of initialRouteStops) {
            if (!this.routeStops.some(existing => existing.id === rs.id)) {
              this.routeStops.push(rs);
            }
          }
        }
        if (data.trips && data.trips.some((t: Trip) => t.status === 'in_progress')) {
          this.trips = data.trips;
        } else {
          this.trips = [...initialTrips];
        }
        if (data.busLocations?.length) {
          this.busLocations = data.busLocations;
        } else {
          this.busLocations = [...initialBusLocations];
        }
        if (data.notifications?.length) this.notifications = data.notifications;
        if (data.favourites?.length) this.favourites = data.favourites;
        if (data.reports?.length) this.reports = data.reports;
        if (data.sosAlerts?.length) this.sosAlerts = data.sosAlerts;
        if (data.auditLogs?.length) this.auditLogs = data.auditLogs;
        if (data.maintenanceLogs?.length) this.maintenanceLogs = data.maintenanceLogs;
      }
    } catch (e) {
      console.warn('Could not read state file, using initial memory seed:', e);
    }

    // Crucial: Guarantee primary Super Administrator (moadimtiyaz@gmail.com) always exists with official credentials
    const imtiyazUser = this.users.find(u => u.email.toLowerCase() === 'moadimtiyaz@gmail.com');
    if (!imtiyazUser) {
      this.users.unshift({
        id: 'user-admin-imtiyaz',
        name: 'Mohammed Imtiyaz (Chief Transport Controller & Super Admin)',
        email: 'moadimtiyaz@gmail.com',
        password: '9945323328@imti',
        phone: '+91 99453 23328',
        role: 'admin',
        admin_level: 'super_admin',
        depot: 'Karnataka State HQ - Majestic Central Command',
        permissions: ['all', 'fleet_manage', 'driver_manage', 'admin_manage', 'sos_dispatch', 'system_config', 'audit_view'],
        status: 'active',
        created_at: new Date().toISOString()
      });
    } else {
      // Ensure password and role are exact
      imtiyazUser.password = '9945323328@imti';
      imtiyazUser.role = 'admin';
      imtiyazUser.admin_level = 'super_admin';
      if (!imtiyazUser.permissions || !imtiyazUser.permissions.includes('all')) {
        imtiyazUser.permissions = ['all', 'fleet_manage', 'driver_manage', 'admin_manage', 'sos_dispatch', 'system_config', 'audit_view'];
      }
    }

    // Filter out any legacy fake admin
    this.users = this.users.filter(u => u.email.toLowerCase() !== 'admin@ksrtc.in');

    // Ensure there is at least one active location per active trip
    const activeTrips = this.getActiveTrips();
    for (const trip of activeTrips) {
      const loc = this.getLatestLocation(trip.bus_id);
      if (!loc) {
        const seedLoc = initialBusLocations.find(l => l.bus_id === trip.bus_id);
        if (seedLoc) {
          this.busLocations.push({ ...seedLoc, timestamp: new Date().toISOString() });
        }
      }
    }
  }

  saveToFile() {
    try {
      this.transactionCount++;
      const data = {
        users: this.users,
        drivers: this.drivers,
        buses: this.buses,
        routes: this.routes,
        stops: this.stops,
        routeStops: this.routeStops,
        trips: this.trips,
        busLocations: this.busLocations,
        notifications: this.notifications,
        favourites: this.favourites,
        reports: this.reports,
        sosAlerts: this.sosAlerts,
        auditLogs: this.auditLogs,
        maintenanceLogs: this.maintenanceLogs,
        saved_at: new Date().toISOString(),
        transaction_count: this.transactionCount
      };

      // Atomic write pattern: write to tmp file, then rename atomically
      const tmpFile = `${this.storageFile}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.storageFile);
      this.lastSnapshotAt = new Date().toISOString();

      // Create backup snapshot every 10 transactions
      if (this.transactionCount % 10 === 0) {
        fs.copyFileSync(this.storageFile, this.backupFile);
      }
    } catch (e) {
      console.warn('Could not write state file:', e);
    }
  }

  // Enterprise Audit Logging
  logAudit(
    actor: { name: string; email: string; role?: string },
    action: string,
    entity: string,
    details: string,
    entityId?: string
  ): AuditLog {
    const logEntry: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor_name: actor.name || 'System Operator',
      actor_email: actor.email || 'moadimtiyaz@gmail.com',
      actor_role: actor.role || 'admin',
      action,
      entity,
      entity_id: entityId,
      details
    };

    this.auditLogs.unshift(logEntry);
    // Keep max 1,000 audit logs in active memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(0, 1000);
    }
    this.saveToFile();
    return logEntry;
  }

  // Admin User Management CRUD
  getAdmins(): AdminUser[] {
    return this.users
      .filter(u => u.role === 'admin')
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        password: u.password || '9945323328@imti',
        role: 'admin' as const,
        admin_level: u.admin_level || 'divisional_controller',
        depot: u.depot || 'General Fleet Ops',
        permissions: u.permissions || ['fleet_manage', 'driver_manage'],
        status: u.status || 'active',
        created_at: u.created_at,
        last_login: u.last_login,
        created_by: u.created_by
      }));
  }

  createAdmin(
    adminData: {
      name: string;
      email: string;
      password?: string;
      phone?: string;
      admin_level?: AdminLevel;
      depot?: string;
      permissions?: string[];
    },
    actor?: { name: string; email: string; role?: string }
  ): AdminUser {
    const cleanEmail = adminData.email.trim().toLowerCase();
    const existing = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`An officer/user account with email ${cleanEmail} already exists.`);
    }

    const newAdmin: UserRecord = {
      id: `admin-${Date.now()}`,
      name: adminData.name.trim(),
      email: cleanEmail,
      password: adminData.password || '9945323328@imti',
      phone: adminData.phone || '+91 98450 00000',
      role: 'admin',
      admin_level: adminData.admin_level || 'divisional_controller',
      depot: adminData.depot || 'Central Fleet Division',
      permissions: adminData.permissions || ['fleet_manage', 'driver_manage', 'sos_dispatch'],
      status: 'active',
      created_at: new Date().toISOString(),
      created_by: actor?.email || 'moadimtiyaz@gmail.com'
    };

    this.users.push(newAdmin);
    this.logAudit(
      actor || { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' },
      'ADMIN_CREATED',
      'ADMIN_ROSTER',
      `Created new admin officer: ${newAdmin.name} (${newAdmin.email}) with level ${newAdmin.admin_level} at ${newAdmin.depot}`,
      newAdmin.id
    );
    this.saveToFile();

    return {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      password: newAdmin.password,
      phone: newAdmin.phone,
      role: 'admin',
      admin_level: newAdmin.admin_level as AdminLevel,
      depot: newAdmin.depot!,
      permissions: newAdmin.permissions!,
      status: newAdmin.status!,
      created_at: newAdmin.created_at,
      created_by: newAdmin.created_by
    };
  }

  updateAdmin(
    id: string,
    updates: Partial<UserRecord>,
    actor?: { name: string; email: string; role?: string }
  ): AdminUser {
    const admin = this.users.find(u => u.id === id && u.role === 'admin');
    if (!admin) {
      throw new Error(`Admin officer with ID ${id} not found.`);
    }

    // Protect primary super admin email
    if (admin.email.toLowerCase() === 'moadimtiyaz@gmail.com' && updates.email && updates.email.toLowerCase() !== 'moadimtiyaz@gmail.com') {
      throw new Error('Primary Super Administrator email cannot be altered.');
    }

    if (updates.name) admin.name = updates.name.trim();
    if (updates.phone) admin.phone = updates.phone.trim();
    if (updates.password) admin.password = updates.password;
    if (updates.admin_level) admin.admin_level = updates.admin_level;
    if (updates.depot) admin.depot = updates.depot;
    if (updates.permissions) admin.permissions = updates.permissions;
    if (updates.status) admin.status = updates.status;

    this.logAudit(
      actor || { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' },
      'ADMIN_UPDATED',
      'ADMIN_ROSTER',
      `Updated admin profile for ${admin.name} (${admin.email})`,
      admin.id
    );
    this.saveToFile();

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      password: admin.password,
      phone: admin.phone,
      role: 'admin',
      admin_level: admin.admin_level as AdminLevel,
      depot: admin.depot || 'Central Command',
      permissions: admin.permissions || ['all'],
      status: admin.status || 'active',
      created_at: admin.created_at
    };
  }

  deleteAdmin(id: string, actor?: { name: string; email: string; role?: string }): boolean {
    const adminIndex = this.users.findIndex(u => u.id === id && u.role === 'admin');
    if (adminIndex === -1) {
      throw new Error(`Admin with ID ${id} not found.`);
    }

    const admin = this.users[adminIndex];
    if (admin.email.toLowerCase() === 'moadimtiyaz@gmail.com') {
      throw new Error('Security Restriction: Primary Super Administrator (moadimtiyaz@gmail.com) cannot be deleted.');
    }

    this.users.splice(adminIndex, 1);
    this.logAudit(
      actor || { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' },
      'ADMIN_REMOVED',
      'ADMIN_ROSTER',
      `Deleted admin account for ${admin.name} (${admin.email})`,
      admin.id
    );
    this.saveToFile();
    return true;
  }

  // Database Diagnostics for Enterprise Monitoring
  getDiagnostics(): DatabaseDiagnostics {
    let storageBytes = 0;
    try {
      if (fs.existsSync(this.storageFile)) {
        storageBytes = fs.statSync(this.storageFile).size;
      }
    } catch {
      storageBytes = 0;
    }

    const uptimeSeconds = Math.floor((Date.now() - this.bootTime) / 1000);
    const totalRecords =
      this.users.length +
      this.drivers.length +
      this.buses.length +
      this.routes.length +
      this.stops.length +
      this.routeStops.length +
      this.trips.length +
      this.busLocations.length +
      this.sosAlerts.length +
      this.reports.length +
      this.auditLogs.length +
      this.maintenanceLogs.length;

    return {
      status: 'HEALTHY',
      engine: 'KSRTC High-Performance Atomic Transit Store (v4.2 Enterprise)',
      uptime_seconds: uptimeSeconds,
      total_records: totalRecords,
      collections: {
        users: this.users.length,
        admins: this.users.filter(u => u.role === 'admin').length,
        drivers: this.drivers.length,
        buses: this.buses.length,
        routes: this.routes.length,
        stops: this.stops.length,
        route_stops: this.routeStops.length,
        trips: this.trips.length,
        sos_alerts: this.sosAlerts.length,
        reports: this.reports.length,
        audit_logs: this.auditLogs.length,
        maintenance_logs: this.maintenanceLogs.length
      },
      storage_bytes: storageBytes,
      storage_file: 'database_state.json',
      last_snapshot_at: this.lastSnapshotAt,
      active_connections: 1,
      persistence_mode: 'ATOMIC_WRITE_WITH_ROLLING_BACKUP',
      last_backup_status: fs.existsSync(this.backupFile) ? 'Active Snapshot OK' : 'Pending First Cycle'
    };
  }

  // Instant Full Backup Snapshot
  createBackup() {
    this.saveToFile();
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const filename = `ksrtc_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const dest = path.join(backupDir, filename);
    fs.copyFileSync(this.storageFile, dest);
    const size = fs.statSync(dest).size;

    this.logAudit(
      { name: 'Mohammed Imtiyaz', email: 'moadimtiyaz@gmail.com', role: 'super_admin' },
      'DATABASE_SNAPSHOT_CREATED',
      'DATABASE_ENGINE',
      `Manual snapshot archive created: ${filename} (${Math.round(size / 1024)} KB)`
    );

    return { filename, timestamp: new Date().toISOString(), size };
  }

  // Helper query methods
  getRouteWithStops(routeId: string): Route | undefined {
    const route = this.routes.find(r => r.id === routeId || r.route_number === routeId);
    if (!route) return undefined;
    const rStops = this.routeStops
      .filter(rs => rs.route_id === route.id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map(rs => {
        const stop = this.stops.find(s => s.id === rs.stop_id);
        return { ...rs, stop };
      });
    return { ...route, stops: rStops };
  }

  getStopByCodeOrId(identifier: string): Stop | undefined {
    return this.stops.find(s => s.id === identifier || s.stop_code === identifier);
  }

  getActiveTrips(): Trip[] {
    return this.trips.filter(t => t.status === 'in_progress' || t.status === 'paused');
  }

  getLatestLocation(busId: string): BusLocation | undefined {
    const locs = this.busLocations.filter(l => l.bus_id === busId && l.is_valid);
    if (!locs.length) return undefined;
    return locs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }
}

export const db = new DatabaseStore();

