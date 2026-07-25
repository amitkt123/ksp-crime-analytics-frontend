chang# Network graph: CASE/LOCATION node detail panels

## Problem

`NetworkScreen.tsx` renders PERSON, CASE, and LOCATION nodes on the graph canvas, but only PERSON
nodes are interactive. `docs/superpowers/specs/2026-07-19-network-link-analysis-design.md` explicitly
scoped CASE/LOCATION nodes as "visual context only, not interactive, matching the mockup" — this spec
lifts that restriction.

Worse than a missing feature, the current click handler is actively wrong for non-PERSON nodes:

```ts
onNodeClick={(node) => handlePersonClick(personIdOfNode(node))}
```

`personIdOfNode`/`caseIdOfNode`/`locationIdOfNode` all do the same `Number(node.id)` conversion (a
CASE or LOCATION node's Neo4j id is a valid number), so clicking a CASE or LOCATION node today
silently calls `handlePersonClick` with that id treated as a `personId` — looking up a nonexistent
offender/person and doing nothing visible, rather than erroring. This spec fixes the routing as part
of adding the two new panels.

The backend contract already anticipated this: `SubgraphFocus` includes `'case'`/`'location'`,
`SubgraphParams` carries `caseId`/`locationId`, and `caseIdOfNode()`/`locationIdOfNode()` exist in
`networkApi.ts` — none of it wired into the screen until now.

## Goals

- Clicking a CASE node opens a side panel with a condensed case summary and two actions: recenter the
  graph on that case, or open the full case file in Case Explorer.
- Clicking a LOCATION node opens a side panel summarizing that location within the currently-loaded
  subgraph, with a "Focus on Location" action.
- Fix `NetworkScreen`'s click routing to dispatch on `node.type` instead of assuming every click is a
  person.
- Reuse the existing `SidePanelChrome` shell (already extracted and used by `EvidencePanel`) for both
  new panels — no shell duplication.

## Non-goals

- No changes to PERSON node click behavior or `EvidencePanel` itself — it stays the AI-confidence-claim
  component it already is. CASE/LOCATION data is ground-truth record data, not a confidence claim, so
  it gets its own panels rather than being forced into `EvidencePanel`'s schema.
- No new backend endpoints. CASE panels use the existing `useCaseDetail(token, caseId)` hook
  (`caseApi.ts`) unchanged. LOCATION panels use only data already present in the loaded subgraph
  (the clicked node's own fields plus its edges) — there is no location-detail endpoint to call.
- No full map embed in the LOCATION panel — coordinates render as plain text, not a map tile.
- No edge-type visual styling, legend-as-filter checkboxes, collapsible sidebars, or node iconography
  changes. Separate UI work, unrelated to node click behavior.
- No multi-node selection or "compare two cases" panel.
- Path-finding mode is unchanged: it remains PERSON-only. Cases/locations are not valid path endpoints.

## Frontend architecture

### `NetworkScreen.tsx`: type-aware click routing

`SelectedPerson` is replaced with a discriminated union covering all panel-worthy selections:

```ts
type SelectedNode =
  | { source: 'offender'; data: RepeatOffenderResponse }
  | { source: 'person'; data: GraphNodeResponse }
  | { source: 'case'; data: GraphNodeResponse }
  | { source: 'location'; data: GraphNodeResponse };
```

`onNodeClick` dispatches on `node.type`:

```ts
function handleNodeClick(node: GraphNodeResponse) {
  if (pathMode) {
    if (node.type === 'PERSON') handlePersonClick(personIdOfNode(node));
    return; // CASE/LOCATION clicks are no-ops in path mode
  }
  if (node.type === 'PERSON') { handlePersonClick(personIdOfNode(node)); return; }
  if (node.type === 'CASE') { setSelectedNode({ source: 'case', data: node }); return; }
  setSelectedNode({ source: 'location', data: node });
}
```

Only one panel is open at a time (`selectedNode` is a single value, not a stack) — clicking a new node
replaces whatever panel is currently showing, matching today's single-`EvidencePanel` behavior.
`EvidencePanel` continues to render off the `offender`/`person` branches exactly as it does today;
`CaseDetailPanel`/`LocationDetailPanel` render off the `case`/`location` branches.

### `CaseDetailPanel.tsx` (new, `src/screens/network/`)

Props: `{ node: GraphNodeResponse | null; onClose: () => void; onFocus: (caseId: number) => void }`.

Wraps `SidePanelChrome` (`title` = the node's `label`, e.g. "144/2026"). Fetches
`useCaseDetail(token, node && caseIdOfNode(node))`. While the fetch is in flight, pre-fills the header
from fields already on the subgraph node itself (`caseNo`, `crimeRegisteredDate`, `gravityWeight`) so
the panel never opens empty.

Body, once loaded:

- Status chip (`caseStatusLabel`/`caseStatusChipClass`) + gravity dot (`gravityLabel`/
  `gravityDotClass`), reusing the exact helpers `CaseDetailScreen` uses today.
- Crime section (`crimeSubHeadName`), station, district.
- FIR date (`firDate`).
- Narrative, clamped to ~3 lines via CSS `-webkit-line-clamp` (no "read more" toggle — the full text
  is one click away via the Case Explorer link).
- Accused / victim / complainant counts, tallied client-side from `parties[]` grouped by `role`.
- Actions row: **"Focus on Case"** (`onFocus(caseId)` → `NetworkScreen` calls
  `setFocus({ mode: 'case', caseId })`, reusing `SubgraphParams.caseId`/`SubgraphFocus.'case'`, both of
  which already exist in `networkApi.ts` and just need a case reached via `subgraphParamsForFocus`) and
  **"Open in Case Explorer"** (`<Link to={`/case-explorer/${caseId}`}>`).

Error state: inline "Couldn't load case details" + retry (`.refetch()`), panel stays open — same
pattern as the rest of the screen's error handling.

### `LocationDetailPanel.tsx` (new, `src/screens/network/`)

Props: `{ node: GraphNodeResponse | null; nodes: GraphNodeResponse[]; edges: GraphEdgeResponse[];
onClose: () => void; onFocus: (locationId: number) => void }`.

No fetch — everything is derived from data the screen already has:

- Title: the node's `label`.
- Coordinates (`latitude`/`longitude`) as plain text, when present.
- Connected CASE/PERSON counts and a list of connected case labels, computed by filtering `edges` for
  `sourceId`/`targetId === node.id`, resolving the other endpoint against `nodes`, and grouping by
  `type`. Each listed case label links to `/case-explorer/${caseIdOfNode(caseNode)}`.
- Action: **"Focus on Location"** (`onFocus(locationId)` → `setFocus({ mode: 'location', locationId })`,
  same pattern as the case panel, using the existing `SubgraphFocus.'location'`/
  `SubgraphParams.locationId`).

**Known limitation, by design:** counts/lists only reflect what's in the *currently loaded* subgraph —
if the graph is showing a person-focused view that happens to include this location incidentally, the
panel can undercount. "Focus on Location" is the resolution path (it reloads the subgraph centered on
that location), not a bug to fix here.

### `subgraphParamsForFocus` (existing function, extended)

The underlying API types (`SubgraphFocus`, `SubgraphParams.caseId`/`locationId` in `networkApi.ts`)
already support `case`/`location` focus modes — only `NetworkScreen`'s local `NetworkFocus` union and
its `subgraphParamsForFocus` switch don't have arms for them yet. Both gain two new variants:

```ts
type NetworkFocus =
  | { mode: 'top-offenders' }
  | { mode: 'person'; personId: number }
  | { mode: 'community'; communityId: number }
  | { mode: 'path'; from: number; to: number }
  | { mode: 'case'; caseId: number }
  | { mode: 'location'; locationId: number };
```

with two corresponding arms added to `subgraphParamsForFocus`'s switch (returning
`{ focus: 'case', caseId }` / `{ focus: 'location', locationId }`), mirroring the existing four.

## Error handling

- Loading and error states for `CaseDetailPanel` follow the pattern above (skeleton via pre-filled
  header fields, inline retry on fetch failure).
- `LocationDetailPanel` has no loading/error state of its own — it can only be empty (no connected
  nodes found in the current subgraph), rendered as a plain "No connections in the current view" line
  rather than an error.
- Both panels' `onFocus` triggers a normal `useSubgraph` refetch through existing loading/error/empty
  handling already on `NetworkScreen` — no new error path needed there.

## Testing

- `NetworkScreen.test.tsx`: clicking a CASE node opens `CaseDetailPanel` (not the offender flow);
  clicking a LOCATION node opens `LocationDetailPanel`; clicking a PERSON node is unchanged; in path
  mode, CASE/LOCATION clicks are no-ops and PERSON clicks still register path endpoints; only one panel
  is ever open at a time (clicking node B while node A's panel is open replaces it).
- `CaseDetailPanel.test.tsx` (new): renders pre-filled header before `useCaseDetail` resolves; renders
  full body once loaded; error + retry state; "Focus on Case" and "Open in Case Explorer" fire the
  right callback/link.
- `LocationDetailPanel.test.tsx` (new): computes correct connected-case/person counts and list from a
  fixed nodes/edges fixture; empty state when no edges reference the node; "Focus on Location" fires
  the right callback.
- `networkApi.test.tsx`: add a case covering `subgraphParamsForFocus` (or its `NetworkFocus`-mapping
  equivalent) for the new `case`/`location` `NetworkFocus` variants.
