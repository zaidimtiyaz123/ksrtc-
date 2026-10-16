import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Route, Stop } from '../types';
import { Maximize2, Minimize2, Navigation, Compass, Layers, MapPin, Globe } from 'lucide-react';
import { GoogleMapView } from './GoogleMapView';

interface DriverCockpitMapProps {
  currentLat: number;
  currentLng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  assignedRoute: Route | null;
  originLat: number;
  originLng: number;
  originName: string;
  nextStopName?: string;
  geofenceRadiusMeters?: number;
  className?: string;
}

export const DriverCockpitMap: React.FC<DriverCockpitMapProps> = ({
  currentLat,
  currentLng,
  heading = 90,
  speed = 0,
  accuracy = 8,
  assignedRoute,
  originLat,
  originLng,
  originName,
  nextStopName,
  geofenceRadiusMeters = 100,
  className = 'w-full h-80 sm:h-96'
}) => {
  const [mapEngine, setMapEngine] = useState<'google' | 'radar'>(() => {
    const saved = localStorage.getItem('ksrtc_cockpit_engine');
    if (saved === 'google' || saved === 'radar') return saved;
    // Default to 'radar' which provides 100% reliable zero-key map rendering out of the box
    return 'radar';
  });

  const handleToggleEngine = (engine: 'google' | 'radar') => {
    setMapEngine(engine);
    localStorage.setItem('ksrtc_cockpit_engine', engine);
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'dark' | 'voyager' | 'satellite' | 'osm'>('dark');

  const getTileUrl = (style: 'dark' | 'voyager' | 'satellite' | 'osm') => {
    switch (style) {
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'osm':
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'voyager':
      default:
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }
  };

  // Initialize Leaflet Map only if in radar mode
  useEffect(() => {
    if (mapEngine !== 'radar') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat || 13.3409, currentLng || 77.1010],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    const tileUrl = getTileUrl(mapStyle);
    L.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapEngine]);

  // Update Tile Style in radar mode
  useEffect(() => {
    if (!mapInstanceRef.current || mapEngine !== 'radar') return;
    const map = mapInstanceRef.current;
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = getTileUrl(mapStyle);
    L.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
  }, [mapStyle, mapEngine]);

  // Update Route Polyline and Stops in radar mode
  useEffect(() => {
    if (!mapInstanceRef.current || mapEngine !== 'radar') return;
    const map = mapInstanceRef.current;

    // Clear previous polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Clear previous stop markers
    stopMarkersRef.current.forEach(m => map.removeLayer(m));
    stopMarkersRef.current = [];

    // Draw 100m Depot Geofence Circle
    if (geofenceCircleRef.current) {
      map.removeLayer(geofenceCircleRef.current);
    }
    geofenceCircleRef.current = L.circle([originLat, originLng], {
      radius: geofenceRadiusMeters,
      color: '#10B981',
      weight: 2,
      dashArray: '5, 5',
      fillColor: '#10B981',
      fillOpacity: 0.15
    }).addTo(map);
    geofenceCircleRef.current.bindTooltip(`Depot Geofence: ${originName} (100m)`, {
      permanent: false,
      direction: 'top',
      className: 'bg-emerald-950 text-emerald-200 border border-emerald-500 text-xs px-2 py-1 rounded'
    });

    // Draw Route Polyline
    if (assignedRoute?.route_geometry && assignedRoute.route_geometry.length > 0) {
      const latLngs: L.LatLngExpression[] = assignedRoute.route_geometry.map(([lat, lng]) => [lat, lng]);
      polylineRef.current = L.polyline(latLngs, {
        color: '#3B82F6',
        weight: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }

    // Draw Stops
    if (assignedRoute?.stops) {
      assignedRoute.stops.forEach(item => {
        const s = item.stop;
        if (!s) return;

        const isOrigin = s.latitude === originLat && s.longitude === originLng;
        const markerIcon = L.divIcon({
          className: 'custom-stop-marker',
          html: `
            <div style="
              width: ${isOrigin ? '16px' : '12px'};
              height: ${isOrigin ? '16px' : '12px'};
              border-radius: 9999px;
              background-color: ${isOrigin ? '#10B981' : '#60A5FA'};
              border: 2px solid #FFFFFF;
              box-shadow: 0 0 10px ${isOrigin ? 'rgba(16, 185, 129, 0.8)' : 'rgba(96, 165, 250, 0.6)'};
            "></div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const stopMarker = L.marker([s.latitude, s.longitude], { icon: markerIcon }).addTo(map);
        stopMarker.bindTooltip(`${s.name}${s.name_kannada ? ` (${s.name_kannada})` : ''}`, {
          permanent: false,
          direction: 'top',
          className: 'bg-slate-900 text-white border border-slate-700 text-xs px-2 py-1 rounded shadow-xl'
        });
        stopMarkersRef.current.push(stopMarker);
      });
    }
  }, [assignedRoute, originLat, originLng, originName, geofenceRadiusMeters, mapEngine]);

  // Update Live Bus Position & Heading in radar mode
  useEffect(() => {
    if (!mapInstanceRef.current || mapEngine !== 'radar') return;
    const map = mapInstanceRef.current;

    const busIconHtml = `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 12px;
        background: linear-gradient(135deg, #2563EB, #1D4ED8);
        border: 2px solid #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.6);
        transform: rotate(${heading}deg);
        transition: transform 0.3s ease;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </div>
    `;

    const busDivIcon = L.divIcon({
      className: 'driver-bus-icon',
      html: busIconHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng([currentLat, currentLng]);
      busMarkerRef.current.setIcon(busDivIcon);
    } else {
      busMarkerRef.current = L.marker([currentLat, currentLng], {
        icon: busDivIcon,
        zIndexOffset: 1000
      }).addTo(map);
    }

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([currentLat, currentLng]);
      accuracyCircleRef.current.setRadius(accuracy);
    } else {
      accuracyCircleRef.current = L.circle([currentLat, currentLng], {
        radius: accuracy,
        color: '#3B82F6',
        weight: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.15
      }).addTo(map);
    }

    // Auto-center bus in radar mode
    map.panTo([currentLat, currentLng], { animate: true, duration: 0.5 });
  }, [currentLat, currentLng, heading, accuracy, mapEngine]);

  return (
    <div className="space-y-2">
      {/* Engine Switcher Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-[#121622] border border-[#232A3B]">
            <button
              type="button"
              onClick={() => handleToggleEngine('radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mapEngine === 'radar'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Free Vector Radar (OSM)</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-400/20 text-emerald-300 font-mono">0 Key</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleEngine('google')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mapEngine === 'google'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Engine: <strong className="text-emerald-400 uppercase">{mapEngine === 'google' ? 'Google Maps JS SDK' : 'Free OpenStreetMap & CartoDB'}</strong>
        </div>
      </div>

      {mapEngine === 'google' ? (
        <GoogleMapView
          currentLat={currentLat}
          currentLng={currentLng}
          heading={heading}
          speed={speed}
          accuracy={accuracy}
          busLabel="My KSRTC Bus"
          assignedRoute={assignedRoute}
          originLat={originLat}
          originLng={originLng}
          originName={originName}
          nextStopName={nextStopName}
          geofenceRadiusMeters={geofenceRadiusMeters}
          className={className}
          onSwitchToRadar={() => handleToggleEngine('radar')}
        />
      ) : (
        <div
          id="driver-cockpit-radar-container"
          className={`relative overflow-hidden rounded-2xl border border-[#202533] bg-[#0A0D14] ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : className
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Quick HUD Overlay */}
          <div className="absolute top-3 left-3 z-[400] pointer-events-none flex flex-col gap-1.5">
            <div className="bg-[#0F1115]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#262B35] text-white flex items-center gap-2 shadow-xl pointer-events-auto">
              <Compass className="w-4 h-4 text-blue-400" />
              <div className="text-xs font-mono">
                <span className="text-slate-400">Bearing: </span>
                <strong className="text-white">{heading}°</strong>
              </div>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([currentLat, currentLng], 15);
                }
              }}
              className="w-9 h-9 rounded-xl bg-[#0F1115]/90 hover:bg-[#1E222B] text-slate-300 hover:text-white border border-[#262B35] flex items-center justify-center shadow-lg transition-all"
              title="Recenter Vehicle"
            >
              <Navigation className="w-4 h-4" />
            </button>

            {/* Tile Style Switcher */}
            <button
              type="button"
              onClick={() => {
                const styles: ('dark' | 'voyager' | 'satellite' | 'osm')[] = ['dark', 'voyager', 'satellite', 'osm'];
                const nextIdx = (styles.indexOf(mapStyle) + 1) % styles.length;
                setMapStyle(styles[nextIdx]);
              }}
              className="px-2.5 h-9 rounded-xl bg-[#0F1115]/90 hover:bg-[#1E222B] text-slate-200 hover:text-white border border-[#262B35] flex items-center gap-1 shadow-lg transition-all text-xs font-bold"
              title={`Switch Tile Layer (Current: ${mapStyle.toUpperCase()})`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="capitalize">{mapStyle}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="w-9 h-9 rounded-xl bg-[#0F1115]/90 hover:bg-[#1E222B] text-slate-300 hover:text-white border border-[#262B35] flex items-center justify-center shadow-lg transition-all"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Bottom Coordinates & Accuracy Pill */}
          <div className="absolute bottom-3 left-3 z-[400] pointer-events-none">
            <div className="bg-[#0F1115]/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#262B35] text-[10px] font-mono text-slate-300 flex items-center gap-2">
              <span>{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
              <span className="text-emerald-400">±{Math.round(accuracy)}m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
