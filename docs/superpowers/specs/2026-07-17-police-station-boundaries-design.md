# Police station boundary subdivision design

## Problem

`KGISMAPS_KN_Police_Station_Boundaries.geojsonl` (830 station polygons statewide) was dropped into `dist/geo/` — Vite's gitignored build-output directory, so it doesn't survive a rebuild and isn't served. The file has no district field (only `PS_BOUNDName`, `PS_BOUNDCode`, `KGISPS_SUB_DIVID`, `OBJECTID`), and each polygon is very dense (median 1243 vertices), making the raw 27MB file unsuitable to ship as-is.

The Command Center map (`DistrictMap.tsx`) currently shows only district-level fill. When a district is selected, it should subdivide into its constituent police station boundaries, colored by case count the same way districts are today.

## Goals

- Selecting a district on the map renders that district's police station boundaries as a subdivision layer on top of the (already dimmed/zoomed) district fill.
- Station polygons are colored by case count using a district-local color scale (0..max within that district's stations).
- Hovering a station highlights it and shows a tooltip (station name + case count, or "No case data" if unmatched).
- Works fully in mock/demo mode (no live backend required), consistent with this app's existing "render fully populated without a backend" design intent.

## Non-goals

- Clicking a station polygon does nothing beyond what hovering already does — no third drill-down level, no scroll-linking to `StationDrilldownList`. The data model has no per-station detail beyond the existing case count.
- Station markers/pins — polygons only.
- A legend redesign — reuses the existing case-count color-scale visual language.
- Committing the raw 27MB source file to the repo. It's a one-time local input, used in place from `dist/geo/` to generate small derived outputs, then discarded.
- The spatial join (station → district) becoming a permanently-owned pipeline in this frontend repo. In real mode, the backend performs the join and simplification and returns already-district-scoped, already-simplified GeoJSON; this repo only consumes it. A one-time local script exists solely to produce mock/demo fixtures.

## Architecture

### 1. Backend contract (new, for the separate backend repo)

```
GET /api/geo/districts/{districtId}/stations/boundaries
→ {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { unitId: number; unitName: string },
      geometry: Polygon | MultiPolygon
    }]
  }
```

The backend is responsible for: spatial-joining raw station geometry to a district, coordinate simplification for bundle size, and tagging each feature with `unitId` matching its own `StationSummaryResponse.unitId`. Returning `unitId` (not just a name) lets the frontend join case-count data by id instead of fuzzy name-matching — station names between datasets are not guaranteed to line up 1:1. Implementing this endpoint is out of scope for this repo.

### 2. Mock fixture generation (one-time, local, not committed)

A throwaway Node script (e.g. `scripts/build-station-fixtures.mjs`, run once and not part of `npm run build`) reads `dist/geo/KGISMAPS_KN_Police_Station_Boundaries.geojsonl` in place and:

1. **Spatial join**: for each station polygon, computes a centroid and tests it against `public/data/karnataka-districts.geojson`'s district polygons (ray-casting point-in-polygon) to assign a `districtId`. Verified 829/830 stations resolve this way; the one unmatched case (`Thirumani PS`) falls back to its nearest district by centroid distance. This is an approximation for visualization, not an authoritative administrative join.
2. **Simplification**: applies Douglas-Peucker simplification (tolerance ≈ 0.0002–0.0003°, ~20–30m) to cut the dense source geometry down to a size suitable for lazy per-district loading (e.g. Bengaluru Urban's 120 stations drop from several MB to roughly 500KB).
3. **Synthetic id assignment**: assigns each station a stable sequential `unitId` (ordered by district, then original file order).
4. **Output**:
   - `public/data/stations/<districtId>.geojson` — one small `FeatureCollection` per district, `properties: { unitId, unitName }` (from `PS_BOUNDName`), matching the real backend's contract shape.
   - A generated fixture module (e.g. `src/api/generatedStationFixtures.ts`) exporting `STATIONS_BY_DISTRICT: Record<districtId, { unitId, unitName }[]>`, consumed by `mockData.ts`.

### 3. `mockData.ts` changes

`mockStations(districtId)` is rewritten to use `STATIONS_BY_DISTRICT[districtId]` instead of the current 4 generic fake names. Each real station gets a synthetic proportional share of the district's `caseCount` (deterministic split, not `Math.random()`, so tests stay stable), keyed by the same `unitId` used in the geojson fixture — so mock mode exercises the identical id-join path as real mode.

`getMockResponse` gets a new route match: `path.match(/^\/api\/geo\/districts\/(\d+)\/stations\/boundaries$/)`, returning the corresponding `public/data/stations/<id>.geojson` fetched the same way `loadBoundaries()` already fetches `public/data/karnataka-districts.geojson`.

### 4. `geoApi.ts`

New `StationBoundaryFeatureCollection` type and `getStationBoundaries`/`useStationBoundaries(token, districtId)`, following the existing `useStationSummaries` pattern exactly (`staleTime: 60_000`, `enabled: token != null && districtId != null`).

### 5. `DistrictMap.tsx`

- New prop: `stationBoundaries: StationBoundaryFeatureCollection | null`.
- When non-null, add a `stations` source + `station-fill` layer above `district-fill`. Features are enriched client-side with `caseCount` looked up by `unitId` against the station summaries already available to `CommandCenterScreen` (same enrichment pattern `district-fill` already uses for `caseCount`).
- Color scale: `interpolate`/`linear` on `caseCount`, scaled 0..max **within that district's stations** (a district-local max, distinct from the statewide district max).
- Hover: same `feature-state` hover pattern as `district-fill` — highlighted outline + a popup with station name + case count (or "No case data" when a station's `unitId` has no matching summary row).
- Click: no handler (read-only layer).
- When selection clears, the `stations` source/layer is removed.

### 6. `CommandCenterScreen.tsx`

Add `stationBoundariesQuery = useStationBoundaries(token, districtDrilldownId)`; pass `stationBoundariesQuery.data ?? null` to `<DistrictMap>`.

## Error handling

- `stationBoundariesQuery` failing or still loading does not block or degrade the rest of the district view — the map simply shows the zoomed/dimmed district with no station subdivision until data arrives, matching how the existing station-list query already degrades quietly on this screen.
- A station whose `unitId` has no matching case-count row renders with a neutral/grey fill and "No case data" in its tooltip, rather than being dropped from the layer.

## Testing

- Extend `DistrictMap.test.tsx`'s `FakeMap` to support adding/removing the `stations` source and layer, and firing synthetic hover events on `station-fill`.
- Unit test the district-local color-scale calculation and the `unitId`-based case-count enrichment.
- `mockData.test.ts`: `mockStations()` returns real station names per selected district with proportional synthetic counts, `unitId`s matching the generated `public/data/stations/<id>.geojson` fixtures.
- `CommandCenterScreen.test.tsx`: selecting a district passes loaded station boundaries through to `DistrictMap`.
- The one-time fixture-generation script is not unit tested (throwaway local tool, not shipped code); its output is spot-checked (feature counts per district, output file sizes) when run.
