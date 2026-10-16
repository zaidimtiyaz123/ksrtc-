import React, { useState, useEffect, useMemo, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Route, Stop, LiveBusTelemetry } from '../types';
import {
  Navigation,
  Compass,
  MapPin,
  Layers,
  Key,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertTriangle,
  Bus as BusIcon
} from 'lucide-react';

export const isGoogleMapsKeyValid = (key: string | undefined | null): boolean => {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.startsWith('AIza') && trimmed.length >= 20;
};

interface GoogleMapViewProps {
  currentLat: number;
  currentLng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  busLabel?: string;
  assignedRoute?: Route | null;
  originLat?: number;
  originLng?: number;
  originName?: string;
  nextStopName?: string;
  geofenceRadiusMeters?: number;
  otherBuses?: LiveBusTelemetry[];
  className?: string;
  onSelectBus?: (bus: LiveBusTelemetry) => void;
  onSwitchToRadar?: () => void;
  apiKey?: string;
}

// Polyline component to draw route line on Google Maps
function RouteLine({ pathCoords, strokeColor = '#2563EB' }: { pathCoords: { lat: number; lng: number }[]; strokeColor?: string }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !window.google || !pathCoords || pathCoords.length < 2) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const polyline = new google.maps.Polyline({
      path: pathCoords,
      geodesic: true,
      strokeColor,
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map
    });

    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
      polylineRef.current = null;
    };
  }, [map, pathCoords, strokeColor]);

  return null;
}

// 100-meter Depot Geofence Circle
function DepotGeofenceCircle({
  center,
  radius = 100
}: {
  center: { lat: number; lng: number };
  radius?: number;
}) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !window.google || !center.lat || !center.lng) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    const circle = new google.maps.Circle({
      strokeColor: '#10B981',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: '#10B981',
      fillOpacity: 0.18,
      map,
      center,
      radius
    });

    circleRef.current = circle;

    return () => {
      circle.setMap(null);
      circleRef.current = null;
    };
  }, [map, center.lat, center.lng, radius]);

  return null;
}

// Camera auto-pan controller
function CameraPanController({
  position,
  followVehicle
}: {
  position: { lat: number; lng: number };
  followVehicle: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !followVehicle || !position.lat || !position.lng) return;
    map.panTo(position);
  }, [map, position.lat, position.lng, followVehicle]);

  return null;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  currentLat,
  currentLng,
  heading = 90,
  speed = 0,
  accuracy = 5,
  busLabel = 'KSRTC Fleet',
  assignedRoute,
  originLat,
  originLng,
  originName = 'Depot Terminal',
  nextStopName,
  geofenceRadiusMeters = 100,
  otherBuses = [],
  className = 'w-full h-80 sm:h-96',
  onSelectBus,
  onSwitchToRadar,
  apiKey: propApiKey
}) => {
  const [activeKey, setActiveKey] = useState<string>(() => {
    const candidate = propApiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('ksrtc_gmaps_key') || '';
    return isGoogleMapsKeyValid(candidate) ? candidate.trim() : '';
  });

  const [inputKey, setInputKey] = useState('');
  const [inputKeyError, setInputKeyError] = useState<string | null>(null);
  const [showKeyInputModal, setShowKeyInputModal] = useState(false);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedFleetBus, setSelectedFleetBus] = useState<LiveBusTelemetry | null>(null);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState<google.maps.MapTypeId | 'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [authError, setAuthError] = useState<string | null>(null);
  const [invalidKeyWarning, setInvalidKeyWarning] = useState<string | null>(() => {
    const rawClient = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '').trim();
    if (rawClient && !isGoogleMapsKeyValid(rawClient)) {
      return rawClient.startsWith('nvapi-')
        ? 'An NVIDIA API key was configured instead of a Google Maps Platform key.'
        : 'Configured key does not match Google Maps Platform API key format (must start with "AIza").';
    }
    return null;
  });

  useEffect(() => {
    if (propApiKey) {
      if (isGoogleMapsKeyValid(propApiKey)) {
        setActiveKey(propApiKey.trim());
        setAuthError(null);
      } else {
        setInvalidKeyWarning('The provided API key does not start with "AIza".');
      }
    }
  }, [propApiKey]);

  // Intercept Google Maps authentication failure globally to prevent unhandled script errors
  useEffect(() => {
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('[GoogleMapView] Google Maps authentication failure (InvalidKeyMapError / quota / unauthorized domain).');
      setAuthError('Google Maps reported an authentication failure (InvalidKeyMapError). The API key is invalid or unauthorized.');
    };

    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
    };
  }, []);

  // Fetch server-configured key if available and not yet loaded
  useEffect(() => {
    if (!activeKey) {
      fetch('/api/config/maps')
        .then(res => res.json())
        .then(data => {
          if (data.invalidKeyReason) {
            setInvalidKeyWarning(data.invalidKeyReason);
          }
          if (data.apiKey && isGoogleMapsKeyValid(data.apiKey)) {
            setActiveKey(data.apiKey.trim());
            setAuthError(null);
          }
        })
        .catch(() => {});
    }
  }, [activeKey]);

  const handleSaveKey = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setInputKeyError('Please enter an API key');
      return;
    }
    if (!isGoogleMapsKeyValid(trimmed)) {
      if (trimmed.startsWith('nvapi-')) {
        setInputKeyError('This is an NVIDIA API key, not a Google Maps key. Google Maps keys start with "AIza".');
      } else {
        setInputKeyError('Invalid key format. Google Maps Platform keys must start with "AIza".');
      }
      return;
    }

    setInputKeyError(null);
    setActiveKey(trimmed);
    setAuthError(null);
    setInvalidKeyWarning(null);
    localStorage.setItem('ksrtc_gmaps_key', trimmed);
    setShowKeyInputModal(false);
  };

  // Convert route coordinates to Google Maps LatLng literals
  const routePath = useMemo(() => {
    if (!assignedRoute) return [];
    if (assignedRoute.route_geometry && assignedRoute.route_geometry.length > 0) {
      return assignedRoute.route_geometry.map(([lat, lng]) => ({ lat, lng }));
    }
    if (assignedRoute.stops && assignedRoute.stops.length > 0) {
      return assignedRoute.stops
        .filter(s => s.stop)
        .map(s => ({ lat: s.stop.latitude, lng: s.stop.longitude }));
    }
    return [];
  }, [assignedRoute]);

  const depotCenter = useMemo(() => {
    if (originLat && originLng) {
      return { lat: originLat, lng: originLng };
    }
    if (routePath.length > 0) {
      return routePath[0];
    }
    return { lat: 13.3409, lng: 77.1010 };
  }, [originLat, originLng, routePath]);

  const vehiclePosition = useMemo(() => {
    return {
      lat: Number(currentLat) || 13.3409,
      lng: Number(currentLng) || 77.1010
    };
  }, [currentLat, currentLng]);

  return (
    <div
      id="google-maps-container"
      className={`relative overflow-hidden rounded-2xl border border-[#232A3B] bg-[#0A0D14] ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : className
      }`}
    >
      {activeKey && isGoogleMapsKeyValid(activeKey) && !authError ? (
        <APIProvider
          apiKey={activeKey}
          onError={(err) => {
            console.warn('[GoogleMapView] APIProvider error:', err);
            setAuthError('Failed to load Google Maps SDK. The API key may be invalid, unrestricted, or quota exceeded.');
          }}
        >
          <div className="w-full h-full relative">
            <Map
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              mapId="DEMO_MAP_ID"
              defaultCenter={vehiclePosition}
              defaultZoom={14}
              mapTypeId={mapType as any}
              gestureHandling="greedy"
              disableDefaultUI={true}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Route Polyline */}
              {routePath.length > 1 && (
                <RouteLine pathCoords={routePath} strokeColor="#2563EB" />
              )}

              {/* 100m Depot Geofence Circle */}
              {depotCenter && (
                <DepotGeofenceCircle center={depotCenter} radius={geofenceRadiusMeters} />
              )}

              {/* Camera Tracking Controller */}
              <CameraPanController
                position={vehiclePosition}
                followVehicle={followVehicle}
              />

              {/* Live Vehicle Marker */}
              <AdvancedMarker
                position={vehiclePosition}
                title={`${busLabel} (${speed} km/h)`}
                zIndex={100}
              >
                <div className="relative flex items-center justify-center">
                  {/* Accuracy ring */}
                  <div
                    className="absolute rounded-full bg-blue-500/20 border border-blue-400/40 animate-ping pointer-events-none"
                    style={{ width: '42px', height: '42px' }}
                  />
                  {/* Vehicle Heading Pointer */}
                  <div
                    className="relative w-10 h-10 rounded-2xl bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white transition-transform duration-300"
                    style={{ transform: `rotate(${heading}deg)` }}
                  >
                    <Navigation className="w-5 h-5 fill-white text-white drop-shadow" />
                  </div>
                  {/* Speed Badge */}
                  <div className="absolute -top-3.5 bg-slate-900/90 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black shadow-md whitespace-nowrap">
                    {speed} km/h
                  </div>
                </div>
              </AdvancedMarker>

              {/* Route Stops Markers */}
              {assignedRoute?.stops?.map((stopItem, index) => {
                const s = stopItem.stop;
                if (!s) return null;
                const isOrigin = index === 0;
                const isDestination = index === (assignedRoute.stops?.length || 1) - 1;

                return (
                  <AdvancedMarker
                    key={s.id || `stop-${index}`}
                    position={{ lat: s.latitude, lng: s.longitude }}
                    title={s.name}
                    onClick={() => setSelectedStop(s)}
                    zIndex={50}
                  >
                    <div className="cursor-pointer group">
                      <Pin
                        background={isOrigin ? '#10B981' : isDestination ? '#EF4444' : '#4F46E5'}
                        borderColor="#FFFFFF"
                        glyphColor="#FFFFFF"
                        scale={isOrigin || isDestination ? 1.0 : 0.75}
                      />
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Other Fleet Buses */}
              {otherBuses.map(bus => (
                <AdvancedMarker
                  key={bus.bus_id}
                  position={{ lat: bus.latitude, lng: bus.longitude }}
                  title={`${bus.registration_number} - Route ${bus.route_number}`}
                  onClick={() => {
                    setSelectedFleetBus(bus);
                    if (onSelectBus) onSelectBus(bus);
                  }}
                  zIndex={80}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-blue-400 text-blue-400 flex items-center justify-center shadow-lg cursor-pointer">
                    <BusIcon className="w-4 h-4" />
                  </div>
                </AdvancedMarker>
              ))}

              {/* Stop InfoWindow */}
              {selectedStop && (
                <InfoWindow
                  position={{ lat: selectedStop.latitude, lng: selectedStop.longitude }}
                  onCloseClick={() => setSelectedStop(null)}
                >
                  <div className="text-slate-900 p-1 max-w-[200px]">
                    <div className="font-extrabold text-xs text-blue-800">{selectedStop.name}</div>
                    {selectedStop.name_kannada && (
                      <div className="text-[11px] text-slate-600 font-semibold">{selectedStop.name_kannada}</div>
                    )}
                    <div className="mt-1 text-[10px] text-slate-500 font-mono">
                      Stop Code: {selectedStop.stop_code} • Zone: {selectedStop.zone || 'KSRTC'}
                    </div>
                  </div>
                </InfoWindow>
              )}

              {/* Selected Fleet Bus InfoWindow */}
              {selectedFleetBus && (
                <InfoWindow
                  position={{ lat: selectedFleetBus.latitude, lng: selectedFleetBus.longitude }}
                  onCloseClick={() => setSelectedFleetBus(null)}
                >
                  <div className="text-slate-900 p-1 max-w-[220px]">
                    <div className="font-black text-xs text-slate-900">{selectedFleetBus.registration_number}</div>
                    <div className="text-[11px] font-bold text-blue-600">
                      Route {selectedFleetBus.route_number}: {selectedFleetBus.route_name}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-600 font-mono flex items-center justify-between">
                      <span>Speed: {selectedFleetBus.speed} km/h</span>
                      <span>Next: {selectedFleetBus.next_stop_name || 'En Route'}</span>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </div>
        </APIProvider>
      ) : (
        /* Zero-Config Google Maps Setup & Key Prompt Overlay */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0C101A] text-slate-200">
          <div className="w-14 h-14 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-lg">
            <MapPin className="w-8 h-8" />
          </div>

          <h3 className="text-base font-extrabold text-white tracking-tight">
            Google Maps Platform Integration
          </h3>

          <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
            Google Maps JavaScript SDK provides live satellite & vector map navigation. A valid Google Maps Platform API key (starting with <span className="font-mono text-blue-400">AIza</span>) is required to render tiles.
          </p>

          {/* Dedicated Error or Warning Banner */}
          {authError && (
            <div className="mt-3 max-w-md w-full bg-red-950/70 border border-red-500/50 rounded-2xl p-3 text-left flex items-start gap-2.5 shadow-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-red-200 leading-relaxed">
                <strong className="block text-red-300 font-bold mb-0.5">Google Maps Key Error</strong>
                {authError}
              </div>
            </div>
          )}

          {invalidKeyWarning && !authError && (
            <div className="mt-3 max-w-md w-full bg-amber-950/70 border border-amber-500/50 rounded-2xl p-3 text-left flex items-start gap-2.5 shadow-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-200 leading-relaxed">
                <strong className="block text-amber-300 font-bold mb-0.5">Invalid Key Detected</strong>
                {invalidKeyWarning}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all"
            >
              <span>Get Free Maps Demo Key</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => {
                setInputKeyError(null);
                setShowKeyInputModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#1C2230] hover:bg-[#283247] text-slate-200 border border-[#2B3347] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Enter API Key</span>
            </button>

            {onSwitchToRadar && (
              <button
                type="button"
                onClick={onSwitchToRadar}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Switch to Tactical Radar (No Key)</span>
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-500 mt-3 font-mono">
            Or configure VITE_GOOGLE_MAPS_API_KEY in project settings.
          </p>
        </div>
      )}

      {/* Interactive Floating HUD Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
        {/* Recenter / Auto-pan vehicle toggle */}
        <button
          type="button"
          onClick={() => setFollowVehicle(!followVehicle)}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer ${
            followVehicle
              ? 'bg-blue-600/90 text-white border-blue-400 shadow-blue-600/30'
              : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title={followVehicle ? 'Vehicle camera lock active' : 'Vehicle camera lock unlocked'}
        >
          <Navigation className={`w-3.5 h-3.5 ${followVehicle ? 'fill-white' : ''}`} />
          <span className="hidden sm:inline">{followVehicle ? 'LOCKED' : 'FREE'}</span>
        </button>

        {/* Map Type (Roadmap / Satellite) */}
        <button
          type="button"
          onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer"
          title="Toggle Satellite / Street View"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">{mapType === 'roadmap' ? 'SATELLITE' : 'STREET'}</span>
        </button>

        {/* Enter API Key button if user wants to swap */}
        <button
          type="button"
          onClick={() => setShowKeyInputModal(true)}
          className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-slate-700 shadow-lg backdrop-blur-md transition-all cursor-pointer"
          title="Configure Google Maps API Key"
        >
          <Key className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 shadow-lg backdrop-blur-md transition-all cursor-pointer"
          title={isFullscreen ? 'Exit full screen' : 'Expand map full screen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating Speed & Depot Geofence Badge at Bottom */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800 text-white flex items-center gap-2 shadow-xl pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="text-xs font-mono">
            <span className="text-slate-400 font-normal">GPS: </span>
            <strong className="text-white">{currentLat.toFixed(4)}, {currentLng.toFixed(4)}</strong>
            <span className="text-slate-500 ml-1.5">±{Math.round(accuracy)}m</span>
          </div>
        </div>

        <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800 text-white flex items-center gap-2 shadow-xl pointer-events-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono text-emerald-400 font-bold">
            100M GEOFENCE RADAR
          </span>
        </div>
      </div>

      {/* API Key Configuration Modal */}
      {showKeyInputModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121622] border border-[#2B3347] rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Configure Google Maps API Key</span>
              </div>
              <button
                onClick={() => setShowKeyInputModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your Google Maps Platform key or paste the Maps Demo Key from Google Cloud console:
            </p>

            <input
              type="password"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setInputKeyError(null);
              }}
              placeholder="AIzaSy..."
              className={`w-full bg-[#0A0D14] border rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none ${
                inputKeyError ? 'border-red-500' : 'border-[#252C3D] focus:border-blue-500'
              }`}
            />

            {inputKeyError && (
              <div className="text-[11px] text-red-400 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{inputKeyError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Get Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {localStorage.getItem('ksrtc_gmaps_key') && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('ksrtc_gmaps_key');
                      setActiveKey('');
                      setInputKey('');
                      setShowKeyInputModal(false);
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 hover:underline"
                  >
                    Clear Saved
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyInputModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
                >
                  Save & Load Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
