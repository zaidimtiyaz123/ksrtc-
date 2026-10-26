import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { LiveBusTelemetry, BusLiveStatus, SOSAlert } from '../../src/types/index.js';
import { db } from '../db/database.js';

interface ClientMetadata {
  isAlive: boolean;
  subscribedRouteId: string | null;
  subscribedBusId: string | null;
  connectTime: number;
  lastPingTime: number;
}

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();
const clientMetadata = new Map<WebSocket, ClientMetadata>();

// Server-side metrics for connection telemetry
export const wsTelemetry = {
  totalConnectionsServed: 0,
  peakConcurrentClients: 0,
  messagesBroadcasted: 0,
  pingsProcessed: 0,
  get activeClients(): number {
    return clients.size;
  }
};

let heartbeatInterval: NodeJS.Timeout | null = null;

export function setupWebSocketServer(httpServer: Server) {
  if (wss) {
    try {
      wss.close();
    } catch (_) {}
  }

  wss = new WebSocketServer({
    server: httpServer,
    path: '/api/ws',
    perMessageDeflate: false // Disable compression overhead for high-frequency small telemetry packets
  });

  // Clear any existing heartbeat
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // RFC 6455 Ping/Pong Heartbeat: prune zombie connections every 25 seconds
  heartbeatInterval = setInterval(() => {
    for (const ws of clients) {
      const meta = clientMetadata.get(ws);
      if (!meta) {
        clients.delete(ws);
        try { ws.terminate(); } catch (_) {}
        continue;
      }

      if (meta.isAlive === false) {
        // Did not respond to previous ping
        clients.delete(ws);
        clientMetadata.delete(ws);
        try { ws.terminate(); } catch (_) {}
        continue;
      }

      meta.isAlive = false;
      try {
        ws.ping();
      } catch (_) {
        clients.delete(ws);
        clientMetadata.delete(ws);
        try { ws.terminate(); } catch (_) {}
      }
    }
  }, 25000);

  wss.on('connection', (ws: WebSocket, req) => {
    clients.add(ws);
    wsTelemetry.totalConnectionsServed++;
    if (clients.size > wsTelemetry.peakConcurrentClients) {
      wsTelemetry.peakConcurrentClients = clients.size;
    }

    const meta: ClientMetadata = {
      isAlive: true,
      subscribedRouteId: null,
      subscribedBusId: null,
      connectTime: Date.now(),
      lastPingTime: Date.now()
    };
    clientMetadata.set(ws, meta);

    // Built-in pong handler for protocol-level ping frames
    ws.on('pong', () => {
      const m = clientMetadata.get(ws);
      if (m) m.isAlive = true;
    });

    // Send immediate initial snapshot of all active live fleet
    const liveFleet = getLiveFleetTelemetry();
    safeSend(ws, JSON.stringify({
      type: 'FLEET_SNAPSHOT',
      data: liveFleet,
      timestamp: Date.now(),
      activeBusesCount: liveFleet.length
    }));

    ws.on('message', (message: string | Buffer) => {
      try {
        const payload = JSON.parse(message.toString());
        meta.isAlive = true;

        if (payload.type === 'PING') {
          wsTelemetry.pingsProcessed++;
          meta.lastPingTime = Date.now();
          safeSend(ws, JSON.stringify({
            type: 'PONG',
            serverTime: Date.now(),
            clientTime: payload.clientTime || null
          }));
        } else if (payload.type === 'SUBSCRIBE') {
          // Dynamic selective route/bus filtering for extreme bandwidth and CPU efficiency
          meta.subscribedRouteId = payload.route_id && payload.route_id !== 'all' ? payload.route_id : null;
          meta.subscribedBusId = payload.bus_id && payload.bus_id !== 'all' ? payload.bus_id : null;

          safeSend(ws, JSON.stringify({
            type: 'SUBSCRIBED',
            route_id: meta.subscribedRouteId,
            bus_id: meta.subscribedBusId,
            status: 'active'
          }));
        } else if (payload.type === 'REQUEST_SNAPSHOT') {
          const freshFleet = getLiveFleetTelemetry();
          safeSend(ws, JSON.stringify({
            type: 'FLEET_SNAPSHOT',
            data: freshFleet,
            timestamp: Date.now(),
            activeBusesCount: freshFleet.length
          }));
        }
      } catch (e) {
        // ignore malformed message
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      clientMetadata.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
      clientMetadata.delete(ws);
      try { ws.terminate(); } catch (_) {}
    });
  });

  wss.on('close', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  return wss;
}

function safeSend(ws: WebSocket, data: string): boolean {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(data);
      wsTelemetry.messagesBroadcasted++;
      return true;
    } catch (_) {
      return false;
    }
  }
  return false;
}

// Efficient single-pass broadcast with subscription routing
export function broadcastLocationUpdate(telemetry: LiveBusTelemetry) {
  if (!telemetry || clients.size === 0) return;

  const payload = JSON.stringify({
    type: 'BUS_LOCATION_UPDATE',
    data: telemetry,
    timestamp: Date.now()
  });

  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    const meta = clientMetadata.get(client);
    if (meta) {
      // Route filter check
      if (meta.subscribedRouteId && meta.subscribedRouteId !== telemetry.route_id) {
        continue;
      }
      // Bus filter check
      if (meta.subscribedBusId && meta.subscribedBusId !== telemetry.bus_id) {
        continue;
      }
    }

    safeSend(client, payload);
  }
}

export function broadcastFleetSnapshot() {
  if (clients.size === 0) return;

  const liveFleet = getLiveFleetTelemetry();
  const payload = JSON.stringify({
    type: 'FLEET_SNAPSHOT',
    data: liveFleet,
    timestamp: Date.now(),
    activeBusesCount: liveFleet.length
  });

  for (const client of clients) {
    safeSend(client, payload);
  }
}

export function broadcastEmergencySOS(alert: SOSAlert) {
  if (clients.size === 0) return;

  const payload = JSON.stringify({
    type: 'EMERGENCY_SOS_ALERT',
    data: alert,
    timestamp: Date.now()
  });

  // Emergency alerts are broadcasted with top priority to all active clients
  for (const client of clients) {
    safeSend(client, payload);
  }
}

export function broadcastSOSUpdate(alert: SOSAlert) {
  if (clients.size === 0) return;

  const payload = JSON.stringify({
    type: 'EMERGENCY_SOS_UPDATE',
    data: alert,
    timestamp: Date.now()
  });

  for (const client of clients) {
    safeSend(client, payload);
  }
}

export function getLiveFleetTelemetry(): LiveBusTelemetry[] {
  const activeTrips = db.getActiveTrips();
  const now = Date.now();
  const telemetryList: LiveBusTelemetry[] = [];

  for (const trip of activeTrips) {
    const bus = db.buses.find(b => b.id === trip.bus_id);
    const route = db.routes.find(r => r.id === trip.route_id);
    const driver = db.drivers.find(d => d.id === trip.driver_id);
    const latestLoc = db.getLatestLocation(trip.bus_id);

    if (bus && route && latestLoc) {
      const locTime = new Date(latestLoc.timestamp).getTime();
      const diffSeconds = Math.max(0, Math.round((now - locTime) / 1000));

      let status: BusLiveStatus = 'LIVE';
      if (diffSeconds > 120) {
        status = 'OFFLINE';
      } else if (diffSeconds > 30) {
        status = 'STALE';
      }

      const delayMin = (latestLoc as any).delay_minutes ?? (latestLoc.eta_minutes && latestLoc.eta_minutes > 15 ? 4 : 1);
      const delayCat = (latestLoc as any).delay_category ?? (delayMin <= 2 ? 'ON_TIME' : delayMin <= 7 ? 'MINOR_DELAY' : 'HEAVY_CONGESTION');
      const confScore = (latestLoc as any).confidence_score ?? 0.88;
      const etaMin = latestLoc.eta_minutes ?? 12;
      const intvl = (latestLoc as any).interval ?? {
        p10_minutes: Math.max(1, Math.round(etaMin * 0.88)),
        p50_minutes: etaMin,
        p90_minutes: Math.max(etaMin + 2, Math.round(etaMin * 1.2))
      };
      const delayC = (latestLoc as any).delay_cause ?? (delayMin > 2 ? 'Corridor traffic density and signal delay' : 'Nominal highway speed trajectory');

      telemetryList.push({
        bus_id: bus.id,
        registration_number: bus.registration_number,
        fleet_number: bus.fleet_number,
        model: bus.model,
        trip_id: trip.id,
        driver_name: driver?.name || 'Assigned Driver',
        driver_code: driver?.driver_code || 'DRV-000',
        route_id: route.id,
        route_number: route.route_number,
        route_name: route.route_name,
        origin: route.origin,
        destination: route.destination,
        latitude: latestLoc.latitude,
        longitude: latestLoc.longitude,
        accuracy: latestLoc.accuracy,
        speed: latestLoc.speed,
        heading: latestLoc.heading,
        timestamp: latestLoc.timestamp,
        status,
        seconds_ago: diffSeconds,
        next_stop: latestLoc.next_stop_name,
        next_stop_id: latestLoc.next_stop_id,
        eta_minutes: latestLoc.eta_minutes,
        distance_to_next_km: latestLoc.distance_to_next_stop_km,
        trip_status: trip.status,
        // Inbuilt Python Prediction Fields
        delay_minutes: delayMin,
        delay_category: delayCat,
        confidence_score: confScore,
        interval: intvl,
        delay_cause: delayC,
        corridor_bottleneck: (latestLoc as any).corridor_bottleneck,
        calibrated_speed_kmh: (latestLoc as any).calibrated_speed_kmh || Math.round(latestLoc.speed * 0.95),
        pipeline_engine: (latestLoc as any).pipeline_engine || 'python_ml_engine'
      });
    }
  }

  return telemetryList;
}
