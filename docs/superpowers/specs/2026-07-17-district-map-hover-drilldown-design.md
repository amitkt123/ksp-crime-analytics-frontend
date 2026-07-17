# District map hover highlight + drill-down design

## Problem

On the Command Center's Karnataka map (`DistrictMap.tsx`), districts can already be clicked to select them (via the existing `?district=<id>` URL param), which swaps the right-side panel to a station-level breakdown. Two things are missing:

1. No visual feedback as the mouse moves over the map — districts don't highlight, and there's no tooltip.
2. Clicking a district doesn't change the map itself — the full state map stays visible; only the right panel changes. The map should zoom into just the clicked district.
3. The right panel's district view is thinner than the state-wide view — it drops the KPI summary and category-mix chart that show state-wide, keeping only the station list.

## Goals

- Hovering over a district highlights it and shows a tooltip (district name + case count).
- Clicking a district zooms the map to that district's boundary, showing only it.
- The right panel, when a district is selected, shows district-scoped KPI + category-mix data in addition to the existing station list and alert feed.
- Clicking back (existing sidebar control) restores both the state-wide map view and the state-wide panel.

## Non-goals

- Multi-district selection (rubber-band/box select). Confirmed out of scope — the app's data model is single-district drill-down.
- A dedicated map-level "back to state" button — the existing `StationDrilldownList` back button already clears `?district=`, and the map reacts to that same shared state.
- A separate route for district drill-down (e.g. `/command-center/districts/:id`) — selection stays a query param, unchanged from today.
- Filtering `AlertFeed` to the selected district — no per-district alert data exists; alerts stay state-wide.
- Adding station markers/pins to the zoomed district map — the district view shows only the boundary, not station locations.

## Architecture

### 1. Map hover highlight + tooltip (`DistrictMap.tsx`)

- On the existing `district-fill` layer, add:
  - `mousemove`: resolve the hovered feature's `districtId`; clear the previous hovered feature's `feature-state` (`hover: false`) and set it on the new one (`hover: true`), so exactly one district is highlighted at a time. Set `map.getCanvas().style.cursor = 'pointer'`.
  - `mouseleave`: clear the current hover feature-state and reset the cursor.
- `fill-outline-color`'s paint expression is changed to reference `['feature-state', 'hover']`, so the hovered district gets a visibly distinct outline color, independent of the case-count fill color scale.
- A single reused `maplibregl.Popup` (`closeButton: false`, `closeOnClick: false`) is shown at the cursor's `lngLat` on `mousemove` with the district's name and case count, and removed on `mouseleave`.
- Hover handlers are no-ops while a district is already selected (`selectedDistrictId != null`), since only one feature is rendered at that point.

### 2. Click drill-down zoom (`DistrictMap.tsx`)

- `DistrictMap` gains a new prop: `selectedDistrictId: number | null`, passed down from `CommandCenterScreen`'s existing `selectedDistrictId` (derived from `?district=`).
- The existing `click` handler on `district-fill` is unchanged — it still calls `onDistrictSelect(districtId)`, which sets the URL param.
- A new `useEffect` keyed on `selectedDistrictId` (and the loaded boundaries):
  - **Selected:** `map.setFilter('district-fill', ['==', ['get', 'districtId'], selectedDistrictId])` to show only that district's fill, and `map.fitBounds(bbox(feature), { padding: 40 })` to zoom the camera to it.
  - **Cleared:** `map.setFilter('district-fill', null)` to restore all districts, and `map.fitBounds(bbox(boundaries))` (or the original `center: [76.5, 15.3], zoom: 5.5`) to restore the state-wide view.
- `bbox()` is a small local helper (no new dependency) that recursively walks a Polygon/MultiPolygon's coordinate arrays to compute `[[minLng, minLat], [maxLng, maxLat]]`. It assumes at least one coordinate exists — always true for the in-repo GeoJSON, so no defensive fallback is needed.

No new route is introduced. Drill-down state continues to live entirely in the `?district=` URL param on `/command-center`.

### 3. District-scoped KPI + category mix panel

**New API surface** (`src/api/geoApi.ts`), mirroring the existing `getStationSummaries`/`useStationSummaries` pattern:

```ts
export interface DistrictSummaryResponse {
  kpi: KpiResponse;              // reused from commandCenterApi.ts
  categoryMix: CategorySliceResponse[]; // reused from commandCenterApi.ts
}

export function getDistrictSummary(token: string | null, districtId: number): Promise<DistrictSummaryResponse> {
  return apiFetch(`/api/geo/districts/${districtId}/summary`, {}, token);
}

export function useDistrictSummary(token: string | null, districtId: number | null) {
  return useQuery({
    queryKey: ['geo-district-summary', districtId],
    queryFn: () => getDistrictSummary(token, districtId as number),
    staleTime: 60_000,
    enabled: token != null && districtId != null,
  });
}
```

This is a new endpoint contract for the (separate) backend to implement; real-mode behavior beyond calling it is out of scope for this repo.

**Mock synthesis** (`src/api/mockData.ts`):

```ts
function mockDistrictSummary(districtId: number): DistrictSummaryResponse {
  const district = MOCK_DISTRICTS.find((d) => d.districtId === districtId);
  const ratio = (district?.caseCount ?? 0) / MOCK_SUMMARY.kpi.stateCaseCount;
  // Scale kpi's count-like fields (stateCaseCount, topCrimeSubHeadCount) and each
  // categoryMix slice's count by `ratio`, rounded. resolvedPct and the delta fields are
  // rates, not counts, and are carried over unscaled. Same proportional-split spirit as
  // the existing mockStations().
}
```

Wired into `getMockResponse` via a new route match: `path.match(/^\/api\/geo\/districts\/(\d+)\/summary$/)`, following the existing `stationMatch` style.

**`CommandCenterScreen.tsx` changes:**

- Add `districtSummaryQuery = useDistrictSummary(token, isPolicymaker ? null : selectedDistrictId)`.
- Pass `selectedDistrictId` through to `<DistrictMap>`.
- In the side-pane's district-selected branch, render (in order): `KpiPanel` + `CategoryMixChart` fed by `districtSummaryQuery.data` (scoped to the district), then the existing `StationDrilldownList`, then `AlertFeed` (unchanged, state-wide).
- `KpiPanel` and `CategoryMixChart` are reused as-is — they're already presentational components that just take data.

## Error handling

- `districtSummaryQuery` failing does **not** blank the whole screen the way the top-level `isLoading`/`isError` gate does for state-wide data. It's supplementary to a view that still has useful content (`StationDrilldownList`, `AlertFeed`) without it.
- On `districtSummaryQuery.isError`, render an inline `<p role="alert">Couldn't load district details <button onClick={...refetch}>Retry</button></p>` in place of the KPI/category-mix block; the rest of the side pane renders normally.
- Map-side hover/selection cleanup: the existing `useEffect` teardown (`map.remove()`) already discards feature-state and any open popup when the component unmounts — no separate cleanup path is needed.

## Testing

- Extend the existing `FakeMap` in `DistrictMap.test.tsx` to support `setFilter`, `fitBounds`, `setFeatureState`, `removeFeatureState`, and a fake `Popup` (`setLngLat`/`setHTML`/`addTo`/`remove`), plus firing synthetic `mousemove`/`mouseleave` on `district-fill`.
- Unit test the `bbox()` helper directly against sample Polygon and MultiPolygon fixtures — pure function, no map needed.
- `DistrictMap` tests:
  - Hovering a feature sets its `hover` feature-state and shows tooltip text (name + case count); leaving clears both and resets the cursor.
  - Selecting a district (`selectedDistrictId` set) calls `setFilter` with that district and `fitBounds` with its bbox.
  - Clearing selection resets the filter to `null` and re-fits to the full extent.
- `mockData.ts` test: `mockDistrictSummary()` scales counts proportionally and rounds sanely for a large district (Bengaluru Urban) and a small one (Bagalkote).
- `CommandCenterScreen.test.tsx`: selecting a district renders `KpiPanel` + `CategoryMixChart` (scoped data) above the station list; simulating a `districtSummaryQuery` error shows the inline retry UI while the rest of the pane still renders.
