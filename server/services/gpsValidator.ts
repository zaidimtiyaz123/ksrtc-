import { db } from '../db/database.js';
import { BusLocation, Route } from '../../src/types/index.js';

export interface GPSValidationResult {
  isValid: boolean;
  reason?: string;
  deviationFlag?: boolean;
  speed: number;
}

// Haversine formula calculation for geographical distances (in Kilometers)
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Minimum distance from a point (lat, lon) to a line segment (lat1, lon1) -> (lat2, lon2)
function pointToSegmentDistance(
  pLat: number,
  pLon: number,
  s1Lat: number,
  s1Lon: number,
  s2Lat: number,
  s2Lon: number
): number {
  const d1 = calculateHaversineDistance(pLat, pLon, s1Lat, s1Lon);
  const d2 = calculateHaversineDistance(pLat, pLon, s2Lat, s2Lon);
  const segmentLen = calculateHaversineDistance(s1Lat, s1Lon, s2Lat, s2Lon);
  if (segmentLen === 0) return d1;
  return Math.min(d1, d2);
}

export function validateGPSUpdate(
  busId: string,
  tripId: string,
  latitude: number,
  longitude: number,
  accuracy: number,
  reportedSpeed: number,
  timestampStr: string,
  route?: Route
): GPSValidationResult {
  // 1. Basic coordinate range checks
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { isValid: false, reason: 'Coordinates must be numeric', speed: 0 };
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    return { isValid: false, reason: 'Coordinates are NaN', speed: 0 };
  }

  // Check latitude / longitude within valid earth geographic limits
  if (latitude < -90.0 || latitude > 90.0 || longitude < -180.0 || longitude > 180.0) {
    return { isValid: false, reason: 'Coordinates outside valid geographic limits', speed: 0 };
  }

  // 2. Accuracy check (reject poor accuracy > 250 meters)
  if (accuracy > 250) {
    return { isValid: false, reason: `GPS accuracy too low (${accuracy.toFixed(1)}m > 250m threshold)`, speed: reportedSpeed };
  }

  // 3. Timestamp age check
  const now = Date.now();
  const timestamp = new Date(timestampStr).getTime();
  if (isNaN(timestamp)) {
    return { isValid: false, reason: 'Invalid ISO timestamp', speed: 0 };
  }

  const ageMs = now - timestamp;
  if (ageMs < -60000) {
    // More than 1 minute in future
    return { isValid: false, reason: 'Timestamp is in the future', speed: 0 };
  }
  if (ageMs > 15 * 60 * 1000) {
    // Older than 15 minutes
    return { isValid: false, reason: 'Timestamp is stale (>15 mins old)', speed: 0 };
  }

  // 4. Maximum commercial vehicle speed check (135 km/h for KSRTC buses)
  if (reportedSpeed > 135) {
    return { isValid: false, reason: `Reported speed ${reportedSpeed} km/h exceeds maximum permissible limit (135 km/h)`, speed: reportedSpeed };
  }

  // 5. Teleportation / Jumps validation against previous GPS point
  const previousLoc = db.getLatestLocation(busId);
  let effectiveSpeed = reportedSpeed;

  if (previousLoc) {
    const prevTime = new Date(previousLoc.timestamp).getTime();
    const timeDeltaSeconds = (timestamp - prevTime) / 1000;

    if (timeDeltaSeconds > 1) {
      const distanceKm = calculateHaversineDistance(
        previousLoc.latitude,
        previousLoc.longitude,
        latitude,
        longitude
      );
      const computedSpeedKmh = (distanceKm / (timeDeltaSeconds / 3600));

      // If computed jump speed is physically impossible (> 160 km/h)
      if (computedSpeedKmh > 160 && distanceKm > 0.5) {
        return {
          isValid: false,
          reason: `Impossible movement jump: ${distanceKm.toFixed(2)}km in ${timeDeltaSeconds.toFixed(0)}s (implied speed ${computedSpeedKmh.toFixed(0)} km/h)`,
          speed: reportedSpeed
        };
      }

      if (reportedSpeed === 0 && computedSpeedKmh > 10 && computedSpeedKmh < 120) {
        effectiveSpeed = Math.round(computedSpeedKmh);
      }
    }
  }

  // 6. Route corridor deviation check
  let deviationFlag = false;
  if (route && route.route_geometry && route.route_geometry.length >= 2) {
    let minDistanceToRoute = Infinity;
    for (let i = 0; i < route.route_geometry.length - 1; i++) {
      const [lat1, lon1] = route.route_geometry[i];
      const [lat2, lon2] = route.route_geometry[i + 1];
      const d = pointToSegmentDistance(latitude, longitude, lat1, lon1, lat2, lon2);
      if (d < minDistanceToRoute) {
        minDistanceToRoute = d;
      }
    }
    // If distance from designated route corridor > 3.0 km, mark as deviation
    if (minDistanceToRoute > 3.0) {
      deviationFlag = true;
    }
  }

  return {
    isValid: true,
    deviationFlag,
    speed: effectiveSpeed
  };
}
