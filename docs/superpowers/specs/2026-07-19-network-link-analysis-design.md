# Network / Link Analysis screen design (rewritten against the real backend contract)

> **Revision note (2026-07-19):** This replaces an earlier version of this spec that proposed a
> speculative `GET /api/network/graph?scope=...` contract, opened to every role with masking. That
> contract was never built. The real backend (core-platform + graph-service, implemented and
> tested the same day) shipped a different contract: a single `GET /api/network/subgraph?focus=...`
> endpoint with four focus modes, access unchanged from the three pre-existing network endpoints
> (`SCRB_ANALYST` only, raw unmasked data, no scope params). This revision targets that real
> contract. Everything under "Real backend contract" below was verified by reading the actual
> DTOs/controllers/Cypher in `core-platform` and `graph-service` and running their test suites
> (`SubgraphQueryServiceTest`, `SubgraphQueryControllerIT`, `NetworkQueryServiceTest`,
> `GraphServiceClientTest`, `NetworkControllerIT` — all passing).

## Problem

`/network` is wired into `App.tsx` and `Rail.tsx` but renders only `ScreenPlaceholder`. A static
design mockup already exists (`docs/superpowers/fe-artifacts-html/network.html` /
`build/build_network.py`): a force-directed graph of Person/Case/Location nodes, a path-finding mode
(click two people, BFS-highlight the connecting chain), a community legend, and a repeat-offenders
ranked rail, with node clicks opening an evidence panel. This spec designs the frontend screen
against the real, already-implemented backend contract.

## Real backend contract (verified against `core-platform`/`graph-service` source + passing tests)

Four endpoints under `/api/network`, all requiring the caller to have `STATE` scope AND
`rawCaseAccess=true` (`NetworkQueryService.requireFullNetworkAccess()`) — in practice
**`SCRB_ANALYST` only**. `DISTRICT_SUPERVISOR` is not `STATE`-scoped and gets `403`. There is no
scope/masking parameter anywhere in this contract; every field is the real, unmasked value.

### 1. `GET /api/network/subgraph?focus=&limit=&personId=&hops=&communityId=&from=&to=&maxHops=` (new)

One endpoint, four mutually-exclusive focus modes (`focus` unrecognized/missing → `top-offenders`):

| `focus` | Params used | Server-side semantics |
|---|---|---|
| `top-offenders` (default) | `limit` (default 10) | 2-hop ego-networks around the top-N repeat offenders by case count |
| `person` | `personId` (required), `hops` (default 2, clamped 1–2) | Ego-network around one person |
| `community` | `communityId` (required) | **Only** the `Person` nodes in that Louvain community plus the real `CO_ACCUSED_WITH`/`SHARES_MO_WITH` edges Neo4j actually has among them — no `Case`/`Location` nodes, ever |
| `path` | `from`, `to` (required), `maxHops` (default 6) | The `Person` nodes on the resolved shortest path, plus the `Case`/`Location` nodes that justify each direct hop |

Response:

```ts
interface SubgraphResponse {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  generatedAt: string; // ISO Instant of the graph-service projection run that produced this data
}
interface GraphNodeResponse {
  id: string;                                  // String form of Neo4j's internal node id
  type: 'PERSON' | 'CASE' | 'LOCATION';
  label: string;                                // displayName (PERSON) / "crimeNo / caseNo" (CASE) / locationKey (LOCATION)
  confidence: number | null;                    // non-null ONLY for type === 'PERSON' (identity-resolution confidence)
}
interface GraphEdgeResponse {
  id: string;
  sourceId: string;                             // matches a GraphNodeResponse.id
  targetId: string;                             // matches a GraphNodeResponse.id
  type: 'ACCUSED_IN' | 'VICTIM_IN' | 'ARRESTED_BY' | 'OCCURRED_AT' | 'CO_ACCUSED_WITH' | 'SHARES_MO_WITH';
  confidence: number | null;                    // non-null ONLY for type === 'SHARES_MO_WITH' (MO-similarity score)
}
```

Capped at **≤75 total nodes** per response, enforced in the Cypher itself server-side — the frontend
must never assume more nodes exist just because a focus "should" have more; hitting the cap on a
large community is expected, not an error.

### 2–4. Existing endpoints (unchanged, already implemented before this session)

```ts
// GET /api/network/repeat-offenders?minCases=&limit=
interface RepeatOffenderResponse { personId: number; displayName: string; caseCount: number; gravityWeight: number; confidenceScore: number; }

// GET /api/network/communities?minSize=
interface CommunityResponse { communityId: number; size: number; memberDisplayNames: string[]; }

// GET /api/network/path?from=&to=&maxHops=  (404 -> no path, or null in mock mode)
interface NetworkPathResponse { personIds: number[]; displayNames: string[]; hopCount: number; }
```

### The graph model (why edges point where they do)

From `graph-service`'s `Person`/`CaseNode`/`LocationNode` entities and the subgraph Cypher:

- `ACCUSED_IN`: `Person -> Case` (outgoing)
- `VICTIM_IN`: `Person -> Case` (outgoing)
- `ARRESTED_BY`: `Person -> Case` (outgoing — despite the name, the target is the case they were arrested in connection with, not a station)
- `OCCURRED_AT`: `Case -> Location` (outgoing)
- `CO_ACCUSED_WITH`, `SHARES_MO_WITH`: `Person <-> Person` (computed, undirected in practice) — **both** confirmed from the `community` focus Cypher, which only ever traverses these two types between `Person` nodes

### Two contract subtleties that will bite if missed

1. **`personId` (input) vs. `GraphNodeResponse.id` (output) are related but differently-typed.**
   `RepeatOffenderResponse.personId` and the `personId`/`from`/`to` query params are numbers (Neo4j's
   internal `Long` id, serialized as a JSON number). But a `PERSON` node's `id` field in a
   `SubgraphResponse` is a **string** (`String.valueOf(id(n))` server-side) — the string form of that
   same number. To go from a canvas node back to a numeric `personId` (e.g. to drive path-finding or
   to look up a repeat-offender's rich stats), convert with `Number(node.id)`; to compare a
   `RepeatOffenderResponse.personId` against a canvas node, compare `String(offender.personId) ===
   node.id`. Never treat `node.id` as a second, independent identifier space.

2. **`GraphNodeResponse` carries no `communityId`.** The `/subgraph` node shape is
   `{id, type, label, confidence}` only — community membership is not on the node. To color a
   `PERSON` node by community, cross-reference its `label` against `CommunityResponse.memberDisplayNames`
   (a plain name list, no ids) from a separately-fetched `communities` list. This is a name-based
   join, not an id-based one — a real limitation of the current contract, not a frontend choice.

3. **`personId`/`communityId` validity window.** These are Neo4j internal ids, valid only within the
   hourly graph-service projection run that produced them (same caveat `RepeatOffenderResponse`
   already documents backend-side). The frontend must never persist a `personId` across a page
   reload or cache it beyond a single session's fetch.

## Goals

- Render `/network` fully populated in mock mode, following the existing `caseApi.ts` / `mockData.ts`
  pattern, against the *real* contract above (not a speculative one).
- Full parity with the mockup's interactions: graph canvas (Person/Case/Location nodes, community
  coloring), path-finding mode with hop count, repeat-offenders rail, community legend, evidence
  panel on click.
- Fix the existing over-permissive route: `/network` currently allows
  `['DISTRICT_SUPERVISOR', 'SCRB_ANALYST']` in `App.tsx`, but the real backend only ever authorizes
  `SCRB_ANALYST`. A `DISTRICT_SUPERVISOR` reaching this screen today would get a working-looking UI
  in mock mode and a `403` against the real backend — this spec corrects the route to
  `['SCRB_ANALYST']` only, so the FE access model matches reality.

## Non-goals

- No scope narrowing, no masking, no widening access to other roles — the real backend doesn't
  support any of that for these four endpoints. If that ever changes, it needs its own backend spec
  first, then a follow-up to this one, per the original design spec's own stated sequencing
  (`docs/superpowers/specs/2026-07-19-network-subgraph-api-design.md`, core-platform repo: "The
  Network/Link Analysis frontend screen itself — separate spec, built against this contract once
  merged").
- No live cross-linking from Network back into Case Explorer (independently-shaped mock identities —
  Neo4j `personId` vs. `caseId` — reconciling them is separate work).
- No Playwright e2e coverage, matching the precedent set by Case Explorer's spec.
- No CO_ACCUSED_WITH edges in mock data — today's mock case generator produces exactly one accused
  per case (`mockCaseSummaries`/`mockParty`), so no two mock accused ever share a case as co-accused.
  `SHARES_MO_WITH` (accused sharing a crime sub-head) is populated instead and carries the demo
  weight that a real deployment would split across both edge types.

## Frontend architecture

### Routing & access

`/network`'s `ProtectedRoute allowedRoles` in `App.tsx` becomes `['SCRB_ANALYST']` only (removing
`DISTRICT_SUPERVISOR`), matching `requireFullNetworkAccess()`. No scope picker, no `useMe()`
dependency in the screen — access is binary (in or redirected), same as today's `/admin` route.

### `networkApi.ts` (new)

Same shape as `caseApi.ts`/`geoApi.ts` — interfaces, fetch functions, one `useX` React Query hook per
fetch function. Full signatures are specified task-by-task in the implementation plan
(`docs/superpowers/plans/2026-07-19-network-link-analysis.md`), matching the types under "Real
backend contract" above verbatim.

### Mock data (`mockData.ts`)

New route matches in `getMockResponse`: `/api/network/subgraph`, `/api/network/repeat-offenders`,
`/api/network/communities`, `/api/network/path`. Derived from the *existing* mock case data
(`mockCaseSummaries`, `mockParty`, `CASE_CRIME_TYPES`) rather than a separate synthetic dataset, using
the **same** `accused`/`victim` party generation `mockCaseDetail` already uses
(`mockParty('accused', index + 1)`, `mockParty('victim', index)`) so a person appearing in the network
graph is the same identity Case Explorer shows for that case.

- Accused and victim names get stable numeric `personId`s via two fixed id arrays parallel to the
  existing `ACCUSED_NAMES`/`VICTIM_NAMES` pools (mock has no real Neo4j ids, so this stands in for
  identity resolution's synthetic-id tier).
- **`ACCUSED_IN`/`VICTIM_IN`** edges: person → case, from each case's accused/victim party.
- **`OCCURRED_AT`** edges: case → its station (one `LOCATION` node per contributing station).
- **`SHARES_MO_WITH`** edges: accused ↔ accused sharing `crimeSubHeadId`, confidence scored by shared
  case count — stands in for the real MO-similarity signal.
- **`CO_ACCUSED_WITH`**: never populated (see Non-goals).
- **Communities**: accused persons grouped by `crimeHeadId` (their crime sub-head's parent category)
  — a deterministic stand-in for a real Louvain run, matching `community` focus's actual shape
  (`Person` nodes + `CO_ACCUSED_WITH`/`SHARES_MO_WITH` edges only, no `Case`/`Location`).
  `colorForCommunity` hashes the resulting `communityId` into one of the 5 `--cat-N` palette slots —
  it does **not** reuse `CategoryMixChart`'s `crimeHeadId -> slot` map, because a real Neo4j
  `communityId` is an arbitrary Louvain cluster id with no relation to the crime-category palette;
  mock happens to derive `communityId` from `crimeHeadId` today, but the frontend must treat
  `communityId` as opaque.
- **Repeat offenders**: accused grouped by `personId`, `caseCount` = occurrence count, sorted
  descending, filtered by `minCases`, capped at `limit`.
- **Path**: BFS over a person-adjacency graph built from case co-occurrence (any two persons —
  accused or victim — appearing on the same case are adjacent), `hopCount` = person-to-person hops,
  `null` (-> "no path found") if unreachable within `maxHops`. This mirrors the real
  `/api/network/path`'s reported shape (`personIds`/`displayNames`/`hopCount` only, no intermediate
  Case/Location nodes) even though the real graph traversal happens over the full node/edge graph.
- **Subgraph**: builds the node/edge set per focus mode following the real Cypher's actual shape for
  each mode (documented per-mode above) — critically, `community` focus returns **only** `PERSON`
  nodes and `SHARES_MO_WITH` edges, never `CASE`/`LOCATION`, matching the real query. All modes cap at
  75 nodes and drop any edge whose endpoint didn't survive the cap, exactly like the server does.

**Known mock limitation** (carried over from the original spec draft): `ACCUSED_NAMES` is a fixed
6-name pool cycling by `index % 6` independent of station, so the same accused name recurs across
every station statewide once more than 6 stations feed the dataset. This produces "repeat offenders"
that are a pool-size artifact, not intentional repeat-offense modeling — a pre-existing limitation of
`mockData.ts`, not something this spec fixes.

### Components (`src/screens/network/`)

- **`NetworkScreen.tsx`** — the `/network` route. Local `focus` state (`top-offenders` by default,
  switching to `person`/`community`/`path` on interaction) drives `useSubgraph`. `useRepeatOffenders`
  and `useCommunities` are fetched independently of `focus` (they always show the full ranked
  list/legend, not just what's on-canvas). Renders `<Header title="Network / Link Analysis">`, the
  canvas, path-finding bar, community legend, and repeat-offender rail.
- **`NetworkGraphCanvas.tsx`** — SVG canvas, force layout ported from `build_network.py`'s algorithm
  (fixed-iteration spring + repulsion simulation, no d3 dependency). Renders `PERSON` (circle, colored
  by community via label lookup), `CASE` (diamond), `LOCATION` (triangle) nodes. Click on a `PERSON`
  node opens the evidence panel (outside path mode) or registers a path endpoint (inside path mode).
  `CASE`/`LOCATION` nodes are visual context only, not interactive, matching the mockup.
- **`CommunityLegend.tsx`** — node-type shapes + community color key; clicking a community row sets
  `focus = { mode: 'community', communityId }`.
- **`PathFindingBar.tsx`** — toggle + two-person selection state, calls `useNetworkPath` once both
  ends are picked, renders hop count + name chain or "no path found within 6 hops".
- **`RepeatOffenderRail.tsx`** — ranked list from `useRepeatOffenders`, reuses `ConfidenceChip` for
  `confidenceScore`, each card click sets `focus = { mode: 'person', personId, hops: 2 }` and opens
  the evidence panel using that row's rich data (`caseCount`/`gravityWeight`/`confidenceScore` — a
  strictly better evidence source than a bare canvas node click, which only has `label`/`confidence`).
- Evidence panel reuses the existing `EvidencePanel` design-system component unchanged.

## Error handling

- **Loading**: skeleton state on the canvas while `useSubgraph`/`useRepeatOffenders` are loading,
  matching `CommandCenterScreen`'s existing skeleton convention.
- **Error**: `role="alert"` message + retry button calling `.refetch()`, same pattern as
  `CaseExplorerScreen`.
- **Empty focus**: if `nodes` is empty for the resolved focus (e.g. an unknown `communityId`), render
  `"No linked records for this view."` instead of an empty canvas.
- **No path found**: `/path` resolving to `null` (real 404, or mock BFS finding nothing) renders an
  inline message in `PathFindingBar`, not a page-level error.
- **Stale ids**: `useSubgraph`/`useRepeatOffenders`/`useCommunities` use a short `staleTime` (5
  minutes, well under an hour) so a session doesn't hold ids long enough to go stale.
- **403 (`rawCaseAccess` denial)**: shouldn't trigger given the corrected `SCRB_ANALYST`-only route,
  but `networkApi.ts` still surfaces `ApiError` through the existing error state as a safety net.

## Testing

- **`networkApi.test.tsx`**: each `getX`/`useX` pair, mock-mode responses for all four endpoints,
  same shape as `caseApi.test.tsx`; the `node.id` <-> `personId` string/number conversion helper gets
  its own direct test.
- **`mockData.test.ts` additions**: subgraph is deterministic per focus+params and never exceeds 75
  nodes / never has a dangling edge; `community` focus returns only `PERSON` nodes; `path` BFS
  returns the right hop chain for a known pair and `null` for an unreachable pair or an id outside
  `maxHops`.
- **`NetworkScreen.test.tsx`**: default `top-offenders` focus renders; clicking a rail card switches
  focus to that person and opens the evidence panel; clicking a community legend row switches focus;
  loading skeleton, error+retry, and empty-focus states each render.
- **`NetworkGraphCanvas.test.tsx`**: nodes/edges render from a fixed graph fixture; clicking a
  `PERSON` node fires `onPersonClick` with its numeric `personId` (converted from `node.id`), not the
  raw node id string.
- **`PathFindingBar.test.tsx`**: toggling path mode, selecting two people, rendering hop count and
  name chain; "no path found" state when the mock query resolves to `null`.
- **`RepeatOffenderRail.test.tsx`**: ranked list renders from a fixed fixture, sorted descending by
  `caseCount`; card click matches the same evidence-panel behavior as a canvas node click.
