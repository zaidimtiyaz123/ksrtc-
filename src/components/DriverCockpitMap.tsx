import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Route } from '../types';
import { Maximize2, Minimize2, Navigation, Compass, Layers, Check } from 'lucide-react';

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

type CockpitTileLayer = 'dark' | 'voyager' | 'satellite' | 'osm';

interface LayerOption {
  id: CockpitTileLayer;
  label: string;
  description: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  { id: 'dark', label: 'Dark Mode', description: 'Night transit HUD (ESRI Canvas)' },
  { id: 'voyager', label: 'Street View', description: 'Clean navigation (ESRI World Street)' },
  { id: 'satellite', label: 'Satellite', description: 'ESRI World Imagery' },
  { id: 'osm', label: 'OpenStreetMap', description: 'Humanitarian OSM transit' }
];

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeLayer, setActiveLayer] = useState<CockpitTileLayer>(() => {
    const saved = localStorage.getItem('ksrtc_driver_layer') as CockpitTileLayer;
    return (saved && ['dark', 'voyager', 'satellite', 'osm'].includes(saved)) ? saved : 'dark';
  });
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  const createTileLayer = (style: CockpitTileLayer): L.TileLayer => {
    switch (style) {
      case 'dark':
        return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          maxNativeZoom: 16,
          attribution: '&copy; ESRI Canvas &copy; KSRTC'
        });
      case 'satellite':
        return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          maxNativeZoom: 18,
          attribution: '&copy; ESRI World Imagery'
        });
      case 'osm':
        return L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; OpenStreetMap &copy; HOT'
        });
      case 'voyager':
      default:
        return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          maxNativeZoom: 18,
          attribution: '&copy; ESRI World Street &copy; KSRTC'
        });
    }
  };

  const handleSelectLayer = (layer: CockpitTileLayer) => {
    setActiveLayer(layer);
    setIsLayerMenuOpen(false);
    localStorage.setItem('ksrtc_driver_layer', layer);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [currentLat || 13.3409, currentLng || 77.1010],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    const tileLayer = createTileLayer(activeLayer).addTo(map);
    tileLayerRef.current = tileLayer;

    // Attribution
    L.control.attribution({ position: 'bottomright' })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; KSRTC')
      .addTo(map);

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Update Tile Layer when layer selection changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = createTileLayer(activeLayer).addTo(map);
    tileLayerRef.current = newTileLayer;
    map.invalidateSize();
  }, [activeLayer]);

  // Invalidate size on fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Update Route Polyline, Origin Geofence, and Stops
  useEffect(() => {
    if (!mapInstanceRef.current) return;
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
        opacity: 0.85,
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
  }, [assignedRoute, originLat, originLng, originName, geofenceRadiusMeters]);

  // Update Live Bus Position & Heading
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const busIconHtml = `
      <div style="
        width: 38px;
        height: 38px;
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </div>
    `;

    const busDivIcon = L.divIcon({
      className: 'driver-bus-icon',
      html: busIconHtml,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
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

    // Auto-center on bus
    map.panTo([currentLat, currentLng], { animate: true, duration: 0.5 });
  }, [currentLat, currentLng, heading, accuracy]);

  return (
    <div className="space-y-2">
      {/* Top Status & Layer Controls Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#121622] border border-[#232A3B] text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-white">OpenStreetMap & CartoDB Radar</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Layer: <strong className="text-emerald-400 uppercase">{activeLayer}</strong>
        </div>
      </div>

      <div
        id="driver-cockpit-radar-container"
        className={`relative overflow-hidden rounded-2xl border border-[#202533] bg-[#0A0D14] ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : className
        }`}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Quick HUD Overlay - Bearing & Speed */}
        <div className="absolute top-3 left-3 z-[400] pointer-events-none flex flex-col gap-1.5">
          <div className="bg-[#0F1115]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#262B35] text-white flex items-center gap-2 shadow-xl pointer-events-auto">
            <Compass className="w-4 h-4 text-blue-400" />
            <div className="text-xs font-mono">
              <span className="text-slate-400">Bearing: </span>
              <strong className="text-white">{heading}°</strong>
              {speed > 0 && (
                <>
                  <span className="text-slate-500 mx-1">·</span>
                  <span className="text-emerald-400 font-bold">{Math.round(speed)} km/h</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Right Controls: Recenter, Layer Switcher, Fullscreen */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
          {/* Recenter Button */}
          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([currentLat, currentLng], 15);
              }
            }}
            className="w-9 h-9 rounded-xl bg-[#0F1115]/90 hover:bg-[#1E222B] text-slate-300 hover:text-white border border-[#262B35] flex items-center justify-center shadow-lg transition-all cursor-pointer"
            title="Recenter Vehicle"
          >
            <Navigation className="w-4 h-4" />
          </button>

          {/* Layer Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLayerMenuOpen(prev => !prev)}
              className="px-2.5 h-9 rounded-xl bg-[#0F1115]/90 hover:bg-[#1E222B] text-slate-200 hover:text-white border border-[#262B35] flex items-center gap-1.5 shadow-lg transition-all text-xs font-bold cursor-pointer"
              title="Select Map Layer"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="capitalize">{activeLayer}</span>
            </button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 top-11 w-48 bg-[#0F1219] border border-[#262D3D] rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-[500] animate-in fade-in duration-150">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#222838]">
                  Select Map Tile Layer
                </div>
                {LAYER_OPTIONS.map(opt => {
                  const isSelected = activeLayer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectLayer(opt.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-[#181E2C] hover:text-white'
                      }`}
                    >
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{opt.description}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="w-9 h-9 rounded-xl bg-[#0F1115]/90 hover:bg-[#1E222B] text-slate-300 hover:text-white border border-[#262B35] flex items-center justify-center shadow-lg transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Coordinates & Accuracy Badge */}
        <div className="absolute bottom-3 left-3 z-[400] pointer-events-none">
          <div className="bg-[#0F1115]/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#262B35] text-[10px] font-mono text-slate-300 flex items-center gap-2">
            <span>{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
            <span className="text-emerald-400">±{Math.round(accuracy)}m</span>
            {nextStopName && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-blue-300">Next: {nextStopName}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
