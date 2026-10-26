import {
  User,
  Driver,
  Bus,
  Route,
  Stop,
  Trip,
  LiveBusTelemetry,
  FleetStats,
  IVRResponse,
  PassengerReport,
  NotificationItem,
  FavoriteItem,
  SOSAlert,
  SystemKeysResponse,
  AdminUser,
  AuditLog,
  MaintenanceLog,
  DatabaseDiagnostics,
  TripPlanRequest,
  TripPlanResponse,
  PopularTripItem
} from '../types';

const API_BASE = '/api';

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  try {
    const token = localStorage.getItem('ksrtc_token') || sessionStorage.getItem('ksrtc_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-admin-token'] = token;
    }
  } catch {}
  return headers;
}

export const FALLBACK_ROUTES: Route[] = [
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

export const FALLBACK_STOPS: Stop[] = [
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

export const FALLBACK_LIVE_BUSES: LiveBusTelemetry[] = [
  {
    bus_id: 'bus-ka01ab1234',
    registration_number: 'KA 01 AB 1234',
    fleet_number: 'KSRTC-TU-104',
    model: 'Airavat Club Class (Volvo Multi-Axle)',
    trip_id: 'trip-152-101',
    driver_name: 'Basavaraj Patil',
    driver_code: 'DRV-101',
    route_id: 'route-152',
    route_number: '152',
    route_name: 'Tumkur ⇄ Bengaluru Majestic (Express via NH48)',
    origin: 'Tumkur KSRTC Bus Stand',
    destination: 'Bengaluru Kempegowda Majestic',
    latitude: 13.0988,
    longitude: 77.3912,
    accuracy: 8,
    speed: 62,
    heading: 135,
    timestamp: new Date().toISOString(),
    status: 'LIVE',
    seconds_ago: 2,
    next_stop: 'Yeshwanthpur TTMC Bus Terminal',
    next_stop_id: 'stop-1005',
    eta_minutes: 18,
    distance_to_next_km: 17.5,
    trip_status: 'in_progress'
  },
  {
    bus_id: 'bus-ka09cd5678',
    registration_number: 'KA 09 CD 5678',
    fleet_number: 'KSRTC-MY-208',
    model: 'Airavat Diamond Class (Scania Metrolink)',
    trip_id: 'trip-302-102',
    driver_name: 'Manjunath Gowda',
    driver_code: 'DRV-102',
    route_id: 'route-302',
    route_number: '302',
    route_name: 'Mysuru ⇄ Bengaluru (Airavat Expressway Non-Stop & Express)',
    origin: 'Mysuru Central Suburban Bus Stand',
    destination: 'Bengaluru Kempegowda Majestic',
    latitude: 12.6518,
    longitude: 77.2089,
    accuracy: 6,
    speed: 76,
    heading: 65,
    timestamp: new Date().toISOString(),
    status: 'LIVE',
    seconds_ago: 3,
    next_stop: 'Ramanagara Bus Depot Circle',
    next_stop_id: 'stop-1011',
    eta_minutes: 14,
    distance_to_next_km: 16.8,
    trip_status: 'in_progress'
  },
  {
    bus_id: 'bus-ka13ef9012',
    registration_number: 'KA 13 EF 9012',
    fleet_number: 'KSRTC-HN-312',
    model: 'Rajahamsa Executive (Ashok Leyland)',
    trip_id: 'trip-201-103',
    driver_name: 'Shivakumar Hiremath',
    driver_code: 'DRV-103',
    route_id: 'route-201',
    route_number: '201',
    route_name: 'Hassan ⇄ Bengaluru Majestic (via NH75)',
    origin: 'Hassan KSRTC Central Stand',
    destination: 'Bengaluru Kempegowda Majestic',
    latitude: 13.0238,
    longitude: 77.0274,
    accuracy: 10,
    speed: 58,
    heading: 98,
    timestamp: new Date().toISOString(),
    status: 'LIVE',
    seconds_ago: 5,
    next_stop: 'Nelamangala Toll Plaza Stop',
    next_stop_id: 'stop-1004',
    eta_minutes: 32,
    distance_to_next_km: 48.0,
    trip_status: 'in_progress'
  },
  {
    bus_id: 'bus-ka25gh3456',
    registration_number: 'KA 25 GH 3456',
    fleet_number: 'KSRTC-NW-419',
    model: 'Sarige Karnataka Express',
    trip_id: 'trip-501-104',
    driver_name: 'Venkatesh Naik',
    driver_code: 'DRV-104',
    route_id: 'route-501',
    route_number: '501',
    route_name: 'Hubballi ⇄ Bengaluru (Rajahamsa Executive)',
    origin: 'Hubballi Old Bus Stand',
    destination: 'Bengaluru Kempegowda Majestic',
    latitude: 14.2251,
    longitude: 76.3980,
    accuracy: 12,
    speed: 65,
    heading: 145,
    timestamp: new Date().toISOString(),
    status: 'LIVE',
    seconds_ago: 4,
    next_stop: 'Tumkur KSRTC Bus Stand',
    next_stop_id: 'stop-1001',
    eta_minutes: 95,
    distance_to_next_km: 128.0,
    trip_status: 'in_progress'
  }
];

export const api = {
  // Auth
  async getDriversRoster(): Promise<{
    drivers: Array<{
      id: string;
      driver_code: string;
      name: string;
      phone: string;
      status: string;
      assigned_bus_id: string;
      bus_registration: string;
      bus_model: string;
      assigned_route_id: string;
      route_name: string;
      default_password: string;
    }>;
  }> {
    const res = await fetch(`${API_BASE}/auth/drivers-roster`);
    if (!res.ok) throw new Error('Failed to fetch drivers roster');
    return res.json();
  },

  async loginWithGoogle(profile: { uid: string; email?: string | null; name?: string | null; photoURL?: string | null }) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Google login failed' }));
      throw new Error(err.error || 'Google login failed');
    }
    return res.json();
  },

  async requestOtp(email: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const res = await fetch(`${API_BASE}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to request OTP' }));
      throw new Error(err.error || 'Failed to request OTP');
    }
    return res.json();
  },

  async verifyOtp(email: string, otp: string): Promise<{ token: string; user: User; role: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Invalid or expired OTP' }));
      throw new Error(err.error || 'Invalid or expired OTP');
    }
    return res.json();
  },

  async login(identifier: string, password?: string, role?: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, role })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async signup(name: string, email: string, phone?: string, role: string = 'passenger') {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, role })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Signup failed' }));
      throw new Error(err.error || 'Signup failed');
    }
    return res.json();
  },

  async getMe(token: string) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  // Live Buses
  async getLiveBuses(): Promise<{ count: number; buses: LiveBusTelemetry[] }> {
    try {
      const res = await fetch(`${API_BASE}/buses/live`);
      if (!res.ok) throw new Error('Failed to fetch live buses');
      const data = await res.json();
      if (Array.isArray(data.buses) && data.buses.length > 0) {
        return data;
      }
      return { count: FALLBACK_LIVE_BUSES.length, buses: FALLBACK_LIVE_BUSES };
    } catch {
      return { count: FALLBACK_LIVE_BUSES.length, buses: FALLBACK_LIVE_BUSES };
    }
  },

  async getBuses(): Promise<{ buses: Bus[] }> {
    try {
      const res = await fetch(`${API_BASE}/buses`);
      if (!res.ok) throw new Error('Failed to fetch fleet buses');
      return await res.json();
    } catch {
      return {
        buses: [
          { id: 'bus-ka01ab1234', registration_number: 'KA 01 AB 1234', fleet_number: 'KSRTC-TU-104', model: 'Airavat Club Class (Volvo Multi-Axle)', status: 'active', capacity: 48, depot: 'Tumkur Central Depot', created_at: new Date().toISOString() },
          { id: 'bus-ka09cd5678', registration_number: 'KA 09 CD 5678', fleet_number: 'KSRTC-MY-208', model: 'Airavat Diamond Class (Scania Metrolink)', status: 'active', capacity: 45, depot: 'Mysuru Suburban Depot', created_at: new Date().toISOString() },
          { id: 'bus-ka13ef9012', registration_number: 'KA 13 EF 9012', fleet_number: 'KSRTC-HN-312', model: 'Rajahamsa Executive (Ashok Leyland)', status: 'active', capacity: 40, depot: 'Hassan Division Depot', created_at: new Date().toISOString() },
          { id: 'bus-ka25gh3456', registration_number: 'KA 25 GH 3456', fleet_number: 'KSRTC-NW-419', model: 'Sarige Karnataka Express', status: 'active', capacity: 54, depot: 'Hubballi Central Depot', created_at: new Date().toISOString() }
        ]
      };
    }
  },

  async getBusDetails(id: string) {
    try {
      const res = await fetch(`${API_BASE}/buses/${id}`);
      if (!res.ok) throw new Error('Failed to fetch bus details');
      return await res.json();
    } catch {
      const liveBus = FALLBACK_LIVE_BUSES.find(b => b.bus_id === id);
      return {
        bus: {
          id: id,
          registration_number: liveBus?.registration_number || 'KA 01 AB 1234',
          fleet_number: liveBus?.fleet_number || 'KSRTC-TU-104',
          model: liveBus?.model || 'Airavat Club Class (Volvo Multi-Axle)',
          status: 'active',
          capacity: 48
        },
        liveStatus: 'LIVE',
        secondsAgo: 5
      };
    }
  },

  // Routes
  async getRoutes(): Promise<{ routes: Route[] }> {
    try {
      const res = await fetch(`${API_BASE}/routes`);
      if (!res.ok) throw new Error('Failed to fetch routes');
      const data = await res.json();
      if (Array.isArray(data.routes) && data.routes.length > 0) {
        return data;
      }
      return { routes: FALLBACK_ROUTES };
    } catch {
      return { routes: FALLBACK_ROUTES };
    }
  },

  async searchRoutes(from?: string, to?: string, routeNumber?: string, query?: string): Promise<{ count: number; routes: Route[] }> {
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (routeNumber) params.set('route_number', routeNumber);
      if (query) params.set('q', query);
      const res = await fetch(`${API_BASE}/routes/search?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to search routes');
      return await res.json();
    } catch {
      const filtered = FALLBACK_ROUTES.filter(r => {
        const matchesFrom = !from || r.origin.toLowerCase().includes(from.toLowerCase()) || r.route_name.toLowerCase().includes(from.toLowerCase());
        const matchesTo = !to || r.destination.toLowerCase().includes(to.toLowerCase()) || r.route_name.toLowerCase().includes(to.toLowerCase());
        const matchesRouteNum = !routeNumber || r.route_number.toLowerCase().includes(routeNumber.toLowerCase().replace(/^route\s*/i, ''));
        const matchesQ = !query || r.route_number.toLowerCase().includes(query.toLowerCase()) || r.route_name.toLowerCase().includes(query.toLowerCase()) || r.origin.toLowerCase().includes(query.toLowerCase()) || r.destination.toLowerCase().includes(query.toLowerCase());
        return matchesFrom && matchesTo && matchesRouteNum && matchesQ;
      });
      return { count: filtered.length, routes: filtered };
    }
  },

  async getRouteDetails(id: string): Promise<{ route: Route; activeBuses: LiveBusTelemetry[] }> {
    try {
      const res = await fetch(`${API_BASE}/routes/${id}`);
      if (!res.ok) throw new Error('Failed to fetch route details');
      return await res.json();
    } catch {
      const route = FALLBACK_ROUTES.find(r => r.id === id || r.route_number === id) || FALLBACK_ROUTES[0];
      const activeBuses = FALLBACK_LIVE_BUSES.filter(b => b.route_id === route.id);
      return { route, activeBuses };
    }
  },

  // Stops
  async getStops(): Promise<{ stops: Stop[] }> {
    try {
      const res = await fetch(`${API_BASE}/stops`);
      if (!res.ok) throw new Error('Failed to fetch stops');
      const data = await res.json();
      if (Array.isArray(data.stops) && data.stops.length > 0) {
        return data;
      }
      return { stops: FALLBACK_STOPS };
    } catch {
      return { stops: FALLBACK_STOPS };
    }
  },

  async getNearbyStops(lat: number, lng: number, radius: number = 25): Promise<{ stops: (Stop & { distance_from_user_km: number })[] }> {
    const res = await fetch(`${API_BASE}/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    if (!res.ok) throw new Error('Failed to fetch nearby stops');
    return res.json();
  },

  async getStopDetails(idOrCode: string): Promise<{
    stop: Stop;
    servicingRoutes: Route[];
    approachingBuses: (LiveBusTelemetry & { eta_to_this_stop_min: number; distance_to_this_stop_km: number })[];
    qrUrl: string;
    ivrInstructions: { tollFreeNumber: string; stopCode: string; instructions: string };
  }> {
    const res = await fetch(`${API_BASE}/stops/${idOrCode}`);
    if (!res.ok) throw new Error('Failed to fetch stop details');
    return res.json();
  },

  // A-to-B Route Planner with Live Telemetry
  async planTrip(params: TripPlanRequest): Promise<TripPlanResponse> {
    const res = await fetch(`${API_BASE}/planner/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to plan KSRTC trip');
    }
    return res.json();
  },

  async getPopularTrips(): Promise<{ corridors: PopularTripItem[] }> {
    const res = await fetch(`${API_BASE}/planner/popular`);
    if (!res.ok) throw new Error('Failed to fetch popular trips');
    return res.json();
  },

  async searchPlannerStops(q: string): Promise<{ stops: Stop[] }> {
    const res = await fetch(`${API_BASE}/planner/stops?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('Failed to search stops');
    return res.json();
  },

  // Driver GPS Ingestion & Trip actions
  async getDriverStatus(driverId: string): Promise<{
    driver: Driver;
    assignedBus: Bus;
    assignedRoute: Route;
    activeTrip?: Trip;
    currentLocation?: any;
  }> {
    const res = await fetch(`${API_BASE}/driver/status/${driverId}`);
    if (!res.ok) throw new Error('Failed to fetch driver status');
    return res.json();
  },

  async assignDriverRouteAndBus(payload: { driver_id: string; route_id?: string; bus_id?: string }) {
    const res = await fetch(`${API_BASE}/driver/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update driver assignment');
    return res.json();
  },

  async startDriverTrip(
    driver_id: string,
    bus_id: string,
    route_id: string,
    latitude: number,
    longitude: number,
    options?: { override_geofence?: boolean; force?: boolean; use_origin_coords?: boolean }
  ) {
    const res = await fetch(`${API_BASE}/driver/trip/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_id,
        bus_id,
        route_id,
        latitude,
        longitude,
        ...options
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to start trip' }));
      const errorObj: any = new Error(err.error || 'Failed to start trip');
      errorObj.data = err;
      throw errorObj;
    }
    return res.json();
  },

  async pauseDriverTrip(trip_id: string) {
    const res = await fetch(`${API_BASE}/driver/trip/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id })
    });
    return res.json();
  },

  async resumeDriverTrip(trip_id: string) {
    const res = await fetch(`${API_BASE}/driver/trip/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id })
    });
    return res.json();
  },

  async endDriverTrip(trip_id: string) {
    const res = await fetch(`${API_BASE}/driver/trip/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id })
    });
    return res.json();
  },

  async sendGPSUpdate(payload: {
    bus_id: string;
    driver_id?: string;
    trip_id?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
  }) {
    const res = await fetch(`${API_BASE}/location/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'GPS update rejected' }));
      throw new Error(err.error || 'GPS update rejected');
    }
    return res.json();
  },

  async sendBatchGPSUpdates(updates: any[]) {
    const res = await fetch(`${API_BASE}/location/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    return res.json();
  },

  // Background Supabase Telemetry Sync
  async syncDriverLocationToSupabase(payload: {
    driver_id: string;
    bus_id: string;
    route_id: string;
    trip_id: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    timestamp?: string;
  }) {
    const res = await fetch(`${API_BASE}/driver/supabase-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Supabase sync failed' }));
      throw new Error(err.error || 'Supabase sync failed');
    }
    return res.json();
  },

  async getSupabaseSyncStatus() {
    const res = await fetch(`${API_BASE}/driver/supabase-sync/status`);
    if (!res.ok) throw new Error('Failed to get Supabase sync status');
    return res.json();
  },

  // IVR Endpoints
  async getIVRWelcome(): Promise<IVRResponse> {
    const res = await fetch(`${API_BASE}/ivr/welcome`);
    return res.json();
  },

  async sendIVRInput(payload: {
    sessionId?: string;
    digits?: string;
    action?: string;
    language?: string;
    stop_code?: string;
    phoneNumber?: string;
  }): Promise<IVRResponse> {
    const res = await fetch(`${API_BASE}/ivr/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to process IVR input');
    return res.json();
  },

  async sendIVRSMS(payload: {
    phone: string;
    stopCode?: string;
    stopName?: string;
    routeNumber?: string;
    busNumber?: string;
    etaMinutes?: number;
  }) {
    const res = await fetch(`${API_BASE}/ivr/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to dispatch SMS');
    return res.json();
  },

  async sendIVRLanguage(lang: string): Promise<IVRResponse> {
    const res = await fetch(`${API_BASE}/ivr/language`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang })
    });
    return res.json();
  },

  async sendIVRStop(stop_code: string, language: 'en' | 'kn' | 'hi'): Promise<IVRResponse> {
    const res = await fetch(`${API_BASE}/ivr/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stop_code, language })
    });
    return res.json();
  },

  async sendIVRSelection(action: string, language: string, stop_code?: string): Promise<IVRResponse> {
    const res = await fetch(`${API_BASE}/ivr/selection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, language, stop_code })
    });
    return res.json();
  },

  // Admin Fleet & Analytics
  async getAdminStats(): Promise<{ stats: FleetStats }> {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    return res.json();
  },

  async createBus(busData: Partial<Bus>) {
    const res = await fetch(`${API_BASE}/admin/buses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(busData)
    });
    if (!res.ok) throw new Error('Failed to create bus');
    return res.json();
  },

  async updateBus(id: string, busData: Partial<Bus>) {
    const res = await fetch(`${API_BASE}/admin/buses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(busData)
    });
    if (!res.ok) throw new Error('Failed to update bus');
    return res.json();
  },

  async deleteBus(id: string) {
    const res = await fetch(`${API_BASE}/admin/buses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete bus');
    return res.json();
  },

  async createDriver(driverData: Partial<Driver> & { password?: string }) {
    const res = await fetch(`${API_BASE}/admin/drivers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(driverData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create driver' }));
      throw new Error(err.error || 'Failed to create driver');
    }
    return res.json();
  },

  async updateDriver(id: string, driverData: Partial<Driver> & { password?: string }) {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(driverData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update driver' }));
      throw new Error(err.error || 'Failed to update driver');
    }
    return res.json();
  },

  async deleteDriver(id: string) {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete driver');
    return res.json();
  },

  async revokeDriverAccess(id: string) {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}/revoke-access`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to revoke driver access' }));
      throw new Error(err.error || 'Failed to revoke driver access');
    }
    return res.json();
  },

  async restoreDriverAccess(id: string) {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}/restore-access`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to restore driver access' }));
      throw new Error(err.error || 'Failed to restore driver access');
    }
    return res.json();
  },

  async revokeAllDriversAccess() {
    const res = await fetch(`${API_BASE}/admin/drivers/revoke-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to execute emergency driver lockdown' }));
      throw new Error(err.error || 'Failed to execute emergency driver lockdown');
    }
    return res.json();
  },

  async createRoute(routeData: any) {
    const res = await fetch(`${API_BASE}/admin/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routeData)
    });
    if (!res.ok) throw new Error('Failed to create route');
    return res.json();
  },

  async updateRoute(id: string, routeData: any) {
    const res = await fetch(`${API_BASE}/admin/routes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routeData)
    });
    if (!res.ok) throw new Error('Failed to update route');
    return res.json();
  },

  async deleteRoute(id: string) {
    const res = await fetch(`${API_BASE}/admin/routes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete route');
    return res.json();
  },

  async addStopToRoute(routeId: string, payload: { stop_id: string; scheduled_arrival?: string; scheduled_departure?: string; distance_from_origin_km?: number; stop_sequence?: number }) {
    const res = await fetch(`${API_BASE}/admin/routes/${routeId}/stops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to add stop to route');
    return res.json();
  },

  async removeStopFromRoute(routeId: string, stopId: string) {
    const res = await fetch(`${API_BASE}/admin/routes/${routeId}/stops/${stopId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove stop from route');
    return res.json();
  },

  async reorderRouteStops(routeId: string, orderedStopIds: string[]) {
    const res = await fetch(`${API_BASE}/admin/routes/${routeId}/reorder-stops`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedStopIds })
    });
    if (!res.ok) throw new Error('Failed to reorder route stops');
    return res.json();
  },

  async createStop(stopData: Partial<Stop>) {
    const res = await fetch(`${API_BASE}/admin/stops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stopData)
    });
    if (!res.ok) throw new Error('Failed to create stop');
    return res.json();
  },

  async updateStop(id: string, stopData: Partial<Stop>) {
    const res = await fetch(`${API_BASE}/admin/stops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stopData)
    });
    if (!res.ok) throw new Error('Failed to update stop');
    return res.json();
  },

  async deleteStop(id: string) {
    const res = await fetch(`${API_BASE}/admin/stops/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete stop');
    return res.json();
  },

  async dispatchTrip(payload: { bus_id: string; driver_id: string; route_id: string }) {
    const res = await fetch(`${API_BASE}/admin/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to dispatch trip');
    return res.json();
  },

  async getAdminReports(): Promise<{ reports: PassengerReport[] }> {
    const res = await fetch(`${API_BASE}/admin/reports`);
    if (!res.ok) throw new Error('Failed to fetch admin reports');
    return res.json();
  },

  async updateReportStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/admin/reports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update report status');
    return res.json();
  },

  // Passenger Favorites & Reports
  async getFavorites(userId?: string): Promise<{ routes: Route[]; stops: Stop[]; favorites: FavoriteItem[] }> {
    const res = await fetch(`${API_BASE}/passenger/favorites?userId=${userId || 'user-passenger-1'}`);
    if (!res.ok) return { routes: [], stops: [], favorites: [] };
    const data = await res.json().catch(() => ({ favorites: [] }));
    const favs: FavoriteItem[] = data.favorites || [];
    const routes = favs.map(f => f.route).filter(Boolean) as Route[];
    const stops = favs.map(f => f.stop).filter(Boolean) as Stop[];
    return { routes, stops, favorites: favs };
  },

  async getDrivers(): Promise<{ drivers: Driver[] }> {
    const res = await fetch(`${API_BASE}/admin/drivers`);
    if (!res.ok) throw new Error('Failed to fetch drivers');
    return res.json();
  },

  async getReports(): Promise<{ reports: PassengerReport[] }> {
    const res = await fetch(`${API_BASE}/admin/reports`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async resolveReport(id: string) {
    return this.updateReportStatus(id, 'resolved');
  },

  async getAnalytics(): Promise<{ analytics: FleetStats }> {
    const res = await this.getAdminStats();
    return { analytics: res.stats };
  },

  async addFavorite(route_id?: string, stop_id?: string, userId?: string) {
    const res = await fetch(`${API_BASE}/passenger/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, route_id, stop_id })
    });
    return res.json();
  },

  async removeFavorite(id: string) {
    const res = await fetch(`${API_BASE}/passenger/favorites/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getNotifications(userId?: string): Promise<{ notifications: NotificationItem[] }> {
    const res = await fetch(`${API_BASE}/passenger/notifications?userId=${userId || 'user-passenger-1'}`);
    return res.json();
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/passenger/notifications/${id}/read`, { method: 'PUT' });
    return res.json();
  },

  async submitReport(payload: {
    user_id?: string;
    bus_id?: string;
    trip_id?: string;
    report_type: string;
    description: string;
  }) {
    const res = await fetch(`${API_BASE}/passenger/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Driver SOS Emergency Alerts
  async triggerDriverSOS(payload: {
    driver_id: string;
    bus_id?: string;
    route_id?: string;
    trip_id?: string;
    latitude?: number;
    longitude?: number;
    speed?: number;
    heading?: number;
    emergency_type?: string;
    message?: string;
  }): Promise<{ success: boolean; message: string; alert: SOSAlert }> {
    const res = await fetch(`${API_BASE}/driver/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to trigger SOS' }));
      throw new Error(err.error || 'Failed to trigger SOS');
    }
    return res.json();
  },

  async cancelDriverSOS(payload: {
    alert_id?: string;
    driver_id?: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string; alert: SOSAlert }> {
    const res = await fetch(`${API_BASE}/driver/sos/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to cancel SOS' }));
      throw new Error(err.error || 'Failed to cancel SOS');
    }
    return res.json();
  },

  // Admin SOS Management
  async getAdminSOSAlerts(): Promise<{ alerts: SOSAlert[]; active_count: number }> {
    const res = await fetch(`${API_BASE}/admin/sos`);
    if (!res.ok) throw new Error('Failed to fetch SOS alerts');
    return res.json();
  },

  async acknowledgeAdminSOS(alertId: string, dispatcherName?: string): Promise<{ alert: SOSAlert }> {
    const res = await fetch(`${API_BASE}/admin/sos/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispatcher_name: dispatcherName })
    });
    if (!res.ok) throw new Error('Failed to acknowledge SOS alert');
    return res.json();
  },

  async dispatchAdminSOS(alertId: string, payload: {
    dispatch_type?: string;
    details?: string;
    responder_eta_min?: number;
    responder_unit?: string;
    estimated_arrival_min?: number;
    notes?: string;
  }): Promise<{ alert: SOSAlert }> {
    const res = await fetch(`${API_BASE}/admin/sos/${alertId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to dispatch emergency services');
    return res.json();
  },

  async resolveAdminSOS(alertId: string, payload: {
    dispatcher_name?: string;
    notes?: string;
    resolution_notes?: string;
    resolved_by?: string;
  }): Promise<{ alert: SOSAlert }> {
    const res = await fetch(`${API_BASE}/admin/sos/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to resolve SOS alert');
    return res.json();
  },

  // AI Transit Copilot & Key Integrations
  async getIntegrationStatus(): Promise<{
    gemini: { available: boolean; model: string; feature: string };
    supabase: { available: boolean; feature: string };
    ivr: { available: boolean; provider: string; feature: string };
  }> {
    const res = await fetch(`${API_BASE}/ai/status`);
    if (!res.ok) throw new Error('Failed to fetch integration status');
    return res.json();
  },

  async queryTransitCopilot(query: string, language: 'en' | 'kn' | 'hi' = 'en'): Promise<{
    response: string;
    isAiGenerated: boolean;
    model?: string;
  }> {
    const res = await fetch(`${API_BASE}/ai/transit-copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, language, userRole: 'passenger' })
    });
    if (!res.ok) throw new Error('Failed to query Transit Copilot');
    return res.json();
  },

  async getGoogleMapsConfig(): Promise<{ provider?: string; configured: boolean; freeTier?: boolean; apiKey?: string }> {
    try {
      const res = await fetch(`${API_BASE}/config/maps`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {
      provider: 'leaflet-osm',
      configured: true,
      freeTier: true,
      apiKey: ''
    };
  },

  async getSystemKeysConfig(): Promise<SystemKeysResponse> {
    try {
      const res = await fetch(`${API_BASE}/config/system-keys`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {
      keys: [
        {
          id: 'free_maps',
          name: 'Free Interactive Vector & Satellite Maps',
          provider: 'OpenStreetMap & CartoDB (Leaflet Engine)',
          status: 'active',
          isKeyRequired: false,
          health: 'healthy',
          message: '100% Free & Unlimited. Active across all views.',
          action: 'Always active.'
        }
      ],
      freeMapAvailable: true,
      aiCopilotAvailable: true
    };
  },

  // Enterprise Admin & Officer Management
  async getAdmins(): Promise<{ admins: AdminUser[] }> {
    const res = await fetch(`${API_BASE}/admin/admins`);
    if (!res.ok) throw new Error('Failed to fetch administrator roster');
    return res.json();
  },

  async createAdmin(payload: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    admin_level?: string;
    depot?: string;
    permissions?: string[];
  }): Promise<{ message: string; admin: AdminUser }> {
    const res = await fetch(`${API_BASE}/admin/admins`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create administrator' }));
      throw new Error(err.error || 'Failed to create administrator');
    }
    return res.json();
  },

  async updateAdmin(
    id: string,
    updates: Partial<AdminUser> & { password?: string }
  ): Promise<{ message: string; admin: AdminUser }> {
    const res = await fetch(`${API_BASE}/admin/admins/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update administrator' }));
      throw new Error(err.error || 'Failed to update administrator');
    }
    return res.json();
  },

  async deleteAdmin(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/admins/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete administrator' }));
      throw new Error(err.error || 'Failed to delete administrator');
    }
    return res.json();
  },

  // Firewall Status & Telemetry
  async getFirewallStatus(): Promise<{
    status: string;
    shield: string;
    metrics: {
      totalRequestsInspected: number;
      threatsBlocked: number;
      rateLimitBlocks: number;
      startedAt: string;
      blockedIncidents: Array<{
        timestamp: string;
        ip: string;
        path: string;
        reason: string;
        patternMatched: string;
      }>;
    };
    timestamp: string;
  }> {
    const res = await fetch(`${API_BASE}/security/firewall-status`);
    if (!res.ok) {
      return {
        status: 'active',
        shield: 'KSRTC SmartTrack Intelligent Firewall',
        metrics: {
          totalRequestsInspected: 0,
          threatsBlocked: 0,
          rateLimitBlocks: 0,
          startedAt: new Date().toISOString(),
          blockedIncidents: []
        },
        timestamp: new Date().toISOString()
      };
    }
    return res.json();
  },

  // Database System & Diagnostics
  async getDatabaseDiagnostics(): Promise<{ diagnostics: DatabaseDiagnostics }> {
    const res = await fetch(`${API_BASE}/admin/diagnostics`);
    if (!res.ok) throw new Error('Failed to fetch database diagnostics');
    return res.json();
  },

  async getAuditLogs(search?: string, limit: number = 50): Promise<{ logs: AuditLog[]; total: number }> {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    query.set('limit', String(limit));
    const res = await fetch(`${API_BASE}/admin/audit-logs?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch system audit logs');
    return res.json();
  },

  async createDatabaseBackup(): Promise<{ message: string; backup: { filename: string; timestamp: string; size: number } }> {
    const res = await fetch(`${API_BASE}/admin/backup`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to create database backup snapshot');
    return res.json();
  },

  async getMaintenanceLogs(): Promise<{ logs: MaintenanceLog[] }> {
    const res = await fetch(`${API_BASE}/admin/maintenance`);
    if (!res.ok) throw new Error('Failed to fetch maintenance logs');
    return res.json();
  },

  async logMaintenance(payload: Partial<MaintenanceLog>): Promise<{ message: string; log: MaintenanceLog }> {
    const res = await fetch(`${API_BASE}/admin/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to log maintenance' }));
      throw new Error(err.error || 'Failed to log maintenance');
    }
    return res.json();
  },

  // Fleet Simulation Controls
  async getSimulationStatus(): Promise<{ success: boolean; simulation: any }> {
    const res = await fetch(`${API_BASE}/simulation/status`);
    if (!res.ok) throw new Error('Failed to get simulation status');
    return res.json();
  },

  async startSimulation(): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
    return res.json();
  },

  async stopSimulation(): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/stop`, { method: 'POST' });
    return res.json();
  },

  async toggleSimulation(): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/toggle`, { method: 'POST' });
    return res.json();
  },

  async setSimulationSpeed(multiplier: number): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/speed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiplier })
    });
    return res.json();
  },

  async resetSimulation(): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
    return res.json();
  },

  async triggerSimulationSOS(busId?: string, reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/trigger-sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bus_id: busId, reason })
    });
    return res.json();
  },

  async resolveSimulationSOS(alertId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/resolve-sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_id: alertId })
    });
    return res.json();
  },

  async triggerSimulationTraffic(routeId?: string, delayMinutes?: number): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/trigger-traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_id: routeId, delay_minutes: delayMinutes })
    });
    return res.json();
  },

  async triggerSimulationDeviation(busId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/simulation/trigger-deviation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bus_id: busId })
    });
    return res.json();
  },

  // Python Predictive Pipeline & AI Delay Analytics
  async getPythonPipelineMetrics(): Promise<{
    service: string;
    version: string;
    pythonRuntime: string;
    metrics: {
      totalExecutions: number;
      successfulPythonRuns: number;
      fallbackRuns: number;
      avgLatencyMs: number;
      lastExecutionAt: string;
    };
  }> {
    const res = await fetch(`${API_BASE}/analytics/pipeline-metrics`);
    if (!res.ok) throw new Error('Failed to fetch Python pipeline metrics');
    return res.json();
  },

  async predictDelayWithPython(payload: {
    bus_id?: string;
    latitude?: number;
    longitude?: number;
    speed?: number;
    heading?: number;
    route_id?: string;
    recent_speeds?: number[];
    scenario?: any;
  }) {
    const res = await fetch(`${API_BASE}/analytics/predict-delay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to run Python delay prediction');
    return res.json();
  },

  async simulateCorridorScenario(payload: {
    route_id: string;
    slowdown_percent: number;
    incident_type: string;
    weather_impact?: string;
  }) {
    const res = await fetch(`${API_BASE}/analytics/simulate-corridor-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to simulate scenario' }));
      throw new Error(err.error || 'Failed to simulate scenario');
    }
    return res.json();
  },

  async getCorridorDelaySummary(): Promise<{
    success: boolean;
    corridors: Array<{
      route_id: string;
      route_number: string;
      route_name: string;
      distance_km: number;
      active_buses: number;
      delay_minutes: number;
      delay_category: 'ON_TIME' | 'MINOR_DELAY' | 'MODERATE_DELAY' | 'HEAVY_CONGESTION';
      primary_cause: string;
      confidence_score: number;
      calibrated_speed_kmh: number;
      bottleneck_node?: string | null;
    }>;
    timestamp: string;
  }> {
    const res = await fetch(`${API_BASE}/analytics/corridor-delay-summary`);
    if (!res.ok) throw new Error('Failed to fetch corridor delay summary');
    return res.json();
  }
};

// WebSocket Real-time subscriber utility with high-efficiency selective routing, adaptive fallback, and instant auto-reconnect
export interface LiveFleetSubscriptionOptions {
  routeId?: string | null;
  busId?: string | null;
  onConnectionChange?: (
    status: 'connected' | 'connecting' | 'reconnecting' | 'fallback_active' | 'disconnected',
    latencyMs?: number
  ) => void;
}

export type LiveFleetUnsubscribe = (() => void) & {
  setFilter: (filter: { routeId?: string | null; busId?: string | null }) => void;
  requestSnapshot: () => void;
  sendPing: () => void;
};

export function subscribeToLiveFleet(
  onLocationUpdate: (telemetry: LiveBusTelemetry) => void,
  onSnapshot: (fleet: LiveBusTelemetry[]) => void,
  onSOSAlert?: (alert: SOSAlert) => void,
  onSOSUpdate?: (alert: SOSAlert) => void,
  options?: LiveFleetSubscriptionOptions
): LiveFleetUnsubscribe {
  let ws: WebSocket | null = null;
  let isClosedIntentionally = false;
  let reconnectTimer: any = null;
  let heartbeatPingTimer: any = null;
  let fallbackPollingInterval: any = null;
  let wsConnected = false;
  let retryCount = 0;
  let activeFilter = {
    routeId: options?.routeId || null,
    busId: options?.busId || null
  };

  const notifyStatus = (status: 'connected' | 'connecting' | 'reconnecting' | 'fallback_active' | 'disconnected', latencyMs?: number) => {
    if (options?.onConnectionChange) {
      options.onConnectionChange(status, latencyMs);
    }
  };

  // HTTP fallback sync when WebSocket is connecting or offline
  const syncViaHttp = async () => {
    if (isClosedIntentionally) return;
    try {
      const res = await api.getLiveBuses();
      if (res && Array.isArray(res.buses)) {
        onSnapshot(res.buses);
      }
    } catch {
      // ignore transient poll error
    }
  };

  const startFallbackPolling = (fast: boolean = true) => {
    if (fallbackPollingInterval) clearInterval(fallbackPollingInterval);
    // Fast polling (3s) while WS is down; slow sanity check (45s) when WS is connected
    fallbackPollingInterval = setInterval(syncViaHttp, fast ? 3000 : 45000);
  };

  const stopFallbackPolling = () => {
    if (fallbackPollingInterval) {
      clearInterval(fallbackPollingInterval);
      fallbackPollingInterval = null;
    }
  };

  // Initial immediate fetch so UI has data instantaneously
  syncViaHttp();
  startFallbackPolling(true);

  function scheduleReconnect() {
    if (isClosedIntentionally) return;
    clearTimeout(reconnectTimer);

    // Exponential backoff with random jitter: 600ms, 1200ms, 2400ms, up to 8000ms max
    const baseDelay = Math.min(8000, 600 * Math.pow(1.6, Math.min(retryCount, 6)));
    const jitter = baseDelay * (0.8 + Math.random() * 0.4);
    const delay = Math.round(jitter);
    retryCount++;

    notifyStatus('reconnecting');
    startFallbackPolling(true);

    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  function startHeartbeat() {
    if (heartbeatPingTimer) clearInterval(heartbeatPingTimer);
    // RFC 6455 application-level ping every 18 seconds to measure round-trip latency
    heartbeatPingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
        } catch (_) {}
      }
    }, 18000);
  }

  function stopHeartbeat() {
    if (heartbeatPingTimer) {
      clearInterval(heartbeatPingTimer);
      heartbeatPingTimer = null;
    }
  }

  function connect() {
    if (isClosedIntentionally) return;
    clearTimeout(reconnectTimer);

    try {
      notifyStatus(retryCount === 0 ? 'connecting' : 'reconnecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        wsConnected = true;
        retryCount = 0;
        notifyStatus('connected');

        // Adaptive polling: switch from aggressive 3s to relaxed 45s sanity check
        startFallbackPolling(false);
        startHeartbeat();

        // Subscribe with route/bus filters if specified
        try {
          ws?.send(JSON.stringify({
            type: 'SUBSCRIBE',
            route_id: activeFilter.routeId,
            bus_id: activeFilter.busId
          }));
          ws?.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
        } catch (_) {}
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'BUS_LOCATION_UPDATE' && payload.data) {
            onLocationUpdate(payload.data);
          } else if (payload.type === 'FLEET_SNAPSHOT' && Array.isArray(payload.data)) {
            onSnapshot(payload.data);
          } else if (payload.type === 'PONG') {
            if (payload.clientTime) {
              const rtt = Math.max(1, Date.now() - Number(payload.clientTime));
              notifyStatus('connected', rtt);
            }
          } else if (payload.type === 'EMERGENCY_SOS_ALERT' && payload.data && onSOSAlert) {
            onSOSAlert(payload.data);
          } else if (payload.type === 'EMERGENCY_SOS_UPDATE' && payload.data && onSOSUpdate) {
            onSOSUpdate(payload.data);
          }
        } catch (e) {
          // ignore malformed packet
        }
      };

      ws.onclose = () => {
        wsConnected = false;
        stopHeartbeat();
        if (!isClosedIntentionally) {
          notifyStatus('fallback_active');
          scheduleReconnect();
        } else {
          notifyStatus('disconnected');
        }
      };

      ws.onerror = () => {
        wsConnected = false;
        stopHeartbeat();
        try { ws?.close(); } catch (_) {}
      };
    } catch (e) {
      wsConnected = false;
      stopHeartbeat();
      if (!isClosedIntentionally) {
        scheduleReconnect();
      }
    }
  }

  // Network and browser tab lifecycle triggers for instantaneous connectivity
  const handleOnline = () => {
    if (!isClosedIntentionally && (!ws || ws.readyState !== WebSocket.OPEN)) {
      retryCount = 0;
      connect();
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !isClosedIntentionally) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        retryCount = 0;
        connect();
      } else {
        try {
          ws.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
        } catch (_) {}
      }
    }
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Kick off initial WebSocket connection
  connect();

  const unsubscribeFn: any = () => {
    isClosedIntentionally = true;
    clearTimeout(reconnectTimer);
    stopHeartbeat();
    stopFallbackPolling();
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);

    if (ws) {
      try { ws.close(); } catch (_) {}
      ws = null;
    }
  };

  unsubscribeFn.setFilter = (filter: { routeId?: string | null; busId?: string | null }) => {
    activeFilter = {
      routeId: filter.routeId || null,
      busId: filter.busId || null
    };
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'SUBSCRIBE',
          route_id: activeFilter.routeId,
          bus_id: activeFilter.busId
        }));
      } catch (_) {}
    }
  };

  unsubscribeFn.requestSnapshot = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'REQUEST_SNAPSHOT' }));
      } catch (_) {}
    } else {
      syncViaHttp();
    }
  };

  unsubscribeFn.sendPing = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
      } catch (_) {}
    }
  };

  return unsubscribeFn as LiveFleetUnsubscribe;
}
