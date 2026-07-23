# Insights Redesign — Nav Fix, Navy/Gold Theme, Lightbox, Sankey/Chord, Crime Number Fix

## Context

The `/insights` dashboard (shipped 2026-07-23, see `docs/superpowers/plans/2026-07-23-insights-analytics-dashboard.md`) doesn't match the user's expectations, benchmarked against a reference static prototype at `C:\CrimeBureau\Karnataka_Police_FIR_Dashboard.html` (light navy/gold theme, D3-based, single persistent top tab-nav, Sankey + chord diagrams). This spec covers five independent fixes/additions to reconcile the two, all scoped to `ksp-crime-analytics-frontend`.

## 1. Left rail nav bug fix

**Root cause**: `src/app/Rail.tsx` renders each nav item as an icon-only 40×40 button with no `<svg>` icon supplied (despite CSS expecting one). The label (`.rail-tip` in `src/design-system/components.css`) is `opacity: 0` by default and only becomes visible on `:hover`/`:focus-visible` as a floating tooltip — it is never rendered as inline text. Combined, the rail renders as a column of blank rounded squares.

**Fix**: Convert the rail from an icon-only 60px column into a labeled sidebar (~200px wide):
- `.shell` grid template widens its first column from `60px` to `200px`.
- `.rail-item` becomes a horizontal flex row (icon + label), not a `place-items: center` square.
- `.rail-tip` becomes a normal inline `<span>` with `opacity: 1` always — remove the hover-reveal behavior entirely.
- Each `NAV_ITEMS` entry in `Rail.tsx` gets a small inline SVG icon (simple line icons, one per section — Command Center, Insights, Case Explorer, Network, Sociological, Admin) sized 18–20px, since none exist today.
- Active route gets a highlighted background/left-border in the new navy/gold palette.

## 2. Navy/gold theme, app-wide

Remap `src/design-system/tokens.css`'s **light theme** (`:root`) to the reference palette; this is the default and only theme going forward for this redesign (dark-mode variant remains selectable via the existing toggle but is out of scope for repalette — leave `[data-theme="dark"]` as-is unless it visibly clashes with the new light tokens elsewhere).

| Token | Old | New |
|---|---|---|
| `--canvas` | `#F7F9FC` | `#eef1f6` |
| `--panel` | `#FFFFFF` | `#ffffff` (unchanged) |
| `--line` | `#D8DEEA` | `#e3e8ef` |
| `--text` | `#14213A` | `#1c2b3a` |
| `--muted` | `#5B6B8C` | `#647184` |
| `--real` (primary accent) | `#2a78d6` | `#123a63` (navy2) |
| `--predicted` (secondary accent) | `#7C4DCC` | `#d4a017` (gold) |
| `--alert` | `#D6323B` | `#c0392b` |
| `--pii` | `#B9770E` | `#d4a017` (gold, unify with predicted) |
| category palette `--cat-1..5` | green/pink/amber/teal/orange | reuse reference `COLORS` array: `#123a63,#d4a017,#c0392b,#1e8a5f,#6c5ce7,#e67e22,#2b8fd1,#a06cd5` (cycle as needed) |
| `--status-good-ink` | `#0ca30c` | `#1e8a5f` |
| `--status-warning` | `#eda100` | `#e67e22` (amber, distinct from gold accent) |

No component beyond CSS variables + the specific hardcoded hex values found in `InsightCard.tsx`/tab components (if any) needs to change — the design system is token-driven.

## 3. Consistent persistent top header

Add a shared header bar rendered by the existing per-screen `Header.tsx` (or a new common wrapper it delegates to) with the same structural chrome on every authenticated screen:
- App/title block (left): section name + one-line description, `Space Grotesk` heading font, navy text.
- Role/user badge (right): current role (e.g. "SCRB Analyst"), matching the reference's `.meta` corner text style.
- Background: navy gradient (`linear-gradient(120deg, #0b2340 0%, #123a63 100%)`), white text — matches reference `header.top`.

This header is a distinct concern from the left rail: rail = switch section, header = persistent per-login chrome. It appears identically shaped on Command Center, Insights, Case Explorer, Network, Sociological, and Admin — only the title/description text and any page-specific KPI strip underneath vary.

Within `/insights` specifically (`InsightsScreen.tsx`), the existing 5 pillar tabs (Overview / Crime Trends / Demographics / Investigation Network / Judicial & Units — labels already correct) are restyled from generic pill buttons to the reference's `nav.tabs` look: white bar, pill buttons, active state filled navy with white text, sticky under the header.

## 4. Chart tile lightbox

Add an expand affordance to `InsightCard.tsx`:
- Small expand icon button in the card header (top-right, next to the existing "demo data" badge).
- Clicking opens a modal (new `ChartLightbox.tsx`, following the existing modal pattern in `src/design-system/EvidencePanel.tsx` — same overlay/dialog/focus-trap approach, not a new pattern) containing:
  - The same chart component, rendered larger (e.g. 2x the tile's dimensions / full modal width).
  - A sortable data table below it, listing the underlying data points that feed the chart (reuse the existing sortable-table pattern already used for "Recent FIRs" and "Investigating Officer Leaderboard").
  - An X close button top-right, plus Escape-to-close and overlay-click-to-close (matching `EvidencePanel` conventions).
- Each tab's chart-rendering call sites pass both the chart's render props and its tabular data array to `InsightCard`, so the card can hand both to the lightbox without every chart component needing its own modal logic.

## 5. Sankey + Chord diagrams

Neither exists today. `InvestigationNetworkTab.tsx` currently uses `RankedBarList` as an explicit stand-in (comment: "Rendered as ranked linkage bars, not a chord diagram") and `OverviewTab.tsx`'s case-journey visualization also uses `RankedBarList`.

**Dependencies to add** (small, layout-only, no DOM-manipulation style): `d3-sankey`, `d3-chord`, `d3-shape`, `d3-scale`. These compute layout geometry (node/link positions, arc/ribbon path strings) only — rendering stays declarative React SVG, consistent with how `Donut.tsx`/`HeatmapGrid.tsx` already hand-roll SVG without an imperative D3-DOM approach.

- **Sankey** (`SankeyChart.tsx`, new): replaces the Overview tab's "Case Journey — Registration to Final Outcome" `RankedBarList`. Nodes: Registered → {Under Investigation} → {Charge Sheeted, Closed - False Case, Undetected}. Demo data derived from the existing `CASES`/`CHARGESHEETS`-shaped demo dataset in `demoAnalyticsData.ts` (case status counts by transition), not new invented data.
- **Chord** (`ChordDiagram.tsx`, new): replaces Investigation Network's "Crime Head ↔ Act Linkage" `RankedBarList`. Matrix: crime head × legal act, weighted by association count — derived from the existing `ACT_ASSOC`-shaped demo relationship already described in the reference prototype's data generator (crime head → act weights).
- Both get tooltips (hover shows flow value) and both plug into the lightbox (§4) as their "data table" is the flat edge list (source, target, value).

## 6. Crime Number format fix (frontend demo data)

Current demo/mock data uses three different, mutually inconsistent formats (`FIR26051201`, `FIR-2026-KA-17600`, `101/2026/5/238`) — none match the ER doc's structured 18-character format: 1-digit CaseCategoryCode + 4-digit DistrictID + 4-digit PoliceStationID + 4-digit Year + 5-digit RunningSerialNumber.

- New shared utility `src/utils/crimeNumber.ts`:
  ```ts
  export const CASE_CATEGORY_CODES = { FIR: 1, UDR: 3, PAR: 4, ZERO_FIR: 8 } as const;
  export function formatCrimeNo(categoryCode: number, districtId: number, unitId: number, year: number, serial: number): string;
  export function formatCaseNo(year: number, serial: number): string; // last 9 digits per ER doc
  ```
- `demoAnalyticsData.ts`, `mockData.ts`, and the two test fixtures (`CaseDetailScreen.test.tsx`, `CaseList.test.tsx`) are updated to generate/display crime numbers via this utility instead of ad-hoc string templates.
- **NCR is dropped** from `CASE_CATEGORIES` in demo data — it isn't a category defined in the ER doc's `CaseCategory` table or its Crime Number examples, so keeping it would require inventing an undocumented category code.
- The two divergent field names (`crimeNumber` in `caseApi.ts`/demo/mock data vs. `crimeNo` in `geoApi.ts`/`sociologicalApi.ts`) are **not** renamed/unified (out of scope, would touch many call sites for no functional gain) — both are updated to produce values via the same `formatCrimeNo` utility so their *content* is consistent even though the field names differ.

## 7. ER doc gap: Case Category Code table

`docs/Police_FIR_ER_Diagram.md` states the category codes only as prose inside the CrimeNo column description (FIR=1, UDR=3, Zero FIR=8, PAR=4) and its `CaseCategory` table has no code column at all. Add a new small reference table directly under the CaseCategory section:

| Category | Code (leading digit of CrimeNo) |
|---|---|
| FIR | 1 |
| UDR | 3 |
| PAR | 4 |
| Zero FIR | 8 |

This is documentation-only (matches the backend's actual seed data, see the companion backend spec) — no other ER doc content changes.

## Out of scope

- Backend/Postgres schema changes (`KSP-CORE-PLATFORM`) — covered by a separate spec: `docs/superpowers/specs/2026-07-23-crime-no-transition-design.md` in that repo.
- Dark theme repalette (left as-is).
- Renaming `crimeNumber`/`crimeNo` to a single field name.
