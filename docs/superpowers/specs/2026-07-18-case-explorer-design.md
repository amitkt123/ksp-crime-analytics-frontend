# Case Explorer screen design

## Problem

`/case-explorer` is the default landing route for `INVESTIGATOR` and `STATION_SUPERVISOR` (see `roleRouting.ts`), but it currently renders only `ScreenPlaceholder`. Those two roles have no working screen at all — every other role (`DISTRICT_SUPERVISOR`, `SCRB_ANALYST`, `POLICYMAKER` via Command Center; `ADMIN` via Admin/Audit) has one. Case Explorer needs to be the individual-case (FIR-level) worklist analogous to what Command Center is for district-level aggregates.

## Goals

- A station-scoped, filterable, searchable list of individual cases for Investigator and Station Supervisor.
- A case detail page showing facts, victim/accused parties (PII-masked by default, revealable — reusing `PiiField`), and a status timeline.
- Fully populated in mock/demo mode, consistent with this app's existing "render fully populated without a backend" design intent.
- Follows established conventions in this codebase (API module shape, list/row markup, loading/error/empty states) rather than inventing new ones.

## Non-goals

- No status updates, notes, or investigating-officer reassignment — this spec is read-only viewing. Case actions are a later iteration.
- No per-investigator case assignment. Both roles see the same station-scoped case pool; they differ only in future permitted actions, not in what they can see.
- No Playwright e2e coverage. The only existing golden path (`e2e/command-center.spec.ts`) covers login → Command Center; a Case Explorer e2e flow is a reasonable follow-up but not required to ship this screen.
- No new modal/overlay primitive — detail is a dedicated route, not a panel or dialog.
- No changes to `CATEGORY_MIX`/`CRIME_HEAD_SLOT` or Command Center's existing crime taxonomy beyond adding the new `CASE_CRIME_TYPES` list described below.

## Architecture

### 1. Station identity on the logged-in user

The auth model currently has no concept of "which station am I in" — `LoginResponse` has only `token`/`roles`, and `MeResponse` (`src/api/meApi.ts`) has `unit: string | null` (free text, e.g. "State Crime Records Bureau") but no station id.

Add `unitId: number | null` to `MeResponse`. In mock mode, give the Investigator/Station Supervisor demo personas a real `unitId` pulled from `STATIONS_BY_DISTRICT` (the same real KGIS roster already used for stations/alerts), and `null` for personas without a station (e.g. the existing SCRB Analyst demo user). `CaseExplorerScreen` reads `unitId` via the existing `useMe(token)` hook to scope its case query — no new auth plumbing required.

### 2. Routing

Two new sibling routes in `App.tsx`, replacing the `/case-explorer` placeholder, both under the existing `ProtectedRoute allowedRoles={['INVESTIGATOR','STATION_SUPERVISOR']}`:

```
/case-explorer            -> CaseExplorerScreen   (list + filters)
/case-explorer/:caseId    -> CaseDetailScreen      (facts, parties, timeline)
```

This mirrors the flat top-level route style already used for `/command-center`, `/network`, etc. — no nested `<Routes>` needed.

### 3. `caseApi.ts` (new)

Same shape as `geoApi.ts`/`alertsApi.ts` — interfaces, fetch functions, React Query hooks:

```ts
export type CaseStatus = 'registered' | 'under_investigation' | 'closed';

export interface CaseSummaryResponse {
  caseId: number;
  caseNumber: string;        // FIR number, e.g. "0142/2026"
  unitId: number;
  unitName: string;
  crimeSubHeadId: number;
  crimeSubHeadName: string;
  status: CaseStatus;
  firDate: string;           // ISO date
}

export interface CasePartyResponse {
  role: 'victim' | 'accused';
  name: { masked: string; real: string };
  phone: { masked: string; real: string };
  address: { masked: string; real: string };
}

export interface CaseTimelineEntryResponse {
  status: CaseStatus;
  timestamp: string;
  note: string;
}

export interface CaseDetailResponse extends CaseSummaryResponse {
  narrative: string;
  parties: CasePartyResponse[];
  timeline: CaseTimelineEntryResponse[];
}

export interface CaseFilters {
  status?: CaseStatus;
  crimeSubHeadId?: number;
  q?: string;
}

export function getCases(token: string | null, unitId: number, filters: CaseFilters): Promise<CaseSummaryResponse[]>;
export function useCases(token: string | null, unitId: number | null, filters: CaseFilters);
export function getCaseDetail(token: string | null, caseId: number): Promise<CaseDetailResponse>;
export function useCaseDetail(token: string | null, caseId: number | null);

// Shared label so list chip, detail chip, and timeline entries can't drift in wording.
export function caseStatusLabel(status: CaseStatus): string;
```

`GET /api/cases?unitId=&status=&crimeSubHeadId=&q=` and `GET /api/cases/:caseId`. The party `masked`/`real` pair shape matches `PiiField`'s props exactly, so the detail screen passes a party's `name`/`phone`/`address` straight into `<PiiField masked={...} real={...} />` with no adapter.

### 4. Mock data (`mockData.ts`)

- A small fixed `CASE_CRIME_TYPES` taxonomy (~6 entries: `crimeSubHeadId`, `crimeSubHeadName`, `crimeHeadId`), added alongside the existing ad hoc crime-subhead usage in `MOCK_ALERTS`.
- A deterministic per-station case generator, in the style of `mockStations()`/`timeOfDayShares()`: for a given `unitId`, always produces the same N case records (varying status/crime type/FIR date by index) — no `Math.random()`, so results and tests stay stable across runs.
- `getMockResponse` gains two new route matches: `/api/cases` (applies `unitId`/`status`/`crimeSubHeadId`/`q` filtering — `q` matches case number or a party's `real` name) and `/api/cases/:caseId`.

### 5. Components (`src/screens/case-explorer/`)

- **`CaseExplorerScreen.tsx`** — the `/case-explorer` route. `useMe(token)` for `unitId`; `useCases(token, unitId, filters)` for the list, with `filters` in local `useState` (status `<select>`, crime type `<select>`, free-text `<input>`). Renders `<Header title="Case Explorer">`, the filter bar, and `<CaseList>`.
- **`CaseList.tsx`** — presentational, following `StationDrilldownList`'s existing list convention: `<ul className="case-list"><li className="case-list-row">`, each row a `<Link to={`/case-explorer/${caseId}`}>` showing case number (`mono`), crime sub-head, a status chip, and FIR date.
- **`CaseDetailScreen.tsx`** — the `/case-explorer/:caseId` route. Reads `caseId` via `useParams`, calls `useCaseDetail`. Breadcrumb back-link to `/case-explorer` (same `breadcrumb-back` style as `StationDrilldownList`). Facts block (case number, status chip, crime sub-head, FIR date, narrative). Parties block (one card per party: role badge + `PiiField` for name/phone/address). Timeline block: plain `<ul>`, oldest first, no new design-system component.

## Error handling

Follows `CommandCenterScreen`'s existing pattern exactly:

- **`CaseExplorerScreen`**: `isLoading = meQuery.isLoading || casesQuery.isLoading` renders a skeleton (empty `case-list-row` placeholders, same idea as the `kpi-tile` skeleton). `isError` renders the existing `role="alert"` message + retry button pattern, calling `.refetch()` on whichever query failed. An empty result set (filters match nothing, or the station has no cases) renders `<p>No cases match these filters.</p>`, matching `StationDrilldownList`'s `"No stations with cases in this district."` empty state.
- **`CaseDetailScreen`**: `isLoading` → `<p>Loading case…</p>` (matches the existing inline-loading convention, e.g. `"Loading district details…"`). `isError` → same alert + retry pattern. An unknown/invalid `:caseId` (query resolves to no record) shows `"Case not found"` with a link back to `/case-explorer`, rather than a generic retry.

## Testing

- **`caseApi.test.ts`**: `getCases`/`useCases`/`getCaseDetail`/`useCaseDetail`, same shape as `geoApi.test.tsx`.
- **`mockData.test.ts` additions**: case generator is deterministic per `unitId`; `/api/cases` mock correctly applies `status`/`crimeSubHeadId`/`q` filtering; `/api/cases/:caseId` returns the matching record.
- **`CaseExplorerScreen.test.tsx`**: list renders from mock data; each filter narrows the rendered rows; loading skeleton, error+retry, and empty-list states each render; a row's link points at the right `/case-explorer/:caseId`.
- **`CaseList.test.tsx`**: pure presentational — given case summaries, rows render the right fields and `href`s.
- **`CaseDetailScreen.test.tsx`**: facts/status chip/narrative render; parties render through `PiiField` masked by default; timeline entries render in order; back link goes to `/case-explorer`; unknown `:caseId` shows "Case not found" with a link back.
