# Network / Link Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Revision note (2026-07-19):** Replaces an earlier version of this plan built against a
> speculative `/api/network/graph?scope=...` contract that was never implemented backend-side. This
> revision targets the real, already-implemented and tested contract documented in
> `docs/superpowers/specs/2026-07-19-network-link-analysis-design.md` — a single
> `GET /api/network/subgraph?focus=...` endpoint (four focus modes) plus the three pre-existing
> `repeat-offenders`/`communities`/`path` endpoints, all `SCRB_ANALYST`-only, unmasked, no scope
> params.

**Goal:** Build the `/network` screen (graph canvas, path-finding, repeat-offender rail, community
legend) against mock data shaped to the real `GET /api/network/subgraph` (+ the three existing
network endpoints) contract, restricted to `SCRB_ANALYST` to match the real backend's RBAC.

**Architecture:** A new `networkApi.ts` module (types + fetch functions + React Query hooks,
mirroring `caseApi.ts`) sits behind four new mock routes in `mockData.ts`, all derived from the
*existing* per-station case/party mock generator (`mockCaseSummaries`/`mockParty`) rather than a
separate synthetic dataset. Four presentational/interactive components (`CommunityLegend`,
`RepeatOffenderRail`, `NetworkGraphCanvas`, `PathFindingBar`) compose into `NetworkScreen`, which
holds a local `focus` state (`top-offenders` | `person` | `community` | `path`) driving a single
`useSubgraph` call — no scope derivation, no masking, matching the real backend. The force-directed
graph layout is a hand-rolled SVG simulation (no d3), ported from the existing static mockup
(`docs/superpowers/fe-artifacts-html/build/build_network.py`) with deterministic (not
`Math.random()`-seeded) initial node placement so layout is stable across renders and tests.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-query`, Vitest + React Testing Library, plain SVG (no new dependencies).

## Global Constraints

- No `Math.random()` anywhere in mock data or layout code — every mock generator and the force layout must be deterministic (same input → same output), matching this codebase's existing convention (see `mockCaseSummaries`, `mockStations`).
- No new npm dependencies — the graph canvas is hand-rolled SVG, matching this codebase's avoidance of graph-viz libraries.
- Every new/modified `.ts`/`.tsx` file gets a co-located `.test.ts`/`.test.tsx`, matching the 1:1 file-to-test convention used throughout `src/`.
- No masking, no scope params anywhere in this feature — the real backend (`NetworkQueryService.requireFullNetworkAccess()`) returns raw, unmasked `displayName`/`label` fields and has no `scope`/`unitId`/`districtId` parameters on any of the four network endpoints.
- `GraphNodeResponse.id` (subgraph node id, a string) and `personId` (a number, used everywhere else — `RepeatOffenderResponse.personId`, `/path`'s `from`/`to`, `/subgraph`'s `personId` param) are two different types for the same underlying Neo4j id. Every place code crosses between them must go through `personIdOfNode()` (Task 1) — never compare a raw `node.id` string to a `personId` number, and never treat `node.id` as a second identifier space.
- `personId`/`communityId` values are only valid within the graph-service projection run that produced them — never persist one to storage or across a page reload (this plan's mock/component code doesn't need to simulate expiry, but must not add persistence).

---

## Task 1: `networkApi.ts` — types, fetch functions, hooks

**Files:**
- Create: `src/api/networkApi.ts`
- Test: `src/api/networkApi.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`/`ApiError` (`src/api/client.ts`).
- Produces: `GraphNodeType`, `GraphEdgeType`, `SubgraphFocus`, `GraphNodeResponse`, `GraphEdgeResponse`, `SubgraphResponse`, `SubgraphParams`, `RepeatOffenderResponse`, `CommunityResponse`, `NetworkPathResponse`, `personIdOfNode(node)`, `subgraphQueryString(params)`, `getSubgraph`/`useSubgraph`, `getRepeatOffenders`/`useRepeatOffenders`, `getCommunities`/`useCommunities`, `getNetworkPath`/`useNetworkPath` — all consumed by Task 2 (mock routes match these paths/params) and Tasks 3–8 (components/screen consume the types and hooks).

- [ ] **Step 1: Write the failing tests**

Create `src/api/networkApi.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import { ApiError } from './client';
import {
  personIdOfNode,
  subgraphQueryString,
  getSubgraph,
  useSubgraph,
  getRepeatOffenders,
  getCommunities,
  getNetworkPath,
  useNetworkPath,
  type SubgraphResponse,
} from './networkApi';

afterEach(() => {
  vi.restoreAllMocks();
});

function wrapperWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('personIdOfNode', () => {
  it('converts a subgraph node id string back to the numeric personId', () => {
    expect(personIdOfNode({ id: '482910' })).toBe(482910);
  });
});

describe('subgraphQueryString', () => {
  it('includes only focus for top-offenders with no limit given', () => {
    expect(subgraphQueryString({ focus: 'top-offenders' })).toBe('focus=top-offenders');
  });

  it('includes personId and hops for the person focus', () => {
    const query = subgraphQueryString({ focus: 'person', personId: 42, hops: 2 });
    expect(query).toBe('focus=person&personId=42&hops=2');
  });

  it('includes from/to/maxHops for the path focus', () => {
    const query = subgraphQueryString({ focus: 'path', from: 1, to: 2, maxHops: 6 });
    expect(query).toBe('focus=path&from=1&to=2&maxHops=6');
  });
});

describe('getSubgraph', () => {
  it('fetches /api/network/subgraph with the built query string', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ nodes: [], edges: [], generatedAt: '2026-07-19T00:00:00Z' });
    await getSubgraph('test-token', { focus: 'community', communityId: 7 });
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/subgraph?focus=community&communityId=7', {}, 'test-token');
  });
});

describe('useSubgraph', () => {
  it('returns the fetched subgraph once loaded', async () => {
    const data: SubgraphResponse = { nodes: [], edges: [], generatedAt: '2026-07-19T00:00:00Z' };
    vi.spyOn(client, 'apiFetch').mockResolvedValue(data);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useSubgraph('test-token', { focus: 'top-offenders' }), {
      wrapper: wrapperWith(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('does not fetch when params is null', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ nodes: [], edges: [], generatedAt: '' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useSubgraph('test-token', null), { wrapper: wrapperWith(queryClient) });

    expect(apiFetchSpy).not.toHaveBeenCalled();
  });
});

describe('getRepeatOffenders', () => {
  it('fetches /api/network/repeat-offenders with minCases and limit', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getRepeatOffenders('test-token', 2, 8);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/repeat-offenders?minCases=2&limit=8', {}, 'test-token');
  });
});

describe('getCommunities', () => {
  it('fetches /api/network/communities with minSize', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getCommunities('test-token', 4);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/communities?minSize=4', {}, 'test-token');
  });
});

describe('getNetworkPath', () => {
  it('fetches /api/network/path with from/to/maxHops', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ personIds: [1, 2], displayNames: ['A', 'B'], hopCount: 1 });
    await getNetworkPath('test-token', 1, 2, 6);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/path?from=1&to=2&maxHops=6', {}, 'test-token');
  });

  it('returns null when apiFetch resolves null (mock "no path")', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(null);
    const result = await getNetworkPath('test-token', 1, 99, 6);
    expect(result).toBeNull();
  });

  it('returns null when apiFetch throws a 404 ApiError (real backend "no path")', async () => {
    vi.spyOn(client, 'apiFetch').mockRejectedValue(new ApiError(404, 'not found'));
    const result = await getNetworkPath('test-token', 1, 99, 6);
    expect(result).toBeNull();
  });

  it('rethrows non-404 errors', async () => {
    vi.spyOn(client, 'apiFetch').mockRejectedValue(new ApiError(500, 'server error'));
    await expect(getNetworkPath('test-token', 1, 99, 6)).rejects.toThrow('server error');
  });
});

describe('useNetworkPath', () => {
  it('does not fetch until both from and to are set', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(null);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useNetworkPath('test-token', 1, null), { wrapper: wrapperWith(queryClient) });

    expect(apiFetchSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/api/networkApi.test.tsx`
Expected: FAIL with "Cannot find module './networkApi'"

- [ ] **Step 3: Implement `networkApi.ts`**

Create `src/api/networkApi.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from './client';

export type GraphNodeType = 'PERSON' | 'CASE' | 'LOCATION';
export type GraphEdgeType = 'ACCUSED_IN' | 'VICTIM_IN' | 'ARRESTED_BY' | 'OCCURRED_AT' | 'CO_ACCUSED_WITH' | 'SHARES_MO_WITH';
export type SubgraphFocus = 'top-offenders' | 'person' | 'community' | 'path';

export interface GraphNodeResponse {
  id: string;
  type: GraphNodeType;
  label: string;
  confidence: number | null;
}

export interface GraphEdgeResponse {
  id: string;
  sourceId: string;
  targetId: string;
  type: GraphEdgeType;
  confidence: number | null;
}

export interface SubgraphResponse {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  generatedAt: string;
}

export interface SubgraphParams {
  focus: SubgraphFocus;
  limit?: number;
  personId?: number;
  hops?: number;
  communityId?: number;
  from?: number;
  to?: number;
  maxHops?: number;
}

export interface RepeatOffenderResponse {
  personId: number;
  displayName: string;
  caseCount: number;
  gravityWeight: number;
  confidenceScore: number;
}

export interface CommunityResponse {
  communityId: number;
  size: number;
  memberDisplayNames: string[];
}

export interface NetworkPathResponse {
  personIds: number[];
  displayNames: string[];
  hopCount: number;
}

// A subgraph node's id is the string form of the same Neo4j internal id that
// personId/from/to/communityId carry as numbers elsewhere in this contract
// (RepeatOffenderResponse.personId, /path's from/to, /subgraph's personId
// param). This is the one place that conversion happens -- never compare a
// raw node.id string to a personId number anywhere else.
export function personIdOfNode(node: Pick<GraphNodeResponse, 'id'>): number {
  return Number(node.id);
}

export function subgraphQueryString(params: SubgraphParams): string {
  const query = new URLSearchParams({ focus: params.focus });
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.personId != null) query.set('personId', String(params.personId));
  if (params.hops != null) query.set('hops', String(params.hops));
  if (params.communityId != null) query.set('communityId', String(params.communityId));
  if (params.from != null) query.set('from', String(params.from));
  if (params.to != null) query.set('to', String(params.to));
  if (params.maxHops != null) query.set('maxHops', String(params.maxHops));
  return query.toString();
}

export function getSubgraph(token: string | null, params: SubgraphParams): Promise<SubgraphResponse> {
  return apiFetch<SubgraphResponse>(`/api/network/subgraph?${subgraphQueryString(params)}`, {}, token);
}

export function useSubgraph(token: string | null, params: SubgraphParams | null) {
  return useQuery({
    queryKey: ['network-subgraph', params],
    queryFn: () => getSubgraph(token, params as SubgraphParams),
    staleTime: 5 * 60_000,
    enabled: token != null && params != null,
  });
}

export function getRepeatOffenders(token: string | null, minCases = 2, limit = 10): Promise<RepeatOffenderResponse[]> {
  const query = new URLSearchParams({ minCases: String(minCases), limit: String(limit) });
  return apiFetch<RepeatOffenderResponse[]>(`/api/network/repeat-offenders?${query.toString()}`, {}, token);
}

export function useRepeatOffenders(token: string | null, minCases = 2, limit = 10) {
  return useQuery({
    queryKey: ['network-repeat-offenders', minCases, limit],
    queryFn: () => getRepeatOffenders(token, minCases, limit),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}

export function getCommunities(token: string | null, minSize = 3): Promise<CommunityResponse[]> {
  const query = new URLSearchParams({ minSize: String(minSize) });
  return apiFetch<CommunityResponse[]>(`/api/network/communities?${query.toString()}`, {}, token);
}

export function useCommunities(token: string | null, minSize = 3) {
  return useQuery({
    queryKey: ['network-communities', minSize],
    queryFn: () => getCommunities(token, minSize),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}

export async function getNetworkPath(
  token: string | null,
  from: number,
  to: number,
  maxHops = 6,
): Promise<NetworkPathResponse | null> {
  const query = new URLSearchParams({ from: String(from), to: String(to), maxHops: String(maxHops) });
  try {
    const result = await apiFetch<NetworkPathResponse | null>(`/api/network/path?${query.toString()}`, {}, token);
    return result ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function useNetworkPath(token: string | null, from: number | null, to: number | null, maxHops = 6) {
  return useQuery({
    queryKey: ['network-path', from, to, maxHops],
    queryFn: () => getNetworkPath(token, from as number, to as number, maxHops),
    staleTime: 5 * 60_000,
    enabled: token != null && from != null && to != null,
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/api/networkApi.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/networkApi.ts src/api/networkApi.test.tsx
git commit -m "Add networkApi: types, fetch functions, and React Query hooks for the real subgraph contract"
```

---

## Task 2: Mock data for the four network endpoints

**Files:**
- Modify: `src/api/mockData.ts`
- Modify: `src/api/mockData.test.ts`

**Interfaces:**
- Consumes: `mockCaseSummaries`, `mockParty`, `CASE_CRIME_TYPES`, `ACCUSED_NAMES`, `VICTIM_NAMES`, `STATIONS_BY_DISTRICT`, `findStationName` (all already in `mockData.ts`).
- Produces: `getMockResponse` now resolves `/api/network/subgraph`, `/api/network/repeat-offenders`, `/api/network/communities`, `/api/network/path`, matching the shapes `networkApi.ts` (Task 1) expects. Consumed directly by `NetworkScreen.test.tsx` (Task 8) for any test exercising real mock-mode data, and by every other component test via fixed fixtures instead.

Person identity in mock data reuses the exact party generation `mockCaseDetail` already uses for a
given case (`mockParty('accused', index + 1)`, `mockParty('victim', index)`), so a person shown on
the network graph for case `caseId` is the same identity Case Explorer shows for that case. Since
mock data has no real Neo4j id, two fixed numeric id arrays (`ACCUSED_PERSON_IDS`,
`VICTIM_PERSON_IDS`), parallel to the existing `ACCUSED_NAMES`/`VICTIM_NAMES` pools, stand in for
identity resolution's synthetic-id tier. The dataset samples the first `MOCK_NETWORK_STATION_SAMPLE`
stations (deterministic — `Object.values(STATIONS_BY_DISTRICT).flat()`'s stable order) so the mock
network stays a legible size, mirroring the real backend's 75-node-per-response cap without needing
to reproduce it station-by-station.

- [ ] **Step 1: Write the failing tests**

Add to `src/api/mockData.test.ts`:

```ts
import { getMockResponse } from './mockData';

describe('getMockResponse — /api/network/subgraph', () => {
  it('top-offenders focus returns PERSON, CASE, and LOCATION nodes with ACCUSED_IN/OCCURRED_AT edges', async () => {
    const response = (await getMockResponse('/api/network/subgraph?focus=top-offenders&limit=5', {})) as {
      nodes: Array<{ id: string; type: string; label: string; confidence: number | null }>;
      edges: Array<{ sourceId: string; targetId: string; type: string; confidence: number | null }>;
      generatedAt: string;
    };
    expect(response.nodes.some((n) => n.type === 'PERSON')).toBe(true);
    expect(response.nodes.some((n) => n.type === 'CASE')).toBe(true);
    expect(response.nodes.some((n) => n.type === 'LOCATION')).toBe(true);
    expect(response.edges.some((e) => e.type === 'ACCUSED_IN')).toBe(true);
    expect(response.edges.some((e) => e.type === 'OCCURRED_AT')).toBe(true);
    expect(response.generatedAt).toBeTruthy();
  });

  it('never exceeds 75 nodes and never has a dangling edge', async () => {
    const response = (await getMockResponse('/api/network/subgraph?focus=top-offenders&limit=50', {})) as {
      nodes: Array<{ id: string }>;
      edges: Array<{ sourceId: string; targetId: string }>;
    };
    expect(response.nodes.length).toBeLessThanOrEqual(75);
    const ids = new Set(response.nodes.map((n) => n.id));
    response.edges.forEach((e) => {
      expect(ids.has(e.sourceId)).toBe(true);
      expect(ids.has(e.targetId)).toBe(true);
    });
  });

  it('is deterministic -- the same params return identical output across calls', async () => {
    const a = await getMockResponse('/api/network/subgraph?focus=top-offenders&limit=5', {});
    const b = await getMockResponse('/api/network/subgraph?focus=top-offenders&limit=5', {});
    expect(a).toEqual(b);
  });

  it('community focus returns only PERSON nodes, never CASE or LOCATION', async () => {
    const communities = (await getMockResponse('/api/network/communities?minSize=1', {})) as Array<{ communityId: number }>;
    expect(communities.length).toBeGreaterThan(0);
    const response = (await getMockResponse(`/api/network/subgraph?focus=community&communityId=${communities[0].communityId}`, {})) as {
      nodes: Array<{ type: string }>;
    };
    expect(response.nodes.length).toBeGreaterThan(0);
    response.nodes.forEach((n) => expect(n.type).toBe('PERSON'));
  });

  it('person focus centers the ego-network on the requested personId', async () => {
    const offenders = (await getMockResponse('/api/network/repeat-offenders?minCases=1&limit=5', {})) as Array<{ personId: number }>;
    expect(offenders.length).toBeGreaterThan(0);
    const response = (await getMockResponse(`/api/network/subgraph?focus=person&personId=${offenders[0].personId}&hops=2`, {})) as {
      nodes: Array<{ id: string }>;
    };
    expect(response.nodes.some((n) => n.id === String(offenders[0].personId))).toBe(true);
  });

  it('path focus with from === to returns just that one person, no query needed', async () => {
    const offenders = (await getMockResponse('/api/network/repeat-offenders?minCases=1&limit=5', {})) as Array<{ personId: number }>;
    const response = await getMockResponse(
      `/api/network/path?from=${offenders[0].personId}&to=${offenders[0].personId}&maxHops=6`,
      {},
    );
    expect((response as { hopCount: number }).hopCount).toBe(0);
  });

  it('path focus returns the path persons plus the justifying case and location', async () => {
    const offenders = (await getMockResponse('/api/network/repeat-offenders?minCases=1&limit=8', {})) as Array<{ personId: number }>;
    expect(offenders.length).toBeGreaterThanOrEqual(2);
    const [from, to] = offenders.map((o) => o.personId);

    const response = (await getMockResponse(`/api/network/subgraph?focus=path&from=${from}&to=${to}&maxHops=6`, {})) as {
      nodes: Array<{ type: string }>;
    };
    expect(response.nodes.some((n) => n.type === 'PERSON')).toBe(true);
    expect(response.nodes.some((n) => n.type === 'CASE')).toBe(true);
  });
});

describe('getMockResponse — /api/network/repeat-offenders', () => {
  it('ranks offenders descending by caseCount and respects limit', async () => {
    const response = (await getMockResponse('/api/network/repeat-offenders?minCases=1&limit=3', {})) as Array<{ caseCount: number }>;
    expect(response.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < response.length; i++) {
      expect(response[i - 1].caseCount).toBeGreaterThanOrEqual(response[i].caseCount);
    }
  });
});

describe('getMockResponse — /api/network/communities', () => {
  it('groups persons into communities of at least minSize', async () => {
    const response = (await getMockResponse('/api/network/communities?minSize=1', {})) as Array<{ size: number }>;
    expect(response.length).toBeGreaterThan(0);
    response.forEach((c) => expect(c.size).toBeGreaterThanOrEqual(1));
  });
});

describe('getMockResponse — /api/network/path', () => {
  it('finds a path between two persons who share a case', async () => {
    const offenders = (await getMockResponse('/api/network/repeat-offenders?minCases=1&limit=8', {})) as Array<{ personId: number }>;
    expect(offenders.length).toBeGreaterThanOrEqual(2);
    const [from, to] = offenders.map((o) => o.personId);

    const response = await getMockResponse(`/api/network/path?from=${from}&to=${to}&maxHops=6`, {});
    expect(response).not.toBeNull();
    expect((response as { hopCount: number }).hopCount).toBeGreaterThanOrEqual(0);
  });

  it('returns null for an unknown personId', async () => {
    const response = await getMockResponse('/api/network/path?from=999999&to=999998&maxHops=6', {});
    expect(response).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/api/mockData.test.ts`
Expected: FAIL — all new `getMockResponse` calls return `undefined` (no matching route yet).

- [ ] **Step 3: Implement the network mock generators and routes**

Add to `src/api/mockData.ts`, just above `export async function getMockResponse`:

```ts
// Caps how many stations feed the network mock dataset so the graph stays a legible
// size -- mirrors the real backend's 75-node-per-response cap without needing to
// reproduce it station-by-station. Object.values(...).flat() has a stable insertion
// order, so this sample is deterministic.
const MOCK_NETWORK_STATION_SAMPLE = 10;

// Stand in for identity resolution's synthetic-id tier -- mock data has no real
// Neo4j id, so these fixed arrays (parallel to ACCUSED_NAMES/VICTIM_NAMES) give
// every mock person a stable numeric personId, matching the real contract's
// personId: number shape (RepeatOffenderResponse.personId, /path's from/to).
const ACCUSED_PERSON_IDS = [5001, 5002, 5003, 5004, 5005, 5006];
const VICTIM_PERSON_IDS = [6001, 6002, 6003, 6004, 6005, 6006];

const MAX_SUBGRAPH_NODES = 75;

interface NetworkCaseTuple {
  caseId: number;
  caseNumber: string;
  unitId: number;
  unitName: string;
  crimeSubHeadId: number;
  accusedId: number;
  accusedName: string;
  victimId: number;
  victimName: string;
}

function networkStations() {
  return Object.values(STATIONS_BY_DISTRICT).flat().slice(0, MOCK_NETWORK_STATION_SAMPLE);
}

// Reuses mockCaseDetail's exact party indices (mockParty('accused', index + 1),
// mockParty('victim', index)) so a person shown here is the same identity Case
// Explorer shows for the same caseId.
function networkCaseTuples(): NetworkCaseTuple[] {
  const tuples: NetworkCaseTuple[] = [];
  networkStations().forEach(({ unitId, unitName }) => {
    mockCaseSummaries(unitId, unitName).forEach((summary, index) => {
      const accused = mockParty('accused', index + 1);
      const victim = mockParty('victim', index);
      tuples.push({
        caseId: summary.caseId,
        caseNumber: summary.caseNumber,
        unitId,
        unitName,
        crimeSubHeadId: summary.crimeSubHeadId,
        accusedId: ACCUSED_PERSON_IDS[(index + 1) % ACCUSED_PERSON_IDS.length],
        accusedName: accused.name.real,
        victimId: VICTIM_PERSON_IDS[index % VICTIM_PERSON_IDS.length],
        victimName: victim.name.real,
      });
    });
  });
  return tuples;
}

interface NetworkPersonAgg {
  personId: number;
  displayName: string;
  caseIds: number[];
  crimeSubHeadId: number;
}

function aggregateAccused(tuples: NetworkCaseTuple[]): Map<number, NetworkPersonAgg> {
  const byId = new Map<number, NetworkPersonAgg>();
  tuples.forEach((t) => {
    const existing = byId.get(t.accusedId);
    if (existing) {
      existing.caseIds.push(t.caseId);
    } else {
      byId.set(t.accusedId, { personId: t.accusedId, displayName: t.accusedName, caseIds: [t.caseId], crimeSubHeadId: t.crimeSubHeadId });
    }
  });
  return byId;
}

function confidenceScoreFor(caseCount: number): number {
  return Math.min(0.97, 0.55 + caseCount * 0.06);
}

function personDisplayName(personId: number, tuples: NetworkCaseTuple[]): string | undefined {
  const accused = tuples.find((t) => t.accusedId === personId);
  if (accused) return accused.accusedName;
  const victim = tuples.find((t) => t.victimId === personId);
  if (victim) return victim.victimName;
  return undefined;
}

function buildRepeatOffenders(minCases: number, limit: number) {
  const persons = aggregateAccused(networkCaseTuples());
  return Array.from(persons.values())
    .filter((p) => p.caseIds.length >= minCases)
    .sort((a, b) => b.caseIds.length - a.caseIds.length || a.personId - b.personId)
    .slice(0, limit)
    .map((p) => ({
      personId: p.personId,
      displayName: p.displayName,
      caseCount: p.caseIds.length,
      gravityWeight: p.caseIds.length * 3,
      confidenceScore: confidenceScoreFor(p.caseIds.length),
    }));
}

// Deterministic stand-in for a real Louvain run: groups accused by their crime
// sub-head's parent category. Mirrors the real community focus's actual shape --
// PERSON nodes only, no Case/Location -- so communityId here is just as opaque
// to the frontend as a real Neo4j Louvain cluster id would be.
function buildCommunities(minSize: number) {
  const persons = aggregateAccused(networkCaseTuples());
  const byCommunity = new Map<number, string[]>();
  persons.forEach((p) => {
    const crimeType = CASE_CRIME_TYPES.find((c) => c.crimeSubHeadId === p.crimeSubHeadId)!;
    const list = byCommunity.get(crimeType.crimeHeadId) ?? [];
    list.push(p.displayName);
    byCommunity.set(crimeType.crimeHeadId, list);
  });
  return Array.from(byCommunity.entries())
    .map(([communityId, memberDisplayNames]) => ({ communityId, size: memberDisplayNames.length, memberDisplayNames }))
    .filter((c) => c.size >= minSize)
    .sort((a, b) => b.size - a.size);
}

// Two persons are "adjacent" if they appear (as accused or victim) on the same
// case, OR if two accused share a crimeSubHeadId (the same signal
// sharesMoWithEdges uses for SHARES_MO_WITH) -- a person-to-person adjacency
// graph, matching the real /path endpoint's reported shape
// (personIds/displayNames/hopCount only, no intermediate Case/Location nodes)
// even though the real graph traversal happens over the full node/edge graph,
// including computed CO_ACCUSED_WITH/SHARES_MO_WITH edges.
//
// The case-co-occurrence link alone is NOT enough here: mock accusedId and
// victimId are both pure functions of a case's index-in-station (see
// networkCaseTuples), so every occurrence of a given accusedId pairs with
// exactly one victimId and vice versa -- a perfect matching with no
// accused-to-accused connectivity at all. The crimeSubHeadId link is what
// makes two different repeat offenders reachable from each other, mirroring
// how a real deployment's SHARES_MO_WITH edges would connect them.
function personAdjacency(tuples: NetworkCaseTuple[]): Map<number, Set<number>> {
  const byCase = new Map<number, Set<number>>();
  const bySubHead = new Map<number, Set<number>>();
  tuples.forEach((t) => {
    const caseSet = byCase.get(t.caseId) ?? new Set<number>();
    caseSet.add(t.accusedId);
    caseSet.add(t.victimId);
    byCase.set(t.caseId, caseSet);

    const subHeadSet = bySubHead.get(t.crimeSubHeadId) ?? new Set<number>();
    subHeadSet.add(t.accusedId);
    bySubHead.set(t.crimeSubHeadId, subHeadSet);
  });
  const adjacency = new Map<number, Set<number>>();
  function link(a: number, b: number) {
    if (a === b) return;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }
  byCase.forEach((members) => {
    const list = Array.from(members);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) link(list[i], list[j]);
    }
  });
  bySubHead.forEach((members) => {
    const list = Array.from(members);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) link(list[i], list[j]);
    }
  });
  return adjacency;
}

function bfsPersonPath(from: number, to: number, maxHops: number, tuples: NetworkCaseTuple[]): number[] | null {
  if (from === to) return [from];
  const adjacency = personAdjacency(tuples);
  const queue: number[][] = [[from]];
  const seen = new Set<number>([from]);
  while (queue.length) {
    const current = queue.shift()!;
    const last = current[current.length - 1];
    if (last === to) return current;
    if (current.length - 1 >= maxHops) continue;
    for (const next of adjacency.get(last) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...current, next]);
      }
    }
  }
  return null;
}

function buildNetworkPath(from: number, to: number, maxHops: number) {
  const tuples = networkCaseTuples();
  const fromName = personDisplayName(from, tuples);
  const toName = personDisplayName(to, tuples);
  if (!fromName || !toName) return null;

  const path = bfsPersonPath(from, to, maxHops, tuples);
  if (!path) return null;

  return {
    personIds: path,
    displayNames: path.map((id) => personDisplayName(id, tuples)!),
    hopCount: path.length - 1,
  };
}

type MockGraphNode = { id: string; type: 'PERSON' | 'CASE' | 'LOCATION'; label: string; confidence: number | null };
type MockGraphEdge = { id: string; sourceId: string; targetId: string; type: string; confidence: number | null };

// Caps the node list at 75 and drops any edge whose endpoint didn't survive the
// cap -- mirrors the real Cypher's own documented invariant (never a dangling
// edge, never truncated after the edges were already built).
function capSubgraph(nodes: MockGraphNode[], edges: MockGraphEdge[]) {
  const seen = new Set<string>();
  const cappedNodes = nodes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  }).slice(0, MAX_SUBGRAPH_NODES);
  const nodeIds = new Set(cappedNodes.map((n) => n.id));
  const cappedEdges = edges.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));
  return { nodes: cappedNodes, edges: cappedEdges, generatedAt: '2026-07-19T06:00:00Z' };
}

function sharesMoWithEdges(personIds: number[], tuples: NetworkCaseTuple[]) {
  const bySubHead = new Map<number, Set<number>>();
  tuples.forEach((t) => {
    if (!personIds.includes(t.accusedId)) return;
    const set = bySubHead.get(t.crimeSubHeadId) ?? new Set<number>();
    set.add(t.accusedId);
    bySubHead.set(t.crimeSubHeadId, set);
  });
  const edges: MockGraphEdge[] = [];
  bySubHead.forEach((members) => {
    const list = Array.from(members);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        edges.push({
          id: `smw-${list[i]}-${list[j]}`,
          sourceId: String(list[i]),
          targetId: String(list[j]),
          type: 'SHARES_MO_WITH',
          confidence: 0.7,
        });
      }
    }
  });
  return edges;
}

function egoNetworkNodesAndEdges(seedPersonIds: number[], tuples: NetworkCaseTuple[]) {
  const nodes: MockGraphNode[] = [];
  const edges: MockGraphEdge[] = [];
  const seenNodeIds = new Set<string>();
  function addNode(node: MockGraphNode) {
    if (seenNodeIds.has(node.id)) return;
    seenNodeIds.add(node.id);
    nodes.push(node);
  }

  tuples.forEach((t) => {
    if (!seedPersonIds.includes(t.accusedId) && !seedPersonIds.includes(t.victimId)) return;
    addNode({ id: String(t.accusedId), type: 'PERSON', label: t.accusedName, confidence: confidenceScoreFor(1) });
    addNode({ id: `case-${t.caseId}`, type: 'CASE', label: `${t.caseNumber}`, confidence: null });
    addNode({ id: `location-${t.unitId}`, type: 'LOCATION', label: t.unitName, confidence: null });
    addNode({ id: String(t.victimId), type: 'PERSON', label: t.victimName, confidence: null });
    edges.push({ id: `acc-${t.accusedId}-${t.caseId}`, sourceId: String(t.accusedId), targetId: `case-${t.caseId}`, type: 'ACCUSED_IN', confidence: null });
    edges.push({ id: `vic-${t.victimId}-${t.caseId}`, sourceId: String(t.victimId), targetId: `case-${t.caseId}`, type: 'VICTIM_IN', confidence: null });
    edges.push({ id: `occ-${t.caseId}-${t.unitId}`, sourceId: `case-${t.caseId}`, targetId: `location-${t.unitId}`, type: 'OCCURRED_AT', confidence: null });
  });

  const accusedIdsOnCanvas = nodes.filter((n) => n.type === 'PERSON').map((n) => Number(n.id));
  edges.push(...sharesMoWithEdges(accusedIdsOnCanvas, tuples));

  return capSubgraph(nodes, edges);
}

function buildSubgraph(focus: string, limit: number, personId: number | undefined, hops: number, communityId: number | undefined, from: number | undefined, to: number | undefined, maxHops: number) {
  const tuples = networkCaseTuples();

  if (focus === 'person' && personId != null) {
    const clampedHops = Math.min(Math.max(hops, 1), 2);
    const seeds = [personId];
    if (clampedHops === 2) {
      const directCoParties = tuples
        .filter((t) => t.accusedId === personId || t.victimId === personId)
        .flatMap((t) => [t.accusedId, t.victimId]);
      seeds.push(...directCoParties);
    }
    return egoNetworkNodesAndEdges(seeds, tuples);
  }

  if (focus === 'community' && communityId != null) {
    const persons = aggregateAccused(tuples);
    const memberIds = Array.from(persons.values())
      .filter((p) => {
        const crimeType = CASE_CRIME_TYPES.find((c) => c.crimeSubHeadId === p.crimeSubHeadId)!;
        return crimeType.crimeHeadId === communityId;
      })
      .map((p) => p.personId);
    const nodes: MockGraphNode[] = memberIds.map((id) => {
      const person = persons.get(id)!;
      return { id: String(id), type: 'PERSON', label: person.displayName, confidence: confidenceScoreFor(person.caseIds.length) };
    });
    const edges = sharesMoWithEdges(memberIds, tuples);
    return capSubgraph(nodes, edges);
  }

  if (focus === 'path' && from != null && to != null) {
    const path = bfsPersonPath(from, to, maxHops, tuples);
    if (!path) return capSubgraph([], []);
    const nodes: MockGraphNode[] = [];
    const edges: MockGraphEdge[] = [];
    const seenNodeIds = new Set<string>();
    function addNode(node: MockGraphNode) {
      if (seenNodeIds.has(node.id)) return;
      seenNodeIds.add(node.id);
      nodes.push(node);
    }
    path.forEach((personId2) => {
      const name = personDisplayName(personId2, tuples)!;
      addNode({ id: String(personId2), type: 'PERSON', label: name, confidence: confidenceScoreFor(1) });
    });
    for (let i = 0; i < path.length - 1; i++) {
      const justifyingCase = tuples.find(
        (t) => (t.accusedId === path[i] || t.victimId === path[i]) && (t.accusedId === path[i + 1] || t.victimId === path[i + 1]),
      );
      if (!justifyingCase) continue;
      addNode({ id: `case-${justifyingCase.caseId}`, type: 'CASE', label: justifyingCase.caseNumber, confidence: null });
      addNode({ id: `location-${justifyingCase.unitId}`, type: 'LOCATION', label: justifyingCase.unitName, confidence: null });
      edges.push({ id: `p-${path[i]}-${justifyingCase.caseId}`, sourceId: String(path[i]), targetId: `case-${justifyingCase.caseId}`, type: 'ACCUSED_IN', confidence: null });
      edges.push({ id: `p-${path[i + 1]}-${justifyingCase.caseId}`, sourceId: String(path[i + 1]), targetId: `case-${justifyingCase.caseId}`, type: 'VICTIM_IN', confidence: null });
      edges.push({ id: `occ-${justifyingCase.caseId}`, sourceId: `case-${justifyingCase.caseId}`, targetId: `location-${justifyingCase.unitId}`, type: 'OCCURRED_AT', confidence: null });
    }
    return capSubgraph(nodes, edges);
  }

  const seeds = buildRepeatOffenders(1, limit).map((o) => o.personId);
  return egoNetworkNodesAndEdges(seeds, tuples);
}
```

Then add four route matches inside `getMockResponse`, right before its final `return undefined;`:

```ts
  if (path.startsWith('/api/network/subgraph?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildSubgraph(
      query.get('focus') ?? 'top-offenders',
      Number(query.get('limit') ?? 10),
      query.get('personId') ? Number(query.get('personId')) : undefined,
      Number(query.get('hops') ?? 2),
      query.get('communityId') ? Number(query.get('communityId')) : undefined,
      query.get('from') ? Number(query.get('from')) : undefined,
      query.get('to') ? Number(query.get('to')) : undefined,
      Number(query.get('maxHops') ?? 6),
    );
  }

  if (path.startsWith('/api/network/repeat-offenders?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildRepeatOffenders(Number(query.get('minCases') ?? 2), Number(query.get('limit') ?? 10));
  }

  if (path.startsWith('/api/network/communities?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildCommunities(Number(query.get('minSize') ?? 3));
  }

  if (path.startsWith('/api/network/path?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildNetworkPath(Number(query.get('from')), Number(query.get('to')), Number(query.get('maxHops') ?? 6));
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/api/mockData.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/mockData.ts src/api/mockData.test.ts
git commit -m "Add mock data for the real network subgraph, repeat-offenders, communities, and path endpoints"
```

---

## Task 3: `networkColors.ts` + `CommunityLegend`

**Files:**
- Create: `src/screens/network/networkColors.ts`
- Test: `src/screens/network/networkColors.test.ts`
- Create: `src/screens/network/CommunityLegend.tsx`
- Test: `src/screens/network/CommunityLegend.test.tsx`

**Interfaces:**
- Consumes: `CommunityResponse` (Task 1's `networkApi.ts`).
- Produces: `colorForCommunity(communityId: number): string`, consumed by Task 6 (`NetworkGraphCanvas`). `CommunityLegend` component with an `onSelect(communityId: number)` callback, consumed by Task 8 (`NetworkScreen`).

A real Neo4j `communityId` is an arbitrary Louvain cluster id with no relation to any crime-category
palette, so `colorForCommunity` hashes `communityId` into one of the 5 `--cat-N` slots by
`communityId % 5` — it does **not** reuse `CategoryMixChart`'s `crimeHeadId -> slot` map (mock data
happens to derive `communityId` from `crimeHeadId` today, but the frontend must treat `communityId`
as opaque). `GraphNodeResponse` carries no `communityId`, so `CommunityLegend` only knows sizes/member
names from a separately-fetched `communities` list — it doesn't attempt to look up which canvas nodes
belong to which community (that cross-reference happens in `NetworkGraphCanvas`, Task 6, via a
`communityByLabel` map `NetworkScreen`, Task 8, builds).

- [ ] **Step 1: Write the failing tests**

Create `src/screens/network/networkColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { colorForCommunity } from './networkColors';

describe('colorForCommunity', () => {
  it('maps communityId 0 to --cat-1', () => {
    expect(colorForCommunity(0)).toBe('var(--cat-1)');
  });

  it('wraps communityId 7 to --cat-3 (7 % 5 = 2, slot index + 1)', () => {
    expect(colorForCommunity(7)).toBe('var(--cat-3)');
  });

  it('gives the same communityId the same color across calls', () => {
    expect(colorForCommunity(42)).toBe(colorForCommunity(42));
  });
});
```

Create `src/screens/network/CommunityLegend.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityLegend } from './CommunityLegend';
import type { CommunityResponse } from '../../api/networkApi';

const communities: CommunityResponse[] = [
  { communityId: 2, size: 4, memberDisplayNames: ['Suresh Naik', 'Vijay Kumar'] },
  { communityId: 1, size: 2, memberDisplayNames: ['Rakesh Yadav'] },
];

describe('CommunityLegend', () => {
  it('renders node-type labels and one row per community with its size', () => {
    render(<CommunityLegend communities={communities} onSelect={vi.fn()} />);

    expect(screen.getByText('Person')).toBeInTheDocument();
    expect(screen.getByText('Case')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Community 2 · 4')).toBeInTheDocument();
    expect(screen.getByText('Community 1 · 2')).toBeInTheDocument();
  });

  it('calls onSelect with the communityId when a community row is clicked', async () => {
    const onSelect = vi.fn();
    render(<CommunityLegend communities={communities} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Community 2 · 4'));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('renders nothing under "Detected communities" when there are none', () => {
    render(<CommunityLegend communities={[]} onSelect={vi.fn()} />);
    expect(screen.queryByText(/Community/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/screens/network/networkColors.test.ts src/screens/network/CommunityLegend.test.tsx`
Expected: FAIL with "Cannot find module './networkColors'" / "./CommunityLegend"

- [ ] **Step 3: Implement**

Create `src/screens/network/networkColors.ts`:

```ts
const COMMUNITY_SLOT_COUNT = 5;

// A real Neo4j communityId is an arbitrary Louvain cluster id -- this hashes
// it into one of tokens.css's --cat-1..--cat-5 slots. Deliberately NOT a reuse
// of CategoryMixChart's crimeHeadId -> slot map: that map only makes sense
// for the fixed 5-value crimeHeadId domain, not an open-ended cluster id.
export function colorForCommunity(communityId: number): string {
  const normalized = ((communityId % COMMUNITY_SLOT_COUNT) + COMMUNITY_SLOT_COUNT) % COMMUNITY_SLOT_COUNT;
  return `var(--cat-${normalized + 1})`;
}
```

Create `src/screens/network/CommunityLegend.tsx`:

```tsx
import type { CommunityResponse } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';

interface CommunityLegendProps {
  communities: CommunityResponse[];
  onSelect: (communityId: number) => void;
}

export function CommunityLegend({ communities, onSelect }: CommunityLegendProps) {
  return (
    <div className="legend-panel">
      <div>
        <h4>Node type</h4>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: 'var(--muted-2)' }} />
          Person
        </div>
        <div className="legend-row">
          <span className="legend-shape" aria-hidden="true">
            ◆
          </span>
          Case
        </div>
        <div className="legend-row">
          <span className="legend-shape" aria-hidden="true">
            ▲
          </span>
          Location
        </div>
      </div>
      <div>
        <h4>Detected communities</h4>
        {communities.map((c) => (
          <button key={c.communityId} className="legend-row legend-row-button" onClick={() => onSelect(c.communityId)}>
            <span className="legend-dot" style={{ background: colorForCommunity(c.communityId) }} />
            Community {c.communityId} · {c.size}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/screens/network/networkColors.test.ts src/screens/network/CommunityLegend.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/network/networkColors.ts src/screens/network/networkColors.test.ts src/screens/network/CommunityLegend.tsx src/screens/network/CommunityLegend.test.tsx
git commit -m "Add CommunityLegend and communityId-hash color mapping"
```

---

## Task 4: `RepeatOffenderRail`

**Files:**
- Create: `src/screens/network/RepeatOffenderRail.tsx`
- Test: `src/screens/network/RepeatOffenderRail.test.tsx`

**Interfaces:**
- Consumes: `RepeatOffenderResponse` (Task 1's `networkApi.ts`), `ConfidenceChip` (`src/design-system/ConfidenceChip.tsx`, existing).
- Produces: `RepeatOffenderRail` component with an `onSelect(personId: number)` callback, consumed by Task 8 (`NetworkScreen`).

- [ ] **Step 1: Write the failing test**

Create `src/screens/network/RepeatOffenderRail.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepeatOffenderRail } from './RepeatOffenderRail';
import type { RepeatOffenderResponse } from '../../api/networkApi';

const offenders: RepeatOffenderResponse[] = [
  { personId: 5001, displayName: 'Suresh Naik', caseCount: 5, gravityWeight: 15, confidenceScore: 0.83 },
  { personId: 5002, displayName: 'Vijay Kumar', caseCount: 3, gravityWeight: 9, confidenceScore: 0.73 },
];

describe('RepeatOffenderRail', () => {
  it('renders each offender ranked, with display name, case count, and confidence', () => {
    render(<RepeatOffenderRail offenders={offenders} onSelect={vi.fn()} />);

    expect(screen.getByText('Suresh Naik')).toBeInTheDocument();
    expect(screen.getByText('5 linked cases')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
  });

  it('calls onSelect with the numeric personId when a card is clicked', async () => {
    const onSelect = vi.fn();
    render(<RepeatOffenderRail offenders={offenders} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Suresh Naik'));

    expect(onSelect).toHaveBeenCalledWith(5001);
  });

  it('shows an empty state when there are no repeat offenders', () => {
    render(<RepeatOffenderRail offenders={[]} onSelect={vi.fn()} />);
    expect(screen.getByText('No repeat offenders in this scope.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/network/RepeatOffenderRail.test.tsx`
Expected: FAIL with "Cannot find module './RepeatOffenderRail'"

- [ ] **Step 3: Implement**

Create `src/screens/network/RepeatOffenderRail.tsx`:

```tsx
import { ConfidenceChip } from '../../design-system/ConfidenceChip';
import type { RepeatOffenderResponse } from '../../api/networkApi';

interface RepeatOffenderRailProps {
  offenders: RepeatOffenderResponse[];
  onSelect: (personId: number) => void;
}

export function RepeatOffenderRail({ offenders, onSelect }: RepeatOffenderRailProps) {
  return (
    <aside className="offender-rail">
      <div className="offender-rail-head">
        <h3>Repeat offenders</h3>
        <div className="sub">Ranked by linked-case count</div>
      </div>
      <div className="offender-list">
        {offenders.length === 0 ? (
          <p>No repeat offenders in this scope.</p>
        ) : (
          offenders.map((offender, index) => (
            <button key={offender.personId} className="offender-card" onClick={() => onSelect(offender.personId)}>
              <div className="offender-top">
                <span className="offender-rank mono">{index + 1}</span>
                <span className="offender-name">{offender.displayName}</span>
                <ConfidenceChip confidence={offender.confidenceScore} />
              </div>
              <div className="offender-meta">
                <span className="cases mono">
                  {offender.caseCount} linked case{offender.caseCount === 1 ? '' : 's'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/screens/network/RepeatOffenderRail.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/network/RepeatOffenderRail.tsx src/screens/network/RepeatOffenderRail.test.tsx
git commit -m "Add RepeatOffenderRail"
```

---

## Task 5: `networkLayout.ts` — deterministic force-directed layout

**Files:**
- Create: `src/screens/network/networkLayout.ts`
- Test: `src/screens/network/networkLayout.test.ts`

**Interfaces:**
- Consumes: `GraphNodeResponse`, `GraphEdgeResponse` (Task 1's `networkApi.ts`).
- Produces: `computeForceLayout(nodes, edges): Map<string, { x: number; y: number }>`, consumed by Task 6 (`NetworkGraphCanvas`).

Ported from `docs/superpowers/fe-artifacts-html/build/build_network.py`'s simulation (220 fixed
iterations, spring + repulsion, same constants), with the mockup's `Math.random()` initial placement
replaced by a seeded PRNG keyed on each node's id. Edges use `sourceId`/`targetId` (the real
contract's field names, not the old mockup's `a`/`b`), and person-to-person edge kinds
(`CO_ACCUSED_WITH`, `SHARES_MO_WITH`) get a longer spring rest length than person-to-case/case-to-location
edges, same tuning idea as the original mockup's `co-accused` special case.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/network/networkLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeForceLayout } from './networkLayout';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const nodes: GraphNodeResponse[] = [
  { id: '1', type: 'PERSON', label: 'Suresh Naik', confidence: 0.8 },
  { id: '2', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.7 },
  { id: 'case-1', type: 'CASE', label: '276/2026', confidence: null },
];
const edges: GraphEdgeResponse[] = [
  { id: 'e1', sourceId: '1', targetId: 'case-1', type: 'ACCUSED_IN', confidence: null },
  { id: 'e2', sourceId: '2', targetId: 'case-1', type: 'VICTIM_IN', confidence: null },
];

describe('computeForceLayout', () => {
  it('returns a position for every node', () => {
    const positions = computeForceLayout(nodes, edges);
    expect(positions.size).toBe(3);
    nodes.forEach((n) => expect(positions.has(n.id)).toBe(true));
  });

  it('keeps every position within the 660x460 canvas bounds', () => {
    const positions = computeForceLayout(nodes, edges);
    positions.forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(660);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(460);
    });
  });

  it('is deterministic -- the same nodes/edges always produce the same layout', () => {
    const a = computeForceLayout(nodes, edges);
    const b = computeForceLayout(nodes, edges);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it('ignores an edge referencing a node not in the node list', () => {
    const edgesWithDangling: GraphEdgeResponse[] = [...edges, { id: 'e3', sourceId: '1', targetId: 'ghost', type: 'ACCUSED_IN', confidence: null }];
    expect(() => computeForceLayout(nodes, edgesWithDangling)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/network/networkLayout.test.ts`
Expected: FAIL with "Cannot find module './networkLayout'"

- [ ] **Step 3: Implement**

Create `src/screens/network/networkLayout.ts`:

```ts
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const CANVAS_W = 660;
const CANVAS_H = 460;
const ITERATIONS = 220;

// Deterministic hash of a node id into a PRNG seed -- stands in for build_network.py's
// Math.random() initial placement, which this codebase's mock/layout code never uses:
// same node set always lays out identically.
function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 2147483647;
  }
  return hash <= 0 ? hash + 2147483646 : hash;
}

// Park-Miller minimal standard LCG.
function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
}

const PERSON_TO_PERSON_EDGE_TYPES = new Set(['CO_ACCUSED_WITH', 'SHARES_MO_WITH']);

export function computeForceLayout(nodes: GraphNodeResponse[], edges: GraphEdgeResponse[]): Map<string, { x: number; y: number }> {
  const layoutNodes: LayoutNode[] = nodes.map((n) => {
    const rand = seededRandom(hashId(n.id));
    return { id: n.id, x: rand() * 600 + 40, y: rand() * 380 + 40, vx: 0, vy: 0, fx: 0, fy: 0 };
  });
  const byId = new Map(layoutNodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    layoutNodes.forEach((n) => {
      n.fx = 0;
      n.fy = 0;
    });

    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const a = layoutNodes[i];
        const b = layoutNodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy || 0.01;
        const d = Math.sqrt(d2);
        const rep = 900 / d2;
        const fx = (dx / d) * rep;
        const fy = (dy / d) * rep;
        a.fx += fx;
        a.fy += fy;
        b.fx -= fx;
        b.fy -= fy;
      }
    }

    edges.forEach((e) => {
      const a = byId.get(e.sourceId);
      const b = byId.get(e.targetId);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target = PERSON_TO_PERSON_EDGE_TYPES.has(e.type) ? 70 : 50;
      const f = (d - target) * 0.02;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      a.fx += fx;
      a.fy += fy;
      b.fx -= fx;
      b.fy -= fy;
    });

    layoutNodes.forEach((n) => {
      n.vx = (n.vx + n.fx) * 0.75;
      n.vy = (n.vy + n.fy) * 0.75;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(30, Math.min(CANVAS_W - 30, n.x));
      n.y = Math.max(30, Math.min(CANVAS_H - 30, n.y));
    });
  }

  const positions = new Map<string, { x: number; y: number }>();
  layoutNodes.forEach((n) => positions.set(n.id, { x: n.x, y: n.y }));
  return positions;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/screens/network/networkLayout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/network/networkLayout.ts src/screens/network/networkLayout.test.ts
git commit -m "Add deterministic force-directed layout for the network graph canvas"
```

---

## Task 6: `NetworkGraphCanvas`

**Files:**
- Create: `src/screens/network/NetworkGraphCanvas.tsx`
- Test: `src/screens/network/NetworkGraphCanvas.test.tsx`

**Interfaces:**
- Consumes: `GraphNodeResponse`, `GraphEdgeResponse`, `personIdOfNode` (Task 1), `computeForceLayout` (Task 5), `colorForCommunity` (Task 3).
- Produces: `NetworkGraphCanvas` component with props `{ nodes, edges, communityByLabel, pathEndpointIds, pathMemberIds, onPersonClick }`, consumed by Task 8 (`NetworkScreen`).

`communityByLabel: Map<string, number>` is how a `PERSON` node's color is resolved — `GraphNodeResponse`
carries no `communityId` field, so `NetworkScreen` (Task 8) builds this map from a separately-fetched
`communities` list (`label -> communityId`) and passes it down. `pathEndpointIds`/`pathMemberIds` are
node id **strings** (matching `GraphNodeResponse.id`), not `personId` numbers — `NetworkScreen`
converts its numeric `personId` state to strings before passing them in. `onPersonClick` receives the
numeric `personId` (via `personIdOfNode`), not the raw node id, so callers never have to do that
conversion themselves. `CASE`/`LOCATION` nodes are not interactive, matching the mockup.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/network/NetworkGraphCanvas.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkGraphCanvas } from './NetworkGraphCanvas';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const nodes: GraphNodeResponse[] = [
  { id: '5001', type: 'PERSON', label: 'Suresh Naik', confidence: 0.83 },
  { id: '5002', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.73 },
  { id: 'case-176000', type: 'CASE', label: '276/2026', confidence: null },
  { id: 'location-176', type: 'LOCATION', label: 'Whitefield PS', confidence: null },
];
const edges: GraphEdgeResponse[] = [
  { id: 'e1', sourceId: '5001', targetId: 'case-176000', type: 'ACCUSED_IN', confidence: null },
  { id: 'e2', sourceId: 'case-176000', targetId: 'location-176', type: 'OCCURRED_AT', confidence: null },
];

describe('NetworkGraphCanvas', () => {
  it('renders one graph-node element per node', () => {
    const { container } = render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onPersonClick={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('.graph-node')).toHaveLength(4);
  });

  it('calls onPersonClick with the numeric personId when a person node is clicked', async () => {
    const onPersonClick = vi.fn();
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onPersonClick={onPersonClick}
      />,
    );

    await userEvent.click(screen.getByLabelText('Suresh Naik'));

    expect(onPersonClick).toHaveBeenCalledWith(5001);
  });

  it('marks a person in pathEndpointIds with the path-endpoint class', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={['5001']}
        pathMemberIds={[]}
        onPersonClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Suresh Naik')).toHaveClass('path-endpoint');
  });

  it('marks a person in pathMemberIds with the path-highlight class', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={['5002']}
        onPersonClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Vijay Kumar')).toHaveClass('path-highlight');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/screens/network/NetworkGraphCanvas.test.tsx`
Expected: FAIL with "Cannot find module './NetworkGraphCanvas'"

- [ ] **Step 3: Implement**

Create `src/screens/network/NetworkGraphCanvas.tsx`:

```tsx
import { useMemo } from 'react';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';
import { personIdOfNode } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';
import { computeForceLayout } from './networkLayout';

interface NetworkGraphCanvasProps {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  communityByLabel: Map<string, number>;
  pathEndpointIds: string[];
  pathMemberIds: string[];
  onPersonClick: (personId: number) => void;
}

const PERSON_TO_PERSON_EDGE_TYPES = new Set(['CO_ACCUSED_WITH', 'SHARES_MO_WITH']);

export function NetworkGraphCanvas({ nodes, edges, communityByLabel, pathEndpointIds, pathMemberIds, onPersonClick }: NetworkGraphCanvasProps) {
  const positions = useMemo(() => computeForceLayout(nodes, edges), [nodes, edges]);

  return (
    <svg className="graph-canvas" viewBox="0 0 660 460" role="img" aria-label="Case network graph">
      {edges.map((edge) => {
        const a = positions.get(edge.sourceId);
        const b = positions.get(edge.targetId);
        if (!a || !b) return null;
        return (
          <line
            key={edge.id}
            className={`graph-edge${PERSON_TO_PERSON_EDGE_TYPES.has(edge.type) ? ' mo-shared' : ''}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
          />
        );
      })}
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        if (node.type === 'PERSON') {
          const communityId = communityByLabel.get(node.label);
          const stateClass = pathEndpointIds.includes(node.id)
            ? ' path-endpoint'
            : pathMemberIds.includes(node.id)
              ? ' path-highlight'
              : '';
          return (
            <g key={node.id}>
              <circle
                className={`graph-node${stateClass}`}
                cx={pos.x}
                cy={pos.y}
                r={9}
                fill={communityId != null ? colorForCommunity(communityId) : 'var(--muted-2)'}
                tabIndex={0}
                role="button"
                aria-label={node.label}
                onClick={() => onPersonClick(personIdOfNode(node))}
              />
              <text className="node-label" x={pos.x} y={pos.y - 13} textAnchor="middle">
                {node.label.split(' ')[0]}
              </text>
            </g>
          );
        }

        if (node.type === 'CASE') {
          return (
            <rect
              key={node.id}
              className="graph-node graph-node-case"
              x={pos.x - 5}
              y={pos.y - 5}
              width={10}
              height={10}
              transform={`rotate(45 ${pos.x} ${pos.y})`}
            />
          );
        }

        return (
          <polygon
            key={node.id}
            className="graph-node graph-node-location"
            points={`${pos.x},${pos.y - 8} ${pos.x + 8},${pos.y + 5.6} ${pos.x - 8},${pos.y + 5.6}`}
          />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/screens/network/NetworkGraphCanvas.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/network/NetworkGraphCanvas.tsx src/screens/network/NetworkGraphCanvas.test.tsx
git commit -m "Add NetworkGraphCanvas"
```

---

## Task 7: `PathFindingBar`

**Files:**
- Create: `src/screens/network/PathFindingBar.tsx`
- Test: `src/screens/network/PathFindingBar.test.tsx`

**Interfaces:**
- Consumes: `NetworkPathResponse` (Task 1).
- Produces: `PathFindingBar` component with props `{ pathMode, onToggle, pathEndpoints, pathResult, isPathLoading, isPathError }`, consumed by Task 8 (`NetworkScreen`).

- [ ] **Step 1: Write the failing tests**

Create `src/screens/network/PathFindingBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PathFindingBar } from './PathFindingBar';
import type { NetworkPathResponse } from '../../api/networkApi';

describe('PathFindingBar', () => {
  it('shows "Off" and calls onToggle when the toggle is clicked', async () => {
    const onToggle = vi.fn();
    render(
      <PathFindingBar
        pathMode={false}
        onToggle={onToggle}
        pathEndpoints={[]}
        pathResult={undefined}
        isPathLoading={false}
        isPathError={false}
      />,
    );

    expect(screen.getByText('Off')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toggle path-finding mode' }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('prompts to click two people once path mode is on', () => {
    render(
      <PathFindingBar
        pathMode={true}
        onToggle={vi.fn()}
        pathEndpoints={[]}
        pathResult={undefined}
        isPathLoading={false}
        isPathError={false}
      />,
    );
    expect(screen.getByText('Click two people')).toBeInTheDocument();
  });

  it('shows the hop count and name chain once a path resolves', () => {
    const pathResult: NetworkPathResponse = {
      personIds: [5001, 5002],
      displayNames: ['Suresh Naik', 'Vijay Kumar'],
      hopCount: 1,
    };
    render(
      <PathFindingBar
        pathMode={true}
        onToggle={vi.fn()}
        pathEndpoints={[5001, 5002]}
        pathResult={pathResult}
        isPathLoading={false}
        isPathError={false}
      />,
    );
    expect(screen.getByText('1 hop')).toBeInTheDocument();
    expect(screen.getByText(/Suresh Naik → Vijay Kumar/)).toBeInTheDocument();
  });

  it('shows a "no path found" message when the path result is null', () => {
    render(
      <PathFindingBar
        pathMode={true}
        onToggle={vi.fn()}
        pathEndpoints={[5001, 5002]}
        pathResult={null}
        isPathLoading={false}
        isPathError={false}
      />,
    );
    expect(screen.getByText('No path found within 6 hops.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/screens/network/PathFindingBar.test.tsx`
Expected: FAIL with "Cannot find module './PathFindingBar'"

- [ ] **Step 3: Implement**

Create `src/screens/network/PathFindingBar.tsx`:

```tsx
import type { NetworkPathResponse } from '../../api/networkApi';

interface PathFindingBarProps {
  pathMode: boolean;
  onToggle: () => void;
  pathEndpoints: number[];
  pathResult: NetworkPathResponse | null | undefined;
  isPathLoading: boolean;
  isPathError: boolean;
}

export function PathFindingBar({ pathMode, onToggle, pathEndpoints, pathResult, isPathLoading, isPathError }: PathFindingBarProps) {
  return (
    <div className="path-toggle-bar">
      <span className="label">Path-finding mode</span>
      <button
        className={`mini-toggle${pathMode ? ' on' : ''}`}
        aria-label="Toggle path-finding mode"
        aria-pressed={pathMode}
        onClick={onToggle}
      >
        <span className="knob" />
      </button>
      <span className="hint">{pathMode ? 'Click two people' : 'Off'}</span>
      {pathEndpoints.length === 2 && (
        <span className="path-result show">
          {isPathLoading && '· Finding path…'}
          {!isPathLoading && isPathError && '· Could not find a path.'}
          {!isPathLoading && !isPathError && pathResult === null && '· No path found within 6 hops.'}
          {!isPathLoading && !isPathError && pathResult && (
            <>
              {' · '}
              <span className="hops mono">
                {pathResult.hopCount} hop{pathResult.hopCount === 1 ? '' : 's'}
              </span>
              {' via '}
              {pathResult.displayNames.join(' → ')}
            </>
          )}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/screens/network/PathFindingBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/network/PathFindingBar.tsx src/screens/network/PathFindingBar.test.tsx
git commit -m "Add PathFindingBar"
```

---

## Task 8: `NetworkScreen` — compose everything, focus state, CSS

**Files:**
- Create: `src/screens/network/NetworkScreen.tsx`
- Test: `src/screens/network/NetworkScreen.test.tsx`
- Modify: `src/design-system/components.css`

**Interfaces:**
- Consumes: `useAuth` (`AuthContext.tsx`), `useSubgraph`/`useRepeatOffenders`/`useCommunities`/`useNetworkPath`/`personIdOfNode` (Task 1), `NetworkGraphCanvas` (Task 6), `PathFindingBar` (Task 7), `CommunityLegend` (Task 3), `RepeatOffenderRail` (Task 4), `EvidencePanel`/`EvidenceData` (`design-system/EvidencePanel.tsx`, existing — `{claim, confidence, confidenceLabel, method, baseline, generatedAt, records: string[]}`), `Header` (`app/Header.tsx`, existing).
- Produces: `NetworkScreen` component, consumed by Task 9 (`App.tsx` route).

No `useMe()`, no scope derivation — access is `SCRB_ANALYST`-only at the route level (Task 9), and
none of the four network endpoints take a scope parameter. `NetworkScreen` holds a local `focus` state
(`top-offenders` | `person` | `community` | `path`) that drives a single `useSubgraph` call; the
repeat-offender rail and community legend are fetched independently of `focus` so they always show
the full ranked list/legend, not just what's on-canvas.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/network/NetworkScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as networkApiModule from '../../api/networkApi';
import { NetworkScreen } from './NetworkScreen';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<T, Error>;
}

const subgraph: networkApiModule.SubgraphResponse = {
  nodes: [{ id: '5001', type: 'PERSON', label: 'Suresh Naik', confidence: 0.83 }],
  edges: [],
  generatedAt: '2026-07-19T06:00:00Z',
};

const offenders: networkApiModule.RepeatOffenderResponse[] = [
  { personId: 5001, displayName: 'Suresh Naik', caseCount: 3, gravityWeight: 9, confidenceScore: 0.73 },
];

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
  });
}

function mockNetworkQueries(overrides: Partial<{ subgraph: UseQueryResult<networkApiModule.SubgraphResponse, Error> }> = {}) {
  vi.spyOn(networkApiModule, 'useSubgraph').mockReturnValue(overrides.subgraph ?? mockSuccess(subgraph));
  vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(mockSuccess(offenders));
  vi.spyOn(networkApiModule, 'useCommunities').mockReturnValue(mockSuccess([{ communityId: 2, size: 1, memberDisplayNames: ['Suresh Naik'] }]));
  vi.spyOn(networkApiModule, 'useNetworkPath').mockReturnValue(mockSuccess(null));
}

describe('NetworkScreen', () => {
  it('renders the graph once loaded, defaulting to top-offenders focus', async () => {
    mockAuth();
    mockNetworkQueries();

    render(<NetworkScreen />);

    expect(await screen.findByLabelText('Suresh Naik')).toBeInTheDocument();
    expect(networkApiModule.useSubgraph).toHaveBeenCalledWith('jwt', { focus: 'top-offenders', limit: 10 });
  });

  it('shows the loading skeleton while the subgraph is loading', () => {
    mockAuth();
    mockNetworkQueries({
      subgraph: { data: undefined, isLoading: true, isError: false, isSuccess: false, refetch: vi.fn() } as unknown as UseQueryResult<
        networkApiModule.SubgraphResponse,
        Error
      >,
    });

    render(<NetworkScreen />);

    expect(screen.getByLabelText('Loading network graph')).toBeInTheDocument();
  });

  it('shows an alert and retry button when the subgraph query fails', () => {
    mockAuth();
    mockNetworkQueries({
      subgraph: { data: undefined, isLoading: false, isError: true, isSuccess: false, refetch: vi.fn() } as unknown as UseQueryResult<
        networkApiModule.SubgraphResponse,
        Error
      >,
    });

    render(<NetworkScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the network");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows an empty-focus message when the subgraph has no nodes', async () => {
    mockAuth();
    mockNetworkQueries({ subgraph: mockSuccess({ nodes: [], edges: [], generatedAt: '2026-07-19T06:00:00Z' }) });

    render(<NetworkScreen />);

    expect(await screen.findByText('No linked records for this view.')).toBeInTheDocument();
  });

  it('clicking the repeat-offender rail card switches focus to that person and opens the evidence panel', async () => {
    mockAuth();
    mockNetworkQueries();

    render(<NetworkScreen />);
    await userEvent.click(await screen.findByText('Suresh Naik'));

    expect(await screen.findByRole('dialog', { name: 'Evidence panel' })).toBeInTheDocument();
    await waitFor(() => expect(networkApiModule.useSubgraph).toHaveBeenLastCalledWith('jwt', { focus: 'person', personId: 5001, hops: 2 }));
  });

  it('clicking a community legend row switches focus to that community', async () => {
    mockAuth();
    mockNetworkQueries();

    render(<NetworkScreen />);
    await userEvent.click(await screen.findByText('Community 2 · 1'));

    await waitFor(() => expect(networkApiModule.useSubgraph).toHaveBeenLastCalledWith('jwt', { focus: 'community', communityId: 2 }));
  });

  it('toggling path mode and clicking two people queries useNetworkPath with both ids and switches focus to path', async () => {
    mockAuth();
    mockNetworkQueries({
      subgraph: mockSuccess({
        nodes: [
          ...subgraph.nodes,
          { id: '5002', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.73 },
        ],
        edges: [],
        generatedAt: '2026-07-19T06:00:00Z',
      }),
    });

    render(<NetworkScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Toggle path-finding mode' }));
    await userEvent.click(await screen.findByLabelText('Suresh Naik'));
    await userEvent.click(screen.getByLabelText('Vijay Kumar'));

    await waitFor(() => expect(networkApiModule.useNetworkPath).toHaveBeenLastCalledWith('jwt', 5001, 5002, 6));
    await waitFor(() => expect(networkApiModule.useSubgraph).toHaveBeenLastCalledWith('jwt', { focus: 'path', from: 5001, to: 5002, maxHops: 6 }));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/screens/network/NetworkScreen.test.tsx`
Expected: FAIL with "Cannot find module './NetworkScreen'"

- [ ] **Step 3: Implement `NetworkScreen.tsx`**

Create `src/screens/network/NetworkScreen.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import {
  useSubgraph,
  useRepeatOffenders,
  useCommunities,
  useNetworkPath,
  personIdOfNode,
  type GraphNodeResponse,
  type RepeatOffenderResponse,
  type SubgraphParams,
} from '../../api/networkApi';
import { EvidencePanel, type EvidenceData } from '../../design-system/EvidencePanel';
import { NetworkGraphCanvas } from './NetworkGraphCanvas';
import { PathFindingBar } from './PathFindingBar';
import { CommunityLegend } from './CommunityLegend';
import { RepeatOffenderRail } from './RepeatOffenderRail';

type NetworkFocus =
  | { mode: 'top-offenders' }
  | { mode: 'person'; personId: number }
  | { mode: 'community'; communityId: number }
  | { mode: 'path'; from: number; to: number };

function subgraphParamsForFocus(focus: NetworkFocus): SubgraphParams {
  switch (focus.mode) {
    case 'top-offenders':
      return { focus: 'top-offenders', limit: 10 };
    case 'person':
      return { focus: 'person', personId: focus.personId, hops: 2 };
    case 'community':
      return { focus: 'community', communityId: focus.communityId };
    case 'path':
      return { focus: 'path', from: focus.from, to: focus.to, maxHops: 6 };
  }
}

type SelectedPerson = { source: 'offender'; data: RepeatOffenderResponse } | { source: 'node'; data: GraphNodeResponse };

export function NetworkScreen() {
  const { token } = useAuth();

  const [focus, setFocus] = useState<NetworkFocus>({ mode: 'top-offenders' });
  const [pathMode, setPathMode] = useState(false);
  const [pathEndpoints, setPathEndpoints] = useState<number[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(null);

  const subgraphQuery = useSubgraph(token, subgraphParamsForFocus(focus));
  const offendersQuery = useRepeatOffenders(token);
  const communitiesQuery = useCommunities(token);
  const pathQuery = useNetworkPath(token, pathEndpoints[0] ?? null, pathEndpoints[1] ?? null, 6);

  const communityByLabel = useMemo(() => {
    const map = new Map<string, number>();
    (communitiesQuery.data ?? []).forEach((c) => c.memberDisplayNames.forEach((name) => map.set(name, c.communityId)));
    return map;
  }, [communitiesQuery.data]);

  const isLoading = subgraphQuery.isLoading || offendersQuery.isLoading || communitiesQuery.isLoading;
  const isError = subgraphQuery.isError || offendersQuery.isError || communitiesQuery.isError;

  if (isLoading) {
    return (
      <>
        <Header title="Network / Link Analysis" />
        <main className="network-main">
          <div className="graph-canvas-skeleton" aria-label="Loading network graph" />
        </main>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header title="Network / Link Analysis" />
        <main className="network-main">
          <p role="alert">Couldn't load the network — check your connection and try again.</p>
          <button
            onClick={() => {
              subgraphQuery.refetch();
              offendersQuery.refetch();
              communitiesQuery.refetch();
            }}
          >
            Retry
          </button>
        </main>
      </>
    );
  }

  const nodes = subgraphQuery.data?.nodes ?? [];
  const edges = subgraphQuery.data?.edges ?? [];
  const offenders = offendersQuery.data ?? [];
  const communities = communitiesQuery.data ?? [];

  function togglePathMode() {
    setPathMode((prev) => !prev);
    setPathEndpoints([]);
  }

  function handlePersonClick(personId: number) {
    if (pathMode) {
      setPathEndpoints((prev) => {
        if (prev.includes(personId)) return prev;
        const next = prev.length === 2 ? [personId] : [...prev, personId];
        if (next.length === 2) setFocus({ mode: 'path', from: next[0], to: next[1] });
        return next;
      });
      return;
    }
    const offender = offenders.find((o) => o.personId === personId);
    if (offender) {
      setSelectedPerson({ source: 'offender', data: offender });
    } else {
      const node = nodes.find((n) => n.type === 'PERSON' && personIdOfNode(n) === personId);
      if (node) setSelectedPerson({ source: 'node', data: node });
    }
    setFocus({ mode: 'person', personId });
  }

  function handleCommunitySelect(communityId: number) {
    setFocus({ mode: 'community', communityId });
  }

  function resetFocus() {
    setFocus({ mode: 'top-offenders' });
    setPathMode(false);
    setPathEndpoints([]);
  }

  const generatedAt = subgraphQuery.data?.generatedAt ?? new Date().toISOString();
  const supportingCaseLabels = nodes.filter((n) => n.type === 'CASE').slice(0, 3).map((n) => n.label);

  const evidenceData: EvidenceData | null = selectedPerson && (
    selectedPerson.source === 'offender'
      ? {
          claim: `${selectedPerson.data.displayName} is linked to ${selectedPerson.data.caseCount} case(s), gravity-weighted score ${selectedPerson.data.gravityWeight}.`,
          confidence: selectedPerson.data.confidenceScore,
          confidenceLabel: 'Identity-resolution confidence',
          method: 'graph-service repeat-offender ranking',
          baseline: 'Statewide',
          generatedAt,
          records: supportingCaseLabels,
        }
      : {
          claim: `${selectedPerson.data.label} appears in the current network view.`,
          confidence: selectedPerson.data.confidence ?? 0,
          confidenceLabel: 'Identity-resolution confidence',
          method: 'graph-service subgraph query',
          baseline: 'Statewide',
          generatedAt,
          records: supportingCaseLabels,
        }
  );

  if (nodes.length === 0) {
    return (
      <>
        <Header title="Network / Link Analysis" />
        <main className="network-main">
          <p>No linked records for this view.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Network / Link Analysis" />
      <main className="network-main">
        <NetworkGraphCanvas
          nodes={nodes}
          edges={edges}
          communityByLabel={communityByLabel}
          pathEndpointIds={pathEndpoints.map(String)}
          pathMemberIds={(pathQuery.data?.personIds ?? []).map(String)}
          onPersonClick={handlePersonClick}
        />
        <PathFindingBar
          pathMode={pathMode}
          onToggle={togglePathMode}
          pathEndpoints={pathEndpoints}
          pathResult={pathQuery.data}
          isPathLoading={pathQuery.isLoading}
          isPathError={pathQuery.isError}
        />
        {focus.mode !== 'top-offenders' && (
          <button className="reset-focus-btn" onClick={resetFocus}>
            Top offenders
          </button>
        )}
        <CommunityLegend communities={communities} onSelect={handleCommunitySelect} />
        <RepeatOffenderRail offenders={offenders} onSelect={handlePersonClick} />
      </main>
      <EvidencePanel data={evidenceData} onClose={() => setSelectedPerson(null)} />
    </>
  );
}
```

- [ ] **Step 4: Add the network CSS block**

Append to `src/design-system/components.css` (ported from `build_network.py`'s `EXTRA_CSS`, adapted to
this app's existing class names, a `graph-canvas-skeleton` loading state, and a clickable legend row):

```css
/* ---- Network / Link Analysis screen layout (ported from docs/fe-artifacts-html/build/build_network.py) ---- */
.network-main { grid-area: main; position: relative; overflow: hidden; background: var(--canvas); }
.graph-canvas { width: 100%; height: 100%; display: block; }
.graph-canvas-skeleton { position: absolute; inset: 18px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; opacity: 0.5; }
.graph-node { cursor: pointer; }
.graph-node.path-endpoint { stroke: var(--predicted); stroke-width: 3px; }
.graph-node.path-highlight { stroke: var(--predicted); stroke-width: 2px; }
.graph-node-case, .graph-node-location { fill: var(--muted-2); opacity: 0.7; cursor: default; }
.graph-edge { stroke: var(--muted-2); stroke-width: 1; opacity: 0.55; }
.graph-edge.mo-shared { stroke-dasharray: 3 3; }
.node-label { font-family: 'IBM Plex Sans', sans-serif; font-size: 8.5px; fill: var(--text); pointer-events: none; paint-order: stroke; stroke: var(--canvas); stroke-width: 3px; }

.path-toggle-bar { position: absolute; top: 18px; left: 18px; z-index: 5; display: flex; align-items: center; gap: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; box-shadow: var(--shadow); padding: 9px 14px; }
.path-toggle-bar .label { font-size: 12.5px; font-weight: 500; }
.path-toggle-bar .hint { font-size: 11px; color: var(--muted); }
.mini-toggle { position: relative; width: 38px; height: 21px; border-radius: 999px; border: 1px solid var(--line); background: var(--canvas); cursor: pointer; padding: 2px; flex-shrink: 0; }
.mini-toggle .knob { width: 15px; height: 15px; border-radius: 50%; background: var(--muted-2); transform: translateX(0); transition: transform 0.18s ease, background 0.18s ease; }
.mini-toggle.on .knob { transform: translateX(17px); background: var(--predicted); }
.path-result { display: none; align-items: center; gap: 6px; font-size: 12px; }
.path-result.show { display: flex; }
.path-result .hops { font-family: 'IBM Plex Mono', monospace; color: var(--predicted); font-weight: 500; }

.reset-focus-btn { position: absolute; top: 18px; left: 260px; z-index: 5; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; box-shadow: var(--shadow); padding: 9px 14px; font-size: 12px; cursor: pointer; }

.legend-panel { position: absolute; bottom: 18px; left: 18px; z-index: 5; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; box-shadow: var(--shadow); padding: 14px 16px; width: 220px; display: flex; flex-direction: column; gap: 12px; }
.legend-panel h4 { font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.legend-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; margin-bottom: 6px; }
.legend-row:last-child { margin-bottom: 0; }
.legend-row-button { background: none; border: none; padding: 0; cursor: pointer; text-align: left; font: inherit; color: inherit; width: 100%; }
.legend-shape { width: 12px; height: 12px; flex-shrink: 0; display: grid; place-items: center; color: var(--muted-2); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

.offender-rail { position: absolute; top: 18px; right: 18px; bottom: 18px; z-index: 5; width: 300px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; }
.offender-rail-head { padding: 14px 16px; border-bottom: 1px solid var(--line); }
.offender-rail-head h3 { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; margin: 0; }
.offender-rail-head .sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
.offender-list { overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.offender-card { padding: 10px 11px; border: 1px solid var(--line); border-radius: 8px; background: var(--canvas); cursor: pointer; text-align: left; font: inherit; color: inherit; width: 100%; }
.offender-card:hover { box-shadow: var(--shadow); }
.offender-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.offender-rank { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--muted); width: 16px; flex-shrink: 0; }
.offender-name { font-size: 12px; font-weight: 600; flex: 1; }
.offender-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--muted); }
.offender-meta .cases { font-family: 'IBM Plex Mono', monospace; }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/screens/network/NetworkScreen.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/network/NetworkScreen.tsx src/screens/network/NetworkScreen.test.tsx src/design-system/components.css
git commit -m "Add NetworkScreen and network graph layout CSS"
```

---

## Task 9: Fix `/network`'s role gate and wire `NetworkScreen` into `App.tsx`

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `NetworkScreen` (Task 8).
- Produces: `/network` renders `NetworkScreen` for `SCRB_ANALYST` only (dropping `DISTRICT_SUPERVISOR`, which the real backend's `requireFullNetworkAccess()` rejects with `403` since it isn't `STATE`-scoped), replacing the `ScreenPlaceholder`.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/App.test.tsx`:

```tsx
it('an SCRB_ANALYST can reach /network', async () => {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
  });
  window.history.pushState({}, '', '/network');

  render(<App />);

  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Network / Link Analysis' })).toBeInTheDocument());
});

it('a DISTRICT_SUPERVISOR is redirected away from /network (real backend rejects them with 403)', async () => {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['DISTRICT_SUPERVISOR'], username: 'demo.district-supervisor', login: vi.fn(), logout: vi.fn(),
  });
  window.history.pushState({}, '', '/network');

  render(<App />);

  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Command Center'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/App.test.tsx`
Expected: FAIL — `/network` currently allows `DISTRICT_SUPERVISOR` and still renders the
`ScreenPlaceholder`'s `<h2>`, not `NetworkScreen`'s `<h1>` from `Header`.

- [ ] **Step 3: Wire the route**

In `src/app/App.tsx`, add the import:

```ts
import { NetworkScreen } from '../screens/network/NetworkScreen';
```

Remove the now-unused `Header`/`ScreenPlaceholder` import for this route if `Header`/`ScreenPlaceholder`
are no longer referenced elsewhere in the file (both remain in use for `/sociological`/`/admin`, so
no import changes needed beyond adding `NetworkScreen`).

Replace the `/network` route:

```tsx
        <Route
          path="/network"
          element={
            <ProtectedRoute allowedRoles={['SCRB_ANALYST']}>
              <NetworkScreen />
            </ProtectedRoute>
          }
        />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — every test file in the repo, including all ones added/modified in Tasks 1–9.

- [ ] **Step 6: Commit**

```bash
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "Wire NetworkScreen into /network, restricted to SCRB_ANALYST to match real backend RBAC"
```

---

## Post-plan note

`/network` only renders fully populated in mock mode (`sessionStorage['ksp-mock'] === '1'`). Against
the real backend, `getMockResponse`'s fallback login already issues `SCRB_ANALYST`-role demo tokens
for any unrecognized username, so no new demo persona is needed for this feature — the existing mock
login flow already reaches this screen. Once a live `core-platform`/`graph-service` deployment is
reachable from this frontend, no contract changes are needed here: this plan was built directly
against the real, already-merged `GET /api/network/subgraph` (+ existing three endpoints) contract.
