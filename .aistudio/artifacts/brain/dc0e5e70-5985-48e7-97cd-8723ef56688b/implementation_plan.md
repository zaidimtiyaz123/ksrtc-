# Free Open-Source Transit Mapping Engine (Leaflet, OpenStreetMap & CartoDB)

Complete migration from proprietary Google Maps SDK to a 100% free, zero-API-key mapping infrastructure powered by Leaflet, OpenStreetMap, CartoDB, and ESRI World Imagery, featuring adaptive transit theming and dynamic layer switching across all KSRTC tracking surfaces.

> [!IMPORTANT]
> **User Review & Confirmed Decisions**
> - **Confirmed Mapping Engine**: Leaflet with OpenStreetMap and CartoDB tile infrastructure, completely eliminating Google Maps API key requirements and billing restrictions.
> - **Confirmed Default Visual Style**: Adaptive transit theme automatically tuned to system light and dark modes (CartoDB Voyager for day/light mode, CartoDB Dark Matter for night/dark mode).
> - **Confirmed Layer Controls**: Interactive floating layer switcher enabling users to seamlessly toggle between **Street** (CartoDB Voyager / OSM), **Dark** (CartoDB Dark Matter), and **Satellite** (ESRI World Imagery) in real time.

---

## 1. Overview & Core Concept

### What It Does
This upgrade removes the proprietary Google Maps JavaScript SDK and its API key verification barriers from the entire KSRTC SmartTrack system. In its place, the application adopts an open-source Leaflet engine coupled with high-availability free tile servers. Every map surface—the Driver Cockpit navigation console, the Live Passenger Bus Radar, and the Multi-Modal Trip Planner—now operates with zero configuration, instant tile loading, and no third-party quota limits.

### Target Audience & Persona
- **KSRTC Bus Drivers**: Depend on clear, uninterrupted GPS navigation, heading orientation, and 100m depot geofence awareness in the Driver Cockpit without API key error banners or quota locks.
- **Daily Commuters & Travelers**: Track live buses on real-world transit maps with the ability to switch between crisp street vectors, night-optimized dark mode, and high-resolution satellite imagery.
- **Operations & Depot Managers**: Monitor fleet corridors with zero external service maintenance or recurring map tile subscription expenses.

### Key Value
100% zero-cost, privacy-friendly transit mapping that boots instantly out of the box with zero configuration steps, superior mobile performance, and complete resilience against external API key expiration.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Driver Cockpit Navigation**:
   - The driver opens the cockpit dashboard; the map immediately renders their current vehicle position with high-precision GPS telemetry, speed readout, and directional heading pointer.
   - The 100-meter depot geofence ring and assigned route polyline are rendered in crisp vector lines.
   - Using the top-right layer control, the driver can toggle between Street, Dark Tactical, and Satellite views without reloading the page.
2. **Passenger Live Bus Radar**:
   - Commuters tracking express buses see smooth vehicle transitions along highway corridors.
   - The map respects the application's light/dark posture: bright daytime vector tiles during daylight and CartoDB Dark Matter at night.
   - Users can switch to high-resolution ESRI satellite tiles to inspect highway junctions, bus bays, or landmark stops.
3. **Trip Planner Route Preview**:
   - Passengers searching for routes (e.g. Tumkur ⇄ Bengaluru) view the multi-leg route geometry and bus stops with full layer control and smooth auto-fit bounding.
4. **API Diagnostics Health Center**:
   - The diagnostics center displays Map Tiles as `"100% Free & Active (No Key Required)"`, removing Google Maps error alerts and replacing them with live tile connectivity pings.

### Visual Identity & Theme
- **Aesthetic Direction**: High-contrast, utilitarian transit dashboard with clean hairline borders, crisp typography, and restrained telemetry indicators adhering to enterprise transit design standards.
- **Color Palette**:
  - Primary Slate Canvas: Deep Charcoal (`#090D16` dark mode, `#FFFFFF` light mode).
  - Transit Accents: KSRTC Crimson (`#DC2626`), Electric Blue (`#2563EB`) for active route polylines, Emerald (`#10B981`) for origin/on-time stops, and Amber (`#D97706`) for cautionary zones.
  - Layer Switcher: Translucent dark glass (`rgba(15, 23, 42, 0.85)`) with crisp white icons and subtle active indicator rings.
- **Typography & Hierarchy**:
  - Headings and route names rendered in bold neo-grotesque sans (`Plus Jakarta Sans`).
  - Speeds, coordinates, and geofence indicators strictly use tabular monospace numerals (`font-mono tabular-nums`).
- **Zero-Pill Restraint**:
  - Status metadata is formatted as unboxed text with typographic dot separators (`·`) rather than nested colored pills.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Leaflet + OpenStreetMap & CartoDB vs. Google Maps Platform SDK
- **Chosen Approach**: Full migration to Leaflet with CartoDB (Voyager & Dark Matter) and OpenStreetMap tile endpoints.
- **Why**: Google Maps requires proprietary credit card billing, API key provisioning (`AIza...`), domain authorization headers, and restricted usage quotas. Leaflet is open-source, lightweight (<40kB bundle), privacy-respecting, and operates flawlessly in sandboxed preview environments.
- **Alternatives Considered**: Mapbox GL JS (still requires access tokens and billing accounts) and static canvas radar (lacks real-world street and geographic context).

### Decision 2: Multi-Layer Tile Architecture (Street, Dark, Satellite)
- **Chosen Approach**: Direct integration of three free tile layers:
  1. **Street / Transit**: CartoDB Voyager (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`) & OpenStreetMap standard.
  2. **Dark Mode**: CartoDB Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
  3. **Satellite Imagery**: ESRI World Imagery (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`).
- **Why**: Delivers identical visual versatility to Google Maps without requiring any proprietary SDK or paid billing tiers.
- **Alternatives Considered**: Street-only tile view (deprives drivers and passengers of satellite landmark identification).

### Decision 3: Removal of `@vis.gl/react-google-maps` Dependency
- **Chosen Approach**: Clean deprecation and removal of the Google Maps React package from `package.json`, replacing it entirely with native Leaflet bindings already present in the workspace.
- **Why**: Eliminates bundle bloat (~120kB), prevents script injection errors (`gm_authFailure`, `InvalidKeyMapError`), and ensures zero console warnings.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            KSRTC SmartTrack UI                              │
│                                                                             │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────┐  │
│  │   Driver Cockpit Map   │  │   Passenger Live Map   │  │ Trip Planner  │  │
│  │  - GPS Vehicle Pointer │  │  - Multi-Bus Radar     │  │  - Multi-Leg  │  │
│  │  - 100m Geofence Ring  │  │  - Stop Markers        │  │    Polyline   │  │
│  │  - Layer Switcher HUD  │  │  - Nearest Bus Radar   │  │  - Layer HUD  │  │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────┬───────┘  │
└──────────────┼───────────────────────────┼───────────────────────┼──────────┘
               │                           │                       │
               ▼                           ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Free Leaflet Tile Engine Core                         │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │ Dynamic Tile Layer Provider (Switchable in HUD)                      │  │
│   │  ├─ Street / Transit: CartoDB Voyager & OpenStreetMap                │  │
│   │  ├─ Dark Tactical:   CartoDB Dark Matter (Night Mode)                │  │
│   │  └─ Satellite:       ESRI World Imagery (High-Res Aerial)            │  │
│   └──────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│   ┌──────────────────────────────────▼───────────────────────────────────┐  │
│   │ Custom Vector Layers & Overlays                                      │  │
│   │  ├─ Animated Vehicle Heading Pointers (SVG Navigation Arrow)         │  │
│   │  ├─ 100m Depot Geofence Circle (Emerald Radius Overlay)              │  │
│   │  ├─ High-Contrast Route Polylines (Smooth Curvature & Stop Markers)  │  │
│   │  └─ Camera Auto-Tracking & Re-Center Bounds Engine                   │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    API Diagnostics & Configuration State                    │
│  - /api/config/maps: { provider: 'leaflet-osm', status: 'active', free: true }│
│  - Zero API Key Prompts or Quota Verification Modals                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component State & Interactive Mapping
- **Active Tile Style State**: Persisted per-user in local storage (`'voyager' | 'dark' | 'satellite' | 'osm'`), defaulting adaptively according to light/dark system mode.
- **Layer Switcher HUD**: Compact floating control allowing 1-click toggling between Street, Dark, and Satellite tiles.
- **Live Vehicle Following**: Driver Cockpit and Live Tracking components preserve camera tracking locks with smooth `map.panTo()` transitions while allowing free panning on drag.
- **Diagnostics Service**: Updates `ApiDiagnosticsModal` to test tile server accessibility (CartoDB & OSM HTTP status) instead of checking for a Google Maps `AIza` string.
