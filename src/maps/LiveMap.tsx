import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { LiveBusTelemetry, Stop } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Layers,
  Compass,
  Bus as BusIcon,
  MapPin,
  RefreshCw,
  Eye,
  EyeOff,
  Crosshair,
  Box,
  Radio,
  Navigation2,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface LiveMapProps {
  buses?: LiveBusTelemetry[];
  selectedBusId?: string | null;
  onSelectBus?: (bus: LiveBusTelemetry) => void;
  stops?: Stop[];
  onSelectStop?: (stop: Stop) => void;
  routeGeometry?: [number, number][];
  userLocation?: { latitude: number; longitude: number } | null;
  onUserLocationDetected?: (coords: { latitude: number; longitude: number; accuracy: number }) => void;
  className?: string;
  zoom?: number;
  center?: [number, number];
  showControls?: boolean;
}

type MapTileStyle = 'street' | 'dark' | 'satellite' | 'osm' | 'topo' | 'voyager';

// Haversine calculation for exact real-world distance in km
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  buses = [],
  selectedBusId,
  onSelectBus,
  stops = [],
  onSelectStop,
  routeGeometry,
  userLocation,
  onUserLocationDetected,
  className = 'w-full h-full min-h-[450px]',
  zoom = 10,
  center = [13.1500, 77.3000],
  showControls = true
}) => {
  const { t, language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const busMarkersRef = useRef<{ [busId: string]: L.Marker }>({});
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);

  const [tileStyle, setTileStyle] = useState<MapTileStyle>('street');
  const [showStopsLayer, setShowStopsLayer] = useState(true);
  const [showBusesLayer, setShowBusesLayer] = useState(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // 3D Perspective Aerial Tilt State
  const [is3DMode, setIs3DMode] = useState<boolean>(false);

  // Live User GPS Radar State
  const [myCoords, setMyCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(
    userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude, accuracy: 15 } : null
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);
  const [closestBusInfo, setClosestBusInfo] = useState<{ bus: LiveBusTelemetry; distanceKm: number } | null>(null);
  const [closestStopInfo, setClosestStopInfo] = useState<{ stop: Stop; distanceKm: number } | null>(null);

  // Sync prop userLocation
  useEffect(() => {
    if (userLocation && !isNaN(userLocation.latitude) && !isNaN(userLocation.longitude)) {
      setMyCoords(prev => ({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: prev?.accuracy || 15
      }));
    }
  }, [userLocation]);

  // Compute Nearest Bus and Stop whenever user coordinates or buses change
  useEffect(() => {
    if (!myCoords) {
      setClosestBusInfo(null);
      setClosestStopInfo(null);
      return;
    }

    // Find closest bus
    let minBusDist = Infinity;
    let nearestBus: LiveBusTelemetry | null = null;
    buses.forEach(b => {
      if (!isNaN(b.latitude) && !isNaN(b.longitude)) {
        const d = calculateHaversineKm(myCoords.latitude, myCoords.longitude, b.latitude, b.longitude);
        if (d < minBusDist) {
          minBusDist = d;
          nearestBus = b;
        }
      }
    });

    if (nearestBus) {
      setClosestBusInfo({ bus: nearestBus, distanceKm: minBusDist });
    } else {
      setClosestBusInfo(null);
    }

    // Find closest stop
    let minStopDist = Infinity;
    let nearestStop: Stop | null = null;
    stops.forEach(s => {
      if (!isNaN(s.latitude) && !isNaN(s.longitude)) {
        const d = calculateHaversineKm(myCoords.latitude, myCoords.longitude, s.latitude, s.longitude);
        if (d < minStopDist) {
          minStopDist = d;
          nearestStop = s;
        }
      }
    });

    if (nearestStop) {
      setClosestStopInfo({ stop: nearestStop, distanceKm: minStopDist });
    } else {
      setClosestStopInfo(null);
    }
  }, [myCoords, buses, stops]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialCenter: L.LatLngTuple = [Number(center[0]) || 13.15, Number(center[1]) || 77.30];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(initialCenter, zoom);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = createTileLayer(tileStyle).addTo(map);
    tileLayerRef.current = tileLayer;

    L.control.attribution({ position: 'bottomright' })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; KSRTC SmartTrack')
      .addTo(map);

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Tile layer factory with 100% free, reliable, no-API-key tile providers
  function createTileLayer(style: MapTileStyle): L.TileLayer {
    switch (style) {
      case 'dark':
        return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          maxNativeZoom: 16,
          attribution: '&copy; ESRI Canvas &copy; KSRTC SmartTrack'
        });
      case 'satellite':
        return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          maxNativeZoom: 18,
          attribution: '&copy; ESRI World Imagery &copy; Earthstar Geographics'
        });
      case 'osm':
        return L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; OpenStreetMap contributors &copy; HOT'
        });
      case 'topo':
        return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          maxNativeZoom: 18,
          attribution: '&copy; ESRI World Topo &copy; KSRTC'
        });
      case 'street':
      case 'voyager':
      default:
        return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          maxNativeZoom: 18,
          attribution: '&copy; ESRI World Street &copy; OpenStreetMap'
        });
    }
  }

  const changeTileStyle = (style: MapTileStyle) => {
    setTileStyle(style);
    setIsLayerMenuOpen(false);
    if (tileLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = createTileLayer(style).addTo(mapInstanceRef.current);
      tileLayerRef.current = newLayer;
      mapInstanceRef.current.invalidateSize();
    }
  };

  // 3. User Geolocation Radar Trigger
  const handleLocateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Geolocation is not supported on this browser.');
      setTimeout(() => setGpsStatusMsg(null), 4000);
      return;
    }

    setIsLocating(true);
    setGpsStatusMsg('Acquiring high-precision GPS satellite fix...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setMyCoords({ latitude, longitude, accuracy });
        setGpsStatusMsg(`GPS Locked: Accuracy ±${Math.round(accuracy)}m`);
        setTimeout(() => setGpsStatusMsg(null), 4000);

        if (onUserLocationDetected) {
          onUserLocationDetected({ latitude, longitude, accuracy });
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 14, {
            animate: true,
            duration: 1.2
          });
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Could not acquire GPS coordinates.';
        if (err.code === 1) msg = 'Location permission denied. Enable location access in your browser.';
        else if (err.code === 2) msg = 'Location signal unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setGpsStatusMsg(msg);
        setTimeout(() => setGpsStatusMsg(null), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }, [onUserLocationDetected]);

  // Auto-locate once on initial mount if no userLocation passed
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setMyCoords({ latitude, longitude, accuracy });
          if (onUserLocationDetected) {
            onUserLocationDetected({ latitude, longitude, accuracy });
          }
        },
        () => {
          // silently ignore initial background lookup
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  // 4. Render User Geolocation marker & accuracy circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (userAccuracyCircleRef.current) {
      map.removeLayer(userAccuracyCircleRef.current);
      userAccuracyCircleRef.current = null;
    }

    if (myCoords && !isNaN(myCoords.latitude) && !isNaN(myCoords.longitude)) {
      // 3D Holographic Pulse Beacon HTML
      const userHtml = `
        <div class="relative flex items-center justify-center pointer-events-auto cursor-pointer" style="transform: translate3d(0,0,0);">
          <div class="absolute w-12 h-12 rounded-full bg-cyan-500/20 animate-ping"></div>
          <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 border-2 border-white shadow-[0_0_20px_rgba(0,240,255,0.8)] flex items-center justify-center">
            <div class="w-2.5 h-2.5 rounded-full bg-white shadow-sm"></div>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#0A0D14]/90 text-cyan-300 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-cyan-500/40 shadow-lg whitespace-nowrap">
            YOU (±${Math.round(myCoords.accuracy || 10)}m)
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        className: 'user-loc-beacon-container',
        html: userHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      userMarkerRef.current = L.marker([myCoords.latitude, myCoords.longitude], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 font-sans text-slate-900">
            <div class="text-[10px] uppercase font-mono font-bold text-cyan-700 tracking-wider">Your Live GPS Satellite Fix</div>
            <div class="font-extrabold text-sm text-slate-900 mt-0.5">Current Passenger Location</div>
            <div class="text-xs text-slate-600 font-mono mt-1">Lat: ${myCoords.latitude.toFixed(5)}, Lng: ${myCoords.longitude.toFixed(5)}</div>
            <div class="text-[11px] text-emerald-600 font-semibold mt-1">Accuracy: ±${Math.round(myCoords.accuracy)} meters</div>
          </div>
        `);

      // Draw subtle accuracy circle around user
      if (myCoords.accuracy && myCoords.accuracy < 500) {
        userAccuracyCircleRef.current = L.circle([myCoords.latitude, myCoords.longitude], {
          radius: myCoords.accuracy,
          color: '#00F0FF',
          weight: 1,
          opacity: 0.5,
          fillColor: '#00F0FF',
          fillOpacity: 0.08
        }).addTo(map);
      }
    }
  }, [myCoords]);

  // 5. Render Route Geometry Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (routeGeometry && routeGeometry.length > 1) {
      const polyline = L.polyline(routeGeometry, {
        color: '#00F0FF',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: undefined
      }).addTo(map);

      polylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 13 });
    }
  }, [routeGeometry]);

  // 6. Render Stop Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    stopMarkersRef.current.forEach(m => map.removeLayer(m));
    stopMarkersRef.current = [];

    if (!showStopsLayer || stops.length === 0) return;

    stops.forEach((stop, idx) => {
      if (!stop || isNaN(stop.latitude) || isNaN(stop.longitude)) return;

      const isFirst = idx === 0;
      const isLast = idx === stops.length - 1;

      let badgeBg = 'bg-[#1E2638] text-cyan-400 border-cyan-500/40';
      let badgeLabel = String(idx + 1);
      let roleLabel = t('map.intermediate_stop', 'Bus Stop');

      if (isFirst) {
        badgeBg = 'bg-emerald-600 text-white border-white';
        badgeLabel = '1';
        roleLabel = t('map.origin_terminal', 'Origin Terminal');
      } else if (isLast) {
        badgeBg = 'bg-rose-600 text-white border-white';
        badgeLabel = String(stops.length);
        roleLabel = t('map.dest_terminal', 'Destination Terminal');
      }

      const displayName = (language === 'kn' && stop.name_kannada) ? stop.name_kannada : stop.name;
      const subName = (language === 'kn' && stop.name_kannada) ? stop.name : (stop.name_kannada || '');

      const stopHtml = `
        <div class="flex flex-col items-center group cursor-pointer" style="transform: translate3d(0,0,0);">
          <div class="w-6 h-6 rounded-full ${badgeBg} border-2 shadow-lg flex items-center justify-center text-[10px] font-extrabold transition-transform group-hover:scale-125">
            ${badgeLabel}
          </div>
          <div class="bg-[#0A0D14]/95 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg border border-slate-700 mt-1 whitespace-nowrap hidden group-hover:block transition-all">
            ${displayName} (${stop.stop_code})
          </div>
        </div>
      `;

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker-wrapper',
        html: stopHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(map);

      const popupHtml = `
        <div class="p-2 min-w-[220px] text-slate-900 font-sans">
          <div class="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
            <span class="text-[10px] font-extrabold ${isFirst ? 'text-emerald-700' : (isLast ? 'text-rose-700' : 'text-cyan-700')} uppercase tracking-wider">
              ${roleLabel}
            </span>
            <span class="text-[10px] font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold border border-slate-300">
              #${stop.stop_code}
            </span>
          </div>
          <div class="font-extrabold text-sm text-slate-900 leading-tight mb-0.5">${displayName}</div>
          ${subName ? `<div class="text-xs text-slate-600 mb-1.5 font-medium">${subName}</div>` : ''}
          <div class="text-[11px] text-slate-500 mb-2">Zone: ${stop.zone || 'Karnataka'}</div>
          <a href="/stops/${stop.stop_code}" class="block w-full text-center bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow transition-colors">
            ${t('routes.view_stop_qr', 'View Live Schedule & QR')}
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);

      if (onSelectStop) {
        marker.on('click', () => onSelectStop(stop));
      }

      stopMarkersRef.current.push(marker);
    });
  }, [stops, showStopsLayer, language, onSelectStop, t]);

  // 7. Render and Animate 3D Live Bus Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!showBusesLayer) {
      Object.keys(busMarkersRef.current).forEach(busId => {
        map.removeLayer(busMarkersRef.current[busId]);
        delete busMarkersRef.current[busId];
      });
      return;
    }

    const currentBusIds = new Set(buses.map(b => b.bus_id));

    // Remove inactive markers
    Object.keys(busMarkersRef.current).forEach(busId => {
      if (!currentBusIds.has(busId)) {
        map.removeLayer(busMarkersRef.current[busId]);
        delete busMarkersRef.current[busId];
      }
    });

    buses.forEach(bus => {
      if (!bus || isNaN(bus.latitude) || isNaN(bus.longitude)) return;

      const isSelected = bus.bus_id === selectedBusId;
      const statusColor = bus.status === 'LIVE' ? '#00F0FF' : (bus.status === 'STALE' ? '#F59E0B' : '#64748B');

      // 3D Isometric Bus Pin with Directional Heading Arrow & Glow
      const markerHtml = `
        <div class="custom-bus-marker relative group cursor-pointer ${isSelected ? 'scale-125 z-50' : 'z-20'}">
          ${bus.status === 'LIVE' ? `<div class="pulse-ring" style="color: ${statusColor}"></div>` : ''}
          <div class="custom-bus-pin" style="background: linear-gradient(135deg, ${statusColor} 0%, #0369A1 100%);">
            <svg class="w-5 h-5 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
            </svg>
            ${bus.heading ? `
              <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-cyan-300" style="transform: rotate(${bus.heading}deg);"></div>
            ` : ''}
          </div>
          <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0A0D14] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.8)] whitespace-nowrap border border-cyan-500/30">
            ${bus.route_number || 'KSRTC'} • ${bus.speed || 0} km/h
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'bus-marker-container',
        html: markerHtml,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      if (busMarkersRef.current[bus.bus_id]) {
        const marker = busMarkersRef.current[bus.bus_id];
        marker.setLatLng([bus.latitude, bus.longitude]);
        marker.setIcon(icon);
      } else {
        const marker = L.marker([bus.latitude, bus.longitude], { icon }).addTo(map);

        marker.on('click', () => {
          if (onSelectBus) onSelectBus(bus);
        });

        busMarkersRef.current[bus.bus_id] = marker;
      }
    });

    if (selectedBusId) {
      const target = buses.find(b => b.bus_id === selectedBusId);
      if (target && !isNaN(target.latitude) && !isNaN(target.longitude)) {
        map.panTo([target.latitude, target.longitude], { animate: true, duration: 0.8 });
      }
    }
  }, [buses, selectedBusId, showBusesLayer, onSelectBus]);

  // Fit corridor helper
  const fitRouteBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineRef.current) {
      map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
    } else if (buses.length > 0) {
      const validPoints = buses
        .filter(b => !isNaN(b.latitude) && !isNaN(b.longitude))
        .map(b => [b.latitude, b.longitude] as [number, number]);
      if (validPoints.length > 0) {
        map.fitBounds(L.latLngBounds(validPoints), { padding: [50, 50], maxZoom: 14 });
      }
    }
  };

  return (
    <div
      id="ksrtc-live-map-wrapper"
      className={`relative w-full h-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-[#1E2638] bg-[#0A0D14] ${
        is3DMode ? 'map-tilt-3d' : 'map-tilt-2d'
      }`}
    >
      <div ref={mapContainerRef} className={className} />

      {/* 3D Flight Horizon Glow Effect when 3D mode is active */}
      {is3DMode && (
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-cyan-500/20 via-blue-600/10 to-transparent pointer-events-none z-[300]" />
      )}

      {/* GPS Status Toast Notification */}
      {gpsStatusMsg && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-[#0A0D14]/95 text-cyan-300 border border-cyan-500/50 px-4 py-2 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>{gpsStatusMsg}</span>
        </div>
      )}

      {/* Floating 3D HUD: Nearest Bus & Stop Radar Badge */}
      {myCoords && (closestBusInfo || closestStopInfo) && (
        <div className="absolute bottom-4 left-4 z-[400] bg-[#0A0D14]/90 backdrop-blur-md border border-[#1E2638] text-white p-3 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.8)] text-xs space-y-1.5 max-w-xs border-l-4 border-l-cyan-400 animate-in fade-in">
          <div className="flex items-center justify-between font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Live GPS Satellite Radar
            </span>
            <span className="text-slate-400">±{Math.round(myCoords.accuracy)}m</span>
          </div>

          {closestBusInfo && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-slate-300 truncate">
                Nearest: <strong className="text-white">{closestBusInfo.bus.registration_number}</strong>
              </span>
              <span className="font-mono font-bold text-cyan-300 shrink-0">
                {closestBusInfo.distanceKm < 1
                  ? `${Math.round(closestBusInfo.distanceKm * 1000)} m`
                  : `${closestBusInfo.distanceKm.toFixed(1)} km`}
              </span>
            </div>
          )}

          {closestStopInfo && (
            <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400 pt-0.5 border-t border-slate-800">
              <span className="truncate">
                Stop: <strong className="text-slate-300">{closestStopInfo.stop.name}</strong>
              </span>
              <span className="font-mono text-emerald-400 shrink-0">
                {closestStopInfo.distanceKm < 1
                  ? `${Math.round(closestStopInfo.distanceKm * 1000)} m`
                  : `${closestStopInfo.distanceKm.toFixed(1)} km`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Floating 3D Map Controls Toolbar */}
      {showControls && (
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          {/* 1-Click "Locate Me / GPS Radar" Button */}
          <button
            id="map-locate-me-btn"
            onClick={handleLocateUser}
            disabled={isLocating}
            title="Lock Current GPS Satellite Coordinates & Radar"
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl shadow-xl border backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
              myCoords
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                : 'bg-[#161C2C]/90 hover:bg-[#1E2638] text-white border-[#2A364F]'
            }`}
          >
            <Crosshair className={`w-4 h-4 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isLocating ? 'Locking GPS...' : myCoords ? 'GPS Locked' : 'Locate Me'}
            </span>
          </button>

          {/* 3D Perspective Aerial Tilt Toggle Button */}
          <button
            id="map-3d-toggle-btn"
            onClick={() => setIs3DMode(!is3DMode)}
            title={is3DMode ? 'Switch to 2D Plan View' : 'Switch to 3D Aerial Perspective Tilt View'}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl shadow-xl border backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
              is3DMode
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.4)]'
                : 'bg-[#161C2C]/90 hover:bg-[#1E2638] text-white border-[#2A364F]'
            }`}
          >
            <Box className={`w-4 h-4 ${is3DMode ? 'text-white' : 'text-cyan-400'}`} />
            <span className="hidden sm:inline">{is3DMode ? '3D Active' : '3D View'}</span>
          </button>

          {/* Fit Corridor Button */}
          <button
            id="map-fit-corridor-btn"
            onClick={fitRouteBounds}
            title={t('map.fit_route', 'Fit Route Corridor')}
            className="flex items-center gap-1.5 bg-[#161C2C]/90 hover:bg-[#1E2638] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl border border-[#2A364F] backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{t('map.fit_route', 'Fit Corridor')}</span>
          </button>

          {/* Layer Controls Switcher */}
          <div className="relative">
            <button
              id="map-layers-toggle-btn"
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              title="Map View & Layers"
              className="w-full flex items-center justify-between gap-1.5 bg-[#161C2C]/90 hover:bg-[#1E2638] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl border border-[#2A364F] backdrop-blur-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline capitalize">{tileStyle}</span>
              </div>
            </button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#10141F] border border-[#2A364F] rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-2">Map Style</div>
                <div className="space-y-1">
                  {[
                    { id: 'street', label: 'Street View' },
                    { id: 'dark', label: 'Dark Mode (Night Radar)' },
                    { id: 'satellite', label: 'Satellite (ESRI)' },
                    { id: 'osm', label: 'OpenStreetMap (HOT)' },
                    { id: 'topo', label: 'Topographic (Terrain)' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => changeTileStyle(item.id as MapTileStyle)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium flex items-center justify-between cursor-pointer ${
                        (tileStyle === item.id || (tileStyle === 'voyager' && item.id === 'street')) ? 'bg-cyan-600 text-white font-bold' : 'hover:bg-[#161C2C] text-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      {(tileStyle === item.id || (tileStyle === 'voyager' && item.id === 'street')) && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </button>
                  ))}
                </div>

                <div className="border-t border-[#1E2638] my-2 pt-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-2">Layers</div>
                  <button
                    onClick={() => setShowStopsLayer(!showStopsLayer)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#161C2C] text-slate-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('map.toggle_stops', 'Bus Stops')}</span>
                    </div>
                    {showStopsLayer ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                  <button
                    onClick={() => setShowBusesLayer(!showBusesLayer)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#161C2C] text-slate-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <BusIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('map.toggle_buses', 'Live Buses')}</span>
                    </div>
                    {showBusesLayer ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
