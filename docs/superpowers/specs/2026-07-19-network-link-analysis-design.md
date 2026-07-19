# Network / Link Analysis screen design

## Problem

`/network` is wired into `App.tsx` and `Rail.tsx` but renders only `ScreenPlaceholder`. A static
design mockup already exists (`docs/superpowers/fe-artifacts-html/network.html` /
`build_network.py`): a force-directed graph of Person/Case/Location nodes, a path-finding mode
(click two people, BFS-highlight the connecting chain), a community legend, and a repeat-offenders
ranked rail, with node clicks opening an evidence panel.

The mockup assumes a graph-shaped API (`nodes` + `edges`) that doesn't exist. The real backend —
core-platform's `NetworkController` → `NetworkQueryService` → `GraphServiceClient` →
graph-service's `PersonQueryController` (Neo4j-backed) — exposes three flat endpoints today:

- `GET /api/network/repeat-offenders?minCases=&limit=`
- `GET /api/network/path?from=&to=&maxHops=`
- `GET /api/network/communities?minSize=`

All three currently require `STATE` scope + `rawCaseAccess=true`, which in practice only
`SCRB_ANALYST` has (`POLICYMAKER` is `STATE`-scoped but aggregate-only, so gets `403`). There is no
endpoint that returns a raw node+edge graph for rendering — `PersonQueryController` only exposes
the same three routes internally.

This spec (a) proposes the backend contract change needed to unblock the graph canvas and to open
the screen to every role with scoped/masked access, and (b) designs the frontend screen against
that proposed contract, built now with mock data per this app's "render fully populated without a
backend" convention.

## Goals

- Open `/network` to all authenticated roles (not just `SCRB_ANALYST`/`DISTRICT_SUPERVISOR`),
  scoped by role like Command Center already scopes by station/district/state.
- Non-`SCRB_ANALYST`/`POLICYMAKER` roles get a masked, scope-limited view (station or district),
  consistent with `PiiField`'s masked/real convention already used in Case Explorer — this is a
  real widening of who can query the graph service, so it must not also widen who sees raw names.
- Full parity with the mockup's interactions: graph canvas (Person/Case/Location nodes, community
  coloring), path-finding mode with BFS hop count, repeat-offenders rail, evidence panel on click.
- Fully populated in mock mode, following the existing `caseApi.ts` / `mockData.ts` pattern.

## Non-goals

- No actual graph-service/core-platform code changes in this repo — the "Backend contract change"
  section below is a proposal to hand off, not an implementation. This frontend repo has no access
  to that codebase to implement or verify it.
- No fix for the mock repeat-offender name-collision artifact described under "Mock data" — flagged
  as a known limitation, not solved here.
- No live cross-linking from Network back into Case Explorer (e.g. clicking a case node doesn't
  deep-link to `/case-explorer/:caseId`) — the two screens use independently-shaped mock identities
  (Neo4j `personId` vs. `caseId`) and reconciling them is a separate piece of work.
- No Playwright e2e coverage, matching the precedent set by Case Explorer's spec.
- No change to real (non-mock) backend behavior. Until graph-service/core-platform implement the
  contract change below, this screen only functions fully in mock mode. Against the real backend
  today, only `SCRB_ANALYST` has working access via the existing three endpoints; the new `/graph`
  endpoint and every other role's scoped access simply don't exist server-side yet — this frontend
  work doesn't create them.

## Backend contract change (proposal for graph-service / core-platform)

### New endpoint

`GET /api/network/graph?scope={station|district|state}&unitId=&districtId=`

```json
{
  "nodes": [
    { "id": "123", "type": "person", "displayName": "...", "maskedName": "...", "caseCount": 4, "communityId": 5 },
    { "id": "c1", "type": "case", "caseNumber": "..." },
    { "id": "l1", "type": "location", "label": "..." }
  ],
  "edges": [
    { "a": "123", "b": "c1", "kind": "involved" },
    { "a": "123", "b": "456", "kind": "co-accused" },
    { "a": "c1", "b": "c2", "kind": "mo-shared" },
    { "a": "c1", "b": "l1", "kind": "location" }
  ]
}
```

This doesn't exist in `PersonQueryController` today and is new graph-service work, not just a
core-platform passthrough.

### Existing endpoints gain `scope`/`unitId`/`districtId`

`repeat-offenders`, `communities`, and `path` all currently assume `STATE` scope. Add the same
`scope`/`unitId`/`districtId` params as the new `/graph` endpoint, and for any role without
`rawCaseAccess`, return `maskedName` instead of `displayName` per person — mirroring
`CasePartyResponse`'s `{ masked, real }` shape already used in `caseApi.ts`, so the frontend applies
one masking convention everywhere instead of two.

### Carried-forward caveat

`personId` is a Neo4j internal node id, valid only within the hourly projection run that produced
it (see `RepeatOffenderResponse.java`). The frontend must never persist a `personId` across a page
reload or cache it beyond a single session's fetch — see "Stale ids" under Error handling.

### Open feasibility questions (for graph-service team, not answered here)

- Are `Case` and `Location` modeled as Neo4j nodes today, or only `Person`, with case/location
  association reconstructed from Postgres at query time? This determines whether `/graph` is a
  straightforward Cypher query or requires new node types.
- Is `unitId`/`districtId` already a property reachable from `Person`/`Case` nodes for scoping, or
  does scoping require a new relationship to the org hierarchy?
- Can `maskedName` be computed inside the Cypher query, or does it require a join back to
  `case_master` (Postgres) per node?

## Frontend architecture

### Routing & access

`/network`'s `ProtectedRoute allowedRoles` in `App.tsx` is widened to all roles (removing the
`DISTRICT_SUPERVISOR`/`SCRB_ANALYST` restriction) — auth alone gates the route; scope is what
narrows the data.

Scope is derived automatically from `useMe()`, the same way Command Center derives district/station
scope — no scope picker in the UI:

| Role | Scope | Access |
|---|---|---|
| `INVESTIGATOR`, `STATION_SUPERVISOR` | `station` (`unitId`) | masked |
| `DISTRICT_SUPERVISOR` | `district` (`districtId`) | masked |
| `SCRB_ANALYST`, `POLICYMAKER` | `state` | raw (`SCRB_ANALYST`) / masked (`POLICYMAKER`, no `rawCaseAccess`) |
| `ADMIN` | `state` | masked |

### `networkApi.ts` (new)

Same shape as `caseApi.ts`/`geoApi.ts` — interfaces, fetch functions, one `useX` React Query hook
per fetch function:

```ts
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

export interface NetworkEdge { a: string; b: string; kind: NetworkEdgeKind; }
export interface NetworkGraphResponse { nodes: NetworkNode[]; edges: NetworkEdge[]; }

export interface RepeatOffenderResponse {
  personId: string;
  name: { masked: string; real: string };
  caseCount: number;
  gravityWeight: number;
  confidenceScore: number;
  communityId: number;
}

export interface CommunityResponse { communityId: number; size: number; memberNames: Array<{ masked: string; real: string }>; }

export interface NetworkPathResponse { personIds: string[]; names: Array<{ masked: string; real: string }>; hopCount: number; }

export interface NetworkScopeParams { scope: NetworkScope; unitId?: number; districtId?: number; }

export function getNetworkGraph(token, params: NetworkScopeParams): Promise<NetworkGraphResponse>;
export function useNetworkGraph(token, params: NetworkScopeParams | null);

export function getRepeatOffenders(token, params: NetworkScopeParams, minCases = 2, limit = 8): Promise<RepeatOffenderResponse[]>;
export function useRepeatOffenders(token, params: NetworkScopeParams | null);

export function getCommunities(token, params: NetworkScopeParams, minSize = 3): Promise<CommunityResponse[]>;
export function useCommunities(token, params: NetworkScopeParams | null);

export function getNetworkPath(token, from: string, to: string, maxHops = 6): Promise<NetworkPathResponse | null>; // null on 404
export function useNetworkPath(token, from: string | null, to: string | null);
```

`name`/party fields reuse the `{ masked, real }` shape so they drop straight into `PiiField` with
no adapter, same as `CasePartyResponse` in `caseApi.ts`.

### Mock data (`mockData.ts`)

New route matches in `getMockResponse`: `/api/network/graph`, `/api/network/repeat-offenders`,
`/api/network/communities`, `/api/network/path`.

Derived from the *existing* mock case data rather than a separate synthetic dataset, per the
existing per-station generator (`mockCaseSummaries`, `mockParty`, `CASES_PER_STATION = 6`):

- For the requested scope, enumerate the relevant stations (one station for `station` scope, all
  stations in a district for `district`, all stations statewide for `state`).
- For each station, build its 6 cases via `mockCaseSummaries` and their accused/victim parties via
  `mockParty`. Person node identity = accused party's `real` name string (mock data has no separate
  person id).
- **`involved` edges**: person ↔ case, from each case's accused party.
- **`co-accused` edges**: two accused sharing a case — doesn't occur in current mock data (one
  accused per case), so this edge kind will be empty until/unless a case gets a second accused
  party; left as a real edge kind in the type, not populated by the generator yet.
- **`mo-shared` edges**: case ↔ case where both share `crimeSubHeadId`.
- **`location` edges**: case ↔ its station (`unitId`), one location node per station.
- **Communities**: group by shared `crimeSubHeadId` cluster (mirrors the mockup's
  `communityId`/`communityColors` idea) — deterministic, not a real Louvain run.
- **Repeat offenders**: group accused-party occurrences by name, `caseCount` = occurrence count,
  sorted descending, top N.
- **Path**: BFS over the derived edge list between two person ids, same algorithm as the mockup's
  `bfsPath`, returning `null` (→ frontend renders "no path found") if unreachable within `maxHops`.
- Names masked/unmasked per the requesting persona's role, matching `maskName()`'s existing logic.

**Known mock limitation**: `ACCUSED_NAMES` is a fixed 6-name pool, and `mockParty('accused', index)`
cycles through it by `index % 6` independent of `unitId` — so the same accused name recurs at the
same case-slot across *every* station statewide. Within a single station's 6 cases this never
repeats (each of the 6 names appears once), so `station` scope shows no repeat offenders at all;
`district`/`state` scope will show all 6 names as "repeat offenders" purely because the name pool
is shared across stations, not because of intentional repeat-offense modeling. This is a pre-existing
limitation of `mockData.ts`'s name pool, not something this spec fixes — noted here so the resulting
demo data doesn't get mistaken for a deliberately dramatic repeat-offender pattern.

### Components (`src/screens/network/`)

- **`NetworkScreen.tsx`** — the `/network` route. `useMe(token)` derives `NetworkScopeParams` from
  role + `unitId`/`districtId`. Renders `<Header title="Network / Link Analysis">`, filter bar
  (date range / crime type / confidence — cosmetic, mirrors the mockup's header, not wired to the
  mock backend since none of the three real endpoints take those params today), and the graph
  layout below.
- **`NetworkGraphCanvas.tsx`** — SVG canvas, force layout ported directly from `build_network.py`'s
  algorithm (fixed-iteration spring + repulsion simulation, no d3 dependency, consistent with this
  app avoiding graph-viz libraries elsewhere). Renders person (circle, radius by `caseCount`, fill
  by `communityId`), case (diamond), location (triangle) nodes per the mockup's shapes. Click on a
  person opens the evidence panel; in path-finding mode, click-two-people highlights the BFS path.
  Case and location nodes are visual context only, not interactive, in v1 — matching the mockup,
  which never wires a click handler for them either.
- **`CommunityLegend.tsx`** — node-type shapes + community color key, presentational.
- **`PathFindingBar.tsx`** — toggle + two-person selection state, calls `useNetworkPath` once both
  ends are picked, renders hop count or "no path found within 6 hops".
- **`RepeatOffenderRail.tsx`** — ranked list from `useRepeatOffenders`, reuses `ConfidenceChip` for
  `confidenceScore`, each card click behaves like clicking that person's node (opens evidence
  panel).
- Evidence panel reuses the existing `EvidencePanel` design-system component unchanged — a person
  click builds `EvidenceData` from that node's `communityId`/`caseCount`/supporting case numbers,
  same shape Case Explorer and Command Center already produce for it.

## Error handling

- **Loading**: skeleton state on the canvas (empty node placeholders) while `useNetworkGraph` and
  `useRepeatOffenders` are loading, matching `CommandCenterScreen`'s existing skeleton convention.
- **Error**: `role="alert"` message + retry button calling `.refetch()`, same pattern as
  `CaseExplorerScreen`.
- **Empty scope**: if `nodes` is empty for the resolved scope (e.g. a station with no cases),
  render `"No linked cases in this scope."` instead of an empty canvas.
- **No path found**: `/path` resolving to `null` (real 404, or mock BFS finding nothing) renders an
  inline message in `PathFindingBar`, not a page-level error.
- **Stale ids**: because Neo4j `personId` is only valid within the hourly projection run that
  produced it, `useNetworkGraph`/`useRepeatOffenders` use a short `staleTime` (5 minutes, well under
  an hour) so a session doesn't hold ids long enough to go stale. A `/path` call against a stale id
  is indistinguishable from a genuine "no path" 404 with the current contract, so both render the
  same "no path found" message — not solved by better error messages, only by keeping ids fresh.
- **403 (`rawCaseAccess` denial)**: shouldn't trigger once scope/masking is implemented correctly
  per role, but `networkApi.ts` still surfaces `ApiError` through the existing error state as a
  safety net if a role/scope combination is misconfigured server-side.

## Testing

- **`networkApi.test.tsx`**: each `getX`/`useX` pair, mock-mode responses for all four endpoints,
  same shape as `caseApi.test.tsx`.
- **`mockData.test.ts` additions**: graph/offenders/communities are deterministic per scope; `path`
  BFS returns the right hop chain for a known pair and `null` for an unreachable pair; masking is
  applied for non-raw-access personas and bypassed for `SCRB_ANALYST`.
- **`NetworkScreen.test.tsx`**: scope correctly derived per role/`unitId`/`districtId`; loading
  skeleton, error+retry, and empty-scope states each render.
- **`NetworkGraphCanvas.test.tsx`**: nodes/edges render from a fixed graph fixture; clicking a
  person node opens the evidence panel with the right claim text.
- **`PathFindingBar.test.tsx`**: toggling path mode, selecting two people, rendering hop count;
  "no path found" state when the mock query resolves to `null`.
- **`RepeatOffenderRail.test.tsx`**: ranked list renders from a fixed fixture, sorted descending by
  `caseCount`; card click matches the same evidence-panel behavior as a canvas node click.
