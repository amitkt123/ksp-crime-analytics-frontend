# Insights (5-pillar analytics dashboard) design

## Problem

A design sample (`Karnataka_Police_FIR_Dashboard.html`, outside this repo) demonstrates a
pill-tabbed analytics dashboard with five sections — Overview, Crime Trends, Demographics,
Investigation Network, Judicial & Units — covering ~28 visualizations, built with raw D3.js against
synthetic data in a light navy/gold theme. The user wants this available to every role in the real
app, wired to real backend data wherever it exists, with the rest clearly marked as demo data until
the backend catches up.

Today's app has no equivalent: Command Center, Case Explorer, Network, and Sociological are each
role-restricted to a subset of the 7 roles (`ProtectedRoute allowedRoles`) and cover different ground
(map/KPIs, case list/detail, graph exploration, correlation/forecast).

## Backend reality check (verified against KSP-CORE-PLATFORM source)

Two of the five pillars have **no backend support at all**:

- **Demographics** — victim/accused/complainant gender, age, religion, caste, occupation exist only
  inside individual case records (`ComplainantResponse` etc.), never aggregated. No endpoint.
- **Judicial & Units** — no court-outcome or unit-performance table/endpoint exists.
  `ChargesheetDetails.cstype` is in the schema but unused/uncomputed
  (`docs/platform-status-and-next-steps.md`, core-platform repo, confirms both gaps explicitly).

The other three pillars are a mix of real and unbacked charts — see the per-visualization table
below.

### Role model (from `RbacScopeResolutionService`, `AppRole`, `DemoUserSeeder`)

7 role codes: `INVESTIGATOR`, `STATION_SUPERVISOR`, `DISTRICT_SUPERVISOR`, `SCRB_ANALYST`,
`POLICYMAKER`, `ADMIN`, `SUPER_ADMIN`.

| Role | Scope | `rawCaseAccess` | `canRevealPii` |
|---|---|---|---|
| INVESTIGATOR | own cases / own unit | true | true |
| STATION_SUPERVISOR | unit | true | true |
| DISTRICT_SUPERVISOR | district | true | true |
| SCRB_ANALYST | state | true | true |
| POLICYMAKER | state, aggregate-only | **false** | **false** |
| ADMIN | none (case data) — audit only | n/a | n/a |
| SUPER_ADMIN | state, demo bypass of FE role gates | true | true |

Aggregate endpoints already used by the real Command Center (`/api/command-center/summary`,
`/api/geo/districts*`) are pre-scoped server-side by the caller's role — the frontend doesn't
implement scoping itself, it just calls the same endpoints. `POLICYMAKER`'s `rawCaseAccess=false`
means `/api/cases` (raw case list) is refused outright, not masked — Command Center already codes
around this (`isPolicymaker` checks). `ADMIN` has no case-data scope per backend RBAC and today
never reaches Command Center/Sociological/Network at all; whether ADMIN is permitted to call the
*aggregate* endpoints is not verifiable from this repo — **flagged as an open question for the
backend team, not assumed**. Insights defaults ADMIN to the same aggregate-only treatment as
POLICYMAKER as the safe default.

## Goals

- New Rail nav item **"Insights"** → route `/insights`, reachable by **all 7 roles** (no
  `allowedRoles` restriction, a first for this app's routes).
- Five pill-tabs matching the sample: Overview, Crime Trends, Demographics, Investigation Network,
  Judicial & Units.
- Every visualization from the sample is present. Each one independently uses the real backend
  endpoint if the data genuinely matches, or a clearly-tagged synthetic value otherwise — see the
  per-visualization table below. This is a per-chart decision, not a per-pillar one: Overview and
  Crime Trends each mix live and demo charts.
- Existing Command Center, Case Explorer, Network, Sociological screens are untouched.
- Dark theme only, using the existing design tokens (`tokens.css`), Recharts where it fits, small
  custom SVG components (no new D3 dependency) for chart types Recharts doesn't support (chord/matrix
  heatmap).

## Non-goals

- No new backend endpoints. This is a frontend-only spec; Demographics and Judicial & Units stay
  100% synthetic until a backend spec adds the missing aggregations.
- No change to the RBAC/route restrictions on the 4 existing screens.
- No attempt to build a true chord diagram or force-directed layout for the "Crime Head ↔ Act"
  linkage — Recharts has no chord primitive, and pulling in D3 for one chart contradicts the chosen
  "Recharts + existing dark theme" direction. Rendered as grouped linkage bars instead, same
  information, demo data either way.
- No live cross-linking from Insights into Case Explorer/Network (out of scope for this pass).
- No Playwright e2e coverage, matching the precedent set by Case Explorer/Network specs (component +
  screen-level tests only).

## Per-visualization data source

`LIVE` = existing real endpoint, response already role-scoped server-side. `DEMO` = synthetic,
seeded, deterministic, rendered with a small "DEMO DATA" badge.

### Overview

| Chart | Source |
|---|---|
| Registrations vs Chargesheeted trend | DEMO — no chargesheet time series exists |
| Case Journey funnel (reg → investigation → outcome) | DEMO — no status-transition endpoint |
| Case Category Mix donut | **LIVE** — `commandCenterApi.getCommandCenterSummary().categoryMix` |
| Gravity of Offence donut | DEMO — gravity has no aggregate endpoint (only per-case) |
| Top Districts by Case Volume bar | **LIVE** — `geoApi.getDistrictSummaries` |
| Recent FIRs table | **LIVE** for INVESTIGATOR/STATION_SUPERVISOR (`caseApi.getCases` scoped to their own `unitId` from `/api/me`); **DEMO** for DISTRICT_SUPERVISOR/SCRB_ANALYST/POLICYMAKER/ADMIN/SUPER_ADMIN (no multi-unit or state-wide case-list endpoint exists) |

### Crime Trends

| Chart | Source |
|---|---|
| Crime Head Distribution bar | **LIVE** — categoryMix |
| Crime Head Trend by month (stacked area) | DEMO — only 3 fixed weekly series exist (total/property/arrests), not per-head |
| Cohort closure-velocity heatmap | DEMO — no cohort/lag data |
| District × Crime Head matrix | DEMO — would require ~30 extra district-detail calls to build live; noted as a cheap future upgrade, not built now |
| Incident Location Hotspots scatter | **LIVE** — reuses `geoApi` station incident points (same data `DistrictMap` already renders) |

### Demographics — all DEMO

Victim/Accused/Complainant gender donuts, Age histogram (victims vs accused), Religion bar, Caste
bar, Occupation bar, Victim Gender × Crime Head cross-tab table. No live equivalent exists for any
of these.

### Investigation Network

| Chart | Source |
|---|---|
| Crime Head ↔ Act linkage (bars, not chord) | DEMO — no act-association aggregate endpoint |
| Arrests vs Surrenders by month | DEMO — arrests only exist per-case, not aggregated by month/type |
| Top Repeat Offenders bar | **LIVE** — `networkApi.getRepeatOffenders` |
| First-time vs Repeat donut | **LIVE (derived)** — computed client-side from the repeat-offenders response |
| Investigating Officer Leaderboard table | DEMO — no officer-performance endpoint |

Independent of, and simpler than, the full `/network` graph-exploration screen (which stays
`SCRB_ANALYST`-only and unchanged) — this tab is available to all roles and only surfaces the two
charts that have real data.

### Judicial & Units — all DEMO

Court-wise Pending Cases bar, Final Report Outcome donut, District → Unit Case Load treemap,
Employee Rank Distribution bar, Unit Performance table. No live equivalent exists for any of these
(confirmed no judicial/unit-performance table or endpoint in core-platform).

## Frontend architecture

### Routing & access

New route in `App.tsx`:

```tsx
<Route path="/insights" element={<InsightsScreen />} />
```

No `ProtectedRoute` wrapper — every authenticated role reaches it (this is intentional and the first
route in the app without a role gate; call this out explicitly in the PR since it's a deviation from
every other route). New `Rail.tsx` entry: `{ path: '/insights', label: 'Insights' }`.

### `src/api/insightsApi.ts` (new)

No new real endpoints — this module composes existing hooks (`useCommandCenterSummary`,
`useDistrictSummaries`, `useRepeatOffenders`, `useCases`, `useMe`) for the LIVE charts. No new fetch
functions duplicate existing ones.

### `src/api/demoAnalyticsData.ts` (new)

Deterministic seeded generators (same `mulberry32`-style approach as the sample HTML, ported as a
small local PRNG utility — not a dependency) for every DEMO-tagged chart above. Seeded so numbers are
stable within a session (no reshuffling on every render) but not wired through `client.ts`'s
`ksp-mock` flag — these have no real endpoint to intercept, so they're just local data, always on,
regardless of mock mode. Grouped by pillar: `demographicsDemoData.ts`-equivalent exports live in this
one file (`getDemographicsDemo()`, `getJudicialUnitsDemo()`, `getOverviewDemoExtras()`,
`getCrimeTrendsDemoExtras()`, `getInvestigationNetworkDemoExtras()`), each returning plain data, no
React Query wrapper needed since there's no network call to cache.

### Components (`src/screens/insights/`)

- **`InsightsScreen.tsx`** — the `/insights` route. Owns pill-tab state (`useSearchParams`, so the
  active tab survives a refresh, matching `CommandCenterScreen`'s existing `?district=` pattern —
  here `?tab=overview|crime-trends|demographics|investigation-network|judicial-units`). Renders
  `<Header title="Insights">` + the active tab component. Reads `roles` from `useAuth()` and
  `unitId`/`districtId` from `useMe()` once, passes down what each tab needs.
- **`OverviewTab.tsx`**, **`CrimeTrendsTab.tsx`**, **`DemographicsTab.tsx`**,
  **`InvestigationNetworkTab.tsx`**, **`JudicialUnitsTab.tsx`** — one per pillar, each composing its
  charts per the table above.
- Shared chart primitives, new: **`DemoDataBadge.tsx`** (small chip, reuses the `--pii`
  amber styling already in `tokens.css`), **`HeatmapGrid.tsx`** (cohort velocity + district×crimehead
  matrix — plain SVG rects, color-scaled via a linear interpolation over `--real`), **`LinkageBars.tsx`**
  (crime-head↔act substitute for the chord diagram), **`Donut.tsx`** (generic donut, several charts
  reuse it), **`RankedBarList.tsx`** (generic horizontal bar, several charts reuse it — Top Districts,
  Top Repeat Offenders, Court-wise Pending, Employee Rank).
- Charts that map directly onto a Recharts primitive (trend line, stacked area, treemap, scatter) are
  built inline in their tab component rather than as separate files, matching how
  `SociologicalScreen`'s simpler charts are structured today (only genuinely reusable or complex
  pieces get their own file).

### PII / role handling inside tabs

- Any chart sourced from `caseApi.getCases`/`getCaseDetail` (Recent FIRs) is gated: rendered LIVE
  only when `roles` includes `INVESTIGATOR` or `STATION_SUPERVISOR` **and** `useMe()` has resolved a
  `unitId`; otherwise falls back to the DEMO variant with a note ("Recent FIRs isn't available
  state/district-wide yet — showing representative data") rather than silently showing nothing.
- `CaseSummaryResponse` (what `getCases` returns) never carries party names, so the LIVE Recent FIRs
  table has no PII to mask in the first place — no `PiiField`/reveal flow needed here, unlike Case
  Explorer.
- DEMO tables that *do* show names (IO Leaderboard, cross-tab) use the same masked-style formatting
  (`A**** K***`) as `PiiMasker` for POLICYMAKER/ADMIN, for visual consistency with how real PII looks
  elsewhere — even though the underlying data is synthetic, so there's nothing to actually protect.

## Error handling

- Each tab fetches its own LIVE queries independently (not one big waterfall for the whole screen);
  a slow/failed DEMO-only tab (Demographics, Judicial & Units) never blocks on network state since
  it has none.
- LIVE-chart queries follow the existing `isLoading`/`isError` + retry-button convention
  (`CommandCenterScreen`, `CaseExplorerScreen`).
- `useMe()` failing (can't resolve `unitId`) degrades Recent FIRs to its DEMO variant rather than
  erroring the whole Overview tab.

## Testing

- **`insightsApi.test.tsx`**: each composed hook returns the right shape for a fixed mock-mode
  response; the derived First-time-vs-Repeat donut computation gets a direct unit test against a
  known `RepeatOffenderResponse[]` fixture.
- **`demoAnalyticsData.test.ts`**: every generator is deterministic across repeated calls (same seed
  → same output) and produces internally-consistent totals (e.g. donut slices sum to the displayed
  total, heatmap cells are all in `[0,1]`).
- **`InsightsScreen.test.tsx`**: tab switching via `?tab=`, default tab on first load, `Header` title,
  no `ProtectedRoute` redirect for any of the 7 roles.
- **One `.test.tsx` per tab component**: renders all its charts from fixtures; LIVE charts show data
  from the mocked hook, DEMO charts show the `DemoDataBadge`; Overview's Recent FIRs specifically
  tested for both the INVESTIGATOR (LIVE) and SCRB_ANALYST (DEMO fallback) cases.
- **`DemoDataBadge.test.tsx`**, **`HeatmapGrid.test.tsx`**, **`LinkageBars.test.tsx`**: render from
  fixed fixtures, matching the granularity of existing shared-component tests
  (`ConfidenceChip.test.tsx`).
