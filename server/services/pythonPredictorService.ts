import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/database.js';
import { Route, Stop } from '../../src/types/index.js';
import { ETAService } from './etaService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_PIPELINE_PATH = path.resolve(__dirname, '../python/predictive_pipeline.py');

export interface PythonPredictionInterval {
  p10_minutes: number;
  p50_minutes: number;
  p90_minutes: number;
}

export interface PythonSegmentPrediction {
  stop_id: string;
  stop_name: string;
  stop_name_kannada?: string;
  stop_sequence: number;
  distance_km: number;
  eta_minutes: number;
  p10_minutes: number;
  p90_minutes: number;
  estimated_arrival_time: string;
}

export interface PythonPredictionResult {
  bus_id: string;
  pipeline_version: string;
  predicted_eta_minutes: number;
  next_stop_name?: string;
  next_stop_id?: string;
  distance_to_next_km?: number;
  delay_minutes: number;
  delay_category: 'ON_TIME' | 'MINOR_DELAY' | 'MODERATE_DELAY' | 'HEAVY_CONGESTION';
  confidence_score: number;
  interval: PythonPredictionInterval;
  primary_cause: string;
  corridor_metrics: {
    ewma_speed_kmh: number;
    calibrated_speed_kmh: number;
    speed_volatility?: number;
    impedance_factor: number;
    time_of_day_period?: string;
    bottleneck_node?: string | null;
  };
  segment_breakdown: PythonSegmentPrediction[];
  execution_latency_ms?: number;
  source: 'python_ml_engine' | 'calibrated_fallback';
}

interface CacheEntry {
  timestamp: number;
  result: PythonPredictionResult;
}

export class PythonPredictorService {
  private static cache: Map<string, CacheEntry> = new Map();
  private static CACHE_TTL_MS = 6000; // 6 seconds cache per bus
  public static metrics = {
    totalExecutions: 0,
    successfulPythonRuns: 0,
    fallbackRuns: 0,
    avgLatencyMs: 0,
    lastExecutionAt: ''
  };

  /**
   * Runs the Python predictive pipeline for an individual bus telemetry frame
   */
  static async predictForBus(
    busId: string,
    latitude: number,
    longitude: number,
    speed: number,
    heading: number = 0,
    route?: Route,
    recentSpeeds: number[] = [],
    scenarioOverrides?: { friction_multiplier?: number; incident_description?: string }
  ): Promise<PythonPredictionResult> {
    const startTime = Date.now();
    const cacheKey = `${busId}:${Math.round(latitude * 1000)}:${Math.round(longitude * 1000)}:${Math.round(speed / 5) * 5}:${scenarioOverrides ? 'scenario' : 'normal'}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
      return cached.result;
    }

    // Resolve route stops if available
    let stops: any[] = [];
    if (route) {
      const routeWithStops = db.getRouteWithStops(route.id);
      stops = (routeWithStops?.stops || [])
        .filter(rs => rs.stop && rs.stop.latitude && rs.stop.longitude)
        .map(rs => ({
          id: rs.stop!.id,
          name: rs.stop!.name,
          name_kannada: rs.stop!.name_kannada,
          latitude: rs.stop!.latitude,
          longitude: rs.stop!.longitude,
          stop_sequence: rs.stop_sequence
        }));
    }

    const payload = {
      bus_id: busId,
      latitude,
      longitude,
      speed,
      heading,
      recent_speeds: recentSpeeds,
      route: route ? {
        id: route.id,
        route_number: route.route_number,
        route_name: route.route_name,
        distance_km: route.distance_km,
        estimated_duration_min: route.estimated_duration_min
      } : {},
      stops,
      timestamp: new Date().toISOString(),
      scenario: scenarioOverrides || {}
    };

    try {
      const pythonOutput = await this.executePythonScript(payload);
      const latency = Date.now() - startTime;
      
      this.metrics.totalExecutions++;
      this.metrics.successfulPythonRuns++;
      this.metrics.avgLatencyMs = Math.round(
        (this.metrics.avgLatencyMs * (this.metrics.successfulPythonRuns - 1) + latency) / this.metrics.successfulPythonRuns
      );
      this.metrics.lastExecutionAt = new Date().toISOString();

      const result: PythonPredictionResult = {
        ...pythonOutput,
        execution_latency_ms: latency,
        source: 'python_ml_engine'
      };

      this.cache.set(cacheKey, { timestamp: Date.now(), result });
      return result;
    } catch (err) {
      console.warn(`[Python Predictor] Falling back to geometric ETA for bus ${busId}:`, (err as Error).message);
      this.metrics.totalExecutions++;
      this.metrics.fallbackRuns++;

      return this.buildFallbackResult(busId, latitude, longitude, speed, route, recentSpeeds, Date.now() - startTime);
    }
  }

  /**
   * Executes the Python script via child_process spawn with stdin/stdout JSON streaming
   */
  private static executePythonScript(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [PYTHON_PIPELINE_PATH], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdoutData = '';
      let stderrData = '';

      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python pipeline process timed out after 3500ms'));
      }, 3500);

      pythonProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pythonProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse Python JSON output: ${stdoutData}`));
        }
      });

      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      // Write payload to stdin
      pythonProcess.stdin.write(JSON.stringify(payload));
      pythonProcess.stdin.end();
    });
  }

  /**
   * Resilient fallback in case Python process is restarting or unavailable
   */
  private static buildFallbackResult(
    busId: string,
    lat: number,
    lng: number,
    speed: number,
    route?: Route,
    recentSpeeds: number[] = [],
    latencyMs: number = 0
  ): PythonPredictionResult {
    let etaMinutes = 15;
    let nextStop = 'Upcoming Destination';
    let nextStopId = undefined;
    let distanceKm = 10;

    if (route) {
      const etaCalc = ETAService.calculateETA(lat, lng, speed, route, recentSpeeds);
      etaMinutes = etaCalc.etaMinutes;
      nextStop = etaCalc.nextStop;
      nextStopId = etaCalc.nextStopId;
      distanceKm = etaCalc.distanceKm;
    }

    const p10 = Math.max(1, Math.round(etaMinutes * 0.9));
    const p50 = etaMinutes;
    const p90 = Math.max(p50 + 2, Math.round(etaMinutes * 1.2));

    return {
      bus_id: busId,
      pipeline_version: '2.4-python-native (fallback)',
      predicted_eta_minutes: p50,
      next_stop_name: nextStop,
      next_stop_id: nextStopId,
      distance_to_next_km: distanceKm,
      delay_minutes: Math.max(0, p50 - 12),
      delay_category: p50 > 25 ? 'MODERATE_DELAY' : 'ON_TIME',
      confidence_score: 0.75,
      interval: {
        p10_minutes: p10,
        p50_minutes: p50,
        p90_minutes: p90
      },
      primary_cause: 'Calibrated Highway Geometric Estimate (Standard Corridor Velocity)',
      corridor_metrics: {
        ewma_speed_kmh: Math.round(speed || 45),
        calibrated_speed_kmh: Math.round(speed || 45),
        impedance_factor: 1.05
      },
      segment_breakdown: [],
      execution_latency_ms: latencyMs,
      source: 'calibrated_fallback'
    };
  }

  /**
   * Runs an interactive delay scenario across an entire corridor
   */
  static async simulateCorridorScenario(
    routeId: string,
    scenario: {
      slowdown_percent: number; // e.g. 35% slower
      incident_type: string;    // 'heavy_rain' | 'toll_congestion' | 'road_repair' | 'vip_movement'
      weather_impact?: string;
    }
  ) {
    const route = db.routes.find(r => r.id === routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);

    const routeWithStops = db.getRouteWithStops(route.id);
    const stops = (routeWithStops?.stops || []).map(rs => rs.stop).filter(Boolean) as Stop[];

    if (!stops.length) {
      throw new Error(`Route ${routeId} has no assigned stops`);
    }

    const frictionMultiplier = 1.0 + (scenario.slowdown_percent / 100.0);
    const incidentDescriptions: Record<string, string> = {
      heavy_rain: 'Monsoon downpour across corridor; braking distance buffer active',
      toll_congestion: 'Severe FASTag lane queue at toll plaza (+12 min delay buffer)',
      road_repair: 'Lane reduction due to highway maintenance / flyover work',
      vip_movement: 'Temporary traffic diversion / convoy clearance'
    };

    const incidentDesc = incidentDescriptions[scenario.incident_type] || 'Operational corridor delay scenario';

    // Pick first stop or middle coordinate for scenario origin
    const firstStop = stops[0];
    const middleStop = stops[Math.floor(stops.length / 2)];

    const result = await this.predictForBus(
      `scenario-${route.id}`,
      middleStop?.latitude || firstStop.latitude,
      middleStop?.longitude || firstStop.longitude,
      Math.max(15, Math.round(50 * (1 - scenario.slowdown_percent / 100))),
      90,
      route,
      [45, 40, 35, 30],
      {
        friction_multiplier: frictionMultiplier,
        incident_description: incidentDesc
      }
    );

    return {
      route_id: route.id,
      route_name: route.route_name,
      route_number: route.route_number,
      scenario,
      incident_description: incidentDesc,
      friction_multiplier: frictionMultiplier,
      predicted_forecast: result
    };
  }
}
