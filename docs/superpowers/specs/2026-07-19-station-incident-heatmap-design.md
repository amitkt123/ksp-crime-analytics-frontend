# Station incident-point heatmap design

## Problem

The backend now exposes `GET /api/geo/stations/{unitId}/incidents` (per-case lat/long points for a station, RBAC-scoped so UNIT/OWN_OR_UNIT callers only ever see their own station). Nothing in the frontend calls it. Today, drilling into a district shows a station-level choropleth (`station-fill`, shaded by case count) via `StationDrilldownList` + `DistrictMap`, but there's no way to go one level deeper and see where within a station's jurisdiction incidents actually cluster.

## Goals

- Selecting a station (from its map polygon or its `StationDrilldownList` row) adds a third breadcrumb level, `State › District › Station`, each segment independently clickable: clicking the district segment clears just the station; clicking "State" clears both.
- The map zooms to the selected station's boundary (`fitBounds`, same as district selection) and replaces that station's choropleth fill with a MapLibre `heatmap`-type layer built from its incident points. Sibling stations in the district stay visible, dimmed to the same `0.15` opacity `applyDistrictSelection` already uses for non-selected districts, and remain clickable to switch stations directly.
- The breadcrumb shows the incident count for the selected station (same slot the district breadcrumb uses for `caseCount`).
- Works in mock mode: `mockData.ts` gets a deterministic incident-point generator so the feature demos with no backend running.

## Non-goals

- Per-point hover/tooltip on individual incidents — heatmaps represent density, not individually-addressable features; no popup is added for the heat layer.
- A zoom-dependent transition from heatmap to discrete circle markers (the common MapLibre "heatmap fades out, circles fade in at high zoom" pattern) — out of scope; a single heatmap layer is enough for this pass.
- Any change to `KpiPanel`/`CategoryMixChart`/`AlertFeed` — those stay exactly as they are today at both the district and station level.
- The separate Case Explorer heatmap work on the (unmerged, mock-only) `feature/case-explorer` branch — unrelated, explicitly out of scope, not reused.
- Backend changes — the endpoint and its RBAC scoping already shipped (`core-platform` commit `fb85241`).

## Architecture

### 1. API layer (`src/api/geoApi.ts`)

New type and hook, mirroring `getStationSummaries`/`useStationSummaries` exactly:

```ts
export interface StationIncidentPointResponse {
  caseMasterId: number;
  crimeNo: string;
  latitude: number;
  longitude: number;
}

export function getStationIncidents(token: string | null, unitId: number): Promise<StationIncidentPointResponse[]> {
  return apiFetch<StationIncidentPointResponse[]>(`/api/geo/stations/${unitId}/incidents`, {}, token);
}

export function useStationIncidents(token: string | null, unitId: number | null) {
  return useQuery({
    queryKey: ['geo-station-incidents', unitId],
    queryFn: () => getStationIncidents(token, unitId as number),
    staleTime: 60_000,
    enabled: token != null && unitId != null,
  });
}
```

### 2. URL state and data fetching (`CommandCenterScreen.tsx`)

- New param: `selectedStationId = searchParams.get('station') ? Number(...) : null`, gated the same way `selectedDistrictId` is for policymakers (`isPolicymaker` never gets a station selection either).
- `selectStation(unitId)`: sets `station` in the search params without touching `district`.
- `clearStation()`: deletes only `station`.
- `clearDistrict()` (existing) now also deletes `station` — clearing the district must not leave a dangling station selection.
- `stationIncidentsQuery = useStationIncidents(token, selectedStationId)`, passed to `<DistrictMap>` alongside the existing props. Not part of the top-level `isLoading`/`isError` gate — same "progressive enhancement" treatment as `timeOfDayQuery`.
- Breadcrumb click targets are owned by `DistrictMap` itself (see below), not `CommandCenterScreen` — consistent with how the existing `State`/district breadcrumb segment already lives inside `DistrictMap`.

### 3. Map layer (`DistrictMap.tsx`)

- New props: `selectedStationId: number | null`, `stationIncidents?: StationIncidentPointResponse[]`, `onStationSelect: (unitId: number) => void`, `onStationBack: () => void`.
- The existing `click` handler on `station-fill` currently does nothing (stations aren't clickable today) — add one calling `onStationSelect(unitId)`, mirroring the `district-fill` click handler.
- A new `useEffect` keyed on `selectedStationId`/`stationBoundaries`/`stationIncidents`:
  - **Selected:** dim sibling stations via `setPaintProperty('station-fill', 'fill-opacity', ['case', ['==', ['get', 'unitId'], selectedStationId], 1, 0.15])` (same expression shape as the district version), `fitBounds` to the selected station's geometry.
  - Build/replace a `heatmap-incidents` source (a `FeatureCollection` of `Point` features, one per `StationIncidentPointResponse`, `[longitude, latitude]`) and a `heatmap` layer (`type: 'heatmap'`) with standard density paint properties (`heatmap-weight: 1`, `heatmap-intensity`/`heatmap-radius`/`heatmap-opacity` as fixed constants — no zoom-interpolated stops, per the non-goal above).
  - **Cleared:** remove the `heatmap-incidents` source/layer (same `getLayer`/`removeLayer`/`getSource`/`removeSource` guard pattern the existing station-layer effect already uses), reset `station-fill` opacity to `1`.
- Breadcrumb: extend the existing breadcrumb JSX with a third segment when `selectedStationId` is set — `<button onClick={onStationBack}>{selectedDistrict.districtName}</button> › <b>{stationName}</b> <span>{count} incidents</span>` — `onStationBack` is `CommandCenterScreen`'s `clearStation`, and clicking the existing `State` segment continues to call `onBack` (`clearDistrict`, which now also clears the station per §2).
- `stationName`/incident count are resolved from `stationSummaries`/`stationIncidents` props already passed in — no new prop needed for the name.

### 4. `StationDrilldownList.tsx`

- Rows become buttons calling a new `onStationSelect(unitId)` prop, styled the same as the existing `station-list-row` (no visual change, just clickable). The currently-selected row gets a highlighted class (`aria-current="true"` + a CSS class), mirroring how the selected district already gets visual treatment in the header `<select>`.

### 5. Mock synthesis (`src/api/mockData.ts`)

No prebuilt centroid dataset exists (and the `feature/case-explorer` branch's approach — a separate `generatedStationCentroids.ts` build step — is explicitly not reused per the non-goals). Instead, derive a centroid at request time from data already loaded for the station-boundaries mock:

```ts
import { featureCentroid } from '../screens/command-center/geoBounds'; // pure, no maplibre import

function findStationDistrictId(unitId: number): number | undefined {
  for (const [districtId, roster] of Object.entries(STATIONS_BY_DISTRICT)) {
    if (roster.some((s) => s.unitId === unitId)) return Number(districtId);
  }
  return undefined;
}

// Deterministic jitter around the station's real boundary centroid (no Math.random(),
// same spirit as mockCaseSummaries) -- reuses CASES_PER_STATION's count so the heatmap
// and the station's case list agree on volume.
async function mockStationIncidents(unitId: number) {
  const districtId = findStationDistrictId(unitId);
  if (districtId == null) return [];
  const boundaries = (await loadStationBoundaries(districtId)) as StationBoundaryFeatureCollection;
  const feature = boundaries.features.find((f) => f.properties.unitId === unitId);
  if (!feature) return [];
  const [centerLng, centerLat] = featureCentroid(feature.geometry);
  const unitName = findStationName(unitId) ?? '';

  return mockCaseSummaries(unitId, unitName).map((c, index) => {
    const angle = (index / CASES_PER_STATION) * 2 * Math.PI;
    const radius = 0.01 + (index % 3) * 0.005; // ~1-2km wobble, no Math.random()
    return {
      caseMasterId: c.caseId,
      crimeNo: c.caseNumber,
      latitude: centerLat + Math.sin(angle) * radius,
      longitude: centerLng + Math.cos(angle) * radius,
    };
  });
}
```

Wired into `getMockResponse` via `path.match(/^\/api\/geo\/stations\/(\d+)\/incidents$/)`, same style as the other route matches.

## Error handling

- `stationIncidentsQuery` failing does not blank the screen or the station selection itself — the station stays selected (zoomed, dimmed siblings) with an empty heat layer; an inline `<p role="alert">Couldn't load incident points <button onClick={...refetch}>Retry</button></p>` renders in the breadcrumb area, same pattern as `districtDetailQuery.isError`.
- A station outside the caller's RBAC scope never reaches this code path — `stationSummaries` (and therefore `StationDrilldownList`'s rows and the clickable map polygons) is already filtered server-side to the caller's own unit for UNIT/OWN_OR_UNIT scope, so there's no station in the UI a user could click to trigger a 403.

## Testing

- `DistrictMap.test.tsx`: extend `FakeMap` with nothing new (`getLayer`/`removeLayer`/`getSource`/`removeSource`/`setPaintProperty`/`fitBounds` already exist and cover the heatmap layer's needs).
  - Selecting a station adds a `heatmap-incidents` source with one Point feature per incident and a layer with `type: 'heatmap'`.
  - Selecting a station dims sibling `station-fill` features via the same `['case', ['==', ...]]` opacity expression already tested for districts, and fits bounds to its geometry.
  - Clearing the station selection removes the `heatmap-incidents` layer/source and resets `station-fill` opacity to `1`.
  - Clicking a station polygon calls `onStationSelect` with its `unitId`.
  - Breadcrumb shows the district name, station name, and incident count when a station is selected; clicking the district segment calls `onStationBack` and clicking "State" calls `onBack`.
- `CommandCenterScreen.test.tsx`: selecting a station sets `?station=`; clearing the district also clears `?station=`; a `stationIncidentsQuery` error shows the inline retry affordance without blanking the rest of the screen.
- `mockData.ts` test: `mockStationIncidents()` returns `CASES_PER_STATION` points clustered near the station's real boundary centroid (assert each point's distance from centroid is within the fixed jitter radius), and is stable across repeated calls (no `Math.random()`).
