import { Route, RouteStop, Stop, ETAInfo } from '../../src/types/index.js';
import { calculateHaversineDistance } from './gpsValidator.js';
import { db } from '../db/database.js';

export interface UpcomingStopETA {
  stopId: string;
  stopName: string;
  stopNameKannada?: string;
  stopSequence: number;
  distanceKm: number;
  etaMinutes: number;
  estimatedArrivalTime: string;
}

export interface DetailedETAInfo extends ETAInfo {
  confidence?: 'HIGH' | 'MEDIUM' | 'CALIBRATED';
  upcomingStops?: UpcomingStopETA[];
}

export class ETAService {
  /**
   * Calculates high-accuracy Next Stop and ETA for a bus given its current GPS coordinates,
   * speed, heading, and assigned corridor route.
   */
  static calculateETA(
    currentLat: number,
    currentLng: number,
    currentSpeed: number,
    route: Route,
    recentSpeeds: number[] = []
  ): DetailedETAInfo {
    const routeWithStops = db.getRouteWithStops(route.id);
    const stopsList = (routeWithStops?.stops || [])
      .filter(rs => rs.stop && rs.stop.latitude && rs.stop.longitude)
      .sort((a, b) => a.stop_sequence - b.stop_sequence);

    if (!stopsList.length) {
      return {
        etaMinutes: 0,
        distanceKm: 0,
        nextStop: route.destination,
        currentSpeedKmH: Math.round(currentSpeed || 40),
        confidence: 'CALIBRATED'
      };
    }

    // 1. Calculate distance from bus to each stop
    const stopsWithDistance = stopsList.map((rs, idx) => {
      const stop = rs.stop!;
      const directDistKm = calculateHaversineDistance(currentLat, currentLng, stop.latitude, stop.longitude);
      return {
        ...rs,
        stop,
        directDistKm,
        index: idx
      };
    });

    // 2. High-Accuracy Segment Projection
    // Determine which corridor segment (between stop i and stop i+1) the bus is currently traveling
    let activeSegmentIndex = 0;
    let minSegmentProjectionScore = Infinity;

    for (let i = 0; i < stopsWithDistance.length - 1; i++) {
      const s1 = stopsWithDistance[i];
      const s2 = stopsWithDistance[i + 1];

      // Segment length between consecutive stops
      const segLength = calculateHaversineDistance(
        s1.stop.latitude,
        s1.stop.longitude,
        s2.stop.latitude,
        s2.stop.longitude
      );

      // Sum of distances from bus to s1 and bus to s2 minus segment length
      // For a point near the segment line, (d1 + d2) ≈ segLength
      const detourDist = (s1.directDistKm + s2.directDistKm) - segLength;

      if (detourDist < minSegmentProjectionScore) {
        minSegmentProjectionScore = detourDist;
        activeSegmentIndex = i;
      }
    }

    // Determine the next upcoming stop:
    // By default, on segment (i -> i+1), the next stop is i+1!
    let nextStopIdx = Math.min(activeSegmentIndex + 1, stopsWithDistance.length - 1);

    // If bus is within 150m of s1 and has not yet departed, next stop could still be s1 only if at origin
    if (activeSegmentIndex === 0 && stopsWithDistance[0].directDistKm < 0.15) {
      nextStopIdx = 1; // bus is at origin terminal, next stop is first waypoint
    } else if (stopsWithDistance[nextStopIdx].directDistKm < 0.20 && nextStopIdx < stopsWithDistance.length - 1) {
      // If bus has virtually reached stop i+1 (<200m), next upcoming destination advances to i+2
      nextStopIdx = nextStopIdx + 1;
    }

    const nextStopItem = stopsWithDistance[nextStopIdx];

    // 3. Realistic Operational Speed Calibration
    // Filter out zero/idling speeds (signals, boarding) and compute rolling average
    const validRecentSpeeds = recentSpeeds.filter(s => s > 10 && s <= 120);
    const avgRecentSpeed = validRecentSpeeds.length > 0
      ? validRecentSpeeds.reduce((acc, v) => acc + v, 0) / validRecentSpeeds.length
      : 0;

    let operationalSpeed = 45; // Standard Karnataka highway/urban bus average
    if (currentSpeed >= 15 && currentSpeed <= 110) {
      operationalSpeed = currentSpeed;
    } else if (avgRecentSpeed >= 20) {
      operationalSpeed = avgRecentSpeed;
    } else {
      // Corridor default speed based on route distance
      operationalSpeed = route.distance_km > 100 ? 58 : 42;
    }

    // 4. Road Curvature & Topography Factor
    // Highway corridors in Karnataka have an empirical road-to-straight-line ratio of 1.16 - 1.22
    const roadCorrectionFactor = route.distance_km > 100 ? 1.16 : 1.20;
    const distanceToNextKm = Math.max(0.1, Number((nextStopItem.directDistKm * roadCorrectionFactor).toFixed(1)));

    // 5. Calculate Precise Travel Time + Stop Dwell Buffer
    const travelTimeHours = distanceToNextKm / operationalSpeed;
    const dwellBufferMin = distanceToNextKm > 2 ? 1.2 : 0.4;
    const etaMinutes = Math.max(1, Math.round(travelTimeHours * 60 + dwellBufferMin));

    const arrivalDate = new Date(Date.now() + etaMinutes * 60000);
    const estimatedArrivalTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 6. Multi-Stop Arrival Forecast for All Upcoming Stops on the Corridor
    const upcomingStops: UpcomingStopETA[] = [];
    let cumulativeDistKm = distanceToNextKm;
    let cumulativeMinutes = etaMinutes;

    upcomingStops.push({
      stopId: nextStopItem.stop.id,
      stopName: nextStopItem.stop.name,
      stopNameKannada: nextStopItem.stop.name_kannada,
      stopSequence: nextStopItem.stop_sequence,
      distanceKm: distanceToNextKm,
      etaMinutes: etaMinutes,
      estimatedArrivalTime
    });

    for (let j = nextStopIdx + 1; j < stopsWithDistance.length; j++) {
      const prevStop = stopsWithDistance[j - 1];
      const curStop = stopsWithDistance[j];

      const segmentDist = calculateHaversineDistance(
        prevStop.stop.latitude,
        prevStop.stop.longitude,
        curStop.stop.latitude,
        curStop.stop.longitude
      ) * roadCorrectionFactor;

      cumulativeDistKm = Number((cumulativeDistKm + segmentDist).toFixed(1));
      const legMinutes = Math.max(2, Math.round((segmentDist / operationalSpeed) * 60 + 2.0)); // 2 mins dwell per stop
      cumulativeMinutes += legMinutes;

      const stopArrivalTime = new Date(Date.now() + cumulativeMinutes * 60000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      upcomingStops.push({
        stopId: curStop.stop.id,
        stopName: curStop.stop.name,
        stopNameKannada: curStop.stop.name_kannada,
        stopSequence: curStop.stop_sequence,
        distanceKm: cumulativeDistKm,
        etaMinutes: cumulativeMinutes,
        estimatedArrivalTime: stopArrivalTime
      });
    }

    const confidence: 'HIGH' | 'MEDIUM' | 'CALIBRATED' =
      currentSpeed > 10 ? 'HIGH' : (validRecentSpeeds.length > 0 ? 'MEDIUM' : 'CALIBRATED');

    return {
      etaMinutes,
      distanceKm: distanceToNextKm,
      nextStop: nextStopItem.stop.name,
      nextStopId: nextStopItem.stop.id,
      estimatedArrivalTime,
      currentSpeedKmH: Math.round(operationalSpeed),
      confidence,
      upcomingStops
    };
  }

  /**
   * Calculates ETA specifically to a target stop for any bus servicing that stop
   */
  static calculateETAToStop(
    busLat: number,
    busLng: number,
    busSpeed: number,
    targetStop: Stop
  ): { etaMinutes: number; distanceKm: number; estimatedTime: string } {
    const directDistKm = calculateHaversineDistance(busLat, busLng, targetStop.latitude, targetStop.longitude);
    const roadCorrectionFactor = 1.18;
    const roadDistKm = Math.max(0.1, Number((directDistKm * roadCorrectionFactor).toFixed(1)));
    const speed = busSpeed > 10 ? busSpeed : 42;
    const dwellBuffer = roadDistKm > 5 ? 2.5 : 1.0;
    const etaMin = Math.max(1, Math.round((roadDistKm / speed) * 60 + dwellBuffer));

    const arrivalDate = new Date(Date.now() + etaMin * 60000);
    const estimatedTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      etaMinutes: etaMin,
      distanceKm: roadDistKm,
      estimatedTime
    };
  }
}
