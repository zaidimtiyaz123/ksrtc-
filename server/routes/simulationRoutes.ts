import { Router } from 'express';
import { fleetSimulation } from '../services/fleetSimulationService.js';

export const simulationRouter = Router();

// Get Simulation Status
simulationRouter.get('/status', (req, res) => {
  res.json({
    success: true,
    simulation: fleetSimulation.getStatus()
  });
});

// Start Simulation
simulationRouter.post('/start', (req, res) => {
  fleetSimulation.start();
  res.json({
    success: true,
    message: 'Fleet Simulation Engine started',
    simulation: fleetSimulation.getStatus()
  });
});

// Stop Simulation
simulationRouter.post('/stop', (req, res) => {
  fleetSimulation.stop();
  res.json({
    success: true,
    message: 'Fleet Simulation Engine paused',
    simulation: fleetSimulation.getStatus()
  });
});

// Toggle Simulation
simulationRouter.post('/toggle', (req, res) => {
  const isRunning = fleetSimulation.toggle();
  res.json({
    success: true,
    running: isRunning,
    message: isRunning ? 'Simulation started' : 'Simulation paused',
    simulation: fleetSimulation.getStatus()
  });
});

// Set Speed Multiplier (1x, 2x, 5x, 10x)
simulationRouter.post('/speed', (req, res) => {
  const { multiplier } = req.body;
  const num = Number(multiplier);
  if (!isNaN(num) && num > 0) {
    fleetSimulation.setSpeed(num);
  }
  res.json({
    success: true,
    simulation: fleetSimulation.getStatus()
  });
});

// Reset Fleet to Origin
simulationRouter.post('/reset', (req, res) => {
  fleetSimulation.resetAll();
  res.json({
    success: true,
    message: 'Fleet reset to starting terminals',
    simulation: fleetSimulation.getStatus()
  });
});

// Trigger SOS Panic Alarm Simulation
simulationRouter.post(['/trigger-sos', '/sos'], (req, res) => {
  const { bus_id, busId, reason, emergencyType } = req.body;
  const targetBusId = bus_id || busId;
  const targetReason = reason || emergencyType || 'Simulated Emergency Drill: Engine Overheat & Medical Alert';

  try {
    const alert = fleetSimulation.triggerSOS(targetBusId, targetReason);
    res.json({
      success: true,
      alert,
      message: `Emergency SOS triggered on bus ${alert.bus_registration}`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to trigger SOS' });
  }
});

// Resolve SOS Alert Simulation
simulationRouter.post(['/resolve-sos', '/sos/resolve'], (req, res) => {
  const { alert_id, alertId, bus_id, busId } = req.body;
  const targetAlertId = alert_id || alertId;
  fleetSimulation.resolveSOS(targetAlertId);
  res.json({
    success: true,
    message: 'SOS Alert cleared by Central Dispatch Drill'
  });
});

// Trigger Traffic Delay Simulation
simulationRouter.post(['/trigger-traffic', '/traffic'], (req, res) => {
  const { route_id, routeId, delay_minutes, delayMinutes, trafficLevel } = req.body;
  const delay = Number(delay_minutes || delayMinutes || (trafficLevel === 'heavy' ? 30 : 25));
  const targetRoute = route_id || routeId || 'route-152';

  fleetSimulation.triggerTraffic(targetRoute, delay);
  res.json({
    success: true,
    message: `Traffic congestion delay injected on ${targetRoute} (+${delay}m)`
  });
});

// Trigger Geofence Deviation Simulation
simulationRouter.post(['/trigger-deviation', '/deviation'], (req, res) => {
  const { bus_id, busId } = req.body;
  const targetBus = bus_id || busId || 'bus-ka01ab1234';

  fleetSimulation.triggerDeviation(targetBus);
  res.json({
    success: true,
    message: `Route deviation toggle applied to ${targetBus}`
  });
});
