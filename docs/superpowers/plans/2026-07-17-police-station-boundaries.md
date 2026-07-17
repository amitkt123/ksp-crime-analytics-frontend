# Police Station Boundary Subdivision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a district is selected on the Command Center map, subdivide it into its police station boundaries, colored by case count, matching the existing district choropleth's visual language.

**Architecture:** A one-time local script spatial-joins and simplifies the raw KGIS station boundary file into small per-district GeoJSON fixtures (mock/demo mode) and a matching TS roster module; `DistrictMap.tsx` renders a new `station-fill` MapLibre layer on top of the selected district, joined to case-count data by `unitId`; the real backend will eventually serve the same shape via a new endpoint.

**Tech Stack:** React, TypeScript, MapLibre GL JS, TanStack Query, Vitest, Testing Library. No new dependencies.

## Global Constraints

- No new npm dependencies — spatial join, simplification, and rendering all use built-in Node modules and the already-installed `maplibre-gl`.
- Coordinate precision: round simplified coordinates to 5 decimal places (matches the existing `karnataka-districts.geojson` convention).
- Simplification tolerance: Douglas-Peucker epsilon `0.0003` (~30m) on station polygon rings.
- The raw source file `dist/geo/KGISMAPS_KN_Police_Station_Boundaries.geojsonl` must never be committed — `dist/` is gitignored and this is a one-time local input only.
- The station layer is read-only: no click handler, no third drill-down level past station.
- New backend contract (implementation out of scope for this repo): `GET /api/geo/districts/{districtId}/stations/boundaries` → `{ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { unitId: number; unitName: string }, geometry: Polygon | MultiPolygon }] }`.

---

## Task 1: Generate mock station boundary fixtures

**Files:**
- Create: `scripts/build-station-fixtures.mjs`
- Create (generated, commit the output): `public/data/stations/1.geojson` … `public/data/stations/30.geojson`
- Create (generated, commit the output): `src/api/generatedStationFixtures.ts`

**Interfaces:**
- Produces: `public/data/stations/<districtId>.geojson`, each a `FeatureCollection` of `{ type: 'Feature', properties: { unitId: number; unitName: string }, geometry: Polygon | MultiPolygon }`.
- Produces: `src/api/generatedStationFixtures.ts` exporting:
  ```ts
  export interface StationFixture {
    unitId: number;
    unitName: string;
  }
  export const STATIONS_BY_DISTRICT: Record<number, StationFixture[]>;
  ```
  Later tasks (2, 3, 4) import and rely on exactly these two exports.

This task has no unit tests — the script is a throwaway local tool (per the design doc's testing section), not shipped application code. Verification is done by inspecting its actual output after running it once.

- [ ] **Step 1: Write the fixture-generation script**

Create `scripts/build-station-fixtures.mjs`:

```js
// One-time local generator: spatial-joins the raw KGIS police station boundary file to
// Karnataka districts, simplifies each station polygon, and writes small per-district
// GeoJSON fixtures plus a TS roster module for mock-mode use. Not part of the build —
// run manually: node scripts/build-station-fixtures.mjs
// Requires dist/geo/KGISMAPS_KN_Police_Station_Boundaries.geojsonl to exist locally;
// that raw file is never committed (dist/ is gitignored).
import { createInterface } from 'node:readline';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const RAW_INPUT = 'dist/geo/KGISMAPS_KN_Police_Station_Boundaries.geojsonl';
const DISTRICTS_FILE = 'public/data/karnataka-districts.geojson';
const STATIONS_OUT_DIR = 'public/data/stations';
const FIXTURE_OUT_FILE = 'src/api/generatedStationFixtures.ts';
const SIMPLIFY_EPSILON = 0.0003;
const COORD_PRECISION = 5;

function ringCentroid(ring) {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return [sx / ring.length, sy / ring.length];
}

function geometryCentroid(geometry) {
  if (geometry.type === 'Polygon') return ringCentroid(geometry.coordinates[0]);
  const biggest = geometry.coordinates.reduce((a, b) => (a[0].length >= b[0].length ? a : b));
  return ringCentroid(biggest[0]);
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y) {
      const xIntersect = xi + ((y - yi) * (xj - xi)) / (yj - yi);
      if (x < xIntersect) inside = !inside;
    }
  }
  return inside;
}

function pointInPolygonCoords(point, coords) {
  if (!pointInRing(point, coords[0])) return false;
  return coords.slice(1).every((hole) => !pointInRing(point, hole));
}

function pointInGeometry(point, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygonCoords(point, geometry.coordinates);
  return geometry.coordinates.some((poly) => pointInPolygonCoords(point, poly));
}

function distance([x1, y1], [x2, y2]) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function perpendicularDistance(point, a, b) {
  if (a[0] === b[0] && a[1] === b[1]) return distance(point, a);
  const [x, y] = point;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const num = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const den = Math.hypot(y2 - y1, x2 - x1);
  return num / den;
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

function simplifyRing(ring, epsilon) {
  const simplified = douglasPeucker(ring, epsilon);
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) simplified.push(first);
  return simplified;
}

function roundPoint([x, y]) {
  return [Number(x.toFixed(COORD_PRECISION)), Number(y.toFixed(COORD_PRECISION))];
}

function simplifyGeometry(geometry, epsilon) {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, epsilon).map(roundPoint)),
    };
  }
  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.map((poly) => poly.map((ring) => simplifyRing(ring, epsilon).map(roundPoint))),
  };
}

async function main() {
  const districtsGeoJSON = JSON.parse(await readFile(DISTRICTS_FILE, 'utf8'));
  const districts = districtsGeoJSON.features;
  const districtCentroids = districts.map((d) => geometryCentroid(d.geometry));

  function resolveDistrictId(centroid) {
    for (let i = 0; i < districts.length; i++) {
      if (pointInGeometry(centroid, districts[i].geometry)) return districts[i].properties.districtId;
    }
    let nearestIndex = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < districtCentroids.length; i++) {
      const d = distance(centroid, districtCentroids[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    }
    return districts[nearestIndex].properties.districtId;
  }

  const stationsByDistrict = new Map();
  const rl = createInterface({ input: createReadStream(RAW_INPUT), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const feature = JSON.parse(line);
    const centroid = geometryCentroid(feature.geometry);
    const districtId = resolveDistrictId(centroid);
    const name = feature.properties.PS_BOUNDName;
    const geometry = simplifyGeometry(feature.geometry, SIMPLIFY_EPSILON);
    if (!stationsByDistrict.has(districtId)) stationsByDistrict.set(districtId, []);
    stationsByDistrict.get(districtId).push({ name, geometry });
  }

  let nextUnitId = 1;
  const rosterByDistrict = {};
  await mkdir(STATIONS_OUT_DIR, { recursive: true });

  for (const districtId of [...stationsByDistrict.keys()].sort((a, b) => a - b)) {
    const stations = stationsByDistrict.get(districtId);
    const features = [];
    const roster = [];
    for (const station of stations) {
      const unitId = nextUnitId++;
      roster.push({ unitId, unitName: station.name });
      features.push({ type: 'Feature', properties: { unitId, unitName: station.name }, geometry: station.geometry });
    }
    rosterByDistrict[districtId] = roster;
    const collection = { type: 'FeatureCollection', features };
    const json = JSON.stringify(collection);
    await writeFile(path.join(STATIONS_OUT_DIR, `${districtId}.geojson`), json);
    console.log(`district ${districtId}: ${features.length} stations, ${json.length} bytes`);
  }

  const fixtureSource = [
    'export interface StationFixture {',
    '  unitId: number;',
    '  unitName: string;',
    '}',
    '',
    `export const STATIONS_BY_DISTRICT: Record<number, StationFixture[]> = ${JSON.stringify(rosterByDistrict, null, 2)};`,
    '',
  ].join('\n');
  await writeFile(FIXTURE_OUT_FILE, fixtureSource);
  console.log(`wrote ${FIXTURE_OUT_FILE}: ${nextUnitId - 1} stations across ${Object.keys(rosterByDistrict).length} districts`);
}

main();
```

- [ ] **Step 2: Run the script from the repo root**

Run: `node scripts/build-station-fixtures.mjs`

Expected: 30 lines of `district <id>: <n> stations, <bytes> bytes` output (one per district, ids 1–30, counts summing to 830), followed by a final line `wrote src/api/generatedStationFixtures.ts: 830 stations across 30 districts`. No errors.

- [ ] **Step 3: Spot-check the output**

Run:
```bash
ls public/data/stations | wc -l
node -e "
const fs = require('fs');
let total = 0, maxBytes = 0;
for (const f of fs.readdirSync('public/data/stations')) {
  const bytes = fs.statSync('public/data/stations/' + f).size;
  const data = JSON.parse(fs.readFileSync('public/data/stations/' + f));
  total += data.features.length;
  maxBytes = Math.max(maxBytes, bytes);
}
console.log('total features:', total, 'largest file bytes:', maxBytes);
"
```
Expected: `30` for the file count; `total features: 830` and a `largest file bytes` figure well under a few MB (Bengaluru Urban, districtId 5, is the largest at 120 stations).

- [ ] **Step 4: Commit**

```bash
git add scripts/build-station-fixtures.mjs public/data/stations src/api/generatedStationFixtures.ts
git commit -m "$(cat <<'EOF'
Generate per-district police station boundary fixtures for mock mode

One-time local script spatial-joins the raw KGIS station boundary file
to districts, simplifies geometry, and emits small per-district GeoJSON
fixtures plus a TS station roster used by mockData.ts.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `geoApi.ts` — station boundary type and query hook

**Files:**
- Modify: `src/api/geoApi.ts`
- Test: `src/api/geoApi.test.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces:
  ```ts
  export interface StationBoundaryFeatureCollection {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: { unitId: number; unitName: string };
      geometry: Record<string, unknown>;
    }>;
  }
  export function getStationBoundaries(token: string | null, districtId: number): Promise<StationBoundaryFeatureCollection>;
  export function useStationBoundaries(token: string | null, districtId: number | null): UseQueryResult<StationBoundaryFeatureCollection>;
  ```
  Task 4 (`DistrictMap.tsx`) and Task 5 (`CommandCenterScreen.tsx`) import these.

- [ ] **Step 1: Write the failing tests**

In `src/api/geoApi.test.tsx`, add to the imports at the top:

```ts
import {
  getDistrictSummaries,
  getDistrictBoundaries,
  getStationSummaries,
  getStationBoundaries,
  getDistrictDetail,
  useDistrictSummaries,
  useStationBoundaries,
  useDistrictDetail,
  type DistrictSummaryResponse,
  type DistrictDetailResponse,
} from './geoApi';
```

Then append at the end of the file:

```ts
describe('getStationBoundaries', () => {
  it('fetches /api/geo/districts/{id}/stations/boundaries with the auth token', async () => {
    const boundaries = { type: 'FeatureCollection' as const, features: [] };
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(boundaries);
    const result = await getStationBoundaries('test-token', 3);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/districts/3/stations/boundaries', {}, 'test-token');
    expect(result).toEqual(boundaries);
  });
});

describe('useStationBoundaries', () => {
  it('returns the fetched station boundaries once loaded', async () => {
    const boundaries = {
      type: 'FeatureCollection' as const,
      features: [{ type: 'Feature' as const, properties: { unitId: 1, unitName: 'Cowlbazar PS' }, geometry: {} }],
    };
    vi.spyOn(client, 'apiFetch').mockResolvedValue(boundaries);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useStationBoundaries('test-token', 3), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(boundaries);
  });
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npx vitest run src/api/geoApi.test.tsx`
Expected: FAIL — `getStationBoundaries` / `useStationBoundaries` are not exported members of `./geoApi`.

- [ ] **Step 3: Implement in `geoApi.ts`**

Add this type after `DistrictBoundaryFeatureCollection` (after line 29):

```ts
export interface StationBoundaryFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: { unitId: number; unitName: string };
    geometry: Record<string, unknown>;
  }>;
}
```

Add this function after `getStationSummaries` (after line 41):

```ts
export function getStationBoundaries(token: string | null, districtId: number): Promise<StationBoundaryFeatureCollection> {
  return apiFetch<StationBoundaryFeatureCollection>(`/api/geo/districts/${districtId}/stations/boundaries`, {}, token);
}
```

Add this hook after `useStationSummaries` (after line 72):

```ts
export function useStationBoundaries(token: string | null, districtId: number | null) {
  return useQuery({
    queryKey: ['geo-station-boundaries', districtId],
    queryFn: () => getStationBoundaries(token, districtId as number),
    staleTime: 60_000,
    enabled: token != null && districtId != null,
  });
}
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `npx vitest run src/api/geoApi.test.tsx`
Expected: PASS, all tests including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/api/geoApi.ts src/api/geoApi.test.tsx
git commit -m "$(cat <<'EOF'
Add getStationBoundaries/useStationBoundaries to geoApi

New query for a district's police station boundary GeoJSON, mirroring
the existing useStationSummaries pattern.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `mockData.ts` — real station rosters and boundary fixture route

**Files:**
- Modify: `src/api/mockData.ts`
- Test: `src/api/mockData.test.ts`

**Interfaces:**
- Consumes: `STATIONS_BY_DISTRICT` from `src/api/generatedStationFixtures.ts` (Task 1).
- Produces: `getMockResponse('/api/geo/districts/{id}/stations', ...)` now returns real station names/ids; `getMockResponse('/api/geo/districts/{id}/stations/boundaries', ...)` returns the matching `public/data/stations/<id>.geojson` fixture. No new exports — behavior change only, consumed indirectly via `apiFetch` in mock mode.

- [ ] **Step 1: Write the failing tests**

In `src/api/mockData.test.ts`, replace the top import line:

```ts
import { describe, it, expect } from 'vitest';
```

with:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
```

and add a second import line right below the existing `import { getMockResponse } from './mockData';`:

```ts
import { STATIONS_BY_DISTRICT } from './generatedStationFixtures';
```

Then append at the end of the file:

```ts
describe('getMockResponse stations', () => {
  it('returns one entry per real station in the district, ids/names matching the generated fixture', async () => {
    const result = (await getMockResponse('/api/geo/districts/5/stations', { method: 'GET' })) as Array<{
      unitId: number;
      unitName: string;
      caseCount: number;
    }>;
    const roster = STATIONS_BY_DISTRICT[5];

    expect(result).toHaveLength(roster.length);
    expect(result.map((s) => s.unitId)).toEqual(roster.map((s) => s.unitId));
    expect(result.map((s) => s.unitName)).toEqual(roster.map((s) => s.unitName));
    expect(result.every((s) => s.caseCount >= 1)).toBe(true);
  });
});

describe('getMockResponse station boundaries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the per-district station geojson fixture', async () => {
    const fixture = { type: 'FeatureCollection', features: [] };
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(fixture),
    } as unknown as Response);

    const result = await getMockResponse('/api/geo/districts/5/stations/boundaries', { method: 'GET' });

    expect(fetchSpy).toHaveBeenCalledWith('/data/stations/5.geojson');
    expect(result).toEqual(fixture);
  });
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npx vitest run src/api/mockData.test.ts`
Expected: FAIL — the stations test gets the old 4 generic fake names instead of the real roster; the boundaries test gets `undefined` (route not handled) instead of the fixture.

- [ ] **Step 3: Implement in `mockData.ts`**

Add this import at the top of the file, after the existing top-of-file comment block:

```ts
import { STATIONS_BY_DISTRICT } from './generatedStationFixtures';
```

Replace the existing `mockStations` function (lines 124-134):

```ts
function mockStations(districtId: number) {
  const district = MOCK_DISTRICTS.find((d) => d.districtId === districtId);
  const base = district?.caseCount ?? 100;
  const name = district?.districtName ?? 'District';
  return [
    { unitId: districtId * 10 + 1, unitName: `${name} Town PS`, caseCount: Math.round(base * 0.4) },
    { unitId: districtId * 10 + 2, unitName: `${name} Rural PS`, caseCount: Math.round(base * 0.25) },
    { unitId: districtId * 10 + 3, unitName: `${name} East PS`, caseCount: Math.round(base * 0.2) },
    { unitId: districtId * 10 + 4, unitName: `${name} West PS`, caseCount: Math.round(base * 0.15) },
  ];
}
```

with:

```ts
// Real KGIS station names/ids (see src/api/generatedStationFixtures.ts), each given a
// deterministic proportional share of the district's case count -- no Math.random(), so
// results (and tests) are stable across runs.
function mockStations(districtId: number) {
  const district = MOCK_DISTRICTS.find((d) => d.districtId === districtId);
  const base = district?.caseCount ?? 100;
  const roster = STATIONS_BY_DISTRICT[districtId] ?? [];
  if (roster.length === 0) return [];

  const share = base / roster.length;
  return roster.map((station, index) => {
    const wobble = 1 + (((index % 3) - 1) * 0.2); // cycles 0.8, 1.0, 1.2
    return {
      unitId: station.unitId,
      unitName: station.unitName,
      caseCount: Math.max(1, Math.round(share * wobble)),
    };
  });
}
```

Add a per-district promise cache and loader, right after `loadBoundaries` (after line 49):

```ts
const stationBoundaryPromises = new Map<number, Promise<unknown>>();
function loadStationBoundaries(districtId: number): Promise<unknown> {
  if (!stationBoundaryPromises.has(districtId)) {
    stationBoundaryPromises.set(
      districtId,
      fetch(`/data/stations/${districtId}.geojson`).then((r) => r.json()),
    );
  }
  return stationBoundaryPromises.get(districtId)!;
}
```

Add a new route match in `getMockResponse`, right after the existing `stationMatch` block (after line 163):

```ts
  const stationBoundariesMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations\/boundaries$/);
  if (stationBoundariesMatch) return loadStationBoundaries(Number(stationBoundariesMatch[1]));
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `npx vitest run src/api/mockData.test.ts`
Expected: PASS, all tests including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/api/mockData.ts src/api/mockData.test.ts
git commit -m "$(cat <<'EOF'
Wire real station rosters and boundary fixtures into mock mode

mockStations() now returns the real KGIS station names/ids from the
generated fixture instead of 4 generic fake names, and a new mock
route serves each district's station boundary GeoJSON.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `DistrictMap.tsx` — station subdivision layer

**Files:**
- Modify: `src/screens/command-center/DistrictMap.tsx`
- Test: `src/screens/command-center/DistrictMap.test.tsx`

**Interfaces:**
- Consumes: `StationBoundaryFeatureCollection`, `StationSummaryResponse` from `src/api/geoApi.ts` (Task 2).
- Produces: `DistrictMap` gains two new optional props:
  ```ts
  stationBoundaries?: StationBoundaryFeatureCollection | null; // default null
  stationSummaries?: StationSummaryResponse[];                  // default []
  ```
  Task 5 (`CommandCenterScreen.tsx`) passes these.

- [ ] **Step 1: Extend `FakeMap` in the test file with layer/source introspection**

In `src/screens/command-center/DistrictMap.test.tsx`, inside the `FakeMap` class (after the `removeFeatureState` method, before `remove()`, i.e. after line 68), add:

```ts
    getLayer(id: string) {
      return (this.layers as Array<{ id: string }>).find((l) => l.id === id);
    }

    getSource(id: string) {
      return this.sources[id];
    }

    removeLayer(id: string) {
      this.layers = (this.layers as Array<{ id: string }>).filter((l) => l.id !== id);
    }

    removeSource(id: string) {
      delete this.sources[id];
    }
```

- [ ] **Step 2: Write the failing tests**

Update the type import at the top of the file (line 4):

```ts
import type {
  DistrictBoundaryFeatureCollection,
  DistrictSummaryResponse,
  StationBoundaryFeatureCollection,
  StationSummaryResponse,
} from '../../api/geoApi';
```

Add these fixtures after `boundariesWithGeometry` (after line 131):

```ts
const stationBoundaries: StationBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { unitId: 301, unitName: 'Mysuru City PS' }, geometry: {} },
    { type: 'Feature', properties: { unitId: 302, unitName: 'Mysuru Rural PS' }, geometry: {} },
  ],
};
const stationSummaries: StationSummaryResponse[] = [
  { unitId: 301, unitName: 'Mysuru City PS', caseCount: 80 },
  { unitId: 302, unitName: 'Mysuru Rural PS', caseCount: 40 },
];
```

Add these tests inside the `describe('DistrictMap', ...)` block, right before its closing `});` (before line 346):

```ts
  it('adds a stations source scoped to the district with case counts joined by unitId', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    const source = map.getSource('stations') as { data: StationBoundaryFeatureCollection };
    const properties = source.data.features.map((f) => f.properties);
    expect(properties).toEqual([
      { unitId: 301, unitName: 'Mysuru City PS', caseCount: 80 },
      { unitId: 302, unitName: 'Mysuru Rural PS', caseCount: 40 },
    ]);
    expect(map.getLayer('station-fill')).toBeDefined();
  });

  it('marks a station with no matching case-count row as unmatched (null caseCount)', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={[stationSummaries[0]]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    const source = map.getSource('stations') as { data: StationBoundaryFeatureCollection };
    const unmatched = source.data.features.find((f) => f.properties.unitId === 302);
    expect((unmatched?.properties as { caseCount: number | null }).caseCount).toBeNull();
  });

  it('removes the stations layer and source when station boundaries are cleared', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        stationBoundaries={null}
        stationSummaries={[]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    expect(map.getLayer('station-fill')).toBeUndefined();
    expect(map.getSource('stations')).toBeUndefined();
  });

  it('highlights the hovered station and shows a tooltip with its name and case count', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:station-fill']({
      features: [{ properties: { unitId: 302, unitName: 'Mysuru Rural PS', caseCount: 40 } }],
      lngLat: { lng: 76.6, lat: 12.3 },
    });

    expect(map.featureStates.get(302)).toEqual({ hover: true });
    expect(map.getCanvas().style.cursor).toBe('pointer');
    const popup = FakePopup.instances[0];
    expect(popup.html).toContain('Mysuru Rural PS');
    expect(popup.html).toContain('40 cases');
  });

  it('shows "No case data" for a hovered station with no matching case-count row', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={[]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:station-fill']({
      features: [{ properties: { unitId: 301, unitName: 'Mysuru City PS', caseCount: null } }],
      lngLat: { lng: 76.6, lat: 12.3 },
    });

    const popup = FakePopup.instances[0];
    expect(popup.html).toContain('No case data');
  });

  it('clears the station highlight and tooltip on mouseleave', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:station-fill']({
      features: [{ properties: { unitId: 302, unitName: 'Mysuru Rural PS', caseCount: 40 } }],
      lngLat: { lng: 76.6, lat: 12.3 },
    });
    map.handlers['mouseleave:station-fill']({});

    expect(map.featureStates.has(302)).toBe(false);
    expect(map.getCanvas().style.cursor).toBe('');
    expect(FakePopup.instances[0].removed).toBe(true);
  });
```

- [ ] **Step 3: Run the test file to verify it fails**

Run: `npx vitest run src/screens/command-center/DistrictMap.test.tsx`
Expected: FAIL with TypeScript errors (`stationBoundaries`/`stationSummaries` don't exist on `DistrictMapProps`) and/or `map.getSource('stations')` returning `undefined`.

- [ ] **Step 4: Implement in `DistrictMap.tsx`**

Replace the type import (line 4):

```ts
import type { DistrictBoundaryFeatureCollection, DistrictSummaryResponse } from '../../api/geoApi';
```

with:

```ts
import type {
  DistrictBoundaryFeatureCollection,
  DistrictSummaryResponse,
  StationBoundaryFeatureCollection,
  StationSummaryResponse,
} from '../../api/geoApi';
```

Replace the `DistrictMapProps` interface (lines 7-13):

```ts
interface DistrictMapProps {
  boundaries: DistrictBoundaryFeatureCollection;
  districtSummaries: DistrictSummaryResponse[];
  selectedDistrictId: number | null;
  onDistrictSelect: (districtId: number) => void;
  onBack: () => void;
}
```

with:

```ts
interface DistrictMapProps {
  boundaries: DistrictBoundaryFeatureCollection;
  districtSummaries: DistrictSummaryResponse[];
  selectedDistrictId: number | null;
  stationBoundaries?: StationBoundaryFeatureCollection | null;
  stationSummaries?: StationSummaryResponse[];
  onDistrictSelect: (districtId: number) => void;
  onBack: () => void;
}
```

Replace the component's opening signature and ref declarations (lines 54-61):

```ts
export function DistrictMap({ boundaries, districtSummaries, selectedDistrictId, onDistrictSelect, onBack }: DistrictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof maplibregl.Map> | null>(null);
  const loadedRef = useRef(false);
  const selectedDistrictIdRef = useRef(selectedDistrictId);
  const onDistrictSelectRef = useRef(onDistrictSelect);
  const popupRef = useRef<InstanceType<typeof maplibregl.Popup> | null>(null);
  const hoveredIdRef = useRef<number | null>(null);
```

with:

```ts
export function DistrictMap({
  boundaries,
  districtSummaries,
  selectedDistrictId,
  stationBoundaries = null,
  stationSummaries = [],
  onDistrictSelect,
  onBack,
}: DistrictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof maplibregl.Map> | null>(null);
  const loadedRef = useRef(false);
  const selectedDistrictIdRef = useRef(selectedDistrictId);
  const onDistrictSelectRef = useRef(onDistrictSelect);
  const popupRef = useRef<InstanceType<typeof maplibregl.Popup> | null>(null);
  const hoveredIdRef = useRef<number | null>(null);
  const hoveredStationIdRef = useRef<number | null>(null);
```

Insert a new `useEffect` right after the existing selection effect and before `const selectedDistrict = ...` (after line 169, i.e. right after this closing block):

```ts
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (selectedDistrictId != null) {
      popupRef.current?.remove();
      if (hoveredIdRef.current != null) {
        map.removeFeatureState({ source: 'districts', id: hoveredIdRef.current });
        hoveredIdRef.current = null;
        map.getCanvas().style.cursor = '';
      }
    }
    applyDistrictSelection(map, boundaries, selectedDistrictId);
  }, [selectedDistrictId, boundaries]);
```

add:

```ts
  // A separate effect (not folded into the one above) because it reacts to different
  // inputs -- station data can load/change independently of the selection itself.
  // Re-runs whenever `boundaries` changes too, since that's what remounts the map
  // (see the main useEffect's dependency array) and the stations layer would otherwise
  // be lost on the new map instance.
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;

    if (map.getLayer('station-fill')) map.removeLayer('station-fill');
    if (map.getSource('stations')) map.removeSource('stations');

    if (!stationBoundaries) return;

    const caseCountByUnit = new Map(stationSummaries.map((s) => [s.unitId, s.caseCount]));
    const enrichedFeatures = stationBoundaries.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        caseCount: caseCountByUnit.get(feature.properties.unitId) ?? null,
      },
    }));
    const maxCount = Math.max(1, ...enrichedFeatures.map((f) => f.properties.caseCount ?? 0));

    map.addSource('stations', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: enrichedFeatures },
      promoteId: 'unitId',
    });
    map.addLayer({
      id: 'station-fill',
      type: 'fill',
      source: 'stations',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'caseCount'], null],
          '#D8DEEA',
          ['interpolate', ['linear'], ['get', 'caseCount'], 0, '#b7d3f6', maxCount, '#104281'],
        ],
        'fill-outline-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#2a78d6', '#ffffff'],
      },
    });

    map.on('mousemove', 'station-fill', (e) => {
      const feature = e.features?.[0];
      const unitId = feature?.properties?.unitId;
      if (typeof unitId !== 'number') return;

      if (hoveredStationIdRef.current !== unitId) {
        if (hoveredStationIdRef.current != null) {
          map.removeFeatureState({ source: 'stations', id: hoveredStationIdRef.current });
        }
        hoveredStationIdRef.current = unitId;
        map.setFeatureState({ source: 'stations', id: unitId }, { hover: true });
        map.getCanvas().style.cursor = 'pointer';
      }

      const caseCount = feature!.properties!.caseCount;
      const label = typeof caseCount === 'number' ? `${caseCount} cases` : 'No case data';
      popupRef.current
        ?.setLngLat(e.lngLat)
        .setHTML(`<strong>${feature!.properties!.unitName}</strong><br/>${label}`)
        .addTo(map);
    });

    map.on('mouseleave', 'station-fill', () => {
      if (hoveredStationIdRef.current != null) {
        map.removeFeatureState({ source: 'stations', id: hoveredStationIdRef.current });
      }
      hoveredStationIdRef.current = null;
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });
  }, [stationBoundaries, stationSummaries, boundaries]);
```

- [ ] **Step 5: Run the test file to verify it passes**

Run: `npx vitest run src/screens/command-center/DistrictMap.test.tsx`
Expected: PASS, all tests including the six new ones.

- [ ] **Step 6: Commit**

```bash
git add src/screens/command-center/DistrictMap.tsx src/screens/command-center/DistrictMap.test.tsx
git commit -m "$(cat <<'EOF'
Render police station boundaries as a subdivision layer

Adds a station-fill MapLibre layer on top of the selected district,
colored by case count (joined by unitId) with the same hover
highlight/tooltip pattern already used for districts.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `CommandCenterScreen.tsx` — wire station boundaries through

**Files:**
- Modify: `src/screens/command-center/CommandCenterScreen.tsx`
- Test: `src/screens/command-center/CommandCenterScreen.test.tsx`

**Interfaces:**
- Consumes: `useStationBoundaries` from `src/api/geoApi.ts` (Task 2); `stationBoundaries`/`stationSummaries` props on `DistrictMap` (Task 4).
- Produces: nothing new for later tasks — this is the final integration point.

- [ ] **Step 1: Write the failing tests**

In `src/screens/command-center/CommandCenterScreen.test.tsx`, replace the `DistrictMap` mock (lines 12-16):

```ts
vi.mock('./DistrictMap', () => ({
  DistrictMap: ({ onDistrictSelect }: { onDistrictSelect: (id: number) => void }) => (
    <button onClick={() => onDistrictSelect(3)}>Select Mysuru</button>
  ),
}));
```

with:

```ts
vi.mock('./DistrictMap', () => ({
  DistrictMap: ({
    onDistrictSelect,
    stationBoundaries,
  }: {
    onDistrictSelect: (id: number) => void;
    stationBoundaries: unknown;
  }) => (
    <>
      <button onClick={() => onDistrictSelect(3)}>Select Mysuru</button>
      {stationBoundaries ? <p>Station boundaries loaded</p> : null}
    </>
  ),
}));
```

Add a fixture near the other consts (after the `const boundaries = ...` line, line 34):

```ts
const stationBoundaries = { type: 'FeatureCollection' as const, features: [] };
```

In the first test (`'renders KPIs, category mix, and alerts...'`), add this line alongside the other `vi.spyOn(geoApiModule, ...)` calls, right after the `useDistrictDetail` mock:

```ts
    vi.spyOn(geoApiModule, 'useStationBoundaries').mockReturnValue(
      mockSuccess<geoApiModule.StationBoundaryFeatureCollection>(undefined as unknown as geoApiModule.StationBoundaryFeatureCollection),
    );
```

In the second test (`'selecting a district shows the station drill-down...'`), add this line right after its `useDistrictDetail` mock, and add the `findByText` assertion after the existing assertions:

```ts
    vi.spyOn(geoApiModule, 'useStationBoundaries').mockReturnValue(mockSuccess(stationBoundaries));
```

```ts
    expect(await screen.findByText('Station boundaries loaded')).toBeInTheDocument();
```

In the third test (`'disables the district selector for a Policymaker'`), add:

```ts
    vi.spyOn(geoApiModule, 'useStationBoundaries').mockReturnValue(
      mockSuccess<geoApiModule.StationBoundaryFeatureCollection>(undefined as unknown as geoApiModule.StationBoundaryFeatureCollection),
    );
```

In the fourth test (`'shows an inline retry control when district details fail to load'`), add:

```ts
    vi.spyOn(geoApiModule, 'useStationBoundaries').mockReturnValue(mockSuccess(stationBoundaries));
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npx vitest run src/screens/command-center/CommandCenterScreen.test.tsx`
Expected: FAIL — `useStationBoundaries` is not a function on the real `geoApiModule` export surface used by `CommandCenterScreen` yet, and/or the `'Station boundaries loaded'` text never appears since the screen doesn't call the hook or pass the prop yet.

- [ ] **Step 3: Implement in `CommandCenterScreen.tsx`**

Replace the `geoApi` import (line 5):

```ts
import { useDistrictSummaries, useDistrictBoundaries, useStationSummaries, useDistrictDetail } from '../../api/geoApi';
```

with:

```ts
import {
  useDistrictSummaries,
  useDistrictBoundaries,
  useStationSummaries,
  useDistrictDetail,
  useStationBoundaries,
} from '../../api/geoApi';
```

Add a new query declaration right after `const districtDetailQuery = useDistrictDetail(token, districtDrilldownId);` (after line 26):

```ts
  const stationBoundariesQuery = useStationBoundaries(token, districtDrilldownId);
```

Replace the `<DistrictMap>` invocation:

```tsx
          <DistrictMap
            boundaries={boundaries}
            districtSummaries={districtSummaries}
            selectedDistrictId={districtDrilldownId}
            onDistrictSelect={selectDistrict}
            onBack={clearDistrict}
          />
```

with:

```tsx
          <DistrictMap
            boundaries={boundaries}
            districtSummaries={districtSummaries}
            selectedDistrictId={districtDrilldownId}
            stationBoundaries={stationBoundariesQuery.data ?? null}
            stationSummaries={stationSummariesQuery.data ?? []}
            onDistrictSelect={selectDistrict}
            onBack={clearDistrict}
          />
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `npx vitest run src/screens/command-center/CommandCenterScreen.test.tsx`
Expected: PASS, all four tests.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions across the whole project.

- [ ] **Step 6: Commit**

```bash
git add src/screens/command-center/CommandCenterScreen.tsx src/screens/command-center/CommandCenterScreen.test.tsx
git commit -m "$(cat <<'EOF'
Wire station boundaries into CommandCenterScreen

Fetches the selected district's station boundaries and passes them,
along with the existing station case-count summaries, into DistrictMap.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
