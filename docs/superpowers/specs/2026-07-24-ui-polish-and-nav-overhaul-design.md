# UI Polish (Treemap, InfoTip, Chord, Contrast) + Top-Pill Nav & Fixed KPI Section

## Context

Follow-up fixes to the Insights redesign, based on screenshots the user supplied: (1) a colorful reference treemap image, (2) a screenshot showing the Sociological InfoTip popover clipped off-screen, (3) the reference HTML's header+KPI-strip. Plus a full navigation overhaul: replace the left icon rail with a top pill nav (matching the reference `nav.tabs`), and add the reference's persistent header+KPI-strip to every page.

## 1. InfoTip popover clipping (Sociological page)

`InfoTip.tsx`'s popover is `position: absolute; left: 0` relative to its trigger button. Since `InfoTip` sits inside `.indicator-scatter-row-head`, which is `justify-content: flex-end` (pinning the button near the right edge of its card), a `left: 0`-anchored 220px-wide popover extends further right and gets clipped by the viewport/card edge — exactly what the screenshot shows (text cut off mid-sentence). Fix: anchor the popover to the right of the button instead (`right: 0; left: auto`), so it opens leftward/inward, staying within the card.

## 2. Judicial & Units treemap — rebuild as a real hierarchical treemap

The current `<Treemap>` (Recharts) renders flat, low-contrast cells with poor label legibility — nothing like the reference image's clearly-bordered, colorfully-headered, per-district groupings with visible unit labels and counts. Recharts' `Treemap` has limited styling control for this "colored district header bar + nested labeled unit cells" look.

**Replacement**: a new hand-rolled `CaseLoadTreemap.tsx` component using `d3-hierarchy`'s `treemap()` + `hierarchy()` layout (new dependency — same "layout math only, render as React SVG" pattern already used for `SankeyChart`/`ChordDiagram`), rendering:
- One distinct color per district (cycling a palette), applied to that district's header bar and a lighter tint for its child unit cells.
- A header `<rect>` + `<text>` per district showing `"{District} ({total})"`, matching the reference image's colored title bars.
- Nested `<rect>` + `<text>` per unit inside, showing the unit name (truncated with `title` tooltip if it doesn't fit) — no dependency on Recharts' pixel-threshold label suppression.
- The existing plain-text fallback table below is kept unchanged (still the reliable, always-legible source of truth).

## 3. Chord diagram overhaul (Investigation Network)

Current issues: labels like "IPC" render upside-down for arcs past 180° (the rotation only accounts for centering the text along the arc's radius, not flipping text that would otherwise render inverted); ribbons/arcs are visually thick; no value labels; no hover interaction; the lightbox shows the same stacked chart-then-table layout as every other chart, but for a network diagram like this, seeing the flow values *while* the diagram is enlarged matters more, and a table crammed below a big circle wastes space.

Fixes to `ChordDiagram.tsx`:
- **Label rotation**: when `midAngle > Math.PI` (i.e., past 180°, on the diagram's left half), add a full `180°` rotation to the label's own transform in addition to the anchor flip already there, so "IPC" and similar labels on the left side read left-to-right instead of upside-down.
- **Thinner geometry**: reduce `outerRadius`/`innerRadius` gap (arc thickness) and `ribbon`'s implicit width follows from smaller radius — the net effect is a finer ring and finer ribbons, closer to the reference chord-diagram aesthetic (thin ring, generous ribbon curvature).
- **Value labels**: each arc gets its total flow value displayed alongside its name label.
- **Hover-fade interaction**: hovering an arc (or its label) fades every ribbon/arc/label *not* connected to it (`opacity: 0.15`) and keeps the hovered arc's own ribbons, arc, and label at full opacity with its value label bolded/highlighted. Uses local component state (`hoveredIndex`), no new dependency.
- **Lightbox layout for this one chart only**: `ChartLightbox` gains an optional `layout?: 'stacked' | 'side'` prop (default `'stacked'`, i.e. today's chart-above-table behavior, unchanged for every other chart). `'side'` places the table beside the chart (flex row) instead of below, and widens the modal. `InvestigationNetworkTab.tsx`'s Chord card passes `layout="side"`. The chord diagram itself also renders at a much larger `size` when inside the lightbox (the lightbox passes a bigger explicit size down, since `ChordDiagram`'s `size` prop already exists for exactly this purpose) — filling the enlarged modal instead of staying at its small tile-sized default.

## 4. HeatmapGrid contrast fix (Cohort Analysis + District × Crime Head Matrix)

`.heatmap-cell` hardcodes `color: #fff` regardless of the cell's background intensity. At low intensity (near-white/near-transparent background), white text is close to invisible — a real WCAG contrast failure, in both light and dark themes (the cell background color itself doesn't adapt to theme either, since it's a literal `rgba(18,58,99,alpha)` blend, which reads fine on light canvas but poorly against a dark-mode-hypothetical background — though dark theme is out of scope per this app's existing "light theme is primary" decisions, this fix targets the light-theme contrast bug that's visible in both the user's light and dark screenshots since the KPI/heatmap area doesn't re-theme).

Fix: compute each cell's text color from its own intensity (luminance-threshold approach, the standard heatmap-legibility technique) — dark navy text (`var(--text)`) below a threshold intensity, white above it, so text always contrasts against its own cell's background regardless of value.

## 5. Navigation overhaul: top pill nav replaces the left rail

Per your confirmation: **all 10** rail destinations become one row of top pills (wrapping to a second line on narrow viewports), and the left sidebar is removed entirely, app-wide.

- New `TopNavPills.tsx` replaces `Rail.tsx` — same `NAV_ITEMS` list and the same `canAccessRoute`-based role filtering (Sev-1 fix logic unchanged), rendered as `<NavLink>` pill buttons instead of vertical icon rows (icons dropped — the reference pill nav is text-only).
- `.shell`'s CSS grid drops its rail column entirely: `grid-template-columns: 1fr; grid-template-rows: auto auto 1fr; grid-template-areas: "header" "pillnav" "main";`. Every screen's existing `<Header>`/`<main>` (`grid-area: header` / `grid-area: main`) need no changes — they already flow into the (renamed-in-effect, same-named) grid areas.
- `Rail.tsx`/`Rail.test.tsx` deleted; `.rail`/`.rail-item`/`.rail-mark`/`.rail-tip` CSS rules removed.

## 6. Persistent KPI strip on every page

Per your confirmation: the same 6 KPIs (Total FIRs, Heinous Offences, Chargesheet Rate, Avg Days to Chargesheet, Pending Investigation, Accused Arrested) appear identically on every page, matching the reference HTML exactly (it computes these once and shows them across all 5 of its tabs).

- Added directly inside the shared `Header.tsx` (used by every screen already) so every page gets it with no per-screen changes — `Header` becomes a two-row `<header>`: the existing title/filters/role-chip row, plus a new `.kpi-strip` row below it.
- New demo-data function `getGlobalKpiStripDemo()` in `demoAnalyticsData.ts`, deriving 4 of the 6 numbers from data that already exists elsewhere for consistency (Total FIRs and Pending Investigation from `getCaseJourneyStages()`, Heinous% and Chargesheet Rate computed from `getGravityMixDemo()`/the journey stages) — only Avg Days to Chargesheet and Accused Arrested % are standalone constants, since no existing aggregate produces those two today.

## Out of scope

- Dark-theme-specific re-tuning of the new KPI strip/pill nav colors (light theme is this app's primary theme per earlier decisions).
- Per-page-specific KPIs (explicitly rejected in favor of the same 6 everywhere).
- Any change to Command Center's own internal 2-column layout, Network's graph canvas, or Sociological's map/correlation content beyond what Sections 1-4 touch.
