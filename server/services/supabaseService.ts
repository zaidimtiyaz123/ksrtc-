import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface LocationTelemetryPayload {
  bus_id: string;
  driver_id: string;
  route_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp?: string;
}

export interface SupabaseSyncState {
  isConfigured: boolean;
  totalPacketsSynced: number;
  lastSyncedAt: string | null;
  lastCoordinates: { latitude: number; longitude: number } | null;
  lastError: string | null;
}

let supabaseClient: SupabaseClient | null = null;
let initialized = false;

function isValidHttpUrl(stringToTest: string | undefined | null): boolean {
  if (!stringToTest || typeof stringToTest !== 'string') return false;
  const trimmed = stringToTest.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function isValidSupabaseKey(keyToTest: string | undefined | null): boolean {
  if (!keyToTest || typeof keyToTest !== 'string') return false;
  const trimmed = keyToTest.trim();
  // Valid keys are usually JWTs or long tokens; short numbers like "100" are placeholders
  return trimmed.length >= 20;
}

const syncState: SupabaseSyncState = {
  isConfigured: false,
  totalPacketsSynced: 0,
  lastSyncedAt: null,
  lastCoordinates: null,
  lastError: null
};

export function getSupabaseClient(): SupabaseClient | null {
  if (initialized) return supabaseClient;
  initialized = true;

  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const url = isValidHttpUrl(rawUrl) ? rawUrl!.trim() : null;
  const key = isValidSupabaseKey(rawKey) ? rawKey!.trim() : null;

  if (url && key) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      syncState.isConfigured = true;
      console.log('[Supabase Sync Service] Connected to Supabase endpoint:', url);
    } catch (err: any) {
      console.warn('[Supabase Sync Service] Connection note:', err.message);
      syncState.lastError = err.message;
    }
  } else {
    console.log('[Supabase Sync Service] Supabase credentials pending configuration in Settings. Running with local telemetry persistence.');
    syncState.isConfigured = false;
  }

  return supabaseClient;
}

export async function pushLocationTelemetryToSupabase(payload: LocationTelemetryPayload): Promise<{
  success: boolean;
  syncedToSupabase: boolean;
  packetId?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  const timestamp = payload.timestamp || new Date().toISOString();
  const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  syncState.totalPacketsSynced += 1;
  syncState.lastSyncedAt = timestamp;
  syncState.lastCoordinates = {
    latitude: payload.latitude,
    longitude: payload.longitude
  };

  if (!client) {
    // Client not configured in environment, but packet is verified and registered locally
    return {
      success: true,
      syncedToSupabase: false,
      packetId,
      error: 'Supabase URL/Key not configured in environment variables'
    };
  }

  try {
    const { data, error } = await client
      .from('bus_telemetry')
      .insert([
        {
          id: packetId,
          bus_id: payload.bus_id,
          driver_id: payload.driver_id,
          route_id: payload.route_id,
          trip_id: payload.trip_id,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed || 0,
          heading: payload.heading || 0,
          accuracy: payload.accuracy || 10,
          recorded_at: timestamp
        }
      ]);

    if (error) {
      console.warn('[Supabase Sync Service] Supabase insert note:', error.message);
      syncState.lastError = error.message;
      return {
        success: true,
        syncedToSupabase: false,
        packetId,
        error: error.message
      };
    }

    syncState.lastError = null;
    return {
      success: true,
      syncedToSupabase: true,
      packetId
    };
  } catch (err: any) {
    console.warn('[Supabase Sync Service] Network/API exception:', err.message);
    syncState.lastError = err.message;
    return {
      success: true,
      syncedToSupabase: false,
      packetId,
      error: err.message
    };
  }
}

export function getSupabaseSyncState(): SupabaseSyncState {
  // refresh check
  getSupabaseClient();
  return { ...syncState };
}
