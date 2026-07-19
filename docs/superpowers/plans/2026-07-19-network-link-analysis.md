# Network / Link Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/network` screen (graph canvas, path-finding, repeat-offender rail, community legend) against mock data shaped to a proposed backend contract, open to every role with scope-derived, masking-aware access.

**Architecture:** A new `networkApi.ts` module (types + fetch functions + React Query hooks, mirroring `caseApi.ts`) sits behind four new mock routes in `mockData.ts`, all derived from the *existing* per-station case/party mock generator (`mockCaseSummaries`/`mockParty`) rather than a separate synthetic dataset. Four presentational/interactive components (`CommunityLegend`, `RepeatOffenderRail`, `NetworkGraphCanvas`, `PathFindingBar`) compose into `NetworkScreen`, which derives station/district/state scope from the logged-in user's role via a new `deriveNetworkScope` helper. The force-directed graph layout is a hand-rolled SVG simulation (no d3), ported from the existing static mockup (`docs/superpowers/fe-artifacts-html/build/build_network.py`) with deterministic (not `Math.random()`-seeded) initial node placement so layout is stable across renders and tests.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-query`, Vitest + React Testing Library, plain SVG (no new dependencies).

## Global Constraints

- No `Math.random()` anywhere in mock data or layout code — every mock generator and the force layout must be deterministic (same input → same output), matching this codebase's existing convention (see `mockCaseSummaries`, `mockStations`).
- No new npm dependencies — the graph canvas is hand-rolled SVG, matching this codebase's avoidance of graph-viz libraries.
- Every new/modified `.ts`/`.tsx` file gets a co-located `.test.ts`/`.test.tsx`, matching the 1:1 file-to-test convention used throughout `src/`.
- Masked/real party-style fields always use the `{ masked: string; real: string }` shape (matching `CasePartyResponse`), never a bare string, so they drop into UI with no adapter.
- `personId` (mock: the accused's real name string, standing in for Neo4j's internal node id) must never be treated as stable outside a single query — see the "stale ids" note in the approved spec. This plan's mock data doesn't need to simulate expiry, but no code should persist a `personId` to storage.

---

## Task 1: District identity on the logged-in user + demo personas for every role

**Files:**
- Modify: `src/api/meApi.ts`
- Modify: `src/api/meApi.test.tsx`
- Modify: `src/api/mockData.ts`
- Modify: `src/api/mockData.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `MeResponse.districtId: number | null` (new field). Mock mode gains three new logins — `demo.district-supervisor` (roles `['DISTRICT_SUPERVISOR']`, `districtId: 5`), `demo.policymaker` (roles `['POLICYMAKER']`), `demo.admin` (roles `['ADMIN']`) — alongside the existing `demo.investigator`/`demo.supervisor`. Task 2's `deriveNetworkScope` reads `MeResponse.districtId`.

Today `DISTRICT_SUPERVISOR`/`POLICYMAKER`/`ADMIN` have no reachable mock login (`mockLogin` falls back to a hardcoded `SCRB_ANALYST` persona for any unrecognized username), and `MeResponse` has no `districtId`, so there's no way to derive a `DISTRICT_SUPERVISOR`'s district scope from their identity the way Case Explorer already derives station scope from `unitId`. This task closes both gaps, the same way `a9d8e6c` ("Add station identity to the logged-in user and mock login personas") did for Case Explorer.

- [ ] **Step 1: Write the failing test for the new `districtId` field and personas**

Add to `src/api/meApi.test.tsx`, updating `sampleMe` and adding a field-presence assertion:

```ts
const sampleMe: MeResponse = {
  username: 'demo.analyst',
  firstName: 'R.',
  rank: 'SCRB Analyst',
  unit: 'State CID HQ',
  unitId: null,
  districtId: null,
  roles: ['SCRB_ANALYST'],
};
```

(This alone will fail to compile until `MeResponse` gains `districtId`, which is the point — TypeScript errors count as the test failing.)

Add to `src/api/mockData.test.ts` (create the `describe` block if the file doesn't already test `getMockResponse('/api/me', ...)`):

```ts
describe('getMockResponse — /api/me personas', () => {
  it('resolves demo.district-supervisor to a DISTRICT_SUPERVISOR persona with a real districtId', async () => {
    const response = await getMockResponse('/api/me', {}, 'mock-token-district-supervisor');
    expect(response).toMatchObject({ roles: ['DISTRICT_SUPERVISOR'], districtId: 5 });
  });

  it('resolves demo.policymaker to a POLICYMAKER persona', async () => {
    const response = await getMockResponse('/api/me', {}, 'mock-token-policymaker');
    expect(response).toMatchObject({ roles: ['POLICYMAKER'], districtId: null });
  });

  it('resolves demo.admin to an ADMIN persona', async () => {
    const response = await getMockResponse('/api/me', {}, 'mock-token-admin');
    expect(response).toMatchObject({ roles: ['ADMIN'], districtId: null });
  });

  it('logging in as demo.district-supervisor returns its dedicated token', async () => {
    const response = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.district-supervisor' }),
    });
    expect(response).toEqual({ token: 'mock-token-district-supervisor', roles: ['DISTRICT_SUPERVISOR'] });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/api/meApi.test.tsx src/api/mockData.test.ts`
Expected: FAIL — `meApi.test.tsx` fails to typecheck (`districtId` missing on `MeResponse`); the four new `mockData.test.ts` cases fail because the tokens/personas don't exist yet.

- [ ] **Step 3: Add `districtId` to `MeResponse`**

In `src/api/meApi.ts`, add the field to the interface:

```ts
export interface MeResponse {
  username: string;
  firstName: string;
  rank: string | null;
  unit: string | null;
  unitId: number | null;
  districtId: number | null;
  roles: string[];
}
```

- [ ] **Step 4: Add the three demo personas and logins in `mockData.ts`**

Give every existing mock persona object the new field, then add the three new ones. Replace the existing persona/login block:

```ts
const MOCK_ME = {
  username: 'demo.analyst',
  firstName: 'Demo',
  rank: 'SCRB Analyst',
  unit: 'State Crime Records Bureau',
  unitId: null as number | null,
  districtId: null as number | null,
  roles: ['SCRB_ANALYST'],
};

const MOCK_ME_INVESTIGATOR = {
  username: 'demo.investigator',
  firstName: 'Demo',
  rank: 'Investigator',
  unit: 'Whitefield PS',
  unitId: 176,
  districtId: null as number | null,
  roles: ['INVESTIGATOR'],
};

const MOCK_ME_SUPERVISOR = {
  username: 'demo.supervisor',
  firstName: 'Demo',
  rank: 'Station Supervisor',
  unit: 'Whitefield PS',
  unitId: 176,
  districtId: null as number | null,
  roles: ['STATION_SUPERVISOR'],
};

const MOCK_ME_DISTRICT_SUPERVISOR = {
  username: 'demo.district-supervisor',
  firstName: 'Demo',
  rank: 'District Supervisor',
  unit: 'Bengaluru Urban District',
  unitId: null as number | null,
  districtId: 5,
  roles: ['DISTRICT_SUPERVISOR'],
};

const MOCK_ME_POLICYMAKER = {
  username: 'demo.policymaker',
  firstName: 'Demo',
  rank: 'Policymaker',
  unit: 'Home Department',
  unitId: null as number | null,
  districtId: null as number | null,
  roles: ['POLICYMAKER'],
};

const MOCK_ME_ADMIN = {
  username: 'demo.admin',
  firstName: 'Demo',
  rank: 'System Administrator',
  unit: 'State Crime Records Bureau',
  unitId: null as number | null,
  districtId: null as number | null,
  roles: ['ADMIN'],
};

const DEMO_LOGINS: Record<string, { token: string; roles: string[] }> = {
  'demo.investigator': { token: 'mock-token-investigator', roles: ['INVESTIGATOR'] },
  'demo.supervisor': { token: 'mock-token-supervisor', roles: ['STATION_SUPERVISOR'] },
  'demo.district-supervisor': { token: 'mock-token-district-supervisor', roles: ['DISTRICT_SUPERVISOR'] },
  'demo.policymaker': { token: 'mock-token-policymaker', roles: ['POLICYMAKER'] },
  'demo.admin': { token: 'mock-token-admin', roles: ['ADMIN'] },
};

const MOCK_ME_BY_TOKEN: Record<string, typeof MOCK_ME> = {
  'mock-token-investigator': MOCK_ME_INVESTIGATOR,
  'mock-token-supervisor': MOCK_ME_SUPERVISOR,
  'mock-token-district-supervisor': MOCK_ME_DISTRICT_SUPERVISOR,
  'mock-token-policymaker': MOCK_ME_POLICYMAKER,
  'mock-token-admin': MOCK_ME_ADMIN,
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/api/meApi.test.tsx src/api/mockData.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/api/meApi.ts src/api/meApi.test.tsx src/api/mockData.ts src/api/mockData.test.ts
git commit -m "Add district identity to the logged-in user and demo personas for every role"
```

---

## Task 2: `networkApi.ts` — types, scope derivation, fetch functions, hooks

**Files:**
- Create: `src/api/networkApi.ts`
- Test: `src/api/networkApi.test.tsx`

**Interfaces:**
- Consumes: `MeResponse` (`src/api/meApi.ts`, incl. `districtId` from Task 1), `apiFetch`/`ApiError` (`src/api/client.ts`).
- Produces: `NetworkScope`, `NetworkNodeType`, `NetworkEdgeKind`, `NetworkNode`, `NetworkEdge`, `NetworkGraphResponse`, `RepeatOffenderResponse`, `CommunityResponse`, `NetworkPathResponse`, `NetworkScopeParams`, `deriveNetworkScope(roles, me)`, `scopeQueryString(params)`, `getNetworkGraph`/`useNetworkGraph`, `getRepeatOffenders`/`useRepeatOffenders`, `getCommunities`/`useCommunities`, `getNetworkPath`/`useNetworkPath` — all consumed by Task 3 (mock routes match these paths/params) and Tasks 4–9 (components/screen consume the types and hooks).

- [ ] **Step 1: Write the failing tests**

Create `src/api/networkApi.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import { ApiError } from './client';
import type { MeResponse } from './meApi';
import {
  deriveNetworkScope,
  getNetworkGraph,
  useNetworkGraph,
  getRepeatOffenders,
  getCommunities,
  getNetworkPath,
  useNetworkPath,
  type NetworkGraphResponse,
  type NetworkScopeParams,
} from './networkApi';

afterEach(() => {
  vi.restoreAllMocks();
});

function wrapperWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('deriveNetworkScope', () => {
  const baseMe: MeResponse = {
    username: 'x', firstName: 'X', rank: null, unit: null, unitId: null, districtId: null, roles: [],
  };

  it('gives SCRB_ANALYST state scope', () => {
    expect(deriveNetworkScope(['SCRB_ANALYST'], baseMe)).toEqual({ scope: 'state' });
  });

  it('gives POLICYMAKER state scope', () => {
    expect(deriveNetworkScope(['POLICYMAKER'], baseMe)).toEqual({ scope: 'state' });
  });

  it('gives ADMIN state scope', () => {
    expect(deriveNetworkScope(['ADMIN'], baseMe)).toEqual({ scope: 'state' });
  });

  it('gives DISTRICT_SUPERVISOR district scope from me.districtId', () => {
    const me = { ...baseMe, districtId: 5 };
    expect(deriveNetworkScope(['DISTRICT_SUPERVISOR'], me)).toEqual({ scope: 'district', districtId: 5 });
  });

  it('gives INVESTIGATOR station scope from me.unitId', () => {
    const me = { ...baseMe, unitId: 176 };
    expect(deriveNetworkScope(['INVESTIGATOR'], me)).toEqual({ scope: 'station', unitId: 176 });
  });

  it('gives STATION_SUPERVISOR station scope from me.unitId', () => {
    const me = { ...baseMe, unitId: 176 };
    expect(deriveNetworkScope(['STATION_SUPERVISOR'], me)).toEqual({ scope: 'station', unitId: 176 });
  });

  it('falls back to state scope when a station role has no unitId', () => {
    expect(deriveNetworkScope(['INVESTIGATOR'], baseMe)).toEqual({ scope: 'state' });
  });
});

describe('getNetworkGraph', () => {
  it('fetches /api/network/graph with the scope query string', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ nodes: [], edges: [] });
    await getNetworkGraph('test-token', { scope: 'station', unitId: 176 });
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/graph?scope=station&unitId=176', {}, 'test-token');
  });
});

describe('useNetworkGraph', () => {
  it('returns the fetched graph once loaded', async () => {
    const data: NetworkGraphResponse = { nodes: [], edges: [] };
    vi.spyOn(client, 'apiFetch').mockResolvedValue(data);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useNetworkGraph('test-token', { scope: 'state' }), {
      wrapper: wrapperWith(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('does not fetch when params is null', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ nodes: [], edges: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useNetworkGraph('test-token', null), { wrapper: wrapperWith(queryClient) });

    expect(apiFetchSpy).not.toHaveBeenCalled();
  });
});

describe('getRepeatOffenders', () => {
  it('fetches /api/network/repeat-offenders with scope, minCases, and limit', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getRepeatOffenders('test-token', { scope: 'district', districtId: 5 }, 2, 8);
    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/api/network/repeat-offenders?scope=district&districtId=5&minCases=2&limit=8',
      {},
      'test-token',
    );
  });
});

describe('getCommunities', () => {
  it('fetches /api/network/communities with scope and minSize', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getCommunities('test-token', { scope: 'state' }, 2);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/communities?scope=state&minSize=2', {}, 'test-token');
  });
});

describe('getNetworkPath', () => {
  const params: NetworkScopeParams = { scope: 'state' };

  it('fetches /api/network/path with from/to/maxHops', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ personIds: ['a', 'b'], names: [], hopCount: 1 });
    await getNetworkPath('test-token', params, 'a', 'b', 6);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/path?scope=state&from=a&to=b&maxHops=6', {}, 'test-token');
  });

  it('returns null when apiFetch resolves null (mock "no path")', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(null);
    const result = await getNetworkPath('test-token', params, 'a', 'z', 6);
    expect(result).toBeNull();
  });

  it('returns null when apiFetch throws a 404 ApiError (real backend "no path")', async () => {
    vi.spyOn(client, 'apiFetch').mockRejectedValue(new ApiError(404, 'not found'));
    const result = await getNetworkPath('test-token', params, 'a', 'z', 6);
    expect(result).toBeNull();
  });

  it('rethrows non-404 errors', async () => {
    vi.spyOn(client, 'apiFetch').mockRejectedValue(new ApiError(500, 'server error'));
    await expect(getNetworkPath('test-token', params, 'a', 'z', 6)).rejects.toThrow('server error');
  });
});

describe('useNetworkPath', () => {
  it('does not fetch until both from and to are set', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(null);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useNetworkPath('test-token', { scope: 'state' }, 'a', null), {
      wrapper: wrapperWith(queryClient),
    });

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
import type { MeResponse } from './meApi';

export type NetworkScope = 'station' | 'district' | 'state';
export type NetworkNodeType = 'person' | 'case' | 'location';
export type NetworkEdgeKind = 'co-accused' | 'involved' | 'mo-shared' | 'location';

export interface NetworkNode {
  id: string;
  type: NetworkNodeType;
  name?: { masked: string; real: string };
  caseCount?: number;
  communityId?: number;
  caseNumber?: string;
  label?: string;
}

export interface NetworkEdge {
  a: string;
  b: string;
  kind: NetworkEdgeKind;
}

export interface NetworkGraphResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface RepeatOffenderResponse {
  personId: string;
  name: { masked: string; real: string };
  caseCount: number;
  confidenceScore: number;
  communityId: number;
}

export interface CommunityResponse {
  communityId: number;
  size: number;
  memberNames: Array<{ masked: string; real: string }>;
}

export interface NetworkPathResponse {
  personIds: string[];
  names: Array<{ masked: string; real: string }>;
  hopCount: number;
}

export interface NetworkScopeParams {
  scope: NetworkScope;
  unitId?: number;
  districtId?: number;
}

// Mirrors ROLE_DEFAULT_ROUTE's role-precedence style (roleRouting.ts): state-scope,
// raw-or-masked-access roles first, then district, then station, then a state fallback
// for a station/district role whose identity is missing the id it needs.
export function deriveNetworkScope(roles: string[], me: MeResponse | null | undefined): NetworkScopeParams {
  if (!me) return { scope: 'state' };
  if (roles.includes('SCRB_ANALYST') || roles.includes('POLICYMAKER') || roles.includes('ADMIN')) {
    return { scope: 'state' };
  }
  if (roles.includes('DISTRICT_SUPERVISOR') && me.districtId != null) {
    return { scope: 'district', districtId: me.districtId };
  }
  if ((roles.includes('INVESTIGATOR') || roles.includes('STATION_SUPERVISOR')) && me.unitId != null) {
    return { scope: 'station', unitId: me.unitId };
  }
  return { scope: 'state' };
}

export function scopeQueryString(params: NetworkScopeParams): string {
  const query = new URLSearchParams({ scope: params.scope });
  if (params.unitId != null) query.set('unitId', String(params.unitId));
  if (params.districtId != null) query.set('districtId', String(params.districtId));
  return query.toString();
}

export function getNetworkGraph(token: string | null, params: NetworkScopeParams): Promise<NetworkGraphResponse> {
  return apiFetch<NetworkGraphResponse>(`/api/network/graph?${scopeQueryString(params)}`, {}, token);
}

export function useNetworkGraph(token: string | null, params: NetworkScopeParams | null) {
  return useQuery({
    queryKey: ['network-graph', params],
    queryFn: () => getNetworkGraph(token, params as NetworkScopeParams),
    staleTime: 5 * 60_000,
    enabled: token != null && params != null,
  });
}

export function getRepeatOffenders(
  token: string | null,
  params: NetworkScopeParams,
  minCases = 2,
  limit = 8,
): Promise<RepeatOffenderResponse[]> {
  const query = new URLSearchParams(scopeQueryString(params));
  query.set('minCases', String(minCases));
  query.set('limit', String(limit));
  return apiFetch<RepeatOffenderResponse[]>(`/api/network/repeat-offenders?${query.toString()}`, {}, token);
}

export function useRepeatOffenders(token: string | null, params: NetworkScopeParams | null, minCases = 2, limit = 8) {
  return useQuery({
    queryKey: ['network-repeat-offenders', params, minCases, limit],
    queryFn: () => getRepeatOffenders(token, params as NetworkScopeParams, minCases, limit),
    staleTime: 5 * 60_000,
    enabled: token != null && params != null,
  });
}

export function getCommunities(token: string | null, params: NetworkScopeParams, minSize = 2): Promise<CommunityResponse[]> {
  const query = new URLSearchParams(scopeQueryString(params));
  query.set('minSize', String(minSize));
  return apiFetch<CommunityResponse[]>(`/api/network/communities?${query.toString()}`, {}, token);
}

export function useCommunities(token: string | null, params: NetworkScopeParams | null, minSize = 2) {
  return useQuery({
    queryKey: ['network-communities', params, minSize],
    queryFn: () => getCommunities(token, params as NetworkScopeParams, minSize),
    staleTime: 5 * 60_000,
    enabled: token != null && params != null,
  });
}

export async function getNetworkPath(
  token: string | null,
  params: NetworkScopeParams,
  from: string,
  to: string,
  maxHops = 6,
): Promise<NetworkPathResponse | null> {
  const query = new URLSearchParams(scopeQueryString(params));
  query.set('from', from);
  query.set('to', to);
  query.set('maxHops', String(maxHops));
  try {
    const result = await apiFetch<NetworkPathResponse | null>(`/api/network/path?${query.toString()}`, {}, token);
    return result ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function useNetworkPath(
  token: string | null,
  params: NetworkScopeParams | null,
  from: string | null,
  to: string | null,
  maxHops = 6,
) {
  return useQuery({
    queryKey: ['network-path', params, from, to, maxHops],
    queryFn: () => getNetworkPath(token, params as NetworkScopeParams, from as string, to as string, maxHops),
    staleTime: 5 * 60_000,
    enabled: token != null && params != null && from != null && to != null,
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/api/networkApi.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/networkApi.ts src/api/networkApi.test.tsx
git commit -m "Add networkApi: types, scope derivation, fetch functions, and React Query hooks"
```

---

## Task 3: Mock data for the four network endpoints

**Files:**
- Modify: `src/api/mockData.ts`
- Modify: `src/api/mockData.test.ts`

**Interfaces:**
- Consumes: `mockCaseSummaries`, `mockParty`, `CASE_CRIME_TYPES`, `STATIONS_BY_DISTRICT`, `findStationName` (all already in `mockData.ts`).
- Produces: `getMockResponse` now resolves `/api/network/graph`, `/api/network/repeat-offenders`, `/api/network/communities`, `/api/network/path`, matching the shapes `networkApi.ts` (Task 2) expects. Consumed directly by every component/screen test in Tasks 4–9 that runs against real mock-mode data (most component tests mock the hooks directly instead, per this codebase's convention — see `CaseExplorerScreen.test.tsx` — but `NetworkScreen`'s tests may exercise this).

Person identity in mock data is the accused party's `real` name string (there's no separate id in mock case data, only in real Neo4j). The graph endpoint caps how many stations feed it (`MAX_GRAPH_STATIONS = 8`) so the force layout in Task 6 stays legible — a full state-wide graph would be hundreds of case nodes and an unreadable hairball, which defeats the point of the visualization. Repeat-offenders/communities/path all query the *uncapped* scope (every station in scope), so the offender rail and path-finding reflect the true scope even when the canvas only renders a legible sample — this also means path-finding can find connections between people who aren't both rendered on the capped canvas; `NetworkGraphCanvas` (Task 6) handles a path result whose members aren't on-canvas by simply not drawing anything for the ones that are absent.

- [ ] **Step 1: Write the failing tests**

Add to `src/api/mockData.test.ts`:

```ts
import { getMockResponse } from './mockData';

describe('getMockResponse — /api/network/graph', () => {
  it('returns person/case/location nodes for a station scope', async () => {
    const response = (await getMockResponse('/api/network/graph?scope=station&unitId=176', {})) as {
      nodes: Array<{ id: string; type: string }>;
      edges: Array<{ a: string; b: string; kind: string }>;
    };
    expect(response.nodes.some((n) => n.type === 'person')).toBe(true);
    expect(response.nodes.some((n) => n.type === 'case')).toBe(true);
    expect(response.nodes.some((n) => n.type === 'location')).toBe(true);
    expect(response.edges.some((e) => e.kind === 'involved')).toBe(true);
  });

  it('is deterministic — the same scope query returns identical output across calls', async () => {
    const a = await getMockResponse('/api/network/graph?scope=district&districtId=5', {});
    const b = await getMockResponse('/api/network/graph?scope=district&districtId=5', {});
    expect(a).toEqual(b);
  });

  it('caps the number of contributing stations for state scope so the graph stays small', async () => {
    const response = (await getMockResponse('/api/network/graph?scope=state', {})) as {
      nodes: Array<{ type: string }>;
    };
    const locationCount = response.nodes.filter((n) => n.type === 'location').length;
    expect(locationCount).toBeLessThanOrEqual(8);
  });
});

describe('getMockResponse — /api/network/repeat-offenders', () => {
  it('ranks offenders descending by caseCount and respects limit', async () => {
    const response = (await getMockResponse(
      '/api/network/repeat-offenders?scope=state&minCases=1&limit=3',
      {},
    )) as Array<{ caseCount: number }>;
    expect(response.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < response.length; i++) {
      expect(response[i - 1].caseCount).toBeGreaterThanOrEqual(response[i].caseCount);
    }
  });
});

describe('getMockResponse — /api/network/communities', () => {
  it('groups persons into communities of at least minSize', async () => {
    const response = (await getMockResponse(
      '/api/network/communities?scope=state&minSize=1',
      {},
    )) as Array<{ size: number }>;
    expect(response.length).toBeGreaterThan(0);
    response.forEach((c) => expect(c.size).toBeGreaterThanOrEqual(1));
  });
});

describe('getMockResponse — /api/network/path', () => {
  it('finds a path between two accused persons who share a crime sub-head across stations', async () => {
    const offenders = (await getMockResponse(
      '/api/network/repeat-offenders?scope=state&minCases=2&limit=8',
      {},
    )) as Array<{ personId: string }>;
    expect(offenders.length).toBeGreaterThanOrEqual(2);
    const [from, to] = offenders.map((o) => o.personId);

    const response = await getMockResponse(
      `/api/network/path?scope=state&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&maxHops=6`,
      {},
    );
    expect(response).not.toBeNull();
    expect((response as { hopCount: number }).hopCount).toBeGreaterThanOrEqual(1);
  });

  it('returns null for an unknown person id', async () => {
    const response = await getMockResponse(
      '/api/network/path?scope=state&from=Nobody&to=AlsoNobody&maxHops=6',
      {},
    );
    expect(response).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/api/mockData.test.ts`
Expected: FAIL — all new `getMockResponse` calls return `undefined` (no matching route yet), so `.nodes`/`.edges` access throws or assertions fail.

- [ ] **Step 3: Implement the network mock generators and routes**

Add to `src/api/mockData.ts`, just above `export async function getMockResponse`:

```ts
// Caps how many stations feed the graph endpoint so the force layout (Task 6) stays
// legible -- a full state-wide graph would be hundreds of case nodes. Repeat-offenders/
// communities/path deliberately do NOT use this cap; they search the full scope.
const MAX_GRAPH_STATIONS = 8;

interface NetworkStationRef {
  unitId: number;
  unitName: string;
}

function allStationsFlat(): NetworkStationRef[] {
  return Object.values(STATIONS_BY_DISTRICT).flat();
}

function stationsForNetworkScope(scope: string, unitId?: number, districtId?: number, cap?: number): NetworkStationRef[] {
  let roster: NetworkStationRef[];
  if (scope === 'station' && unitId != null) {
    const unitName = findStationName(unitId);
    roster = unitName ? [{ unitId, unitName }] : [];
  } else if (scope === 'district' && districtId != null) {
    roster = STATIONS_BY_DISTRICT[districtId] ?? [];
  } else {
    roster = allStationsFlat();
  }
  return cap ? roster.slice(0, cap) : roster;
}

interface NetworkCaseTuple {
  caseId: number;
  caseNumber: string;
  unitId: number;
  unitName: string;
  crimeSubHeadId: number;
  crimeHeadId: number;
  accusedReal: string;
  accusedMasked: string;
}

function networkCaseTuples(stations: NetworkStationRef[]): NetworkCaseTuple[] {
  const tuples: NetworkCaseTuple[] = [];
  stations.forEach(({ unitId, unitName }) => {
    mockCaseSummaries(unitId, unitName).forEach((summary, index) => {
      const accused = mockParty('accused', index + 1);
      const crimeType = CASE_CRIME_TYPES.find((c) => c.crimeSubHeadId === summary.crimeSubHeadId)!;
      tuples.push({
        caseId: summary.caseId,
        caseNumber: summary.caseNumber,
        unitId,
        unitName,
        crimeSubHeadId: summary.crimeSubHeadId,
        crimeHeadId: crimeType.crimeHeadId,
        accusedReal: accused.name.real,
        accusedMasked: accused.name.masked,
      });
    });
  });
  return tuples;
}

interface NetworkPersonAgg {
  real: string;
  masked: string;
  caseIds: number[];
  crimeHeadId: number;
}

function aggregateNetworkPersons(tuples: NetworkCaseTuple[]): Map<string, NetworkPersonAgg> {
  const byName = new Map<string, NetworkPersonAgg>();
  tuples.forEach((t) => {
    const existing = byName.get(t.accusedReal);
    if (existing) {
      existing.caseIds.push(t.caseId);
    } else {
      byName.set(t.accusedReal, {
        real: t.accusedReal,
        masked: t.accusedMasked,
        caseIds: [t.caseId],
        crimeHeadId: t.crimeHeadId,
      });
    }
  });
  return byName;
}

function buildNetworkGraph(scope: string, unitId?: number, districtId?: number) {
  const stations = stationsForNetworkScope(scope, unitId, districtId, MAX_GRAPH_STATIONS);
  const tuples = networkCaseTuples(stations);
  const persons = aggregateNetworkPersons(tuples);

  const nodes: Array<Record<string, unknown>> = [];
  persons.forEach((p) => {
    nodes.push({
      id: p.real,
      type: 'person',
      name: { masked: p.masked, real: p.real },
      caseCount: p.caseIds.length,
      communityId: p.crimeHeadId,
    });
  });
  tuples.forEach((t) => {
    nodes.push({ id: `case-${t.caseId}`, type: 'case', caseNumber: t.caseNumber });
  });
  stations.forEach((s) => {
    nodes.push({ id: `location-${s.unitId}`, type: 'location', label: s.unitName });
  });

  const edges: Array<Record<string, unknown>> = [];
  tuples.forEach((t) => {
    edges.push({ a: t.accusedReal, b: `case-${t.caseId}`, kind: 'involved' });
    edges.push({ a: `case-${t.caseId}`, b: `location-${t.unitId}`, kind: 'location' });
  });
  for (let i = 0; i < tuples.length; i++) {
    for (let j = i + 1; j < tuples.length; j++) {
      if (tuples[i].crimeSubHeadId === tuples[j].crimeSubHeadId) {
        edges.push({ a: `case-${tuples[i].caseId}`, b: `case-${tuples[j].caseId}`, kind: 'mo-shared' });
      }
    }
  }

  return { nodes, edges };
}

function buildRepeatOffenders(scope: string, unitId: number | undefined, districtId: number | undefined, minCases: number, limit: number) {
  const stations = stationsForNetworkScope(scope, unitId, districtId);
  const persons = aggregateNetworkPersons(networkCaseTuples(stations));
  return Array.from(persons.values())
    .filter((p) => p.caseIds.length >= minCases)
    .sort((a, b) => b.caseIds.length - a.caseIds.length)
    .slice(0, limit)
    .map((p) => ({
      personId: p.real,
      name: { masked: p.masked, real: p.real },
      caseCount: p.caseIds.length,
      confidenceScore: Math.min(0.96, 0.58 + p.caseIds.length * 0.05),
      communityId: p.crimeHeadId,
    }));
}

function buildCommunities(scope: string, unitId: number | undefined, districtId: number | undefined, minSize: number) {
  const stations = stationsForNetworkScope(scope, unitId, districtId);
  const persons = aggregateNetworkPersons(networkCaseTuples(stations));
  const byCommunity = new Map<number, Array<{ masked: string; real: string }>>();
  persons.forEach((p) => {
    const list = byCommunity.get(p.crimeHeadId) ?? [];
    list.push({ masked: p.masked, real: p.real });
    byCommunity.set(p.crimeHeadId, list);
  });
  return Array.from(byCommunity.entries())
    .map(([communityId, memberNames]) => ({ communityId, size: memberNames.length, memberNames }))
    .filter((c) => c.size >= minSize)
    .sort((a, b) => b.size - a.size);
}

function buildNetworkPath(scope: string, unitId: number | undefined, districtId: number | undefined, from: string, to: string, maxHops: number) {
  const stations = stationsForNetworkScope(scope, unitId, districtId);
  const tuples = networkCaseTuples(stations);
  const persons = aggregateNetworkPersons(tuples);
  if (!persons.has(from) || !persons.has(to)) return null;

  const adjacency = new Map<string, Set<string>>();
  function link(a: string, b: string) {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }
  tuples.forEach((t) => link(t.accusedReal, `case-${t.caseId}`));
  for (let i = 0; i < tuples.length; i++) {
    for (let j = i + 1; j < tuples.length; j++) {
      if (tuples[i].crimeSubHeadId === tuples[j].crimeSubHeadId) {
        link(`case-${tuples[i].caseId}`, `case-${tuples[j].caseId}`);
      }
    }
  }

  const queue: string[][] = [[from]];
  const seen = new Set([from]);
  let foundPath: string[] | null = null;
  while (queue.length) {
    const current = queue.shift()!;
    const last = current[current.length - 1];
    if (last === to) {
      foundPath = current;
      break;
    }
    for (const next of adjacency.get(last) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...current, next]);
      }
    }
  }
  if (!foundPath) return null;

  const personIdsInPath = foundPath.filter((id) => persons.has(id));
  const hopCount = personIdsInPath.length - 1;
  if (hopCount > maxHops) return null;

  return {
    personIds: personIdsInPath,
    names: personIdsInPath.map((id) => {
      const p = persons.get(id)!;
      return { masked: p.masked, real: p.real };
    }),
    hopCount,
  };
}

function parseNetworkScopeQuery(query: URLSearchParams): { scope: string; unitId?: number; districtId?: number } {
  return {
    scope: query.get('scope') ?? 'state',
    unitId: query.get('unitId') ? Number(query.get('unitId')) : undefined,
    districtId: query.get('districtId') ? Number(query.get('districtId')) : undefined,
  };
}
```

Then add four route matches inside `getMockResponse`, right before its final `return undefined;`:

```ts
  if (path.startsWith('/api/network/graph?')) {
    const { scope, unitId, districtId } = parseNetworkScopeQuery(new URLSearchParams(path.split('?')[1]));
    return buildNetworkGraph(scope, unitId, districtId);
  }

  if (path.startsWith('/api/network/repeat-offenders?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const { scope, unitId, districtId } = parseNetworkScopeQuery(query);
    return buildRepeatOffenders(scope, unitId, districtId, Number(query.get('minCases') ?? 2), Number(query.get('limit') ?? 8));
  }

  if (path.startsWith('/api/network/communities?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const { scope, unitId, districtId } = parseNetworkScopeQuery(query);
    return buildCommunities(scope, unitId, districtId, Number(query.get('minSize') ?? 2));
  }

  if (path.startsWith('/api/network/path?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const { scope, unitId, districtId } = parseNetworkScopeQuery(query);
    return buildNetworkPath(scope, unitId, districtId, query.get('from') ?? '', query.get('to') ?? '', Number(query.get('maxHops') ?? 6));
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/api/mockData.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/mockData.ts src/api/mockData.test.ts
git commit -m "Add mock data for network graph, repeat-offenders, communities, and path endpoints"
```

---

## Task 4: `networkColors.ts` + `CommunityLegend`

**Files:**
- Modify: `src/screens/command-center/CategoryMixChart.tsx` (export `CRIME_HEAD_SLOT`)
- Create: `src/screens/network/networkColors.ts`
- Test: `src/screens/network/networkColors.test.ts`
- Create: `src/screens/network/CommunityLegend.tsx`
- Test: `src/screens/network/CommunityLegend.test.tsx`

**Interfaces:**
- Consumes: `CommunityResponse` (Task 2's `networkApi.ts`), `CRIME_HEAD_SLOT` (`CategoryMixChart.tsx`, newly exported).
- Produces: `colorForCommunity(communityId: number): string`, consumed by Task 6 (`NetworkGraphCanvas`) so person nodes and legend swatches use identical colors for the same `communityId`. `CommunityLegend` component consumed by Task 8 (`NetworkScreen`).

Mock `communityId` values are `crimeHeadId`s reused from the existing case taxonomy (see Task 3), so this reuses `CategoryMixChart`'s existing `CRIME_HEAD_SLOT` mapping (crimeHeadId → `--cat-1..5` token) instead of inventing a second palette assignment. Real Neo4j communities have no human-readable name (per the approved spec's contract — `CommunityResponse` only has `communityId`/`size`/members, no `name`), so the legend shows `Community {communityId}`, not an invented name like the static mockup's "Yeshwanthpur ring" — that mockup detail doesn't survive contact with the real contract.

- [ ] **Step 1: Write the failing tests**

Export `CRIME_HEAD_SLOT` from `CategoryMixChart.tsx` — change `const CRIME_HEAD_SLOT` to `export const CRIME_HEAD_SLOT`. No new test needed for this one-word change; its existing behavior is already covered by `CategoryMixChart.test.tsx`.

Create `src/screens/network/networkColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { colorForCommunity } from './networkColors';
import { CRIME_HEAD_SLOT } from '../command-center/CategoryMixChart';

describe('colorForCommunity', () => {
  it('maps a known crimeHeadId to the same --cat-N slot CategoryMixChart uses', () => {
    expect(colorForCommunity(2)).toBe(`var(--cat-${CRIME_HEAD_SLOT[2]})`);
  });

  it('falls back to --cat-5 for an unmapped id', () => {
    expect(colorForCommunity(999)).toBe('var(--cat-5)');
  });
});
```

Create `src/screens/network/CommunityLegend.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommunityLegend } from './CommunityLegend';
import type { CommunityResponse } from '../../api/networkApi';

const communities: CommunityResponse[] = [
  { communityId: 2, size: 4, memberNames: [] },
  { communityId: 1, size: 2, memberNames: [] },
];

describe('CommunityLegend', () => {
  it('renders node-type labels and one row per community with its size', () => {
    render(<CommunityLegend communities={communities} />);

    expect(screen.getByText('Person')).toBeInTheDocument();
    expect(screen.getByText('Case')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Community 2 · 4')).toBeInTheDocument();
    expect(screen.getByText('Community 1 · 2')).toBeInTheDocument();
  });

  it('renders nothing under "Detected communities" when there are none', () => {
    render(<CommunityLegend communities={[]} />);
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
import { CRIME_HEAD_SLOT } from '../command-center/CategoryMixChart';

export function colorForCommunity(communityId: number): string {
  const slot = CRIME_HEAD_SLOT[communityId] ?? 5;
  return `var(--cat-${slot})`;
}
```

Create `src/screens/network/CommunityLegend.tsx`:

```tsx
import type { CommunityResponse } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';

interface CommunityLegendProps {
  communities: CommunityResponse[];
}

export function CommunityLegend({ communities }: CommunityLegendProps) {
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
          <div className="legend-row" key={c.communityId}>
            <span className="legend-dot" style={{ background: colorForCommunity(c.communityId) }} />
            Community {c.communityId} · {c.size}
          </div>
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
git add src/screens/command-center/CategoryMixChart.tsx src/screens/network/networkColors.ts src/screens/network/networkColors.test.ts src/screens/network/CommunityLegend.tsx src/screens/network/CommunityLegend.test.tsx
git commit -m "Add CommunityLegend and shared community-color mapping"
```

---

## Task 5: `RepeatOffenderRail`

**Files:**
- Create: `src/screens/network/RepeatOffenderRail.tsx`
- Test: `src/screens/network/RepeatOffenderRail.test.tsx`

**Interfaces:**
- Consumes: `RepeatOffenderResponse` (Task 2's `networkApi.ts`), `ConfidenceChip` (`src/design-system/ConfidenceChip.tsx`, existing).
- Produces: `RepeatOffenderRail` component with an `onSelect(personId: string)` callback, consumed by Task 8 (`NetworkScreen`).

- [ ] **Step 1: Write the failing test**

Create `src/screens/network/RepeatOffenderRail.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepeatOffenderRail } from './RepeatOffenderRail';
import type { RepeatOffenderResponse } from '../../api/networkApi';

const offenders: RepeatOffenderResponse[] = [
  { personId: 'Suresh Naik', name: { masked: 'S**** N**k', real: 'Suresh Naik' }, caseCount: 5, confidenceScore: 0.83, communityId: 2 },
  { personId: 'Vijay Kumar', name: { masked: 'V***y K***r', real: 'Vijay Kumar' }, caseCount: 3, confidenceScore: 0.73, communityId: 1 },
];

describe('RepeatOffenderRail', () => {
  it('renders each offender ranked, masked by default, with case count and confidence', () => {
    render(<RepeatOffenderRail offenders={offenders} onSelect={vi.fn()} />);

    expect(screen.getByText('S**** N**k')).toBeInTheDocument();
    expect(screen.getByText('5 linked cases')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
  });

  it('calls onSelect with the personId when a card is clicked', async () => {
    const onSelect = vi.fn();
    render(<RepeatOffenderRail offenders={offenders} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('S**** N**k'));

    expect(onSelect).toHaveBeenCalledWith('Suresh Naik');
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
  onSelect: (personId: string) => void;
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
                <span className="offender-name">{offender.name.masked}</span>
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

## Task 6: `networkLayout.ts` — deterministic force-directed layout

**Files:**
- Create: `src/screens/network/networkLayout.ts`
- Test: `src/screens/network/networkLayout.test.ts`

**Interfaces:**
- Consumes: `NetworkNode`, `NetworkEdge` (Task 2's `networkApi.ts`).
- Produces: `computeForceLayout(nodes, edges): Map<string, { x: number; y: number }>`, consumed by Task 7 (`NetworkGraphCanvas`).

Ported from `docs/superpowers/fe-artifacts-html/build/build_network.py`'s simulation (220 fixed iterations, spring + repulsion, same constants), with the mockup's `Math.random()` initial placement replaced by a seeded PRNG keyed on each node's id — same layout algorithm, but deterministic, so the same node/edge set always lays out identically (required for stable tests and to satisfy this codebase's no-`Math.random()` convention).

- [ ] **Step 1: Write the failing tests**

Create `src/screens/network/networkLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeForceLayout } from './networkLayout';
import type { NetworkNode, NetworkEdge } from '../../api/networkApi';

const nodes: NetworkNode[] = [
  { id: 'p1', type: 'person', caseCount: 2, communityId: 1 },
  { id: 'p2', type: 'person', caseCount: 1, communityId: 1 },
  { id: 'case-1', type: 'case' },
];
const edges: NetworkEdge[] = [
  { a: 'p1', b: 'case-1', kind: 'involved' },
  { a: 'p2', b: 'case-1', kind: 'involved' },
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

  it('is deterministic — the same nodes/edges always produce the same layout', () => {
    const a = computeForceLayout(nodes, edges);
    const b = computeForceLayout(nodes, edges);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it('ignores an edge referencing a node not in the node list', () => {
    const edgesWithDangling: NetworkEdge[] = [...edges, { a: 'p1', b: 'ghost', kind: 'involved' }];
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
import type { NetworkNode, NetworkEdge } from '../../api/networkApi';

const CANVAS_W = 660;
const CANVAS_H = 460;
const ITERATIONS = 220;

// Deterministic hash of a node id into a PRNG seed -- stands in for build_network.py's
// Math.random() initial placement, which this codebase's mock/layout code never uses
// (see mockCaseSummaries et al.): same node set always lays out identically.
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

export function computeForceLayout(nodes: NetworkNode[], edges: NetworkEdge[]): Map<string, { x: number; y: number }> {
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
      const a = byId.get(e.a);
      const b = byId.get(e.b);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target = e.kind === 'co-accused' ? 70 : 50;
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/screens/network/networkLayout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/network/networkLayout.ts src/screens/network/networkLayout.test.ts
git commit -m "Add deterministic force-directed layout for the network graph canvas"
```

---

## Task 7: `NetworkGraphCanvas`

**Files:**
- Create: `src/screens/network/NetworkGraphCanvas.tsx`
- Test: `src/screens/network/NetworkGraphCanvas.test.tsx`

**Interfaces:**
- Consumes: `NetworkNode`, `NetworkEdge` (Task 2), `computeForceLayout` (Task 6), `colorForCommunity` (Task 4).
- Produces: `NetworkGraphCanvas` component with props `{ nodes, edges, pathEndpoints, pathMemberIds, onPersonClick }`, consumed by Task 8 (`NetworkScreen`).

The real `/api/network/path` contract returns only the chain of person ids (`personIds`), not the full node-by-node path through the intervening cases/locations — so there's no edge to highlight between two path-adjacent people (there may be no direct edge between them at all; they're linked via a case or a chain of shared-MO cases). This canvas marks path *nodes* (`.path-highlight` on the circle) rather than attempting to highlight a path of edges, which the data doesn't support. Case and location nodes are not interactive in this version (no click handler), matching the mockup.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/network/NetworkGraphCanvas.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkGraphCanvas } from './NetworkGraphCanvas';
import type { NetworkNode, NetworkEdge } from '../../api/networkApi';

const nodes: NetworkNode[] = [
  { id: 'Suresh Naik', type: 'person', name: { masked: 'S**** N**k', real: 'Suresh Naik' }, caseCount: 3, communityId: 2 },
  { id: 'Vijay Kumar', type: 'person', name: { masked: 'V***y K***r', real: 'Vijay Kumar' }, caseCount: 1, communityId: 1 },
  { id: 'case-176000', type: 'case', caseNumber: '276/2026' },
  { id: 'location-176', type: 'location', label: 'Whitefield PS' },
];
const edges: NetworkEdge[] = [
  { a: 'Suresh Naik', b: 'case-176000', kind: 'involved' },
  { a: 'case-176000', b: 'location-176', kind: 'location' },
];

describe('NetworkGraphCanvas', () => {
  it('renders one graph-node element per node', () => {
    const { container } = render(
      <NetworkGraphCanvas nodes={nodes} edges={edges} pathEndpoints={[]} pathMemberIds={[]} onPersonClick={vi.fn()} />,
    );
    expect(container.querySelectorAll('.graph-node')).toHaveLength(4);
  });

  it('calls onPersonClick with the person id when a person node is clicked', async () => {
    const onPersonClick = vi.fn();
    render(
      <NetworkGraphCanvas nodes={nodes} edges={edges} pathEndpoints={[]} pathMemberIds={[]} onPersonClick={onPersonClick} />,
    );

    await userEvent.click(screen.getByLabelText('S**** N**k'));

    expect(onPersonClick).toHaveBeenCalledWith('Suresh Naik');
  });

  it('marks a person in pathEndpoints with the path-endpoint class', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        pathEndpoints={['Suresh Naik']}
        pathMemberIds={[]}
        onPersonClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('S**** N**k')).toHaveClass('path-endpoint');
  });

  it('marks a person in pathMemberIds with the path-highlight class', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        pathEndpoints={[]}
        pathMemberIds={['Vijay Kumar']}
        onPersonClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('V***y K***r')).toHaveClass('path-highlight');
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
import type { NetworkNode, NetworkEdge } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';
import { computeForceLayout } from './networkLayout';

interface NetworkGraphCanvasProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  pathEndpoints: string[];
  pathMemberIds: string[];
  onPersonClick: (personId: string) => void;
}

export function NetworkGraphCanvas({ nodes, edges, pathEndpoints, pathMemberIds, onPersonClick }: NetworkGraphCanvasProps) {
  const positions = useMemo(() => computeForceLayout(nodes, edges), [nodes, edges]);

  return (
    <svg className="graph-canvas" viewBox="0 0 660 460" role="img" aria-label="Case network graph">
      {edges.map((edge) => {
        const a = positions.get(edge.a);
        const b = positions.get(edge.b);
        if (!a || !b) return null;
        return (
          <line
            key={`${edge.a}|${edge.b}`}
            className={`graph-edge${edge.kind === 'mo-shared' ? ' mo-shared' : ''}`}
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

        if (node.type === 'person') {
          const radius = 6 + (node.caseCount ?? 1) * 1.1;
          const label = node.name?.masked ?? node.id;
          const stateClass = pathEndpoints.includes(node.id)
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
                r={radius}
                fill={colorForCommunity(node.communityId ?? 0)}
                tabIndex={0}
                role="button"
                aria-label={label}
                onClick={() => onPersonClick(node.id)}
              />
              <text className="node-label" x={pos.x} y={pos.y - radius - 4} textAnchor="middle">
                {label.split(' ')[0]}
              </text>
            </g>
          );
        }

        if (node.type === 'case') {
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

## Task 8: `PathFindingBar`

**Files:**
- Create: `src/screens/network/PathFindingBar.tsx`
- Test: `src/screens/network/PathFindingBar.test.tsx`

**Interfaces:**
- Consumes: `NetworkPathResponse` (Task 2).
- Produces: `PathFindingBar` component with props `{ pathMode, onToggle, pathEndpoints, pathResult, isPathLoading, isPathError }`, consumed by Task 9 (`NetworkScreen`).

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
      personIds: ['a', 'b'],
      names: [{ masked: 'S**** N**k', real: 'Suresh Naik' }, { masked: 'V***y K***r', real: 'Vijay Kumar' }],
      hopCount: 1,
    };
    render(
      <PathFindingBar
        pathMode={true}
        onToggle={vi.fn()}
        pathEndpoints={['a', 'b']}
        pathResult={pathResult}
        isPathLoading={false}
        isPathError={false}
      />,
    );
    expect(screen.getByText('1 hop')).toBeInTheDocument();
    expect(screen.getByText(/S\*\*\*\* N\*\*k → V\*\*\*y K\*\*\*r/)).toBeInTheDocument();
  });

  it('shows a "no path found" message when the path result is null', () => {
    render(
      <PathFindingBar
        pathMode={true}
        onToggle={vi.fn()}
        pathEndpoints={['a', 'b']}
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
  pathEndpoints: string[];
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
              {pathResult.names.map((n) => n.masked).join(' → ')}
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

## Task 9: `NetworkScreen` — compose everything, states, CSS

**Files:**
- Create: `src/screens/network/NetworkScreen.tsx`
- Test: `src/screens/network/NetworkScreen.test.tsx`
- Modify: `src/design-system/components.css`

**Interfaces:**
- Consumes: `useAuth` (`AuthContext.tsx`), `useMe` (`meApi.ts`), `deriveNetworkScope`/`useNetworkGraph`/`useRepeatOffenders`/`useCommunities`/`useNetworkPath` (Task 2), `NetworkGraphCanvas` (Task 7), `PathFindingBar` (Task 8), `CommunityLegend` (Task 4), `RepeatOffenderRail` (Task 5), `EvidencePanel`/`EvidenceData` (`design-system/EvidencePanel.tsx`, existing), `Header` (`app/Header.tsx`, existing).
- Produces: `NetworkScreen` component, consumed by Task 10 (`App.tsx` route).

- [ ] **Step 1: Write the failing tests**

Create `src/screens/network/NetworkScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as networkApiModule from '../../api/networkApi';
import { NetworkScreen } from './NetworkScreen';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<T, Error>;
}

const me: meApiModule.MeResponse = {
  username: 'demo.investigator',
  firstName: 'Demo',
  rank: 'Investigator',
  unit: 'Whitefield PS',
  unitId: 176,
  districtId: null,
  roles: ['INVESTIGATOR'],
};

const graph: networkApiModule.NetworkGraphResponse = {
  nodes: [
    { id: 'Suresh Naik', type: 'person', name: { masked: 'S**** N**k', real: 'Suresh Naik' }, caseCount: 3, communityId: 2 },
  ],
  edges: [],
};

const offenders: networkApiModule.RepeatOffenderResponse[] = [
  { personId: 'Suresh Naik', name: { masked: 'S**** N**k', real: 'Suresh Naik' }, caseCount: 3, confidenceScore: 0.73, communityId: 2 },
];

function mockAuth(roles: string[] = ['INVESTIGATOR']) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles, username: 'demo.investigator', login: vi.fn(), logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(mockSuccess(me));
}

function mockNetworkQueries(overrides: Partial<{ graph: UseQueryResult<networkApiModule.NetworkGraphResponse, Error> }> = {}) {
  vi.spyOn(networkApiModule, 'useNetworkGraph').mockReturnValue(overrides.graph ?? mockSuccess(graph));
  vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(mockSuccess(offenders));
  vi.spyOn(networkApiModule, 'useCommunities').mockReturnValue(mockSuccess([{ communityId: 2, size: 1, memberNames: [] }]));
  vi.spyOn(networkApiModule, 'useNetworkPath').mockReturnValue(mockSuccess(null));
}

describe('NetworkScreen', () => {
  it('derives station scope for an INVESTIGATOR and renders the graph once loaded', async () => {
    mockAuth(['INVESTIGATOR']);
    mockNetworkQueries();

    render(<NetworkScreen />);

    expect(await screen.findByLabelText('S**** N**k')).toBeInTheDocument();
    expect(networkApiModule.useNetworkGraph).toHaveBeenCalledWith('jwt', { scope: 'station', unitId: 176 });
  });

  it('shows the loading skeleton while the graph is loading', () => {
    mockAuth(['INVESTIGATOR']);
    mockNetworkQueries({
      graph: { data: undefined, isLoading: true, isError: false, isSuccess: false, refetch: vi.fn() } as unknown as UseQueryResult<
        networkApiModule.NetworkGraphResponse,
        Error
      >,
    });

    render(<NetworkScreen />);

    expect(screen.getByLabelText('Loading network graph')).toBeInTheDocument();
  });

  it('shows an alert and retry button when the graph query fails', () => {
    mockAuth(['INVESTIGATOR']);
    mockNetworkQueries({
      graph: { data: undefined, isLoading: false, isError: true, isSuccess: false, refetch: vi.fn() } as unknown as UseQueryResult<
        networkApiModule.NetworkGraphResponse,
        Error
      >,
    });

    render(<NetworkScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the network");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows an empty-scope message when the graph has no nodes', async () => {
    mockAuth(['INVESTIGATOR']);
    mockNetworkQueries({ graph: mockSuccess({ nodes: [], edges: [] }) });

    render(<NetworkScreen />);

    expect(await screen.findByText('No linked cases in this scope.')).toBeInTheDocument();
  });

  it('clicking a person node opens the evidence panel', async () => {
    mockAuth(['INVESTIGATOR']);
    mockNetworkQueries();

    render(<NetworkScreen />);
    await userEvent.click(await screen.findByLabelText('S**** N**k'));

    expect(await screen.findByRole('dialog', { name: 'Evidence panel' })).toBeInTheDocument();
  });

  it('toggling path mode and clicking two people queries useNetworkPath with both ids', async () => {
    mockAuth(['INVESTIGATOR']);
    mockNetworkQueries({
      graph: mockSuccess({
        nodes: [
          ...graph.nodes,
          { id: 'Vijay Kumar', type: 'person', name: { masked: 'V***y K***r', real: 'Vijay Kumar' }, caseCount: 1, communityId: 1 },
        ],
        edges: [],
      }),
    });

    render(<NetworkScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Toggle path-finding mode' }));
    await userEvent.click(await screen.findByLabelText('S**** N**k'));
    await userEvent.click(screen.getByLabelText('V***y K***r'));

    await waitFor(() =>
      expect(networkApiModule.useNetworkPath).toHaveBeenLastCalledWith(
        'jwt',
        { scope: 'station', unitId: 176 },
        'Suresh Naik',
        'Vijay Kumar',
        6,
      ),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/screens/network/NetworkScreen.test.tsx`
Expected: FAIL with "Cannot find module './NetworkScreen'"

- [ ] **Step 3: Implement `NetworkScreen.tsx`**

Create `src/screens/network/NetworkScreen.tsx`:

```tsx
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { useMe } from '../../api/meApi';
import {
  deriveNetworkScope,
  useNetworkGraph,
  useRepeatOffenders,
  useCommunities,
  useNetworkPath,
  type NetworkNode,
  type RepeatOffenderResponse,
} from '../../api/networkApi';
import { EvidencePanel, type EvidenceData } from '../../design-system/EvidencePanel';
import { NetworkGraphCanvas } from './NetworkGraphCanvas';
import { PathFindingBar } from './PathFindingBar';
import { CommunityLegend } from './CommunityLegend';
import { RepeatOffenderRail } from './RepeatOffenderRail';

function nodeFromOffender(offender: RepeatOffenderResponse): NetworkNode {
  return {
    id: offender.personId,
    type: 'person',
    name: offender.name,
    caseCount: offender.caseCount,
    communityId: offender.communityId,
  };
}

export function NetworkScreen() {
  const { token, roles } = useAuth();
  const meQuery = useMe(token);
  const scopeParams = meQuery.data ? deriveNetworkScope(roles, meQuery.data) : null;

  const graphQuery = useNetworkGraph(token, scopeParams);
  const offendersQuery = useRepeatOffenders(token, scopeParams);
  const communitiesQuery = useCommunities(token, scopeParams);

  const [pathMode, setPathMode] = useState(false);
  const [pathEndpoints, setPathEndpoints] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<NetworkNode | null>(null);

  const pathQuery = useNetworkPath(token, scopeParams, pathEndpoints[0] ?? null, pathEndpoints[1] ?? null, 6);

  const isLoading = meQuery.isLoading || graphQuery.isLoading || offendersQuery.isLoading || communitiesQuery.isLoading;
  const isError = meQuery.isError || graphQuery.isError || offendersQuery.isError || communitiesQuery.isError;

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
              meQuery.refetch();
              graphQuery.refetch();
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

  const nodes = graphQuery.data?.nodes ?? [];
  const edges = graphQuery.data?.edges ?? [];
  const offenders = offendersQuery.data ?? [];
  const communities = communitiesQuery.data ?? [];

  function togglePathMode() {
    setPathMode((prev) => !prev);
    setPathEndpoints([]);
  }

  function handlePersonClick(personId: string) {
    if (pathMode) {
      setPathEndpoints((prev) => {
        if (prev.includes(personId)) return prev;
        if (prev.length === 2) return [personId];
        return [...prev, personId];
      });
      return;
    }
    const node = nodes.find((n) => n.id === personId);
    if (node) {
      setSelectedPerson(node);
      return;
    }
    const offender = offenders.find((o) => o.personId === personId);
    if (offender) setSelectedPerson(nodeFromOffender(offender));
  }

  const evidenceData: EvidenceData | null = selectedPerson && {
    claim: `${selectedPerson.name?.masked ?? selectedPerson.id} is linked to ${selectedPerson.caseCount ?? 0} case(s) in community ${selectedPerson.communityId ?? '—'}.`,
    confidence: Math.min(0.96, 0.58 + (selectedPerson.caseCount ?? 0) * 0.05),
    confidenceLabel: 'Community-membership confidence',
    method: 'graph-service (mock)',
    baseline: `${scopeParams?.scope ?? 'state'} scope`,
    generatedAt: new Date().toLocaleString(),
    records: nodes
      .filter((n) => n.type === 'case')
      .slice(0, 3)
      .map((n) => n.caseNumber ?? n.id),
  };

  if (nodes.length === 0) {
    return (
      <>
        <Header title="Network / Link Analysis" />
        <main className="network-main">
          <p>No linked cases in this scope.</p>
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
          pathEndpoints={pathEndpoints}
          pathMemberIds={pathQuery.data?.personIds ?? []}
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
        <CommunityLegend communities={communities} />
        <RepeatOffenderRail offenders={offenders} onSelect={handlePersonClick} />
      </main>
      <EvidencePanel data={evidenceData} onClose={() => setSelectedPerson(null)} />
    </>
  );
}
```

- [ ] **Step 4: Add the network CSS block**

Append to `src/design-system/components.css` (ported from `build_network.py`'s `EXTRA_CSS`, adapted to this app's existing class names and a `graph-canvas-skeleton` loading state):

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

.legend-panel { position: absolute; bottom: 18px; left: 18px; z-index: 5; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; box-shadow: var(--shadow); padding: 14px 16px; width: 220px; display: flex; flex-direction: column; gap: 12px; }
.legend-panel h4 { font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.legend-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; margin-bottom: 6px; }
.legend-row:last-child { margin-bottom: 0; }
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

## Task 10: Wire `/network` into `App.tsx` for every role

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `NetworkScreen` (Task 9).
- Produces: `/network` renders `NetworkScreen` for any authenticated role (no `allowedRoles` restriction), replacing the `ScreenPlaceholder`.

- [ ] **Step 1: Write the failing test**

Add to `src/app/App.test.tsx`:

```tsx
it('an INVESTIGATOR can reach /network (no longer role-restricted)', async () => {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['INVESTIGATOR'], username: 'demo.investigator', login: vi.fn(), logout: vi.fn(),
  });
  window.history.pushState({}, '', '/network');

  render(<App />);

  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Network / Link Analysis' })).toBeInTheDocument());
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/App.test.tsx`
Expected: FAIL — `/network` still renders the `ScreenPlaceholder`'s "Network / Link Analysis" `<h2>`, not `NetworkScreen`'s `<h1>` from `Header`, and `INVESTIGATOR` isn't in the placeholder route's `allowedRoles` so it currently redirects away entirely.

- [ ] **Step 3: Wire the route**

In `src/app/App.tsx`, add the import:

```ts
import { NetworkScreen } from '../screens/network/NetworkScreen';
```

Replace the `/network` route:

```tsx
        <Route path="/network" element={<NetworkScreen />} />
```

(No `ProtectedRoute`/`allowedRoles` wrapper — per the approved spec, access is open to every authenticated role, with scope/masking doing the narrowing instead of a route gate. The outer `<Route path="/*" element={<AuthenticatedShell />} />` in `App` already requires a token via `AuthProvider`'s redirect-to-`/login` behavior for unauthenticated users.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — every test file in the repo, including all ones added/modified in Tasks 1–10.

- [ ] **Step 6: Commit**

```bash
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "Wire NetworkScreen into the /network route for every role"
```

---

## Post-plan note

Per the approved spec's non-goals, this plan doesn't touch graph-service/core-platform — the "Backend contract change" section of `docs/superpowers/specs/2026-07-19-network-link-analysis-design.md` is a proposal to hand off separately. Until that's implemented, `/network` only renders fully populated in mock mode (`sessionStorage['ksp-mock'] === '1'`); against the real backend today only `SCRB_ANALYST` has any working access, via the three endpoints that already exist.
