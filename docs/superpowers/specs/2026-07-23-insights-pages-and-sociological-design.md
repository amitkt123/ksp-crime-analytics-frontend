# Insights → Standalone Pages, Layout Overhaul, and Sociological Enhancements

## Context

Follow-up to the 2026-07-23 Insights redesign. The user wants: the single `/insights` tab-pill page split into five standalone, left-nav-navigable pages; substantial per-page layout changes (full-width charts, mixed-width rows); several new features (real-map hotspots, PII reveal cards with avatars, expanded demographic/officer data); and Sociological page chart enlargement with a "how to read this" tooltip + zoom. The Sev-1 rail/RBAC bug and the all-India state/district backend seed (separate spec) are already done.

## 1. Routing: five standalone pages replacing the tab-pill Insights page

`InsightsScreen.tsx` (the `?tab=` pill switcher) is deleted. Its five tab components (`OverviewTab.tsx`, `CrimeTrendsTab.tsx`, `DemographicsTab.tsx`, `InvestigationNetworkTab.tsx`, `JudicialUnitsTab.tsx` — already existing, already the right content) each get a thin wrapper screen (`OverviewScreen.tsx`, etc., in the same `src/screens/insights/` directory — no file relocation) that renders `<Header title="...">` + the tab component, exactly matching the existing `SociologicalScreen.tsx`/`NetworkScreen.tsx` pattern (a plain screen, no internal tab nav).

Five new top-level routes replace `/insights`: `/overview`, `/crime-trends`, `/demographics`, `/investigation-network`, `/judicial-units`. `/insights` itself redirects to `/overview` (`<Navigate to="/overview" replace />`) so old bookmarks/links don't 404. All five keep the exact same `allowedRoles` list `/insights` had (`INVESTIGATOR, STATION_SUPERVISOR, DISTRICT_SUPERVISOR, SCRB_ANALYST, POLICYMAKER, ADMIN, SUPER_ADMIN`) — added as five new keys in `ROUTE_ALLOWED_ROLES` (`src/auth/roleRouting.ts`), which `Rail` already filters through automatically (no separate rail-visibility logic needed, per the Sev-1 fix).

`Rail.tsx`'s single "Insights" entry is replaced with five entries (icons: reuse the existing `ChartIcon` for Overview, new small icons for the other four — simple, consistent line-icon style matching the existing five), labeled to match the former tab labels exactly: "Overview", "Crime Trends", "Demographics", "Investigation Network", "Judicial & Units". Note "Investigation Network" (this new page) is a distinct concept from the existing "Network / Link Analysis" (`/network`, graph-based case linkage) — both remain in the rail with their current distinct labels; no renaming, since the user specifically referenced the existing tab name.

`InsightsScreen.test.tsx` (tests tab-switching, which no longer exists) is deleted; each new `*Screen.tsx` gets a minimal test confirming the `Header` title and that its tab content renders — mirroring `SociologicalScreen`-style screen tests already in the codebase.

## 2. Overview page (`OverviewScreen` / `OverviewTab.tsx`)

Current: one flat `.insight-grid` holding all 6 cards. New: split into explicit row groups using two new CSS grid variants (`.insight-grid` already gives a natural full-width single-card row when it contains one child; two new classes handle fixed multi-column rows):
```css
.insight-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 900px) { .insight-grid-3 { grid-template-columns: 1fr; } }
```
- Row 1 (`.insight-grid`, one card): Registrations vs Chargesheeted — full width.
- Row 2 (`.insight-grid`, one card): Case Journey (Sankey) — full width. **Link color changes from source-node color to target/receiving-node color** (`SankeyChart.tsx` currently colors each link by `sourceIndex`; flip to `targetIndex`, i.e. `NODE_COLORS[targetIndex % NODE_COLORS.length]`, using `link.target`'s resolved index the same way `link.source`'s is resolved today).
- Row 3 (`.insight-grid-3`, 3 cards): Case Category Mix, Gravity of Offence, Top Districts by Case Volume.
- Row 4 (`.insight-grid`, one card): Recent FIRs table — full width, with two added columns, **Gravity** and **Status**, reusing the exact existing helpers from `src/api/caseApi.ts` (`gravityDotClass`, `gravityLabel`, `caseStatusChipClass`, `caseStatusLabel` — already used identically in `CaseList.tsx`, so the new columns render with the same dot/pill styling used everywhere else in the app, no new CSS). The existing "Registered" column already is the date column (`firDate`); no separate "Date" column is added since it would duplicate it — `Registered` is effectively renamed in header text to **Date** for clarity, per the request.

## 3. Crime Trends page (`CrimeTrendsScreen` / `CrimeTrendsTab.tsx`)

- Row 1 (`.insight-grid-2`, new class: `grid-template-columns: repeat(2, 1fr)`, same media-collapse pattern as `.insight-grid-3`): Crime Head Distribution, Crime Head Trend by Month.
- Row 2 (`.insight-grid`, one card): Cohort Analysis — Case Closure Velocity — full width (unchanged content, just its own row).
- Row 3 (`.insight-grid`, one card): District × Crime Head Hotspot Matrix — full width, **expanded to all 30 Karnataka districts × all 5 demo crime heads** (currently 8 districts × 5 heads), plus a **district filter** `<select>` (reusing the existing `.filter-field`-style dropdown pattern) that narrows the matrix to one district or "All districts" (default). `getDistrictCrimeHeadMatrix()` in `demoAnalyticsData.ts` is rewired to iterate `MOCK_DISTRICTS`-equivalent full 30-district weights (a new `ALL_DISTRICTS_DEMO` list mirroring `mockData.ts`'s 30-district case-count weights) instead of the current hardcoded 8-district `TOP_DISTRICTS_DEMO`.
- **Incident Location Hotspots — fixed to render on an actual Karnataka map.** New component `KarnatakaHotspotMap.tsx` (MapLibre GL, no basemap tiles — same "why MapLibre" reasoning as `DistrictMap.tsx`), rendering `public/data/karnataka-districts.geojson` as a light choropleth-free outline (`fill-color` a flat neutral, `line-color` navy border) for geographic context, then plotting each hotspot as a `circle` layer at its real `[lon, lat]`, sized by `caseCount` (live) or a fixed radius (demo, since the demo dataset has no count field today — add one), colored by `crimeHead` via the same category color cycling `Donut`/other charts already use. This replaces the current plain Recharts `ScatterChart` (which plots raw lon/lat on linear axes with no geographic projection or district context — confirmed broken/misleading, not just cosmetically off).

## 4. Demographics page (`DemographicsScreen` / `DemographicsTab.tsx`)

- **Female → pink.** `Donut.tsx` gets a new optional prop `colorForLabel?: (label: string) => string`; when provided, it's checked before falling back to the existing `SLOT_COLORS` index-cycling. `DemographicsTab.tsx`'s three gender donuts (Victim/Accused/Complainant Gender) all pass `colorForLabel={(label) => (label === 'Female' ? '#e8608f' : undefined)}`-style logic (exact pink shade `#e8608f`, a distinct rose/pink not reused elsewhere in the palette) — other labels (`Male`, `Third Gender`) still fall through to the existing index-based `SLOT_COLORS`.
- Row 2 (`.insight-grid`, one card): Age Distribution — Victims vs Accused — full width (unchanged content).
- Row 3 (`.insight-grid-3`): Complainant Religion, Complainant Caste Category, Complainant Occupation (unchanged content, just regrouped into their own row).
- Row 4 (`.insight-grid-3`, **new**): Accused Religion, Accused Caste Category, Accused Occupation. **New demo-data functions** `getAccusedReligionDemo()`, `getAccusedCasteDemo()`, `getAccusedOccupationDemo()` added to `demoAnalyticsData.ts` — mirroring the existing complainant versions' shape (`LabeledCount[]`) with different (still plausible, still summing sensibly) synthetic counts, since accused demographics don't currently exist anywhere in demo data.
- Row 5 (`.insight-grid`, one card): Victim Gender × Crime Head Cross-tab — full width (unchanged content, already full-width-shaped, just its own explicit row now).

## 5. Investigation Network page (`InvestigationNetworkScreen` / `InvestigationNetworkTab.tsx`)

- Row 1 (`.insight-grid`, one card): Crime Head ↔ Act Linkage (chord diagram) — full width.
- Row 2 (`.insight-grid`, one card): Arrests vs Surrenders by Month — **converted from Bar to Area chart** (swap Recharts `<BarChart><Bar>` for `<AreaChart><Area>`, stacked, matching the existing `AreaChart` usage/styling already in `CrimeTrendsTab.tsx`'s Crime Head Trend by Month) — full width.
- Row 3 (`.insight-grid-2`): Top Repeat Offenders, Accused: First-time vs Repeat — 50/50.
- **PII reveal card, offenders.** Repeat-offender names are currently pre-masked strings (`'M**** K****'`) with no real name behind them at all. `getRepeatOffendersDemo()` gains a `realName` field (a real-looking synthesized name) and additional demo fields for the reveal card: `age`, `gender`, `topCrimeHead`. Clicking a masked name opens a new **`PersonRevealModal`** component (a small centered modal, same visual pattern as `EvidencePanel`'s `variant="modal"`/the new `ChartLightbox` — dialog + scrim + Escape/click-outside close) showing an **initials avatar** (colored circle, same visual language as `Header.tsx`'s existing `.role-avatar`, not a real/fake photo — per your confirmed decision), the revealed real name, and the extra fields as labeled rows.
- **Investigating Officer Leaderboard — full width, expanded columns, PII reveal.** New columns: **Officer, Rank, Unit, District, Cases Handled, Arrests, Chargesheet Rate, Avg Days to CS** (current: Officer, Unit, Cases, Chargesheet rate, Avg. days — missing Rank/District/Arrests). `IoLeaderboardRow` gains `rank: string`, `district: string`, `arrests: number` fields (8 existing demo rows updated with plausible values — `district` derived from each row's existing `unit` station name via a small station→district lookup consistent with `DISTRICT_UNITS_DEMO`-style groupings). Officer name becomes masked (`'R**** K****'`-style, matching the existing repeat-offender masking convention) with the same `PersonRevealModal` click-to-reveal pattern (avatar + real name + rank/unit/district context), reusing the same component built for offenders (one shared `PersonRevealModal`, not two separate components).

## 6. Judicial & Units page (`JudicialUnitsScreen` / `JudicialUnitsTab.tsx`)

- Row 1 (`.insight-grid-2`): Court-wise Pending Cases, Final Report Outcome — 50/50.
- Row 2 (`.insight-grid`, one card): District → Unit Case Load (Treemap) — full width, **expanded to all 30 Karnataka districts** (currently 5). `DISTRICT_UNITS_DEMO`/`DISTRICT_WEIGHTS_DEMO` in `demoAnalyticsData.ts` are rewired to cover all 30 districts — unit names for the 25 newly-added districts are generated formulaically (`"{District} Town PS"`, `"{District} Rural PS"`, 2-3 per district), matching the existing synthetic-data convention already used for this exact purpose in the reference prototype (`Karnataka_Police_FIR_Dashboard.html`'s own generator does the same `d.name+" "+(i===0?"Town":"Rural"+i)+" PS"` pattern) rather than hand-inventing ~75 realistic station names.
- Row 3 (`.insight-grid-2`): Employee Rank Distribution, Unit Performance — 50/50.

## 7. Sociological page (`SociologicalScreen.tsx`)

The four correlation scatter plots (Literacy rate, Unemployment rate, Urbanization rate, Per-capita income — `CorrelationScatterChart.tsx`'s `correlation-grid`, currently a 2×2 small-multiples grid nested in the left `map-pane`) become **full-width, stacked** (one per row) instead of 2×2. Each gets:
- An **info-tooltip** (new small reusable `InfoTip` component — an info-icon button that shows a short "how to read this chart" popover on hover/click; no such component exists today, built from scratch) explaining the scatter plot's axes/correlation meaning.
- A **zoom** affordance reusing the exact `ChartLightbox` component already built for Insights (same expand-icon-in-card-header pattern, same enlarged-chart-plus-data-table modal) — `IndicatorScatterPlot` (inside `CorrelationScatterChart.tsx`) gets wrapped so each of the four plots can expand individually.
- The **Predictive risk panel stays completely untouched** — `RiskForecastChart`/`AnomalyList` in the right `side-pane` are not touched by this change; only the left `map-pane`'s scatter-grid layout changes from 2×2 to stacked full-width. The `IndicatorChoroplethMap` above the scatter grid is also untouched.

## New shared pieces introduced

- `.insight-grid-2` / `.insight-grid-3` CSS classes (fixed 2/3-column grids, collapsing to 1 column under 900px) — `components.css`.
- `Donut`'s `colorForLabel` prop — opt-in, backward compatible (existing callers passing nothing keep today's index-cycling behavior).
- `KarnatakaHotspotMap.tsx` — new MapLibre component, Crime Trends only.
- `PersonRevealModal.tsx` — new modal component, shared by Investigation Network's offenders and IO leaderboard.
- `InfoTip.tsx` — new info-icon/popover component, Sociological only (generic enough to reuse elsewhere later, not required now).

## Out of scope

- Any change to `/network` (Network / Link Analysis) — unrelated screen, not touched.
- Any change to `IndicatorChoroplethMap`/`RiskForecastChart`/`AnomalyList` beyond the scatter-grid layout shift.
- Real photos for PII reveal cards (confirmed: initials avatar only).
- Backend changes (this spec is 100% frontend; the CrimeNo/transition-table backend spec from earlier and the state/district seed are separate, already-delivered/independent efforts).
