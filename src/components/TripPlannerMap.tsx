import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { TripPlanOption, TripLeg } from '../types';
import { Layers, Check } from 'lucide-react';

interface TripPlannerMapProps {
  selectedOption: TripPlanOption | null;
  className?: string;
}

type TripPlannerLayer = 'voyager' | 'dark' | 'satellite' | 'osm';

export const TripPlannerMap: React.FC<TripPlannerMapProps> = ({ selectedOption, className = 'h-full w-full' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [activeLayer, setActiveLayer] = useState<TripPlannerLayer>('voyager');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  const createTileLayer = (style: TripPlannerLayer): L.TileLayer => {
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

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center around Karnataka NH48/NH75 corridor (Bengaluru - Tumkur - Mysuru)
    const map = L.map(mapContainerRef.current, {
      center: [13.15, 77.25],
      zoom: 9,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = createTileLayer(activeLayer).addTo(map);
    tileLayerRef.current = tileLayer;

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Update tile layer on change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const newLayer = createTileLayer(activeLayer).addTo(map);
    tileLayerRef.current = newLayer;
    map.invalidateSize();
  }, [activeLayer]);

  // Update map contents when selectedOption changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    if (!selectedOption || !selectedOption.legs || selectedOption.legs.length === 0) {
      return;
    }

    const boundsPoints: [number, number][] = [];

    selectedOption.legs.forEach((leg: TripLeg, legIdx: number) => {
      const isLeg1 = legIdx === 0;
      const strokeColor = isLeg1 ? '#2563EB' : '#9333EA';

      // 1. Draw Polyline
      if (leg.polyline && leg.polyline.length > 0) {
        const polyline = L.polyline(leg.polyline, {
          color: strokeColor,
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round',
          dashArray: undefined
        });
        polyline.addTo(layers);

        // Add soft glow effect underneath
        const glow = L.polyline(leg.polyline, {
          color: strokeColor,
          weight: 9,
          opacity: 0.25,
          lineJoin: 'round',
          lineCap: 'round'
        });
        glow.addTo(layers);

        leg.polyline.forEach(pt => boundsPoints.push(pt));
      }

      // 2. Intermediate Stops
      if (leg.intermediateStops && leg.intermediateStops.length > 0) {
        leg.intermediateStops.forEach(stop => {
          boundsPoints.push([stop.latitude, stop.longitude]);

          const stopIcon = L.divIcon({
            className: 'custom-stop-dot',
            html: `
              <div style="
                width: 10px;
                height: 10px;
                background-color: #FFFFFF;
                border: 2px solid ${strokeColor};
                border-radius: 50%;
                box-shadow: 0 0 4px rgba(0,0,0,0.5);
              "></div>
            `,
            iconSize: [10, 10],
            iconAnchor: [5, 5]
          });

          const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon });
          marker.bindTooltip(`
            <div style="font-family: inherit; font-size: 11px;">
              <strong style="color: #1E293B;">${stop.name}</strong><br/>
              <span style="color: #64748B;">Stop #${stop.stop_code} · ${stop.zone || 'KSRTC Stop'}</span>
            </div>
          `, { direction: 'top', offset: [0, -5] });
          marker.addTo(layers);
        });
      }

      // 3. Live Bus Marker (if active on this leg)
      if (leg.liveBus) {
        const lb = leg.liveBus;
        boundsPoints.push([lb.latitude, lb.longitude]);

        const busIcon = L.divIcon({
          className: 'custom-live-bus-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <!-- Pulsing Ripple -->
              <div style="
                position: absolute;
                width: 38px;
                height: 38px;
                background: rgba(16, 185, 129, 0.35);
                border-radius: 50%;
                animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <!-- Bus Badge -->
              <div style="
                position: relative;
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #10B981, #059669);
                border: 2px solid #FFFFFF;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #FFFFFF;
                box-shadow: 0 4px 10px rgba(0,0,0,0.4);
                transform: rotate(${lb.heading || 0}deg);
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 6v6"/>
                  <path d="M15 6v6"/>
                  <path d="M2 12h19.6"/>
                  <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.6-.3-1-.7-1.3l-2.3-1.7"/>
                  <path d="M2 18h2"/>
                  <path d="M2 12v5a2 2 0 0 0 2 2h1"/>
                </svg>
              </div>
              <!-- Speed & Reg Pill -->
              <div style="
                position: absolute;
                bottom: -18px;
                background: #0F172A;
                color: #34D399;
                font-family: monospace;
                font-weight: bold;
                font-size: 9px;
                padding: 1px 5px;
                border-radius: 4px;
                border: 1px solid #10B981;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
              ">
                ${lb.currentSpeed} km/h · LIVE
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const busMarker = L.marker([lb.latitude, lb.longitude], { icon: busIcon, zIndexOffset: 1000 });
        busMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; color: #0F172A; min-width: 180px;">
            <div style="font-weight: 800; font-size: 13px; color: #059669; display: flex; items-center; gap: 4px;">
              <span>● LIVE GPS RADAR</span>
            </div>
            <div style="margin-top: 4px; font-weight: bold; font-family: monospace;">${lb.registrationNumber} (${lb.fleetNumber})</div>
            <div style="color: #475569; font-size: 11px; margin-top: 2px;">${lb.model}</div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #334155;">
              Driver: <strong>${lb.driverName}</strong><br/>
              Current Speed: <strong>${lb.currentSpeed} km/h</strong><br/>
              Distance to Boarding: <strong>${lb.distanceToOriginKm} km</strong><br/>
              ETA to Boarding Stop: <strong>${lb.etaToOriginMinutes} min</strong>
            </div>
          </div>
        `);
        busMarker.addTo(layers);
      }
    });

    // 4. Origin Marker (A)
    const origin = selectedOption.legs[0].originStop;
    boundsPoints.push([origin.latitude, origin.longitude]);

    const originIcon = L.divIcon({
      className: 'custom-origin-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: 28px;
            height: 28px;
            background: #10B981;
            color: #FFFFFF;
            font-weight: 900;
            font-size: 13px;
            border: 2.5px solid #FFFFFF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          ">
            A
          </div>
          <div style="
            margin-top: 2px;
            background: rgba(15, 23, 42, 0.95);
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #10B981;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            ${origin.name}
          </div>
        </div>
      `,
      iconSize: [32, 50],
      iconAnchor: [16, 14]
    });
    const originMarker = L.marker([origin.latitude, origin.longitude], { icon: originIcon, zIndexOffset: 900 });
    originMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; color: #0F172A;">
        <div style="font-weight: 800; color: #10B981;">BOARDING STATION (A)</div>
        <div style="font-weight: bold; margin-top: 2px;">${origin.name}</div>
        <div style="color: #64748B; font-size: 11px;">${origin.name_kannada || ''} · Stop #${origin.stop_code}</div>
        <div style="margin-top: 4px; font-size: 11px; color: #334155;">Scheduled Departure: <strong>${selectedOption.departureTime}</strong></div>
      </div>
    `);
    originMarker.addTo(layers);

    // 5. Transfer Station Marker (if 1-transfer option)
    if (selectedOption.type === 'transfer' && selectedOption.transferStation) {
      const transfer = selectedOption.transferStation;
      boundsPoints.push([transfer.latitude, transfer.longitude]);

      const transferIcon = L.divIcon({
        className: 'custom-transfer-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="
              width: 26px;
              height: 26px;
              background: #F59E0B;
              color: #FFFFFF;
              font-weight: 900;
              font-size: 12px;
              border: 2px solid #FFFFFF;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 8px rgba(0,0,0,0.5);
            ">
              ⇄
            </div>
            <div style="
              margin-top: 2px;
              background: rgba(15, 23, 42, 0.95);
              color: #FCD34D;
              font-size: 9px;
              font-weight: 700;
              padding: 2px 5px;
              border-radius: 4px;
              border: 1px solid #F59E0B;
              white-space: nowrap;
            ">
              Transfer (${selectedOption.transferWaitMinutes}m wait)
            </div>
          </div>
        `,
        iconSize: [30, 48],
        iconAnchor: [15, 13]
      });
      const transferMarker = L.marker([transfer.latitude, transfer.longitude], { icon: transferIcon, zIndexOffset: 850 });
      transferMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #0F172A;">
          <div style="font-weight: 800; color: #D97706;">INTERCHANGE STATION</div>
          <div style="font-weight: bold; margin-top: 2px;">${transfer.name}</div>
          <div style="color: #64748B; font-size: 11px;">Stop #${transfer.stop_code}</div>
          <div style="margin-top: 4px; font-size: 11px; color: #334155;">Platform changeover: <strong>${selectedOption.transferWaitMinutes} mins buffer</strong></div>
        </div>
      `);
      transferMarker.addTo(layers);
    }

    // 6. Destination Marker (B)
    const finalLeg = selectedOption.legs[selectedOption.legs.length - 1];
    const destination = finalLeg.destinationStop;
    boundsPoints.push([destination.latitude, destination.longitude]);

    const destIcon = L.divIcon({
      className: 'custom-destination-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: 28px;
            height: 28px;
            background: #EF4444;
            color: #FFFFFF;
            font-weight: 900;
            font-size: 13px;
            border: 2.5px solid #FFFFFF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          ">
            B
          </div>
          <div style="
            margin-top: 2px;
            background: rgba(15, 23, 42, 0.95);
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #EF4444;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            ${destination.name}
          </div>
        </div>
      `,
      iconSize: [32, 50],
      iconAnchor: [16, 14]
    });
    const destMarker = L.marker([destination.latitude, destination.longitude], { icon: destIcon, zIndexOffset: 900 });
    destMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; color: #0F172A;">
        <div style="font-weight: 800; color: #EF4444;">FINAL DESTINATION (B)</div>
        <div style="font-weight: bold; margin-top: 2px;">${destination.name}</div>
        <div style="color: #64748B; font-size: 11px;">${destination.name_kannada || ''} · Stop #${destination.stop_code}</div>
        <div style="margin-top: 4px; font-size: 11px; color: #334155;">Estimated Arrival: <strong>${selectedOption.arrivalTime}</strong></div>
      </div>
    `);
    destMarker.addTo(layers);

    // Auto fit bounds
    if (boundsPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      } catch (_) {}
    }
  }, [selectedOption]);

  return (
    <div className={`relative ${className} overflow-hidden rounded-2xl border border-[#1A2233] bg-[#0A0D14]`}>
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 bg-[#0B0F19]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#1E293B] shadow-xl text-xs font-mono text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>KSRTC Corridor Route Geometry & Live Telemetry</span>
      </div>

      {/* Floating Layer Controls */}
      <div className="absolute top-3 right-3 z-[400]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(prev => !prev)}
            className="px-2.5 h-8 rounded-xl bg-[#0B0F19]/90 hover:bg-[#1A2233] text-slate-200 hover:text-white border border-[#1E293B] flex items-center gap-1.5 shadow-xl text-xs font-bold cursor-pointer transition-all"
            title="Switch Map Tile Layer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="capitalize">{activeLayer}</span>
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 top-10 w-44 bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-[500] animate-in fade-in duration-150">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1E293B]">
                Map Layer
              </div>
              {[
                { id: 'voyager', label: 'Street View' },
                { id: 'dark', label: 'Dark Mode' },
                { id: 'satellite', label: 'Satellite (ESRI)' },
                { id: 'osm', label: 'OpenStreetMap (HOT)' }
              ].map(opt => {
                const isSelected = activeLayer === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setActiveLayer(opt.id as TripPlannerLayer);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-600/20 text-emerald-300 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-[#151D2E] hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
