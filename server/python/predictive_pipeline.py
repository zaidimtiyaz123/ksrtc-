#!/usr/bin/env python3
"""
KSRTC SmartTrack - Python Predictive Bus Arrival & AI Delay Forecasting Pipeline
Direct backend analytics and machine learning pipeline for real-time transit intelligence.
Computes EWMA velocity smoothing, corridor impedance, and P10/P50/P90 quantile arrival delays.
"""

import sys
import json
import math
from datetime import datetime, timezone, timedelta

# IST timezone: UTC + 5:30
IST_OFFSET = timedelta(hours=5, minutes=30)

# Known Karnataka Highway & Urban Corridor Bottlenecks with coordinates and friction multipliers
CORRIDOR_BOTTLENECK_NODES = [
    {
        "id": "nelamangala_toll",
        "name": "Nelamangala Toll Plaza (NH 48)",
        "lat": 13.0988,
        "lng": 77.3912,
        "radius_km": 4.5,
        "peak_impedance": 1.55,
        "offpeak_impedance": 1.20,
        "base_dwell_min": 5.0,
        "corridor": "Bengaluru - Tumkur"
    },
    {
        "id": "goraguntepalya_junction",
        "name": "Goraguntepalya Flyover Junction (Outer Ring)",
        "lat": 13.0285,
        "lng": 77.5407,
        "radius_km": 3.0,
        "peak_impedance": 1.65,
        "offpeak_impedance": 1.30,
        "base_dwell_min": 6.5,
        "corridor": "Bengaluru North Exit"
    },
    {
        "id": "bidadi_junction",
        "name": "Bidadi Junction / Industrial Area (NH 275)",
        "lat": 12.7958,
        "lng": 77.3842,
        "radius_km": 4.0,
        "peak_impedance": 1.45,
        "offpeak_impedance": 1.15,
        "base_dwell_min": 4.0,
        "corridor": "Bengaluru - Mysuru"
    },
    {
        "id": "kengeri_satellite",
        "name": "Kengeri Satellite Bus Terminal Approach",
        "lat": 12.9158,
        "lng": 77.4835,
        "radius_km": 3.5,
        "peak_impedance": 1.50,
        "offpeak_impedance": 1.25,
        "base_dwell_min": 4.5,
        "corridor": "Bengaluru South-West"
    },
    {
        "id": "ramanagara_town",
        "name": "Ramanagara Toll / Commercial Zone",
        "lat": 12.7214,
        "lng": 77.2799,
        "radius_km": 3.0,
        "peak_impedance": 1.35,
        "offpeak_impedance": 1.10,
        "base_dwell_min": 3.5,
        "corridor": "Bengaluru - Mysuru"
    },
    {
        "id": "tumkur_kyatsandra",
        "name": "Kyatsandra Toll / Tumkur Bypass",
        "lat": 13.3102,
        "lng": 77.1420,
        "radius_km": 3.5,
        "peak_impedance": 1.30,
        "offpeak_impedance": 1.10,
        "base_dwell_min": 3.0,
        "corridor": "Tumkur Bypass"
    },
    {
        "id": "kunigal_bypass",
        "name": "Kunigal Bypass / Bellur Cross (NH 75)",
        "lat": 13.0234,
        "lng": 77.0267,
        "radius_km": 4.0,
        "peak_impedance": 1.25,
        "offpeak_impedance": 1.05,
        "base_dwell_min": 2.5,
        "corridor": "Bengaluru - Hassan"
    }
]

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return r * c

class EWMAVelocityFilter:
    """Exponentially Weighted Moving Average filter for vehicle velocity smoothing."""
    def __init__(self, alpha: float = 0.35, min_threshold_kmh: float = 8.0, max_threshold_kmh: float = 110.0):
        self.alpha = alpha
        self.min_threshold = min_threshold_kmh
        self.max_threshold = max_threshold_kmh

    def smooth(self, current_speed: float, recent_speeds: list) -> tuple:
        """
        Calculates smoothed velocity and speed volatility (std dev).
        Filters out momentary stops (signals, passenger boarding) from highway cruise estimation.
        """
        valid_speeds = [s for s in recent_speeds if self.min_threshold <= s <= self.max_threshold]
        
        # If current speed is reasonable, incorporate it
        if self.min_threshold <= current_speed <= self.max_threshold:
            valid_speeds.append(current_speed)

        if not valid_speeds:
            # Fallback to standard Karnataka highway nominal speed
            return 48.0, 5.0

        # Apply EWMA weights from oldest to newest
        smoothed = valid_speeds[0]
        for spd in valid_speeds[1:]:
            smoothed = (self.alpha * spd) + ((1.0 - self.alpha) * smoothed)

        # Calculate standard deviation for confidence scoring
        mean_speed = sum(valid_speeds) / len(valid_speeds)
        variance = sum((s - mean_speed) ** 2 for s in valid_speeds) / max(1, len(valid_speeds))
        std_dev = math.sqrt(variance)

        return round(smoothed, 1), round(std_dev, 1)

class CorridorImpedanceEngine:
    """Evaluates time-of-day, bottleneck proximity, and scenario factors on corridor travel time."""
    
    @staticmethod
    def get_time_of_day_multiplier(dt_utc: datetime) -> tuple:
        """Returns (multiplier, period_label) in Indian Standard Time."""
        dt_ist = dt_utc + IST_OFFSET
        hour = dt_ist.hour + (dt_ist.minute / 60.0)

        # Morning rush: 07:45 - 10:45 IST
        if 7.75 <= hour <= 10.75:
            # Peak intensity at 09:00
            intensity = 1.0 - (abs(hour - 9.0) / 1.75)
            multiplier = 1.25 + (0.30 * max(0.0, intensity))
            return round(multiplier, 2), "Morning Commute Rush (IST)"
        
        # Evening peak: 17:15 - 20:45 IST
        elif 17.25 <= hour <= 20.75:
            # Peak intensity at 18:45
            intensity = 1.0 - (abs(hour - 18.75) / 1.75)
            multiplier = 1.30 + (0.35 * max(0.0, intensity))
            return round(multiplier, 2), "Evening Highway Congestion (IST)"

        # Midday moderate: 11:30 - 16:30 IST
        elif 11.5 <= hour <= 16.5:
            return 1.10, "Mid-Day Regular Traffic"

        # Late night free-flow: 22:00 - 06:00 IST
        elif hour >= 22.0 or hour <= 6.0:
            return 0.95, "Night Free-Flow Corridor"

        return 1.05, "Standard Traffic Flow"

    @staticmethod
    def evaluate_bottlenecks(bus_lat: float, bus_lng: float, heading: float, corridor_name: str = "") -> tuple:
        """
        Detects if bus is currently near or approaching a known bottleneck corridor node.
        Returns (node_found, impedance_boost, delay_cause).
        """
        closest_node = None
        min_dist = float("inf")

        for node in CORRIDOR_BOTTLENECK_NODES:
            dist = haversine_km(bus_lat, bus_lng, node["lat"], node["lng"])
            if dist < node["radius_km"] and dist < min_dist:
                min_dist = dist
                closest_node = node

        if closest_node:
            proximity_factor = 1.0 - (min_dist / closest_node["radius_km"])
            extra_impedance = (closest_node["peak_impedance"] - 1.0) * proximity_factor
            delay_cause = f"Queuing near {closest_node['name']} ({round(min_dist, 1)}km away)"
            return closest_node, round(1.0 + extra_impedance, 2), delay_cause

        return None, 1.0, ""

def run_predictive_pipeline(payload: dict) -> dict:
    """
    Main pipeline entry point.
    Receives telemetry, route, and stop definitions, and executes the mathematical forecast.
    """
    bus_id = payload.get("bus_id", "bus-unknown")
    lat = float(payload.get("latitude", 13.0))
    lng = float(payload.get("longitude", 77.5))
    instant_speed = float(payload.get("speed", 45.0))
    heading = float(payload.get("heading", 0.0))
    recent_speeds = payload.get("recent_speeds", [])
    route = payload.get("route", {})
    stops = payload.get("stops", [])
    scenario = payload.get("scenario", {}) # Optional simulation overrides (weather, incident)

    # Parse timestamp
    raw_timestamp = payload.get("timestamp")
    if raw_timestamp:
        try:
            dt = datetime.fromisoformat(raw_timestamp.replace("Z", "+00:00"))
        except Exception:
            dt = datetime.now(timezone.utc)
    else:
        dt = datetime.now(timezone.utc)

    # 1. EWMA Velocity Smoothing
    velocity_filter = EWMAVelocityFilter(alpha=0.35)
    ewma_speed, speed_volatility = velocity_filter.smooth(instant_speed, recent_speeds)

    # 2. Corridor Impedance & Time-of-Day Factors
    time_factor, period_label = CorridorImpedanceEngine.get_time_of_day_multiplier(dt)
    corridor_name = route.get("route_name", "")
    bottleneck_node, bottleneck_factor, bottleneck_cause = CorridorImpedanceEngine.evaluate_bottlenecks(
        lat, lng, heading, corridor_name
    )

    # Scenario multipliers (e.g. from dispatcher simulation console)
    scenario_friction = float(scenario.get("friction_multiplier", 1.0))
    scenario_incident = scenario.get("incident_description", "")

    # Combined composite impedance factor
    net_impedance = round(time_factor * bottleneck_factor * scenario_friction, 2)

    # Free flow nominal corridor speed
    route_dist_km = float(route.get("distance_km", 100.0))
    nominal_speed = 62.0 if route_dist_km > 100 else 46.0

    # Operational calibrated speed
    calibrated_speed = max(18.0, min(85.0, ewma_speed / net_impedance))

    # Road tortuosity / curvature ratio (Karnataka highways ~1.18x)
    road_ratio = 1.16 if route_dist_km > 100 else 1.20

    # 3. Match Route & Upcoming Stops
    if not stops:
        # Default single destination estimate
        direct_dist = max(1.0, float(payload.get("distance_to_next_km", 15.0)))
        actual_dist = direct_dist * road_ratio
        expected_minutes = round((actual_dist / calibrated_speed) * 60.0 + 1.5)
        p10 = max(1, round(expected_minutes * 0.88))
        p50 = expected_minutes
        p90 = max(p50 + 1, round(expected_minutes * 1.22))
        
        delay_min = max(0, p50 - round((actual_dist / nominal_speed) * 60.0))
        delay_cat = "ON_TIME" if delay_min <= 2 else ("MINOR_DELAY" if delay_min <= 7 else "HEAVY_CONGESTION")

        return {
            "bus_id": bus_id,
            "pipeline_version": "2.4-python-native",
            "predicted_eta_minutes": p50,
            "delay_minutes": delay_min,
            "delay_category": delay_cat,
            "confidence_score": 0.82,
            "interval": {"p10_minutes": p10, "p50_minutes": p50, "p90_minutes": p90},
            "primary_cause": bottleneck_cause or f"{period_label} across corridor",
            "corridor_metrics": {
                "ewma_speed_kmh": ewma_speed,
                "calibrated_speed_kmh": round(calibrated_speed, 1),
                "impedance_factor": net_impedance,
                "bottleneck_detected": bool(bottleneck_node)
            },
            "segment_breakdown": []
        }

    # Sort stops by sequence
    sorted_stops = sorted(stops, key=lambda s: int(s.get("stop_sequence", 0)))
    
    # Calculate distance to all stops and project active segment
    stops_with_dist = []
    for s in sorted_stops:
        s_lat = float(s.get("latitude") or s.get("stop", {}).get("latitude", 0))
        s_lng = float(s.get("longitude") or s.get("stop", {}).get("longitude", 0))
        d_direct = haversine_km(lat, lng, s_lat, s_lng)
        stops_with_dist.append({
            "stop": s,
            "lat": s_lat,
            "lng": s_lng,
            "direct_km": d_direct
        })

    # Segment projection: find segment (i -> i+1) closest to the bus
    active_idx = 0
    min_detour = float("inf")
    for i in range(len(stops_with_dist) - 1):
        s1 = stops_with_dist[i]
        s2 = stops_with_dist[i + 1]
        leg_len = haversine_km(s1["lat"], s1["lng"], s2["lat"], s2["lng"])
        detour = (s1["direct_km"] + s2["direct_km"]) - leg_len
        if detour < min_detour:
            min_detour = detour
            active_idx = i

    # Next stop index
    next_stop_idx = min(active_idx + 1, len(stops_with_dist) - 1)
    if stops_with_dist[next_stop_idx]["direct_km"] < 0.18 and next_stop_idx < len(stops_with_dist) - 1:
        next_stop_idx += 1

    # 4. Multi-Stop Probabilistic Forecast
    segment_breakdown = []
    cum_dist_km = 0.0
    cum_minutes = 0.0
    nominal_cum_minutes = 0.0

    target_stop = stops_with_dist[next_stop_idx]
    first_leg_dist = max(0.2, target_stop["direct_km"] * road_ratio)
    cum_dist_km = first_leg_dist

    # First upcoming stop
    first_leg_travel_min = (first_leg_dist / calibrated_speed) * 60.0
    first_leg_dwell = 1.0 if first_leg_dist > 3 else 0.5
    cum_minutes = max(1.0, first_leg_travel_min + first_leg_dwell)
    nominal_cum_minutes = (first_leg_dist / nominal_speed) * 60.0 + 0.8

    stop_data = target_stop["stop"]
    stop_name = stop_data.get("name") or stop_data.get("stop", {}).get("name", "Upcoming Stop")
    stop_name_kn = stop_data.get("name_kannada") or stop_data.get("stop", {}).get("name_kannada", "")
    stop_id = stop_data.get("id") or stop_data.get("stop_id") or stop_data.get("stop", {}).get("id", "")

    arr_ist = (dt + IST_OFFSET) + timedelta(minutes=cum_minutes)
    arr_time_str = arr_ist.strftime("%I:%M %p")

    p10_stop = max(1, round(cum_minutes * 0.90))
    p50_stop = round(cum_minutes)
    p90_stop = max(p50_stop + 1, round(cum_minutes * 1.18 + (net_impedance - 1.0) * 3))

    segment_breakdown.append({
        "stop_id": stop_id,
        "stop_name": stop_name,
        "stop_name_kannada": stop_name_kn,
        "stop_sequence": int(stop_data.get("stop_sequence", next_stop_idx + 1)),
        "distance_km": round(cum_dist_km, 1),
        "eta_minutes": p50_stop,
        "p10_minutes": p10_stop,
        "p90_minutes": p90_stop,
        "estimated_arrival_time": arr_time_str
    })

    # Subsequent downstream stops
    for j in range(next_stop_idx + 1, len(stops_with_dist)):
        prev_s = stops_with_dist[j - 1]
        cur_s = stops_with_dist[j]
        leg_km = haversine_km(prev_s["lat"], prev_s["lng"], cur_s["lat"], cur_s["lng"]) * road_ratio
        cum_dist_km += leg_km
        
        # Stop dwell allowance: 1.8 min standard dwell per waypoint
        leg_min = (leg_km / calibrated_speed) * 60.0 + 1.8
        cum_minutes += leg_min
        nominal_cum_minutes += (leg_km / nominal_speed) * 60.0 + 1.5

        cur_stop_data = cur_s["stop"]
        c_name = cur_stop_data.get("name") or cur_stop_data.get("stop", {}).get("name", "")
        c_name_kn = cur_stop_data.get("name_kannada") or cur_stop_data.get("stop", {}).get("name_kannada", "")
        c_id = cur_stop_data.get("id") or cur_stop_data.get("stop_id") or cur_stop_data.get("stop", {}).get("id", "")

        c_arr_ist = (dt + IST_OFFSET) + timedelta(minutes=cum_minutes)
        c_arr_str = c_arr_ist.strftime("%I:%M %p")

        c_p10 = max(1, round(cum_minutes * 0.88))
        c_p50 = round(cum_minutes)
        c_p90 = max(c_p50 + 2, round(cum_minutes * 1.20 + (net_impedance - 1.0) * 4))

        segment_breakdown.append({
            "stop_id": c_id,
            "stop_name": c_name,
            "stop_name_kannada": c_name_kn,
            "stop_sequence": int(cur_stop_data.get("stop_sequence", j + 1)),
            "distance_km": round(cum_dist_km, 1),
            "eta_minutes": c_p50,
            "p10_minutes": c_p10,
            "p90_minutes": c_p90,
            "estimated_arrival_time": c_arr_str
        })

    # Summary metrics for immediate stop
    next_stop_prediction = segment_breakdown[0]
    next_p50 = next_stop_prediction["eta_minutes"]
    next_p10 = next_stop_prediction["p10_minutes"]
    next_p90 = next_stop_prediction["p90_minutes"]

    delay_minutes = max(0, round(cum_minutes - nominal_cum_minutes))
    
    if delay_minutes <= 2:
        delay_category = "ON_TIME"
    elif delay_minutes <= 6:
        delay_category = "MINOR_DELAY"
    elif delay_minutes <= 14:
        delay_category = "MODERATE_DELAY"
    else:
        delay_category = "HEAVY_CONGESTION"

    # Human-readable explainable cause
    causes = []
    if scenario_incident:
        causes.append(f"Simulated Condition: {scenario_incident}")
    if bottleneck_node:
        causes.append(bottleneck_cause)
    if net_impedance >= 1.25 and not bottleneck_node:
        causes.append(f"{period_label} (corridor factor {net_impedance}x)")
    if ewma_speed < 30 and instant_speed < 25:
        causes.append(f"Traffic crawl observed (smoothed speed {ewma_speed} km/h)")
    
    primary_cause = "; ".join(causes) if causes else f"Normal highway progress ({ewma_speed} km/h)"

    # Confidence score (0.0 to 1.0) based on volatility and sample size
    volatility_penalty = min(0.25, speed_volatility / 40.0)
    confidence_score = round(max(0.65, min(0.96, 0.94 - volatility_penalty)), 2)

    return {
        "bus_id": bus_id,
        "pipeline_version": "2.4-python-native",
        "predicted_eta_minutes": next_p50,
        "next_stop_name": next_stop_prediction["stop_name"],
        "next_stop_id": next_stop_prediction["stop_id"],
        "distance_to_next_km": next_stop_prediction["distance_km"],
        "delay_minutes": delay_minutes,
        "delay_category": delay_category,
        "confidence_score": confidence_score,
        "interval": {
            "p10_minutes": next_p10,
            "p50_minutes": next_p50,
            "p90_minutes": next_p90
        },
        "primary_cause": primary_cause,
        "corridor_metrics": {
            "ewma_speed_kmh": ewma_speed,
            "calibrated_speed_kmh": round(calibrated_speed, 1),
            "speed_volatility": speed_volatility,
            "impedance_factor": net_impedance,
            "time_of_day_period": period_label,
            "bottleneck_node": bottleneck_node["name"] if bottleneck_node else None
        },
        "segment_breakdown": segment_breakdown
    }

def main():
    """CLI execution handler supporting stdin or --json arg."""
    try:
        input_data = ""
        if len(sys.argv) > 1 and sys.argv[1] == "--json":
            if len(sys.argv) > 2:
                input_data = sys.argv[2]
            else:
                input_data = "{}"
        else:
            # Read from stdin
            input_data = sys.stdin.read().strip()

        if not input_data:
            input_data = "{}"

        payload = json.loads(input_data)
        result = run_predictive_pipeline(payload)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)
    except Exception as e:
        error_res = {
            "error": str(e),
            "pipeline_version": "2.4-python-native",
            "fallback": True
        }
        print(json.dumps(error_res), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
