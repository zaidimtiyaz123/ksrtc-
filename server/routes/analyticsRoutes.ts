import { Router } from 'express';
import { db } from '../db/database.js';
import { PythonPredictorService } from '../services/pythonPredictorService.js';

export const analyticsRouter = Router();

/**
 * Direct prediction trigger for a bus or custom coordinate payload
 */
analyticsRouter.post('/predict-delay', async (req, res) => {
  try {
    const { bus_id, latitude, longitude, speed, heading, route_id, recent_speeds, scenario } = req.body;

    const route = route_id ? db.routes.find(r => r.id === route_id) : undefined;
    
    // If bus_id given but no route, lookup active trip route
    let activeRoute = route;
    if (!activeRoute && bus_id) {
      const activeTrip = db.trips.find(t => t.bus_id === bus_id && (t.status === 'in_progress' || t.status === 'paused'));
      if (activeTrip) {
        activeRoute = db.routes.find(r => r.id === activeTrip.route_id);
      }
    }

    const prediction = await PythonPredictorService.predictForBus(
      bus_id || 'bus-query',
      Number(latitude || 13.0),
      Number(longitude || 77.5),
      Number(speed || 40),
      Number(heading || 0),
      activeRoute,
      Array.isArray(recent_speeds) ? recent_speeds : [],
      scenario
    );

    res.json({
      success: true,
      prediction
    });
  } catch (error) {
    console.error('[Analytics API] Prediction failed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Pipeline diagnostics & performance metrics
 */
analyticsRouter.get('/pipeline-metrics', (req, res) => {
  res.json({
    service: 'KSRTC Python Predictive Arrival & AI Delay Pipeline',
    version: '2.4-python-native',
    pythonRuntime: 'Python 3.10.12 (Direct IPC)',
    metrics: PythonPredictorService.metrics,
    timestamp: new Date().toISOString()
  });
});

/**
 * Interactive Corridor Scenario Forecaster (What-if modeling)
 */
analyticsRouter.post('/simulate-corridor-scenario', async (req, res) => {
  try {
    const { route_id, slowdown_percent, incident_type, weather_impact } = req.body;

    if (!route_id) {
      return res.status(400).json({ error: 'route_id is required' });
    }

    const simulation = await PythonPredictorService.simulateCorridorScenario(route_id, {
      slowdown_percent: Number(slowdown_percent || 25),
      incident_type: incident_type || 'toll_congestion',
      weather_impact
    });

    res.json({
      success: true,
      simulation
    });
  } catch (error) {
    console.error('[Analytics API] Scenario simulation failed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Summary of delay state across all corridors
 */
analyticsRouter.get('/corridor-delay-summary', async (req, res) => {
  try {
    const corridors = await Promise.all(
      db.routes.slice(0, 8).map(async (route) => {
        const latestBus = db.busLocations.find(l => {
          const trip = db.trips.find(t => t.id === l.trip_id);
          return trip && trip.route_id === route.id;
        });

        const activeBusesCount = db.trips.filter(t => t.route_id === route.id && t.status === 'in_progress').length;

        // Run Python prediction for corridor representative state
        const pred = await PythonPredictorService.predictForBus(
          `corridor-${route.id}`,
          latestBus?.latitude || 13.0,
          latestBus?.longitude || 77.5,
          latestBus?.speed || 48,
          0,
          route
        );

        return {
          route_id: route.id,
          route_number: route.route_number,
          route_name: route.route_name,
          distance_km: route.distance_km,
          active_buses: activeBusesCount,
          delay_minutes: pred.delay_minutes,
          delay_category: pred.delay_category,
          primary_cause: pred.primary_cause,
          confidence_score: pred.confidence_score,
          calibrated_speed_kmh: pred.corridor_metrics.calibrated_speed_kmh,
          bottleneck_node: pred.corridor_metrics.bottleneck_node
        };
      })
    );

    res.json({
      success: true,
      corridors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
