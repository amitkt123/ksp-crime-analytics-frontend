# Command Center restyle to match `command-center-dashboard` mockup

## Context

`command-center-dashboard/` (sibling folder, outside this repo) is an AI-Studio-generated
Tailwind + `lucide-react` prototype of a Command Center dashboard, built against static
mock data. It is not wired to any real API and is not part of this repo's build.

`src/screens/command-center/CommandCenterScreen.tsx` (and its supporting components) is
the real, data-wired Command Center screen in this app: it fetches live summary/KPI data,
district/station geo boundaries, alerts, and time-of-day buckets, and renders an
interactive MapLibre map with drill-down. It currently uses this app's existing plain-CSS
design system (`src/design-system/tokens.css`, `components.css` — CSS custom properties,
light/dark theming via `[data-theme]`, IBM Plex Sans/Space Grotesk/IBM Plex Mono fonts).

Goal: restyle the real screen (plus `MetricDetailScreen.tsx` and `CasePreviewPanel.tsx`,
its two closely related screens) so it visually matches the mockup as closely as possible,
**without** losing any real functionality or fabricating data the real API doesn't provide.

## Decisions (confirmed with user)

1. **Exact visual replica**, not just "similar layout with existing design system." This
   means adopting Tailwind CSS and `lucide-react` as new dependencies, scoped to these
   screens.
2. **Keep the real interactive MapLibre map** (live GeoJSON boundaries, station
   drill-down, live alerts) — do not replace it with the mockup's static hardcoded SVG
   Karnataka illustration. Only the map's surrounding chrome (card, legend, floating
   panel, time-of-day pill bar) is restyled.
3. **Scope includes** `CommandCenterScreen.tsx`, `MetricDetailScreen.tsx`, and
   `CasePreviewPanel.tsx` (the real equivalents of the mockup's dashboard, metric detail
   screen, and case modal).
4. **Add Tailwind + lucide-react** as dependencies, scoped so they don't affect the rest
   of the app.
5. **Keep dark mode.** The mockup has no dark variant; dark mode must keep working via
   the app's existing theme toggle.
6. **Keep the shared app shell** (left icon rail + top header, `App.tsx`/`Rail.tsx`) —
   it's used by every screen; restyling it is out of scope. Restructure only the content
   area inside it.
7. **Restructure the content area into the mockup's stacked layout**: a full-width row of
   4 metric cards, then a map+sidebar row below, replacing today's full-height two-pane
   split.
8. **Switch typography** in these three screens to the mockup's default sans stack
   (Tailwind's `font-sans`), diverging intentionally from the rest of the app's IBM Plex
   Sans/Space Grotesk branding elsewhere. Scoped to these screens only via a wrapping
   class — not a global font change.

## Architecture

### Dependencies

- `tailwindcss` (v4) + `@tailwindcss/vite` — added to `package.json`, wired into
  `vite.config.ts` as a Vite plugin.
- `lucide-react` — added to `package.json`, used for icons across the three screens
  (matching the specific icons the mockup uses: `Info`, `Bell`, `ShieldAlert`,
  `CheckCircle2`, `X`, `Calendar`, `Tag`, `MapPin`, `User`, `Search`, `Filter`,
  `ArrowLeft`, `ChevronDown`).

### Avoiding global regressions

Tailwind's preflight (base reset) is **not** imported — this app has a single global
stylesheet (`main.tsx` imports `fonts.css`, `tokens.css`, `components.css`, `login.css`
directly, no CSS modules), so importing full `tailwindcss` would silently restyle
`<button>`, `<h1>`, `<select>`, etc. on every other screen. Instead, a new
`src/design-system/tailwind-cc.css` imports only the theme + utilities layers:

```css
@import "tailwindcss/theme.css";
@import "tailwindcss/utilities.css";
```

This file also defines an `@theme` block that aliases Tailwind color/radius/shadow
utilities to the **existing CSS custom properties** rather than literal hex/gray values:

- `--color-surface` → `var(--panel)`, `--color-canvas` → `var(--canvas)`,
  `--color-border` → `var(--line)`, `--color-ink` → `var(--text)`,
  `--color-muted` → `var(--muted)`, `--color-accent` → `var(--real)`,
  `--color-danger` → `var(--alert)`, `--color-good` → `var(--status-good-ink)`,
  `--color-warn` → `var(--status-warning)`.

This works because the existing light-mode token values (`--panel #FFFFFF`,
`--canvas #F7F9FC`, `--line #D8DEEA`, `--text #14213A`, `--muted #5B6B8C`,
`--real #2a78d6`) are already visually close to the mockup's white/slate-100/gray-200/
gray-900/gray-500/blue-600 palette, so utilities like `bg-surface`/`text-ink`/
`border-border` render the mockup's look in light mode — and dark mode keeps working for
free via the existing `[data-theme="dark"]` token overrides, with no new dark palette to
invent.

A custom dark variant ties `dark:` utilities to the app's existing toggle instead of OS
preference:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

### Typography scoping

A wrapper class (e.g. `.cc-mockup-type`) applied at the root of each of the three screens
sets `font-family` to Tailwind's default sans stack, overriding the app-wide IBM Plex Sans
rule locally without changing it globally.

### Data — no fabrication

Every visual element must map to a real field already present in `commandCenterApi.ts`,
`geoApi.ts`, `alertsApi.ts`, or `caseApi.ts`. Two places where the mockup shows more than
the real API supports are explicitly **not** replicated:

- `MetricDetailScreen`: the mockup's "Solved vs Unsolved," "Average Resolution Time," and
  "Open Cases by Priority" cards have no backing fields in
  `CommandCenterSummaryResponse`. Not added.
- `CasePreviewPanel`: the mockup's quick status-update buttons (Open/Pending/Closed) have
  no corresponding mutation wired here. Not added.

## Layout restructuring

The shared `.shell` (rail + header) is untouched. Inside `CommandCenterScreen`, today's
`.main` (two fixed-height panes, each independently scrolling) becomes a single
scrollable page, matching the mockup's stacked structure.

### Top row — 4 metric cards (new `MetricCardRow` component)

| Card | Real data source |
|---|---|
| State Case Count | `summary.kpi.stateCaseCount` + `stateCaseCountDeltaPct` |
| Cases Resolved | `summary.kpi.resolvedPct` + `resolvedPctDeltaPts` |
| Arrests Logged | latest of `summary.arrestsWeekly` + delta + inline sparkline |
| State Case Volume | latest of `summary.stateCaseVolumeWeekly` + delta + inline sparkline |

Visual style matches the mockup's `MetricCard.tsx`: rounded card, uppercase eyebrow label,
big number, trend arrow, inline SVG sparkline for the two trend-based cards. The first two
stay clickable into `MetricDetailScreen` via the existing `onSelectMetric` callback,
unchanged behavior.

### Below — map (left) + sidebar (right)

- **Map card**: same `DistrictMap` (MapLibre, live boundaries, station drill-down, live
  alert markers) — only `.map-card`/`.map-breadcrumb` chrome and `TimeOfDaySelector`
  pill-bar styling change. Add a Low/Medium/High legend chip (bottom-right, mockup style)
  driven by the same real min/max case-count values already used in the existing
  choropleth `fill-color` interpolation — no new data.
- **"Top crime sub-head" card**: moves out of `KpiPanel`'s wide tile into its own sidebar
  card matching the mockup's "TOP CRIME SUB-HEAD" card, using the same
  `topCrimeSubHead`/`topCrimeSubHeadCount` fields.
- **Category mix**: `CategoryMixChart` switches from horizontal bars to a donut
  (`recharts` `PieChart`, already a dependency) + legend, matching the mockup visually.
  Same `categoryMix` data and the same fixed `CRIME_HEAD_SLOT` → `--cat-N` color mapping
  (the documented invariant that "Crimes Against Women" never lands on the green slot is
  preserved verbatim, including its comment).
- **Emerging alerts**: `AlertFeed` restyled with the mockup's bell-icon header and card
  treatment; existing click-to-expand `EvidencePanel` behavior unchanged.
- **Crimes-against-property weekly**: the mockup has no 5th metric-card slot for this real
  series. Kept as a small single restyled spark-card under the map — an intentional
  addition beyond the mockup, to avoid deleting real functionality.
- **Station drilldown list**: row/card visual treatment only; same data and behavior.
- **District-scoped mode** (district clicked): sidebar swaps to district KPI + district
  category mix exactly as today — unaffected by this restyle.

### MetricDetailScreen

Restyled to the mockup's `MetricDetailView` look: prominent back link/breadcrumb, large
headline metric card, styled trend line chart (`caseVolume` vs `arrests`, existing data),
restyled category-mix donut. No fabricated sub-metric cards (see Data section above).

### CasePreviewPanel

Restyled to the mockup's `CaseDetailModal` look: icon + title header, close button,
2-column fact grid (crime number, status, gravity, subhead/unit/date), narrative block,
party cards (existing PII-masking behavior via `PiiField` unchanged), "View full case"
action button (existing role-gated link, restyled). No fake status-update control (see
Data section above).

## Testing & rollout

- Preserve existing DOM roles/labels/test-ids across all touched files even as class names
  and markup shape change: `role="alert"`, `aria-current`, `aria-pressed`,
  `aria-label`, etc. Update assertions only where markup structure genuinely changes,
  never weaken them.
- Files with existing tests that must keep passing: `CommandCenterScreen.test.tsx`,
  `MetricDetailScreen.test.tsx` (via `MetricDetailScreen.test.tsx`), `CasePreviewPanel.test.tsx`,
  `AlertFeed.test.tsx`, `KpiPanel.test.tsx`, `CategoryMixChart.test.tsx`,
  `StationDrilldownList.test.tsx`, `TimeOfDaySelector.test.tsx`, `DistrictMap.test.tsx`,
  and `e2e/command-center.spec.ts`.
- New markup (the `MetricCardRow`, the category-mix donut) gets its own test coverage.
- Verification commands: `npm run lint` (oxlint), `npm run test` (vitest). Manual
  dev-server pass in both light and dark theme, covering: district → station drill-down,
  metric-card → `MetricDetailScreen` → back, and opening a case in `CasePreviewPanel`.

## Files touched

- `package.json`, `vite.config.ts` — new dependencies + Tailwind Vite plugin.
- `src/design-system/tailwind-cc.css` (new) — scoped Tailwind theme/utilities import,
  color aliasing, dark variant, typography wrapper class.
- `src/main.tsx` — import the new stylesheet.
- `src/screens/command-center/CommandCenterScreen.tsx` — layout restructuring.
- `src/screens/command-center/MetricCardRow.tsx` (new) — top 4-card row.
- `src/screens/command-center/KpiPanel.tsx` — restyle; drop the wide top-crime-subhead
  tile (moved to its own sidebar card).
- `src/screens/command-center/SparklineStrip.tsx` — restyle; reduced to the single
  remaining crimes-against-property series.
- `src/screens/command-center/CategoryMixChart.tsx` — bar → donut chart, restyled.
- `src/screens/command-center/AlertFeed.tsx` — restyle.
- `src/screens/command-center/TimeOfDaySelector.tsx` — restyle.
- `src/screens/command-center/StationDrilldownList.tsx` — restyle.
- `src/screens/command-center/DistrictMap.tsx` — chrome/legend restyle only; MapLibre
  logic unchanged.
- `src/screens/command-center/MetricDetailScreen.tsx` — restyle.
- `src/screens/command-center/CasePreviewPanel.tsx` — restyle.
- Corresponding `*.test.tsx` files — updated assertions where markup changes.
