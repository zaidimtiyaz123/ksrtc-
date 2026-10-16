import { Router } from 'express';
import { db } from '../db/database.js';
import { getLiveFleetTelemetry } from '../websocket/liveServer.js';
import { calculateHaversineDistance } from '../services/gpsValidator.js';
import {
  Stop,
  Route,
  RouteStop,
  TripPlanOption,
  TripLeg,
  TripPlanResponse,
  PopularTripItem,
  TripLegLiveBus
} from '../../src/types/index.js';

export const plannerRouter = Router();

// Helper to calculate realistic KSRTC fare by distance and service class
function calculateKSRTCFare(distanceKm: number, serviceClass: string): number {
  const normalizedClass = serviceClass.toLowerCase();
  let ratePerKm = 1.45; // Karnataka Sarige Express default
  let minFare = 35;

  if (normalizedClass.includes('airavat') || normalizedClass.includes('volvo') || normalizedClass.includes('club class')) {
    ratePerKm = 2.30;
    minFare = 85;
  } else if (normalizedClass.includes('rajahamsa') || normalizedClass.includes('executive')) {
    ratePerKm = 1.85;
    minFare = 55;
  }

  const rawFare = Math.round(Math.max(minFare, distanceKm * ratePerKm));
  // Round to nearest multiple of 5 for realistic cash/toll ticket pricing
  return Math.round(rawFare / 5) * 5;
}

// Helper to determine service type based on route and bus metadata
function getServiceType(route: Route): string {
  const name = route.route_name.toLowerCase();
  if (name.includes('airavat') || name.includes('expressway') || route.route_number === '302') {
    return 'Airavat Club Class (Volvo Multi-Axle)';
  }
  if (name.includes('rajahamsa') || route.route_number === '501') {
    return 'Rajahamsa Executive (Air Suspension)';
  }
  if (name.includes('nh75') || route.route_number === '201') {
    return 'Karnataka Sarige Express (Fast NH75)';
  }
  return 'Karnataka Sarige Super Fast (Express)';
}

// Helper to slice geometry between two points
function sliceGeometryBetweenStops(
  routeGeometry: [number, number][],
  stopA: Stop,
  stopB: Stop
): [number, number][] {
  if (!routeGeometry || routeGeometry.length < 2) {
    return [[stopA.latitude, stopA.longitude], [stopB.latitude, stopB.longitude]];
  }

  // Find nearest indices on geometry to stopA and stopB
  let closestAIdx = 0;
  let minDistA = Infinity;
  let closestBIdx = routeGeometry.length - 1;
  let minDistB = Infinity;

  routeGeometry.forEach((coord, idx) => {
    const distA = calculateHaversineDistance(coord[0], coord[1], stopA.latitude, stopA.longitude);
    if (distA < minDistA) {
      minDistA = distA;
      closestAIdx = idx;
    }
    const distB = calculateHaversineDistance(coord[0], coord[1], stopB.latitude, stopB.longitude);
    if (distB < minDistB) {
      minDistB = distB;
      closestBIdx = idx;
    }
  });

  if (closestAIdx <= closestBIdx) {
    const slice = routeGeometry.slice(closestAIdx, closestBIdx + 1);
    if (slice.length < 2) {
      return [[stopA.latitude, stopA.longitude], [stopB.latitude, stopB.longitude]];
    }
    return slice;
  } else {
    // Reverse direction
    const slice = routeGeometry.slice(closestBIdx, closestAIdx + 1).reverse();
    if (slice.length < 2) {
      return [[stopA.latitude, stopA.longitude], [stopB.latitude, stopB.longitude]];
    }
    return slice;
  }
}

// 1. GET /api/planner/popular - High-demand corridors with live bus counts
plannerRouter.get('/popular', (req, res) => {
  const liveBuses = getLiveFleetTelemetry();

  const corridors: PopularTripItem[] = [
    {
      id: 'pop-1',
      originStopId: 'stop-1006',
      originName: 'Bengaluru Kempegowda Majestic',
      originNameKannada: 'ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ (ಮೆಜೆಸ್ಟಿಕ್)',
      destinationStopId: 'stop-1001',
      destinationName: 'Tumkur KSRTC Bus Stand',
      destinationNameKannada: 'ತುಮಕೂರು ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಬಸ್ ನಿಲ್ದಾಣ',
      routeNumber: '152',
      distanceKm: 72.5,
      typicalDurationMin: 85,
      activeBusesCount: liveBuses.filter(b => b.route_id === 'route-152' || b.route_id === 'route-501').length,
      minFare: 105
    },
    {
      id: 'pop-2',
      originStopId: 'stop-1006',
      originName: 'Bengaluru Kempegowda Majestic',
      originNameKannada: 'ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ (ಮೆಜೆಸ್ಟಿಕ್)',
      destinationStopId: 'stop-1007',
      destinationName: 'Mysuru Central Suburban Bus Stand',
      destinationNameKannada: 'ಮೈಸೂರು ಉಪನಗರ ಬಸ್ ನಿಲ್ದಾಣ',
      routeNumber: '302',
      distanceKm: 144.0,
      typicalDurationMin: 140,
      activeBusesCount: liveBuses.filter(b => b.route_id === 'route-302').length,
      minFare: 330
    },
    {
      id: 'pop-3',
      originStopId: 'stop-1013',
      originName: 'Hassan KSRTC Central Stand',
      originNameKannada: 'ಹಾಸನ ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ನಿಲ್ದಾಣ',
      destinationStopId: 'stop-1006',
      destinationName: 'Bengaluru Kempegowda Majestic',
      destinationNameKannada: 'ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ (ಮೆಜೆಸ್ಟಿಕ್)',
      routeNumber: '201',
      distanceKm: 182.0,
      typicalDurationMin: 200,
      activeBusesCount: liveBuses.filter(b => b.route_id === 'route-201').length,
      minFare: 265
    },
    {
      id: 'pop-4',
      originStopId: 'stop-1001',
      originName: 'Tumkur KSRTC Bus Stand',
      originNameKannada: 'ತುಮಕೂರು ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಬಸ್ ನಿಲ್ದಾಣ',
      destinationStopId: 'stop-1004',
      destinationName: 'Nelamangala Toll Plaza Stop',
      destinationNameKannada: 'ನೆಲಮಂಗಲ ಟೋಲ್ ಪ್ಲಾಜಾ',
      routeNumber: '152',
      distanceKm: 48.0,
      typicalDurationMin: 50,
      activeBusesCount: liveBuses.filter(b => b.route_id === 'route-152').length,
      minFare: 70
    },
    {
      id: 'pop-5',
      originStopId: 'stop-1017',
      originName: 'Hubballi Old Bus Stand',
      originNameKannada: 'ಹುಬ್ಬಳ್ಳಿ ಹಳೆ ಬಸ್ ನಿಲ್ದಾಣ',
      destinationStopId: 'stop-1006',
      destinationName: 'Bengaluru Kempegowda Majestic',
      destinationNameKannada: 'ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ (ಮೆಜೆಸ್ಟಿಕ್)',
      routeNumber: '501',
      distanceKm: 410.0,
      typicalDurationMin: 420,
      activeBusesCount: liveBuses.filter(b => b.route_id === 'route-501').length,
      minFare: 760
    },
    {
      id: 'pop-6',
      originStopId: 'stop-1002',
      originName: 'Kunigal Bypass Circle',
      originNameKannada: 'ಕುಣಿಗಲ್ ಬೈಪಾಸ್ ವೃತ್ತ',
      destinationStopId: 'stop-1005',
      destinationName: 'Yeshwanthpur TTMC Bus Terminal',
      destinationNameKannada: 'ಯಶವಂತಪುರ ಟಿ.ಟಿ.ಎಂ.ಸಿ',
      routeNumber: '201/152',
      distanceKm: 69.0,
      typicalDurationMin: 80,
      activeBusesCount: liveBuses.filter(b => b.route_id === 'route-201' || b.route_id === 'route-152').length,
      minFare: 115
    }
  ];

  res.json({ corridors });
});

// 2. GET /api/planner/stops - Quick search for autocomplete
plannerRouter.get('/stops', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();

  if (!q) {
    return res.json({ stops: db.stops });
  }

  const filtered = db.stops.filter(s => {
    return (
      s.stop_code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.name_kannada && s.name_kannada.toLowerCase().includes(q)) ||
      (s.zone && s.zone.toLowerCase().includes(q))
    );
  });

  res.json({ stops: filtered });
});

// 3. POST /api/planner/plan - Core A-to-B Planner with Live Bus Location Matching
plannerRouter.post('/plan', (req, res) => {
  const {
    originStopId,
    destinationStopId,
    originQuery,
    destinationQuery,
    userLat,
    userLng,
    departureTime,
    directOnly = false,
    sortBy = 'recommended'
  } = req.body;

  // Resolve Origin Stop
  let originStop: Stop | undefined;
  if (originStopId) {
    originStop = db.getStopByCodeOrId(originStopId);
  } else if (originQuery) {
    const q = String(originQuery).toLowerCase().trim();
    originStop = db.stops.find(s =>
      s.stop_code.toLowerCase() === q ||
      s.name.toLowerCase().includes(q) ||
      (s.name_kannada && s.name_kannada.toLowerCase().includes(q))
    );
  } else if (userLat && userLng) {
    // Nearest stop to user's geolocation
    let nearestDist = Infinity;
    db.stops.forEach(s => {
      const d = calculateHaversineDistance(userLat, userLng, s.latitude, s.longitude);
      if (d < nearestDist && d < 60) {
        nearestDist = d;
        originStop = s;
      }
    });
  }

  // Resolve Destination Stop
  let destStop: Stop | undefined;
  if (destinationStopId) {
    destStop = db.getStopByCodeOrId(destinationStopId);
  } else if (destinationQuery) {
    const q = String(destinationQuery).toLowerCase().trim();
    destStop = db.stops.find(s =>
      s.stop_code.toLowerCase() === q ||
      s.name.toLowerCase().includes(q) ||
      (s.name_kannada && s.name_kannada.toLowerCase().includes(q))
    );
  }

  if (!originStop) {
    return res.status(400).json({ error: 'Origin stop not found. Please select a valid KSRTC boarding stop.' });
  }

  if (!destStop) {
    return res.status(400).json({ error: 'Destination stop not found. Please select a valid KSRTC destination stop.' });
  }

  if (originStop.id === destStop.id) {
    return res.status(400).json({ error: 'Origin and Destination stops cannot be identical.' });
  }

  const liveBuses = getLiveFleetTelemetry();
  const allRoutes = db.routes;

  const directOptions: TripPlanOption[] = [];
  const transferOptions: TripPlanOption[] = [];

  const now = new Date();
  const baseTimeStr = departureTime || now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const [baseHour, baseMin] = baseTimeStr.split(':').map(Number);
  const baseTimestampMs = now.setHours(isNaN(baseHour) ? 8 : baseHour, isNaN(baseMin) ? 0 : baseMin, 0, 0);

  // A. FIND DIRECT ROUTES
  allRoutes.forEach(route => {
    const routeWithStops = db.getRouteWithStops(route.id);
    const stopsList = (routeWithStops?.stops || []).sort((a, b) => a.stop_sequence - b.stop_sequence);

    const originIdx = stopsList.findIndex(rs => rs.stop_id === originStop!.id);
    const destIdx = stopsList.findIndex(rs => rs.stop_id === destStop!.id);

    if (originIdx !== -1 && destIdx !== -1) {
      const isForward = originIdx < destIdx;
      const startIdx = isForward ? originIdx : destIdx;
      const endIdx = isForward ? destIdx : originIdx;

      const subList = stopsList.slice(startIdx, endIdx + 1);
      const orderedStops = isForward ? subList : [...subList].reverse();
      const intermediateStops = orderedStops.slice(1, -1).map(rs => rs.stop!).filter(Boolean);

      // Distance calculation
      let distanceKm = 0;
      const startRs = stopsList[startIdx];
      const endRs = stopsList[endIdx];
      if (endRs.distance_from_origin_km !== undefined && startRs.distance_from_origin_km !== undefined) {
        distanceKm = Math.abs(endRs.distance_from_origin_km - startRs.distance_from_origin_km);
      } else {
        // Fallback Haversine
        for (let s = 0; s < orderedStops.length - 1; s++) {
          const s1 = orderedStops[s].stop;
          const s2 = orderedStops[s + 1].stop;
          if (s1 && s2) {
            distanceKm += calculateHaversineDistance(s1.latitude, s1.longitude, s2.latitude, s2.longitude);
          }
        }
      }
      distanceKm = Math.round(distanceKm * 10) / 10;
      if (distanceKm < 1) distanceKm = 8.5; // safety min

      // Estimated duration
      const serviceClass = getServiceType(route);
      const avgSpeed = serviceClass.includes('Airavat') ? 65 : serviceClass.includes('Rajahamsa') ? 55 : 48;
      const travelMinutes = Math.round((distanceKm / avgSpeed) * 60) + Math.max(5, intermediateStops.length * 3);

      // Check live bus on this route
      const activeBusesOnRoute = liveBuses.filter(b => b.route_id === route.id);
      let matchedLiveBus: TripLegLiveBus | undefined;
      let earliestLiveEtaMin: number | undefined;

      if (activeBusesOnRoute.length > 0) {
        // Pick best matching live bus
        for (const lb of activeBusesOnRoute) {
          const distToOrigin = calculateHaversineDistance(lb.latitude, lb.longitude, originStop!.latitude, originStop!.longitude);
          const effectiveSpeed = Math.max(25, lb.speed || 45);
          const etaToOrigin = Math.round((distToOrigin / effectiveSpeed) * 60);

          if (earliestLiveEtaMin === undefined || etaToOrigin < earliestLiveEtaMin) {
            earliestLiveEtaMin = etaToOrigin;
            matchedLiveBus = {
              busId: lb.bus_id,
              registrationNumber: lb.registration_number,
              fleetNumber: lb.fleet_number,
              model: lb.model,
              driverName: lb.driver_name,
              driverCode: lb.driver_code,
              currentSpeed: lb.speed,
              latitude: lb.latitude,
              longitude: lb.longitude,
              heading: lb.heading,
              distanceToOriginKm: Math.round(distToOrigin * 10) / 10,
              etaToOriginMinutes: Math.max(1, etaToOrigin),
              status: lb.status,
              secondsAgo: lb.seconds_ago,
              occupancyStatus: lb.speed > 55 ? 'seats_available' : lb.speed > 25 ? 'standing_only' : 'crowded'
            };
          }
        }
      }

      // Schedule departure & arrival formatting
      const depDate = new Date(baseTimestampMs + (earliestLiveEtaMin ? earliestLiveEtaMin * 60000 : 15 * 60000));
      const arrDate = new Date(depDate.getTime() + travelMinutes * 60000);

      const depTimeStr = depDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const arrTimeStr = arrDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

      const fare = calculateKSRTCFare(distanceKm, serviceClass);
      // Carbon saved: Car produces ~130g CO2/km; bus passenger emits ~30g CO2/km = 100g/km saved
      const carbonSaved = Math.round((distanceKm * 0.10) * 10) / 10;

      const polyline = sliceGeometryBetweenStops(route.route_geometry, originStop!, destStop!);

      const leg: TripLeg = {
        legIndex: 1,
        routeId: route.id,
        routeNumber: route.route_number,
        routeName: route.route_name,
        originStop: originStop!,
        destinationStop: destStop!,
        intermediateStops,
        intermediateCount: intermediateStops.length,
        distanceKm,
        durationMinutes: travelMinutes,
        scheduledDepartureTime: depTimeStr,
        scheduledArrivalTime: arrTimeStr,
        busServiceType: serviceClass,
        estimatedFare: fare,
        polyline,
        liveBus: matchedLiveBus,
        frequencyDescription: 'Runs every 15-20 mins (05:30 - 23:00)'
      };

      const optionId = `direct-${route.id}-${isForward ? 'fwd' : 'rev'}`;
      let badge: 'Fastest' | 'Live Bus Approaching' | 'Best Value' | 'Direct Non-Stop' = 'Direct Non-Stop';
      if (matchedLiveBus && matchedLiveBus.etaToOriginMinutes <= 25) {
        badge = 'Live Bus Approaching';
      }

      directOptions.push({
        id: optionId,
        type: 'direct',
        totalDurationMinutes: travelMinutes,
        totalDistanceKm: distanceKm,
        totalFare: fare,
        departureTime: depTimeStr,
        arrivalTime: arrTimeStr,
        legs: [leg],
        carbonSavedKg: carbonSaved,
        hasLiveBus: Boolean(matchedLiveBus),
        earliestLiveArrivalMinutes: earliestLiveEtaMin,
        recommendationBadge: badge,
        summary: `Direct ${serviceClass} via Route ${route.route_number}`
      });
    }
  });

  // B. FIND 1-TRANSFER CONNECTING ROUTES (if not directOnly or if direct routes are few)
  if (!directOnly && (directOptions.length === 0 || directOptions.length < 3)) {
    // Potential major transfer hubs
    const potentialTransferHubs = [
      'stop-1006', // Kempegowda Majestic (Primary Hub)
      'stop-1004', // Nelamangala Toll Plaza (NH48 / NH75 Interchange)
      'stop-1001', // Tumkur Bus Stand (NH48 Gateway)
      'stop-1005'  // Yeshwanthpur TTMC
    ];

    potentialTransferHubs.forEach(hubId => {
      if (hubId === originStop!.id || hubId === destStop!.id) return;
      const transferStation = db.getStopByCodeOrId(hubId);
      if (!transferStation) return;

      // Find route from origin to transferStation (Leg 1)
      const leg1Routes = allRoutes.filter(r => {
        const rWithStops = db.getRouteWithStops(r.id);
        const stops = rWithStops?.stops || [];
        const hasA = stops.some(s => s.stop_id === originStop!.id);
        const hasT = stops.some(s => s.stop_id === hubId);
        return hasA && hasT;
      });

      // Find route from transferStation to destStop (Leg 2)
      const leg2Routes = allRoutes.filter(r => {
        const rWithStops = db.getRouteWithStops(r.id);
        const stops = rWithStops?.stops || [];
        const hasT = stops.some(s => s.stop_id === hubId);
        const hasB = stops.some(s => s.stop_id === destStop!.id);
        return hasT && hasB;
      });

      if (leg1Routes.length > 0 && leg2Routes.length > 0) {
        // Formulate transfer option with the top route pair
        const r1 = leg1Routes[0];
        const r2 = leg2Routes.find(r => r.id !== r1.id) || leg2Routes[0];

        // Leg 1 calculations
        const r1WithStops = db.getRouteWithStops(r1.id)?.stops || [];
        const r1OriginIdx = r1WithStops.findIndex(s => s.stop_id === originStop!.id);
        const r1HubIdx = r1WithStops.findIndex(s => s.stop_id === hubId);
        const r1Start = Math.min(r1OriginIdx, r1HubIdx);
        const r1End = Math.max(r1OriginIdx, r1HubIdx);
        const r1SubList = r1WithStops.slice(r1Start, r1End + 1);
        const r1Intermediates = r1SubList.slice(1, -1).map(s => s.stop!).filter(Boolean);

        let d1 = calculateHaversineDistance(originStop!.latitude, originStop!.longitude, transferStation.latitude, transferStation.longitude);
        d1 = Math.round(d1 * 10) / 10;
        const dur1 = Math.round((d1 / 50) * 60) + 10;

        // Leg 2 calculations
        const r2WithStops = db.getRouteWithStops(r2.id)?.stops || [];
        const r2HubIdx = r2WithStops.findIndex(s => s.stop_id === hubId);
        const r2DestIdx = r2WithStops.findIndex(s => s.stop_id === destStop!.id);
        const r2Start = Math.min(r2HubIdx, r2DestIdx);
        const r2End = Math.max(r2HubIdx, r2DestIdx);
        const r2SubList = r2WithStops.slice(r2Start, r2End + 1);
        const r2Intermediates = r2SubList.slice(1, -1).map(s => s.stop!).filter(Boolean);

        let d2 = calculateHaversineDistance(transferStation.latitude, transferStation.longitude, destStop!.latitude, destStop!.longitude);
        d2 = Math.round(d2 * 10) / 10;
        const dur2 = Math.round((d2 / 50) * 60) + 10;

        const transferWaitMin = 15; // 15 min comfortable interchange buffer
        const totalDuration = dur1 + transferWaitMin + dur2;
        const totalDistance = Math.round((d1 + d2) * 10) / 10;

        // Check live buses for Leg 1
        const activeBusesR1 = liveBuses.filter(b => b.route_id === r1.id);
        let liveBus1: TripLegLiveBus | undefined;
        let leg1LiveEtaMin: number | undefined;
        if (activeBusesR1.length > 0) {
          const lb = activeBusesR1[0];
          const distToA = calculateHaversineDistance(lb.latitude, lb.longitude, originStop!.latitude, originStop!.longitude);
          leg1LiveEtaMin = Math.round((distToA / Math.max(30, lb.speed || 45)) * 60);
          liveBus1 = {
            busId: lb.bus_id,
            registrationNumber: lb.registration_number,
            fleetNumber: lb.fleet_number,
            model: lb.model,
            driverName: lb.driver_name,
            driverCode: lb.driver_code,
            currentSpeed: lb.speed,
            latitude: lb.latitude,
            longitude: lb.longitude,
            heading: lb.heading,
            distanceToOriginKm: Math.round(distToA * 10) / 10,
            etaToOriginMinutes: Math.max(2, leg1LiveEtaMin),
            status: lb.status,
            secondsAgo: lb.seconds_ago,
            occupancyStatus: 'seats_available'
          };
        }

        // Check live buses for Leg 2
        const activeBusesR2 = liveBuses.filter(b => b.route_id === r2.id);
        let liveBus2: TripLegLiveBus | undefined;
        if (activeBusesR2.length > 0) {
          const lb2 = activeBusesR2[0];
          const distToHub = calculateHaversineDistance(lb2.latitude, lb2.longitude, transferStation.latitude, transferStation.longitude);
          liveBus2 = {
            busId: lb2.bus_id,
            registrationNumber: lb2.registration_number,
            fleetNumber: lb2.fleet_number,
            model: lb2.model,
            driverName: lb2.driver_name,
            driverCode: lb2.driver_code,
            currentSpeed: lb2.speed,
            latitude: lb2.latitude,
            longitude: lb2.longitude,
            heading: lb2.heading,
            distanceToOriginKm: Math.round(distToHub * 10) / 10,
            etaToOriginMinutes: Math.max(5, Math.round((distToHub / Math.max(30, lb2.speed || 45)) * 60)),
            status: lb2.status,
            secondsAgo: lb2.seconds_ago,
            occupancyStatus: 'seats_available'
          };
        }

        const depDate = new Date(baseTimestampMs + (leg1LiveEtaMin ? leg1LiveEtaMin * 60000 : 12 * 60000));
        const arrLeg1 = new Date(depDate.getTime() + dur1 * 60000);
        const depLeg2 = new Date(arrLeg1.getTime() + transferWaitMin * 60000);
        const finalArr = new Date(depLeg2.getTime() + dur2 * 60000);

        const fare1 = calculateKSRTCFare(d1, getServiceType(r1));
        const fare2 = calculateKSRTCFare(d2, getServiceType(r2));
        const totalFare = fare1 + fare2;
        const carbonSaved = Math.round((totalDistance * 0.10) * 10) / 10;

        const leg1: TripLeg = {
          legIndex: 1,
          routeId: r1.id,
          routeNumber: r1.route_number,
          routeName: r1.route_name,
          originStop: originStop!,
          destinationStop: transferStation,
          intermediateStops: r1Intermediates,
          intermediateCount: r1Intermediates.length,
          distanceKm: d1,
          durationMinutes: dur1,
          scheduledDepartureTime: depDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          scheduledArrivalTime: arrLeg1.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          busServiceType: getServiceType(r1),
          estimatedFare: fare1,
          polyline: sliceGeometryBetweenStops(r1.route_geometry, originStop!, transferStation),
          liveBus: liveBus1,
          frequencyDescription: 'Board Leg 1 (Route ' + r1.route_number + ')'
        };

        const leg2: TripLeg = {
          legIndex: 2,
          routeId: r2.id,
          routeNumber: r2.route_number,
          routeName: r2.route_name,
          originStop: transferStation,
          destinationStop: destStop!,
          intermediateStops: r2Intermediates,
          intermediateCount: r2Intermediates.length,
          distanceKm: d2,
          durationMinutes: dur2,
          scheduledDepartureTime: depLeg2.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          scheduledArrivalTime: finalArr.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          busServiceType: getServiceType(r2),
          estimatedFare: fare2,
          polyline: sliceGeometryBetweenStops(r2.route_geometry, transferStation, destStop!),
          liveBus: liveBus2,
          frequencyDescription: 'Transfer Leg 2 (Route ' + r2.route_number + ')'
        };

        transferOptions.push({
          id: `transfer-${r1.id}-${r2.id}-via-${hubId}`,
          type: 'transfer',
          totalDurationMinutes: totalDuration,
          totalDistanceKm: totalDistance,
          totalFare,
          departureTime: leg1.scheduledDepartureTime,
          arrivalTime: leg2.scheduledArrivalTime,
          legs: [leg1, leg2],
          transferStation,
          transferWaitMinutes: transferWaitMin,
          carbonSavedKg: carbonSaved,
          hasLiveBus: Boolean(liveBus1 || liveBus2),
          earliestLiveArrivalMinutes: leg1LiveEtaMin,
          recommendationBadge: 'Best Value',
          summary: `1 Transfer at ${transferStation.name} (Routes ${r1.route_number} ➔ ${r2.route_number})`
        });
      }
    });
  }

  // Combine and sort options
  let allOptions: TripPlanOption[] = [...directOptions, ...transferOptions];

  // Tag badges
  if (allOptions.length > 0) {
    // Tag the absolute fastest
    const fastest = [...allOptions].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)[0];
    if (fastest) {
      fastest.recommendationBadge = 'Fastest';
    }
  }

  // Sorting
  if (sortBy === 'fastest') {
    allOptions.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
  } else if (sortBy === 'earliest_departure') {
    allOptions.sort((a, b) => (a.earliestLiveArrivalMinutes || 999) - (b.earliestLiveArrivalMinutes || 999));
  } else if (sortBy === 'lowest_fare') {
    allOptions.sort((a, b) => a.totalFare - b.totalFare);
  } else {
    // Recommended: Direct first, then live bus, then shortest duration
    allOptions.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'direct' ? -1 : 1;
      if (a.hasLiveBus !== b.hasLiveBus) return a.hasLiveBus ? -1 : 1;
      return a.totalDurationMinutes - b.totalDurationMinutes;
    });
  }

  const responsePayload: TripPlanResponse = {
    origin: originStop!,
    destination: destStop!,
    directOptionsCount: directOptions.length,
    transferOptionsCount: transferOptions.length,
    options: allOptions,
    liveBusesActiveCount: liveBuses.length,
    timestamp: new Date().toISOString()
  };

  res.json(responsePayload);
});
