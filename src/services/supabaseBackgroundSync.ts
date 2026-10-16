import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { api } from './api';

export interface BackgroundSyncTelemetry {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
}

export interface BackgroundSyncStatus {
  isActive: boolean;
  isSyncing: boolean;
  intervalMs: number;
  packetsSynced: number;
  lastSyncedAt: string | null;
  lastCoordinates: { lat: number; lng: number } | null;
  directSupabaseConfigured: boolean;
  error: string | null;
}

type StatusListener = (status: BackgroundSyncStatus) => void;

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
  return keyToTest.trim().length >= 20;
}

class SupabaseBackgroundSyncService {
  private syncIntervalId: any = null;
  private intervalMs: number = 4000; // Fixed 4-second interval
  private directClient: SupabaseClient | null = null;
  private isDirectConfigured: boolean = false;
  private listeners: Set<StatusListener> = new Set();

  private status: BackgroundSyncStatus = {
    isActive: false,
    isSyncing: false,
    intervalMs: 4000,
    packetsSynced: 0,
    lastSyncedAt: null,
    lastCoordinates: null,
    directSupabaseConfigured: false,
    error: null
  };

  private currentDriverId: string | null = null;
  private currentBusId: string | null = null;
  private currentRouteId: string | null = null;
  private currentTripId: string | null = null;
  private telemetryGetter: (() => BackgroundSyncTelemetry | null) | null = null;

  constructor() {
    this.initDirectClient();
  }

  private initDirectClient() {
    const env = (import.meta as any).env || {};
    const rawUrl = env.VITE_SUPABASE_URL;
    const rawKey = env.VITE_SUPABASE_ANON_KEY;

    const url = isValidHttpUrl(rawUrl) ? rawUrl.trim() : null;
    const anonKey = isValidSupabaseKey(rawKey) ? rawKey.trim() : null;

    if (url && anonKey) {
      try {
        this.directClient = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        this.isDirectConfigured = true;
        this.status.directSupabaseConfigured = true;
        console.log('[Supabase Background Sync] Client direct mode enabled');
      } catch (e: any) {
        console.warn('[Supabase Background Sync] Direct client init warning:', e);
      }
    }
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.status });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = { ...this.status };
    this.listeners.forEach(l => {
      try {
        l(current);
      } catch (err) {
        console.error(err);
      }
    });
  }

  /**
   * Starts background synchronization service.
   * Condition: Strictly active only when driver is actively authenticated and on-route!
   */
  public startBackgroundSync(params: {
    driverId: string;
    busId: string;
    routeId: string;
    tripId: string;
    getTelemetry: () => BackgroundSyncTelemetry | null;
  }) {
    // If already running with same trip, don't duplicate
    if (this.syncIntervalId && this.status.isActive && this.currentTripId === params.tripId) {
      this.telemetryGetter = params.getTelemetry;
      return;
    }

    this.stopBackgroundSync();

    this.currentDriverId = params.driverId;
    this.currentBusId = params.busId;
    this.currentRouteId = params.routeId;
    this.currentTripId = params.tripId;
    this.telemetryGetter = params.getTelemetry;

    this.status.isActive = true;
    this.status.error = null;
    this.notify();

    console.log(`[Supabase Background Sync] Initialized for Trip ${params.tripId}. Fixed interval: ${this.intervalMs}ms.`);

    // Perform immediate pulse, then scheduled pulses
    this.pulseSync();

    this.syncIntervalId = setInterval(() => {
      this.pulseSync();
    }, this.intervalMs);
  }

  /**
   * Immediately halts background synchronization and clears timer
   */
  public stopBackgroundSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.status.isActive = false;
    this.status.isSyncing = false;
    this.currentTripId = null;
    this.telemetryGetter = null;
    this.notify();
    console.log('[Supabase Background Sync] Halted and cleared.');
  }

  /**
   * Executes a single location push to Supabase
   */
  private async pulseSync() {
    if (!this.status.isActive || !this.currentTripId || !this.telemetryGetter) {
      return;
    }

    const telemetry = this.telemetryGetter();
    if (!telemetry || typeof telemetry.latitude !== 'number' || typeof telemetry.longitude !== 'number') {
      return;
    }

    this.status.isSyncing = true;
    this.notify();

    const timestamp = new Date().toISOString();

    try {
      // 1. If direct client available, push to Supabase table
      if (this.directClient) {
        try {
          const res = await this.directClient
            .from('bus_telemetry')
            .insert([
              {
                bus_id: this.currentBusId,
                driver_id: this.currentDriverId,
                route_id: this.currentRouteId,
                trip_id: this.currentTripId,
                latitude: telemetry.latitude,
                longitude: telemetry.longitude,
                speed: telemetry.speed || 0,
                heading: telemetry.heading || 0,
                accuracy: telemetry.accuracy || 5,
                recorded_at: timestamp
              }
            ]);
          if (res?.error) {
            console.warn('[Supabase Sync Direct] Insert warning:', res.error.message);
          }
        } catch {
          // Direct insert is optional; backend endpoint is authoritative
        }
      }

      // 2. Synchronize via authoritative backend service (which also records telemetry in DB & pushes to Supabase)
      await api.syncDriverLocationToSupabase({
        driver_id: this.currentDriverId!,
        bus_id: this.currentBusId!,
        route_id: this.currentRouteId!,
        trip_id: this.currentTripId!,
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        speed: telemetry.speed,
        heading: telemetry.heading,
        accuracy: telemetry.accuracy,
        timestamp
      });

      this.status.packetsSynced += 1;
      this.status.lastSyncedAt = timestamp;
      this.status.lastCoordinates = {
        lat: telemetry.latitude,
        lng: telemetry.longitude
      };
      this.status.error = null;
    } catch (err: any) {
      console.warn('[Supabase Sync Pulse Error]:', err?.message);
      this.status.error = err?.message || 'Sync failed';
    } finally {
      this.status.isSyncing = false;
      this.notify();
    }
  }

  public getStatus(): BackgroundSyncStatus {
    return { ...this.status };
  }
}

export const supabaseBackgroundSync = new SupabaseBackgroundSyncService();
