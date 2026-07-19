# Station Incident-Point Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user drill from a district into a single station and see a MapLibre density heatmap of that station's real incident points (backed by the already-shipped `GET /api/geo/stations/{unitId}/incidents`), with a third breadcrumb level (`State › District › Station`) and full mock-mode support.

**Architecture:** Extend the existing `DistrictMap` component (already the sole owner of all map-layer logic) with a `selectedStationId` prop and a `heatmap`-type MapLibre layer, driven by a new `useStationIncidents` hook in `geoApi.ts`. `CommandCenterScreen` gains a second URL param (`station`, alongside the existing `district`). `StationDrilldownList` rows become clickable. `mockData.ts` gains a deterministic incident-point generator derived from the real station boundary centroid, so the feature works with no backend running.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-query` 5, `maplibre-gl` 5, `react-router-dom` 7, Vitest + Testing Library.

## Global Constraints

- No `Math.random()` anywhere in mock data — every mock function must be deterministic across calls (existing project-wide rule, see `mockCaseSummaries`/`districtTimeOfDayBuckets`).
- No per-point hover/tooltip on individual heatmap points — heatmaps represent density, not individually-addressable features (spec non-goal).
- No zoom-dependent heatmap→circle-layer transition — a single `heatmap` layer with fixed paint constants is sufficient (spec non-goal).
- The unmerged `feature/case-explorer` branch (`CaseHeatmapView`, `generatedStationCentroids.ts`) is not reused — build fresh against `master` (per prior decision in this session).
- Backend is already shipped and unaffected by this plan (`core-platform` commit `fb85241`) — this plan is frontend-only.

---

## Task 1: `geoApi.ts` — station incidents API + hook

**Files:**
- Modify: `src/api/geoApi.ts`
- Test: `src/api/geoApi.test.tsx`

**Interfaces:**
- Produces: `StationIncidentPointResponse { caseMasterId: number; crimeNo: string; latitude: number; longitude: number }`, `getStationIncidents(token: string | null, unitId: number): Promise<StationIncidentPointResponse[]>`, `useStationIncidents(token: string | null, unitId: number | null): UseQueryResult<StationIncidentPointResponse[]>`.

- [ ] **Step 1: Write the failing tests**

Open `src/api/geoApi.test.tsx` and add these imports to the existing `from './geoApi'` import block (keep every existing named import already there):

```ts
  getStationIncidents,
  useStationIncidents,
  type StationIncidentPointResponse,
```

Then append at the end of the file:

```ts
const samplePoints: StationIncidentPointResponse[] = [
  { caseMasterId: 501, crimeNo: '12/2026', latitude: 12.9757, longitude: 77.6057 },
];

describe('getStationIncidents', () => {
  it('fetches /api/geo/stations/{unitId}/incidents with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(samplePoints);
    const result = await getStationIncidents('test-token', 301);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/stations/301/incidents', {}, 'test-token');
    expect(result).toEqual(samplePoints);
  });
});

describe('useStationIncidents', () => {
  it('returns the fetched incident points once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(samplePoints);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useStationIncidents('test-token', 301), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(samplePoints);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/api/geoApi.test.tsx`
Expected: FAIL — `getStationIncidents`/`useStationIncidents`/`StationIncidentPointResponse` are not exported from `./geoApi`.

- [ ] **Step 3: Implement**

In `src/api/geoApi.ts`, add after the existing `DistrictTimeOfDayResponse` interface (after line 50, before `getDistrictSummaries`):

```ts
export interface StationIncidentPointResponse {
  caseMasterId: number;
  crimeNo: string;
  latitude: number;
  longitude: number;
}
```

Then append at the end of the file (after `useDistrictTimeOfDay`):

```ts
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/api/geoApi.test.tsx`
Expected: PASS, all tests including the two new ones.

- [ ] **Step 5: Commit**

```bash
cd ksp-crime-analytics-frontend
git add src/api/geoApi.ts src/api/geoApi.test.tsx
git commit -m "Add getStationIncidents/useStationIncidents to geoApi"
```

---

## Task 2: `mockData.ts` — deterministic station incident points

**Files:**
- Modify: `src/api/mockData.ts`
- Test: `src/api/mockData.test.ts`

**Interfaces:**
- Consumes: `STATIONS_BY_DISTRICT` (from `./generatedStationFixtures`, already imported), `loadStationBoundaries(districtId): Promise<unknown>` (existing, line 54), `findStationName(unitId): string | undefined` (existing, line 265), `mockCaseSummaries(unitId, unitName)` (existing, line 276), `CASES_PER_STATION` (existing, line 257), `featureCentroid(geometry): [number, number]` (new import from `../screens/command-center/geoBounds`).
- Produces: `mockStationIncidents(unitId: number): Promise<Array<{ caseMasterId: number; crimeNo: string; latitude: number; longitude: number }>>`, wired into `getMockResponse` for `/api/geo/stations/{unitId}/incidents`.

- [ ] **Step 1: Write the failing tests**

Append to `src/api/mockData.test.ts`:

```ts
describe('getMockResponse station incidents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const panamburGeometry = {
    type: 'Polygon',
    coordinates: [[[74.80, 12.94], [74.84, 12.94], [74.84, 12.98], [74.80, 12.98], [74.80, 12.94]]],
  };
  const panamburFixture = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { unitId: 355, unitName: 'Panambur PS' }, geometry: panamburGeometry }],
  };

  it('returns one point per mock case, clustered around the station boundary centroid', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(panamburFixture),
    } as unknown as Response);

    const result = (await getMockResponse('/api/geo/stations/355/incidents', { method: 'GET' })) as Array<{
      caseMasterId: number;
      crimeNo: string;
      latitude: number;
      longitude: number;
    }>;

    expect(result).toHaveLength(6); // CASES_PER_STATION
    const centerLng = 74.82;
    const centerLat = 12.96;
    for (const point of result) {
      expect(Math.abs(point.longitude - centerLng)).toBeLessThan(0.02);
      expect(Math.abs(point.latitude - centerLat)).toBeLessThan(0.02);
      expect(typeof point.caseMasterId).toBe('number');
      expect(typeof point.crimeNo).toBe('string');
    }
  });

  it('is deterministic across calls', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(panamburFixture),
    } as unknown as Response);

    const first = await getMockResponse('/api/geo/stations/355/incidents', { method: 'GET' });
    const second = await getMockResponse('/api/geo/stations/355/incidents', { method: 'GET' });
    expect(first).toEqual(second);
  });

  it('returns an empty array for a unitId not present in any district roster', async () => {
    const result = await getMockResponse('/api/geo/stations/999999/incidents', { method: 'GET' });
    expect(result).toEqual([]);
  });
});
```

Note: this test uses unitId `355` (Panambur PS, district 11) deliberately — the existing "station boundaries" test in this same file already caches district `5`'s `loadStationBoundaries` promise, and that in-module cache (`stationBoundaryPromises` in `mockData.ts`) persists across tests in the same file. Reusing district 5 here would silently return the *other* test's cached fixture instead of this test's mock. District 11 is untouched by every other test in this file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/api/mockData.test.ts`
Expected: FAIL — `getMockResponse('/api/geo/stations/355/incidents', ...)` returns `undefined` (no route match yet), so `result` is not an array and `toHaveLength(6)` fails.

- [ ] **Step 3: Implement**

In `src/api/mockData.ts`, add this import at the top, alongside the existing `STATIONS_BY_DISTRICT` import:

```ts
import { featureCentroid } from '../screens/command-center/geoBounds';
```

Add these two functions right after `findStationName` (after line 271, before `mockCaseSummaries`):

```ts
function findStationDistrictId(unitId: number): number | undefined {
  for (const [districtId, roster] of Object.entries(STATIONS_BY_DISTRICT)) {
    if (roster.some((s) => s.unitId === unitId)) return Number(districtId);
  }
  return undefined;
}
```

Add `mockStationIncidents` after `mockCaseSummaries` (after line 292, before the `VICTIM_NAMES` constant):

```ts
// Deterministic jitter around the station's real boundary centroid (no Math.random(),
// same spirit as mockCaseSummaries) -- reuses CASES_PER_STATION's count so the heatmap
// and the station's own case list agree on volume.
async function mockStationIncidents(unitId: number) {
  const districtId = findStationDistrictId(unitId);
  if (districtId == null) return [];
  const boundaries = (await loadStationBoundaries(districtId)) as {
    features: Array<{ properties: { unitId: number }; geometry: { coordinates: unknown } }>;
  };
  const feature = boundaries.features.find((f) => f.properties.unitId === unitId);
  if (!feature) return [];
  const [centerLng, centerLat] = featureCentroid(feature.geometry);
  const unitName = findStationName(unitId) ?? '';

  return mockCaseSummaries(unitId, unitName).map((c, index) => {
    const angle = (index / CASES_PER_STATION) * 2 * Math.PI;
    const radius = 0.01 + (index % 3) * 0.005; // ~1-2km wobble, cycles 3 ways
    return {
      caseMasterId: c.caseId,
      crimeNo: c.caseNumber,
      latitude: centerLat + Math.sin(angle) * radius,
      longitude: centerLng + Math.cos(angle) * radius,
    };
  });
}
```

Wire it into `getMockResponse`, right after the `districtDetailMatch` block (after line 400, before the `/api/cases?` handling):

```ts
  const stationIncidentsMatch = path.match(/^\/api\/geo\/stations\/(\d+)\/incidents$/);
  if (stationIncidentsMatch) return mockStationIncidents(Number(stationIncidentsMatch[1]));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/api/mockData.test.ts`
Expected: PASS, all tests including the three new ones.

- [ ] **Step 5: Commit**

```bash
cd ksp-crime-analytics-frontend
git add src/api/mockData.ts src/api/mockData.test.ts
git commit -m "Add deterministic mock station incident points"
```

---

## Task 3: `DistrictMap.tsx` — heatmap layer, station click, breadcrumb

**Files:**
- Modify: `src/screens/command-center/DistrictMap.tsx`
- Modify: `src/design-system/components.css`
- Test: `src/screens/command-center/DistrictMap.test.tsx`

**Interfaces:**
- Consumes: `StationIncidentPointResponse` (from Task 1's `../../api/geoApi`), `geometryBounds` (existing import from `./geoBounds`).
- Produces: `DistrictMap` gains props `selectedStationId: number | null`, `stationIncidents?: StationIncidentPointResponse[]`, `onStationSelect: (unitId: number) => void`, `onStationBack: () => void`. Adds MapLibre source `heatmap-incidents` and layer `heatmap-incidents-layer`.

- [ ] **Step 1: Write the failing tests**

In `src/screens/command-center/DistrictMap.test.tsx`, add `StationIncidentPointResponse` to the existing `import type { ... } from '../../api/geoApi'` block, and add these fixtures near the existing `stationBoundariesWithGeometry` constant:

```ts
const stationIncidents: StationIncidentPointResponse[] = [
  { caseMasterId: 1, crimeNo: 'GEO-1/2026', latitude: 11.4, longitude: 76.4 },
  { caseMasterId: 2, crimeNo: 'GEO-2/2026', latitude: 11.41, longitude: 76.41 },
];
```

Append these tests to the `describe('DistrictMap', ...)` block (every render call needs `onStationSelect`/`onStationBack` added; the tests below add them explicitly):

```ts
  it('adds a heatmap source/layer for the selected station\'s incident points, and dims its siblings', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={302}
        stationIncidents={stationIncidents}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    const source = map.getSource('heatmap-incidents') as { data: { features: unknown[] } };
    expect(source.data.features).toHaveLength(2);
    expect(map.getLayer('heatmap-incidents-layer')).toEqual(expect.objectContaining({ type: 'heatmap' }));
    expect(map.paintProperties['fill-opacity']).toEqual(['case', ['==', ['get', 'unitId'], 302], 1, 0.15]);
    expect(map.lastFitBounds?.bounds).toEqual([[76.3, 11.3], [76.5, 11.5]]);
  });

  it('removes the heatmap layer/source and resets station opacity when the station selection clears', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={302}
        stationIncidents={stationIncidents}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={null}
        stationIncidents={[]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    expect(map.getLayer('heatmap-incidents-layer')).toBeUndefined();
    expect(map.getSource('heatmap-incidents')).toBeUndefined();
    expect(map.paintProperties['fill-opacity']).toBe(1);
  });

  it('calls onStationSelect with the clicked station unitId', () => {
    const onStationSelect = vi.fn();
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        selectedStationId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={onStationSelect}
        onStationBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['click:station-fill']({ features: [{ properties: { unitId: 302 } }] });

    expect(onStationSelect).toHaveBeenCalledWith(302);
  });

  it('shows a three-level breadcrumb with the incident count when a station is selected', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={302}
        stationIncidents={stationIncidents}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Mysuru Rural PS')).toBeInTheDocument();
    expect(screen.getByText('2 incidents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mysuru' })).toBeInTheDocument();
  });

  it('calls onStationBack when the district breadcrumb segment is clicked while a station is selected', async () => {
    const onStationBack = vi.fn();
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={302}
        stationIncidents={stationIncidents}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={onStationBack}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mysuru' }));

    expect(onStationBack).toHaveBeenCalled();
  });
```

Every pre-existing `<DistrictMap ... />` render call in this file that does **not** already pass `onStationSelect`/`onStationBack` will now fail to type-check once Step 3 makes those props required. Add `onStationSelect={vi.fn()} onStationBack={vi.fn()}` to every existing render call in the file (there are 17 of them, all following the same `onDistrictSelect={vi.fn()} onBack={vi.fn()}` pattern — add the two new props right after those two on each).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/screens/command-center/DistrictMap.test.tsx`
Expected: FAIL — TypeScript errors for missing required props, plus the five new assertions failing (`getSource('heatmap-incidents')` undefined, `click:station-fill` handler not registered, breadcrumb text not found).

- [ ] **Step 3: Implement**

In `src/screens/command-center/DistrictMap.tsx`:

**3a. Import the new type** — add to the existing `import type { ... } from '../../api/geoApi'` block:

```ts
  StationIncidentPointResponse,
```

**3b. Extend `DistrictMapProps`** (the interface starting at line 13) — add after `stationSummaries?: StationSummaryResponse[];`:

```ts
  selectedStationId?: number | null;
  stationIncidents?: StationIncidentPointResponse[];
  onStationSelect: (unitId: number) => void;
  onStationBack: () => void;
```

**3c. Add `applyStationSelection`**, a new module-level function placed right after `applyDistrictSelection` (after line 159):

```ts
// Dims every sibling station (matching applyDistrictSelection's dimming, one level
// down), zooms to the selected station's boundary, and swaps its choropleth fill for a
// density heatmap of its real incident points. No zoom-dependent circle-layer
// transition and no per-point hover -- a single fixed-paint heatmap layer is enough.
function applyStationSelection(
  map: InstanceType<typeof maplibregl.Map>,
  stationBoundaries: StationBoundaryFeatureCollection | null,
  selectedStationId: number | null,
  stationIncidents: StationIncidentPointResponse[],
) {
  if (!map.getLayer('station-fill')) return;

  if (selectedStationId == null) {
    map.setPaintProperty('station-fill', 'fill-opacity', 1);
    if (map.getLayer('heatmap-incidents-layer')) map.removeLayer('heatmap-incidents-layer');
    if (map.getSource('heatmap-incidents')) map.removeSource('heatmap-incidents');
    return;
  }

  map.setPaintProperty('station-fill', 'fill-opacity', [
    'case',
    ['==', ['get', 'unitId'], selectedStationId],
    1,
    0.15,
  ]);

  const feature = stationBoundaries?.features.find((f) => f.properties.unitId === selectedStationId);
  if (feature) map.fitBounds(geometryBounds(feature.geometry), { padding: 40 });

  const points = {
    type: 'FeatureCollection' as const,
    features: stationIncidents.map((p) => ({
      type: 'Feature' as const,
      properties: { caseMasterId: p.caseMasterId, crimeNo: p.crimeNo },
      geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
    })),
  };

  const existingSource = map.getSource('heatmap-incidents') as { setData: (data: unknown) => void } | undefined;
  if (existingSource) {
    existingSource.setData(points);
    return;
  }
  map.addSource('heatmap-incidents', { type: 'geojson', data: points });
  map.addLayer({
    id: 'heatmap-incidents-layer',
    type: 'heatmap',
    source: 'heatmap-incidents',
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': 1,
      'heatmap-radius': 24,
      'heatmap-opacity': 0.85,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(255,255,178,0)',
        0.2, 'rgba(255,237,160,0.6)',
        0.4, 'rgba(254,178,76,0.7)',
        0.6, 'rgba(253,141,60,0.8)',
        0.8, 'rgba(240,59,32,0.9)',
        1, 'rgba(189,0,38,1)',
      ],
    },
  });
}
```

Written inline, matching every other paint expression in this file (e.g. `district-fill`'s `fill-color`/`fill-outline-color` above) — none of them are extracted to a separately-typed constant, and `maplibre-gl`'s own TS defs process `heatmap-color` through an internal `ColorRampProperty` class rather than exposing a public "expression" type meant for raw style JSON, so there's no safe separate type annotation to reach for here anyway.

**3d. Destructure the new props** in the `DistrictMap` function signature (line 166) — add `selectedStationId = null, stationIncidents = [], onStationSelect, onStationBack,` alongside the existing destructured props.

**3e. Add an `onStationSelectRef`** alongside the existing `onDistrictSelectRef` (near line 181): `const onStationSelectRef = useRef(onStationSelect);` and set it each render next to the other ref assignments: `onStationSelectRef.current = onStationSelect;`.

**3f. Add the click handler** inside the existing station-layer `useEffect` (the one that adds `mousemove:station-fill`/`mouseleave:station-fill`, around lines 358-388) — add right after the existing `map.on('mouseleave', 'station-fill', ...)` block:

```ts
    map.on('click', 'station-fill', (e) => {
      const unitId = e.features?.[0]?.properties?.unitId;
      if (typeof unitId === 'number') onStationSelectRef.current(unitId);
    });
```

**3g. Add a new `useEffect`** immediately after that station-layer effect (after its closing `}, [stationBoundaries, stationSummaries, boundaries]);`):

```ts
  // Mirrors the district-level selection effect one level down: dims sibling
  // stations, zooms to the selected one, and (re)builds its heatmap layer. Declared
  // after the station-layer effect above so it always runs against a freshly (re)built
  // station-fill layer within the same commit when stationBoundaries changes.
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    applyStationSelection(mapRef.current, stationBoundaries, selectedStationId, stationIncidents);
  }, [stationBoundaries, selectedStationId, stationIncidents]);
```

**3h. Extend the breadcrumb JSX** (lines 412-436). Replace:

```tsx
  const selectedDistrict =
    selectedDistrictId != null ? districtSummaries.find((d) => d.districtId === selectedDistrictId) : undefined;

  return (
    <div className="map-card">
      <div
        ref={containerRef}
        className="map-canvas"
        role="img"
        aria-label="Map of Karnataka's districts shaded by case count"
      />
      {selectedDistrict && (
        <div className="map-breadcrumb">
          <div className="breadcrumb">
            <button className="breadcrumb-back" onClick={onBack}>
              State
            </button>
            <span className="sep">›</span>
            <b>{selectedDistrict.districtName}</b>
            <span className="map-breadcrumb-count">{selectedDistrict.caseCount.toLocaleString()} cases</span>
          </div>
        </div>
      )}
    </div>
  );
```

with:

```tsx
  const selectedDistrict =
    selectedDistrictId != null ? districtSummaries.find((d) => d.districtId === selectedDistrictId) : undefined;
  const selectedStation =
    selectedStationId != null ? stationSummaries.find((s) => s.unitId === selectedStationId) : undefined;

  return (
    <div className="map-card">
      <div
        ref={containerRef}
        className="map-canvas"
        role="img"
        aria-label="Map of Karnataka's districts shaded by case count"
      />
      {selectedDistrict && (
        <div className="map-breadcrumb">
          <div className="breadcrumb">
            <button className="breadcrumb-back" onClick={onBack}>
              State
            </button>
            <span className="sep">›</span>
            {selectedStation ? (
              <>
                <button className="breadcrumb-back" onClick={onStationBack}>
                  {selectedDistrict.districtName}
                </button>
                <span className="sep">›</span>
                <b>{selectedStation.unitName}</b>
                <span className="map-breadcrumb-count">{stationIncidents.length.toLocaleString()} incidents</span>
              </>
            ) : (
              <>
                <b>{selectedDistrict.districtName}</b>
                <span className="map-breadcrumb-count">{selectedDistrict.caseCount.toLocaleString()} cases</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
```

**3i. CSS** — no new rule is needed; the third segment reuses `.breadcrumb-back` and `.sep` exactly as-is.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/screens/command-center/DistrictMap.test.tsx`
Expected: PASS, all tests including the five new ones.

- [ ] **Step 5: Commit**

```bash
cd ksp-crime-analytics-frontend
git add src/screens/command-center/DistrictMap.tsx src/screens/command-center/DistrictMap.test.tsx
git commit -m "Add station incident heatmap layer to DistrictMap"
```

---

## Task 4: `StationDrilldownList.tsx` — clickable rows

**Files:**
- Modify: `src/screens/command-center/StationDrilldownList.tsx`
- Modify: `src/design-system/components.css`
- Test: `src/screens/command-center/StationDrilldownList.test.tsx`

**Interfaces:**
- Produces: `StationDrilldownList` gains props `selectedStationId?: number | null`, `onStationSelect: (unitId: number) => void`.

- [ ] **Step 1: Write the failing tests**

Append to `src/screens/command-center/StationDrilldownList.test.tsx`:

```ts
  it('calls onStationSelect with the clicked station\'s unitId', async () => {
    const onStationSelect = vi.fn();
    render(
      <StationDrilldownList
        districtName="Bengaluru Urban"
        stations={stations}
        onBack={vi.fn()}
        onStationSelect={onStationSelect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Halasuru PS/ }));

    expect(onStationSelect).toHaveBeenCalledWith(102);
  });

  it('marks the selected station row', () => {
    render(
      <StationDrilldownList
        districtName="Bengaluru Urban"
        stations={stations}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        selectedStationId={102}
      />,
    );

    expect(screen.getByRole('button', { name: /Halasuru PS/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /Cubbon Park PS/ })).not.toHaveAttribute('aria-current');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/screens/command-center/StationDrilldownList.test.tsx`
Expected: FAIL — TypeScript error (`onStationSelect` not a valid prop) and `getByRole('button', { name: /Halasuru PS/ })` finds nothing (rows are `<li>`, not buttons, today).

- [ ] **Step 3: Implement**

Replace the full contents of `src/screens/command-center/StationDrilldownList.tsx`:

```tsx
import type { StationSummaryResponse } from '../../api/geoApi';

interface StationDrilldownListProps {
  districtName: string;
  stations: StationSummaryResponse[];
  selectedStationId?: number | null;
  onBack: () => void;
  onStationSelect: (unitId: number) => void;
}

export function StationDrilldownList({
  districtName,
  stations,
  selectedStationId = null,
  onBack,
  onStationSelect,
}: StationDrilldownListProps) {
  const sorted = [...stations].sort((a, b) => b.caseCount - a.caseCount);

  return (
    <section className="station-drilldown">
      <div className="breadcrumb">
        <button className="breadcrumb-back" onClick={onBack}>State</button>
        <span className="sep">›</span>
        <b>{districtName}</b>
      </div>
      {sorted.length === 0 ? (
        <p>No stations with cases in this district.</p>
      ) : (
        <ul className="station-list">
          {sorted.map((station) => (
            <li key={station.unitId}>
              <button
                type="button"
                className={`station-list-row${station.unitId === selectedStationId ? ' selected' : ''}`}
                aria-current={station.unitId === selectedStationId ? 'true' : undefined}
                onClick={() => onStationSelect(station.unitId)}
              >
                <span>{station.unitName}</span>
                <span className="mono">{station.caseCount.toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Update `src/design-system/components.css` — replace the existing `.station-list-row` rule (line 111):

```css
.station-list-row { display: flex; justify-content: space-between; padding: 8px 10px; background: var(--canvas); border: 1px solid var(--line); border-radius: 7px; font-size: 12.5px; }
```

with:

```css
.station-list-row { display: flex; justify-content: space-between; width: 100%; padding: 8px 10px; background: var(--canvas); border: 1px solid var(--line); border-radius: 7px; font-size: 12.5px; font-family: inherit; color: inherit; text-align: left; cursor: pointer; }
.station-list-row.selected { border-color: var(--real); background: var(--panel); }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/screens/command-center/StationDrilldownList.test.tsx`
Expected: PASS, all tests including the two new ones.

- [ ] **Step 5: Commit**

```bash
cd ksp-crime-analytics-frontend
git add src/screens/command-center/StationDrilldownList.tsx src/design-system/components.css src/screens/command-center/StationDrilldownList.test.tsx
git commit -m "Make StationDrilldownList rows clickable"
```

---

## Task 5: `CommandCenterScreen.tsx` — wire station selection end-to-end

**Files:**
- Modify: `src/screens/command-center/CommandCenterScreen.tsx`
- Test: `src/screens/command-center/CommandCenterScreen.test.tsx`

**Interfaces:**
- Consumes: `useStationIncidents` (Task 1), `DistrictMap`'s new props (Task 3), `StationDrilldownList`'s new props (Task 4).

- [ ] **Step 1: Write the failing tests**

In `src/screens/command-center/CommandCenterScreen.test.tsx`, update the `vi.mock('./DistrictMap', ...)` mock to also expose the station controls, so tests can trigger a station selection the same way they already trigger a district selection:

```ts
vi.mock('./DistrictMap', () => ({
  DistrictMap: ({
    onDistrictSelect,
    onStationSelect,
    stationBoundaries,
    stationIncidents,
  }: {
    onDistrictSelect: (id: number) => void;
    onStationSelect: (id: number) => void;
    stationBoundaries: unknown;
    stationIncidents?: unknown[];
  }) => (
    <>
      <button onClick={() => onDistrictSelect(3)}>Select Mysuru</button>
      <button onClick={() => onStationSelect(300)}>Select Station</button>
      {stationBoundaries ? <p>Station boundaries loaded</p> : null}
      {stationIncidents ? <p>{stationIncidents.length} incident points loaded</p> : null}
    </>
  ),
}));
```

Add `vi.spyOn(geoApiModule, 'useStationIncidents').mockReturnValue(mockSuccess<geoApiModule.StationIncidentPointResponse[]>([]));` to every existing test in the file that already stubs `useStationBoundaries` (there are four such tests) — add it right after each `useStationBoundaries` spy line.

Append two new tests:

```ts
  it('selecting a station sets ?station= and fetches its incident points', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));
    vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(mockSuccess(districts));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(boundaries));
    vi.spyOn(geoApiModule, 'useStationSummaries').mockReturnValue(mockSuccess(stations));
    vi.spyOn(geoApiModule, 'useDistrictDetail').mockReturnValue(mockSuccess(districtDetail));
    vi.spyOn(geoApiModule, 'useStationBoundaries').mockReturnValue(mockSuccess(stationBoundaries));
    const stationIncidents: geoApiModule.StationIncidentPointResponse[] = [
      { caseMasterId: 1, crimeNo: '1/2026', latitude: 12.3, longitude: 76.6 },
      { caseMasterId: 2, crimeNo: '2/2026', latitude: 12.31, longitude: 76.61 },
    ];
    const useStationIncidentsSpy = vi
      .spyOn(geoApiModule, 'useStationIncidents')
      .mockReturnValue(mockSuccess(stationIncidents));
    vi.spyOn(alertsApiModule, 'useEmergingAlerts').mockReturnValue(mockSuccess(alerts));
    vi.spyOn(geoApiModule, 'useDistrictTimeOfDay').mockReturnValue(mockSuccess(timeOfDay));

    renderScreen();

    await userEvent.click(await screen.findByText('Select Mysuru'));
    await userEvent.click(await screen.findByText('Select Station'));

    expect(await screen.findByText('2 incident points loaded')).toBeInTheDocument();
    expect(useStationIncidentsSpy).toHaveBeenCalledWith('jwt', 300);
  });

  it('clearing the district also clears the station selection', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));
    vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(mockSuccess(districts));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(boundaries));
    vi.spyOn(geoApiModule, 'useStationSummaries').mockReturnValue(mockSuccess(stations));
    vi.spyOn(geoApiModule, 'useDistrictDetail').mockReturnValue(mockSuccess(districtDetail));
    vi.spyOn(geoApiModule, 'useStationBoundaries').mockReturnValue(mockSuccess(stationBoundaries));
    const useStationIncidentsSpy = vi
      .spyOn(geoApiModule, 'useStationIncidents')
      .mockReturnValue(mockSuccess<geoApiModule.StationIncidentPointResponse[]>([]));
    vi.spyOn(alertsApiModule, 'useEmergingAlerts').mockReturnValue(mockSuccess(alerts));
    vi.spyOn(geoApiModule, 'useDistrictTimeOfDay').mockReturnValue(mockSuccess(timeOfDay));

    renderScreen();

    await userEvent.click(await screen.findByText('Select Mysuru'));
    await userEvent.click(await screen.findByText('Select Station'));
    expect(useStationIncidentsSpy).toHaveBeenLastCalledWith('jwt', 300);

    // The mocked DistrictMap doesn't expose a "clear district" control, but
    // StationDrilldownList's real "State" breadcrumb button does -- it's rendered
    // for real (not mocked) in the side pane.
    await userEvent.click(screen.getByRole('button', { name: 'State' }));

    await waitFor(() => expect(useStationIncidentsSpy).toHaveBeenLastCalledWith('jwt', null));
  });

  it('shows an inline retry control when station incidents fail to load', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));
    vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(mockSuccess(districts));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(boundaries));
    vi.spyOn(geoApiModule, 'useStationSummaries').mockReturnValue(mockSuccess(stations));
    vi.spyOn(geoApiModule, 'useDistrictDetail').mockReturnValue(mockSuccess(districtDetail));
    vi.spyOn(geoApiModule, 'useStationBoundaries').mockReturnValue(mockSuccess(stationBoundaries));
    const refetch = vi.fn();
    vi.spyOn(geoApiModule, 'useStationIncidents').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch,
    } as unknown as UseQueryResult<geoApiModule.StationIncidentPointResponse[], Error>);
    vi.spyOn(alertsApiModule, 'useEmergingAlerts').mockReturnValue(mockSuccess(alerts));
    vi.spyOn(geoApiModule, 'useDistrictTimeOfDay').mockReturnValue(mockSuccess(timeOfDay));

    renderScreen();

    await userEvent.click(await screen.findByText('Select Mysuru'));
    await userEvent.click(await screen.findByText('Select Station'));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load incident points");
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/screens/command-center/CommandCenterScreen.test.tsx`
Expected: FAIL — `useStationIncidents` doesn't exist as a spy target the mock component can call yet in the way asserted (screen renders no "Select Station" button / no incident-point text), clearing the district doesn't clear a station param that doesn't exist yet, and there's no inline retry control for a failed station-incidents fetch.

- [ ] **Step 3: Implement**

In `src/screens/command-center/CommandCenterScreen.tsx`:

**3a.** Add the import, alongside the existing `geoApi` import block:

```ts
  useStationIncidents,
```

**3b.** After the existing `const districtDrilldownId = ...` line, add:

```ts
  const selectedStationId = searchParams.get('station') ? Number(searchParams.get('station')) : null;
  const stationDrilldownId = isPolicymaker ? null : selectedStationId;
```

**3c.** Add the query, alongside the other `Query` declarations:

```ts
  const stationIncidentsQuery = useStationIncidents(token, stationDrilldownId);
```

**3d.** Add `selectStation`/`clearStation` functions, right after the existing `clearDistrict` function, and update `clearDistrict` to also clear the station param:

```ts
  function selectStation(unitId: number) {
    if (isPolicymaker) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('station', String(unitId));
      return next;
    });
  }

  function clearStation() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('station');
      return next;
    });
  }
```

Then modify the existing `clearDistrict` function to also drop `station`:

```ts
  function clearDistrict() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('district');
      next.delete('station');
      return next;
    });
  }
```

**3e.** Pass the new props to `<DistrictMap>`:

```tsx
          <DistrictMap
            boundaries={boundaries}
            districtSummaries={districtSummaries}
            selectedDistrictId={districtDrilldownId}
            stationBoundaries={stationBoundariesQuery.data ?? null}
            stationSummaries={stationSummariesQuery.data ?? []}
            selectedStationId={stationDrilldownId}
            stationIncidents={stationIncidentsQuery.data ?? []}
            alerts={alerts}
            caseCountOverride={caseCountOverride}
            onDistrictSelect={selectDistrict}
            onBack={clearDistrict}
            onStationSelect={selectStation}
            onStationBack={clearStation}
          />
```

**3f.** Pass the new props to `<StationDrilldownList>`, and add an inline retry block right after it for a failed `stationIncidentsQuery` — same non-blocking pattern as the existing `districtDetailQuery.isError` block above it:

```tsx
                <StationDrilldownList
                  districtName={selectedDistrictName}
                  stations={stationSummariesQuery.data}
                  selectedStationId={stationDrilldownId}
                  onBack={clearDistrict}
                  onStationSelect={selectStation}
                />
                {stationDrilldownId != null && stationIncidentsQuery.isError && (
                  <p role="alert">
                    Couldn't load incident points.{' '}
                    <button onClick={() => stationIncidentsQuery.refetch()}>Retry</button>
                  </p>
                )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ksp-crime-analytics-frontend && npm test -- src/screens/command-center/CommandCenterScreen.test.tsx`
Expected: PASS, all tests including the three new ones.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd ksp-crime-analytics-frontend && npm test`
Expected: PASS, all suites (no regressions in unrelated files from the shared `.station-list-row` CSS/markup change or the `DistrictMap` prop changes).

- [ ] **Step 6: Commit**

```bash
cd ksp-crime-analytics-frontend
git add src/screens/command-center/CommandCenterScreen.tsx src/screens/command-center/CommandCenterScreen.test.tsx
git commit -m "Wire station incident heatmap into CommandCenterScreen"
```

---

## Manual verification (after all tasks)

- [ ] Run `cd ksp-crime-analytics-frontend && npm run dev`, open the Command Center in a browser with `sessionStorage['ksp-mock'] = '1'` set (mock mode), drill into a district, click a station — confirm the map zooms in, siblings dim, a red/orange/yellow heat cluster renders, and the breadcrumb reads `State › <District> › <Station> · N incidents`.
- [ ] Click the district breadcrumb segment — confirm it returns to the district view (station list, no heatmap) without losing the district selection.
- [ ] Click "State" — confirm both district and station clear together.
- [ ] Run `npm run lint` and `npm run build` — confirm no type errors from the new required `DistrictMap`/`StationDrilldownList` props.
