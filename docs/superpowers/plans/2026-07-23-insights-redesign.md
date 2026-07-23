# Insights Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the invisible left-nav labels, remap the app to the reference dashboard's navy/gold theme, add a chart-tile lightbox (bigger chart + data table), add real Sankey and Chord diagrams (replacing bar-list stand-ins), and correct the Crime Number format in all demo/mock data.

**Architecture:** Pure frontend change in `ksp-crime-analytics-frontend`. No backend/API changes. New reusable pieces: `src/utils/crimeNumber.ts` (formatting), `src/screens/insights/SankeyChart.tsx` and `ChordDiagram.tsx` (new chart primitives, hand-rolled SVG driven by `d3-sankey`/`d3-chord`/`d3-shape` layout math only — same style as the existing `Donut.tsx`/`HeatmapGrid.tsx`), and `src/screens/insights/ChartLightbox.tsx` (modal, following the existing `EvidencePanel` modal pattern) plus an `expand` prop on `InsightCard`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, Recharts (existing charts untouched), new deps: `d3-sankey`, `d3-chord`, `d3-shape` (+ `@types/*`).

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-07-23-insights-redesign-design.md`.
- Dropped scope, per spec: dark-theme repalette, renaming `crimeNumber`/`crimeNo` to one field name, sortable table headers (no existing sortable-table pattern in this codebase to reuse — lightbox tables are plain).
- Lightbox (`expand` prop) is wired only onto insight cards that (a) render an actual chart, not just a table, and (b) use static demo data already available as a local array — not cards backed by a live query with loading/error branches, and not cards that already show a full data table inline. This is a deliberate scope cut (see Task 8's intro) to keep the branching manageable; it is not a partial/broken implementation of the spec, it's the full intended scope.
- `crime_no`/`crimeNumber` category code is always `CASE_CATEGORY_CODES.FIR` (1) in this plan's data — none of the touched call sites (Recent FIRs demo table, mock case-explorer data) model UDR/PAR/Zero FIR cases; only the Overview tab's "Case Category Mix" donut lists all four categories, and it already uses category *names* as labels, not `CrimeNo` strings, so it needs no `crimeNumber.ts` involvement beyond dropping NCR.
- CSS-only tasks (color tokens, header/tab restyle) have no meaningful unit test (jsdom doesn't apply external stylesheets) — those tasks end with `npm run build` + `npm run test` as a regression check instead of a new assertion, and a manual visual check via `npm run dev` is called out at the end of the plan.

---

### Task 1: Fix the left rail (invisible nav labels)

**Files:**
- Modify: `src/app/Rail.tsx`
- Modify: `src/design-system/components.css:1-16`
- Test: `src/app/Rail.test.tsx` (new)

**Interfaces:**
- Produces: `Rail` component unchanged in props (still takes none), same `NAV_ITEMS` route/label pairs, now also carrying an `icon` per item.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/Rail.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Rail } from './Rail';

describe('Rail', () => {
  it('renders every nav item with both an icon and visible label text', () => {
    render(
      <MemoryRouter>
        <Rail />
      </MemoryRouter>,
    );
    const labels = ['Command Center', 'Insights', 'Case Explorer', 'Network / Link Analysis', 'Sociological & Predictive', 'Admin / Audit'];
    labels.forEach((label) => {
      const link = screen.getByText(label).closest('a')!;
      expect(link).toBeInTheDocument();
      expect(link.querySelector('svg')).not.toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Rail.test.tsx`
Expected: FAIL — `link.querySelector('svg')` is `null` (Rail.tsx renders no icons today).

- [ ] **Step 3: Rewrite Rail.tsx with icons + always-visible labels**

```tsx
// src/app/Rail.tsx
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center', icon: GridIcon },
  { path: '/insights', label: 'Insights', icon: ChartIcon },
  { path: '/case-explorer', label: 'Case Explorer', icon: FolderIcon },
  { path: '/network', label: 'Network / Link Analysis', icon: NetworkIcon },
  { path: '/sociological', label: 'Sociological & Predictive', icon: TrendIcon },
  { path: '/admin', label: 'Admin / Audit', icon: ShieldIcon },
];

export function Rail() {
  return (
    <nav className="rail" aria-label="Primary">
      {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
        <NavLink key={path} to={path} className="rail-item">
          <Icon />
          <span className="rail-tip">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.2" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 17V9M10 17V3M17 17v-6" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 5.5h5l1.5 2H17v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" strokeLinejoin="round" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="5" cy="5" r="2" />
      <circle cx="15" cy="5" r="2" />
      <circle cx="10" cy="15" r="2" />
      <path d="M6.6 6.2 8.7 13M13.4 6.2 11.3 13M7 5h6" strokeLinecap="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 13.5 8 8l3.5 3.5L17 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 6H17v4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10 2.5 17 5v5c0 4.5-3 7.5-7 8-4-.5-7-3.5-7-8V5l7-2.5z" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 4: Widen the rail and make labels always visible in components.css**

Replace lines 1-16 of `src/design-system/components.css`:

```css
.shell {
  display: grid; grid-template-columns: 208px 1fr; grid-template-rows: 60px 1fr;
  grid-template-areas: "rail header" "rail main"; height: 100vh; min-height: 640px;
}

/* ---- left labeled nav rail ---- */
.rail { grid-area: rail; background: var(--panel); border-right: 1px solid var(--line); display: flex; flex-direction: column; align-items: stretch; padding: 14px 10px; gap: 2px; }
.rail-mark { width: 32px; height: 32px; display: grid; place-items: center; margin-bottom: 14px; color: var(--text); }
.rail-mark svg { width: 20px; height: 20px; }
.rail-item { position: relative; display: flex; align-items: center; gap: 11px; height: 40px; padding: 0 10px; border-radius: 8px; color: var(--muted); background: transparent; border: none; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; text-decoration: none; }
.rail-item svg { width: 19px; height: 19px; flex-shrink: 0; }
.rail-item:hover { background: var(--panel-raised); color: var(--text); }
.rail-item[aria-current="page"] { color: var(--real); background: var(--real-fill); }
.rail-item[aria-current="page"]::before { content: ""; position: absolute; left: -10px; top: 8px; bottom: 8px; width: 3px; background: var(--real); border-radius: 0 3px 3px 0; }
.rail-tip { font-size: 12.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 1; }
```

(This removes the old `position: absolute; opacity: 0` tooltip behavior entirely — `.rail-tip` is now a normal inline label.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- Rail.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/Rail.tsx src/design-system/components.css src/app/Rail.test.tsx
git commit -m "fix: rail nav items were rendering with no icon and a hover-only invisible label"
```

---

### Task 2: Remap color tokens to the navy/gold reference palette

**Files:**
- Modify: `src/design-system/tokens.css:1-14` (light theme `:root` block only)
- Modify: `src/screens/insights/HeatmapGrid.tsx:14-16,43` (hardcoded rgba tied to the old `--real` hex)

**Interfaces:**
- Consumes: none new.
- Produces: same CSS custom property names, new values — no component prop/type changes.

- [ ] **Step 1: Replace the light-theme token block**

Replace lines 1-14 of `src/design-system/tokens.css`:

```css
:root {
  --canvas: #eef1f6; --panel: #FFFFFF; --panel-raised: #FBFCFE; --line: #e3e8ef;
  --text: #1c2b3a; --muted: #647184; --muted-2: #8493B0;
  --real: #123a63; --real-fill: rgba(18,58,99,0.12);
  --predicted: #d4a017; --predicted-fill: rgba(212,160,23,0.14);
  --alert: #c0392b; --alert-fill: rgba(192,57,43,0.10);
  --pii: #d4a017; --pii-fill: rgba(212,160,23,0.12);
  --shadow: 0 1px 2px rgba(20,33,58,0.04), 0 8px 24px -12px rgba(20,33,58,0.18);
  --focus: #1D4ED8;
  --cat-1: #123a63; --cat-2: #d4a017; --cat-3: #c0392b; --cat-4: #1e8a5f; --cat-5: #6c5ce7;
  --status-good-ink: #1e8a5f; --status-good-fill: rgba(30,138,95,0.12);
  --status-warning: #e67e22; --status-warning-ink: #9a5313; --status-warning-fill: rgba(230,126,34,0.16);
  color-scheme: light;
}
```

(Leave `:root[data-theme="dark"]` at lines 15-27 untouched — out of scope per spec.)

- [ ] **Step 2: Fix HeatmapGrid's hardcoded color**

The cell background is hardcoded to the *old* `--real` hex (`57,135,229` = the old blue), which won't track the new navy token. Update `src/screens/insights/HeatmapGrid.tsx`:

Replace the comment at lines 14-16:
```tsx
// Fixed rgba over the light-theme --real hex (18,58,99 = navy #123a63). Kept as a literal
// rather than var(--real) because CSS custom properties can't be used inside an rgba()
// alpha channel computation here; must be kept in sync if --real's hex changes.
```

Replace line 43 (`style={{ background: ... }}`):
```tsx
                style={{ background: `rgba(18, 58, 99, ${intensity})` }}
```

- [ ] **Step 3: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: all existing tests still pass (no test asserts on hex color values); build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/design-system/tokens.css src/screens/insights/HeatmapGrid.tsx
git commit -m "style: remap light theme to the navy/gold reference palette"
```

---

### Task 3: Restyle the persistent header and Insights tab strip

**Files:**
- Modify: `src/design-system/components.css:19,342-344`

**Interfaces:** none (CSS only, no component changes — `Header.tsx` and `InsightsScreen.tsx` already produce the right DOM structure per the investigation).

- [ ] **Step 1: Give `.header` the reference's navy gradient chrome**

Replace line 19 of `src/design-system/components.css`:

```css
.header { grid-area: header; background: linear-gradient(120deg, #0b2340 0%, #123a63 100%); color: #fff; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 18px; padding: 0 20px; min-width: 0; }
```

Add right after the existing `.title-block h1` rule (currently line 21) a color override so the header's heading/text read white on the new gradient, and adjust `.filter-field`/`.role-chip` (which sit inside `.header`) to read against the dark background:

```css
.header .title-block h1 { color: #ffffff; }
.header .filter-field { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); color: #fff; }
.header .filter-field svg { color: rgba(255,255,255,0.7); }
.header .role-chip { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
.header .role-text .name { color: #fff; }
.header .role-text .rank { color: rgba(255,255,255,0.7); }
```

- [ ] **Step 2: Restyle the Insights pillar tabs as navy/gold pills**

Replace lines 342-344:

```css
/* ---- case view tabs / insights pillar tabs ---- */
.view-tabs { display: flex; gap: 6px; padding: 10px 24px; background: var(--panel); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 5; flex-wrap: wrap; }
.view-tab { font: inherit; font-size: 12.5px; font-weight: 600; padding: 7px 16px; border: 1px solid var(--line); background: var(--canvas); color: var(--muted); border-radius: 20px; cursor: pointer; }
.view-tab:hover { background: var(--panel-raised); }
.view-tab.active { background: var(--real); color: #ffffff; border-color: var(--real); }
```

- [ ] **Step 3: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: pass — no test targets these CSS rules.

- [ ] **Step 4: Manual visual check**

Run: `npm run dev`, open `/insights`, confirm the header now shows a navy gradient with white text and the tab strip shows gold-accented navy pill buttons for the active tab.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components.css
git commit -m "style: give the persistent header and insights tab strip the navy/gold reference chrome"
```

---

### Task 4: Add the `crimeNumber` formatting utility

**Files:**
- Create: `src/utils/crimeNumber.ts`
- Test: `src/utils/crimeNumber.test.ts`

**Interfaces:**
- Produces: `CASE_CATEGORY_CODES: { FIR: 1, UDR: 3, PAR: 4, ZERO_FIR: 8 }`, `type CaseCategoryCode`, `formatCrimeNo(categoryCode: CaseCategoryCode, districtId: number, unitId: number, year: number, serial: number): string`, `formatCaseNo(year: number, serial: number): string`. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/crimeNumber.test.ts
import { describe, it, expect } from 'vitest';
import { formatCrimeNo, formatCaseNo, CASE_CATEGORY_CODES } from './crimeNumber';

describe('formatCrimeNo', () => {
  it('matches the ER doc worked examples for every case category code', () => {
    expect(formatCrimeNo(CASE_CATEGORY_CODES.FIR, 443, 6, 2026, 1)).toBe('104430006202600001');
    expect(formatCrimeNo(CASE_CATEGORY_CODES.UDR, 443, 6, 2026, 1)).toBe('304430006202600001');
    expect(formatCrimeNo(CASE_CATEGORY_CODES.ZERO_FIR, 443, 6, 2026, 1)).toBe('804430006202600001');
    expect(formatCrimeNo(CASE_CATEGORY_CODES.PAR, 443, 6, 2026, 1)).toBe('404430006202600001');
  });

  it('pads district/unit/serial segments regardless of magnitude', () => {
    expect(formatCrimeNo(CASE_CATEGORY_CODES.FIR, 5, 176, 2026, 1)).toBe('100050176202600001');
  });
});

describe('formatCaseNo', () => {
  it('builds the 9-digit year + serial case number', () => {
    expect(formatCaseNo(2026, 1)).toBe('202600001');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- crimeNumber.test.ts`
Expected: FAIL — `Cannot find module './crimeNumber'`

- [ ] **Step 3: Implement the utility**

```ts
// src/utils/crimeNumber.ts
// Structured Crime Number format per docs/Police_FIR_ER_Diagram.md (CaseMaster.CrimeNo):
// 1-digit CaseCategoryCode + 4-digit DistrictID + 4-digit PoliceStationID(UnitID)
// + 4-digit Year + 5-digit RunningSerialNumber = 18 characters.
export const CASE_CATEGORY_CODES = {
  FIR: 1,
  UDR: 3,
  PAR: 4,
  ZERO_FIR: 8,
} as const;

export type CaseCategoryCode = (typeof CASE_CATEGORY_CODES)[keyof typeof CASE_CATEGORY_CODES];

export function formatCrimeNo(
  categoryCode: CaseCategoryCode,
  districtId: number,
  unitId: number,
  year: number,
  serial: number,
): string {
  return [
    String(categoryCode),
    String(districtId).padStart(4, '0'),
    String(unitId).padStart(4, '0'),
    String(year),
    String(serial).padStart(5, '0'),
  ].join('');
}

// CaseNo is the last 9 digits of CrimeNo: 4-digit year + 5-digit serial.
export function formatCaseNo(year: number, serial: number): string {
  return `${year}${String(serial).padStart(5, '0')}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- crimeNumber.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/crimeNumber.ts src/utils/crimeNumber.test.ts
git commit -m "feat: add formatCrimeNo/formatCaseNo utility matching the ER doc's structured format"
```

---

### Task 5: Fix Crime Number values in demo/mock data and test fixtures

**Files:**
- Modify: `src/api/demoAnalyticsData.ts:50-58,72-103`
- Modify: `src/api/mockData.ts:334-357`
- Modify: `src/api/mockData.test.ts:166-175`
- Modify: `src/screens/case-explorer/CaseList.test.tsx:17`
- Modify: `src/screens/case-explorer/CaseDetailScreen.test.tsx:27`

**Interfaces:**
- Consumes: `formatCrimeNo`, `formatCaseNo`, `CASE_CATEGORY_CODES` from Task 4.

- [ ] **Step 1: Drop NCR from the Case Category Mix demo data**

In `src/api/demoAnalyticsData.ts`, replace lines 48-58:

```ts
// CaseCategory (FIR/UDR/Zero FIR/PAR) has no backend field anywhere -- distinct from
// commandCenterApi's categoryMix, which is crime-HEAD breakdown, not FIR-type breakdown.
// Only these four categories are defined in the ER doc's CaseCategory table/CrimeNo
// convention (docs/Police_FIR_ER_Diagram.md) -- "NCR" isn't a documented category.
export function getCaseCategoryMixDemo(): CaseCategorySlice[] {
  return [
    { category: 'FIR', count: 8736 },
    { category: 'UDR', count: 1248 },
    { category: 'Zero FIR', count: 998 },
    { category: 'PAR', count: 874 },
  ];
}
```

- [ ] **Step 2: Rebuild Recent FIRs demo data with correctly-formatted Crime Numbers**

Replace lines 72-103 of `src/api/demoAnalyticsData.ts`:

```ts
import { formatCrimeNo, formatCaseNo, CASE_CATEGORY_CODES } from '../utils/crimeNumber';

interface RecentFirDemoSeed {
  districtId: number;
  unitId: number;
  serial: number;
  crimeSubHeadName: string;
  station: string;
  district: string;
}

const RECENT_FIRS_DEMO_SEEDS: RecentFirDemoSeed[] = [
  { districtId: 5, unitId: 176, serial: 12345, crimeSubHeadName: 'Theft of Motor Vehicle', station: 'Whitefield PS', district: 'Bengaluru Urban' },
  { districtId: 5, unitId: 188, serial: 12346, crimeSubHeadName: 'Chain Snatching', station: 'Koramangala PS', district: 'Bengaluru Urban' },
  { districtId: 22, unitId: 240, serial: 12347, crimeSubHeadName: 'Cheating', station: 'Mysuru Town PS', district: 'Mysuru' },
  { districtId: 3, unitId: 310, serial: 12348, crimeSubHeadName: 'Grievous Hurt', station: 'Belagavi Town PS', district: 'Belagavi' },
  { districtId: 26, unitId: 405, serial: 12349, crimeSubHeadName: 'Online Financial Fraud', station: 'Tumakuru Town PS', district: 'Tumakuru' },
  { districtId: 17, unitId: 512, serial: 12350, crimeSubHeadName: 'Burglary', station: 'Kalaburagi Town PS', district: 'Kalaburagi' },
  { districtId: 2, unitId: 330, serial: 12351, crimeSubHeadName: 'Dowry Death', station: 'Ballari Town PS', district: 'Ballari' },
  { districtId: 13, unitId: 260, serial: 12352, crimeSubHeadName: 'NDPS Violations', station: 'Hubli SubUrban PS', district: 'Dharwad' },
];

// Negative caseIds mark these as synthetic -- never a real case-explorer link target. The
// screen that renders this (OverviewTab) uses a plain, non-clickable table for this data, unlike
// the live branch which reuses <CaseList>'s clickable rows.
export function getRecentFirsDemo(): CaseSummaryResponse[] {
  const statuses = ['registered', 'under_investigation', 'closed'] as const;
  const gravities = ['heinous', 'serious', 'minor'] as const;
  return RECENT_FIRS_DEMO_SEEDS.map((seed, i) => ({
    caseId: -1000 - i,
    caseNumber: formatCaseNo(2026, seed.serial),
    unitId: -1,
    unitName: seed.station,
    crimeSubHeadId: -1,
    crimeSubHeadName: seed.crimeSubHeadName,
    status: statuses[i % statuses.length],
    firDate: `2026-0${(i % 9) + 1}-1${i % 9}`,
    crimeNumber: formatCrimeNo(CASE_CATEGORY_CODES.FIR, seed.districtId, seed.unitId, 2026, seed.serial),
    station: seed.station,
    district: seed.district,
    gravity: gravities[i % gravities.length],
  }));
}
```

- [ ] **Step 3: Fix mockData.ts's crimeNumber generation**

In `src/api/mockData.ts`, add the import near the top (with the other imports, e.g. after the `CRIME_TYPE_OPTIONS` import):

```ts
import { formatCrimeNo, CASE_CATEGORY_CODES } from '../utils/crimeNumber';
```

Replace the `mockCaseSummaries` function (lines 334-357):

```ts
function mockCaseSummaries(unitId: number, unitName: string) {
  const district = findDistrictName(unitId);
  const districtId = findStationDistrictId(unitId) ?? 0;
  return Array.from({ length: CASES_PER_STATION }, (_, index) => {
    const crimeType = CASE_CRIME_TYPES[(unitId + index) % CASE_CRIME_TYPES.length];
    const status = CASE_STATUSES[index % CASE_STATUSES.length];
    const dayOffset = (unitId % 10) + index * 5;
    const gravity = CASE_GRAVITIES[(unitId + index * 2) % CASE_GRAVITIES.length];
    return {
      caseId: unitId * 1000 + index,
      caseNumber: `${100 + unitId + index}/2026`,
      unitId,
      unitName,
      crimeSubHeadId: crimeType.crimeSubHeadId,
      crimeSubHeadName: crimeType.crimeSubHeadName,
      status,
      firDate: offsetDate('2026-06-01', -dayOffset),
      crimeNumber: formatCrimeNo(CASE_CATEGORY_CODES.FIR, districtId, unitId, 2026, index + 1),
      station: unitName,
      district,
      gravity,
      location: mockLocation(unitId, index),
    };
  });
}
```

- [ ] **Step 4: Update the three test fixtures**

In `src/api/mockData.test.ts`, replace line 173:
```ts
      crimeNumber: '100050176202600001', // formatCrimeNo(FIR, districtId 5, unitId 176, 2026, serial 1)
```

In `src/screens/case-explorer/CaseList.test.tsx`, replace line 17:
```ts
    crimeNumber: '100050176202600001',
```

In `src/screens/case-explorer/CaseDetailScreen.test.tsx`, replace line 27:
```ts
  crimeNumber: '100050176202600001',
```

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS — `mockData.test.ts`, `CaseList.test.tsx`, `CaseDetailScreen.test.tsx`, and any `OverviewTab.test.tsx`/`InsightsScreen.test.tsx` assertions touching Recent FIRs or Category Mix data all pass with the new values. If `OverviewTab.test.tsx` or `InsightsScreen.test.tsx` assert on the old `'FIR26051201'`-style strings or on 5 category slices (including NCR), update those assertions to match the new `formatCrimeNo` output / 4-category list the same way.

- [ ] **Step 6: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/api/mockData.ts src/api/mockData.test.ts \
  src/screens/case-explorer/CaseList.test.tsx src/screens/case-explorer/CaseDetailScreen.test.tsx
git commit -m "fix: generate Crime Numbers in the ER doc's structured format, drop undocumented NCR category"
```

---

### Task 6: Add a Sankey diagram for Case Journey

**Files:**
- Modify: `package.json` (add `d3-sankey`, `@types/d3-sankey`)
- Modify: `src/api/demoAnalyticsData.ts` (add `getCaseJourneySankeyDemo`)
- Create: `src/screens/insights/SankeyChart.tsx`
- Test: `src/screens/insights/SankeyChart.test.tsx`
- Modify: `src/screens/insights/OverviewTab.tsx:54-56`

**Interfaces:**
- Produces: `SankeyChart({ nodeLabels: string[]; links: Array<{source:number; target:number; value:number}>; width?: number; height?: number })`.
- Produces: `getCaseJourneySankeyDemo(): { nodeLabels: string[]; links: Array<{source:number; target:number; value:number}> }`.

- [ ] **Step 1: Install d3-sankey**

Run: `npm install d3-sankey && npm install -D @types/d3-sankey`

- [ ] **Step 2: Add the Sankey demo-data function**

Append to `src/api/demoAnalyticsData.ts` (after `getCaseJourneyStages`):

```ts
export interface CaseJourneySankeyData {
  nodeLabels: string[];
  links: Array<{ source: number; target: number; value: number }>;
}

// Single source of truth is getCaseJourneyStages(): index 0 (Registered) fans out to every
// later stage. Registered's own count (12480) equals the sum of the other four stages, so
// this models "of everything registered, here's where it currently stands" -- not a lossy
// multi-hop funnel.
export function getCaseJourneySankeyDemo(): CaseJourneySankeyData {
  const stages = getCaseJourneyStages();
  return {
    nodeLabels: stages.map((s) => s.stage),
    links: stages.slice(1).map((stage, i) => ({ source: 0, target: i + 1, value: stage.count })),
  };
}
```

- [ ] **Step 3: Write the failing test for SankeyChart**

```tsx
// src/screens/insights/SankeyChart.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SankeyChart } from './SankeyChart';

describe('SankeyChart', () => {
  it('renders one rect per node and one path per link', () => {
    const { container } = render(
      <SankeyChart
        nodeLabels={['Registered', 'Chargesheeted', 'Undetected']}
        links={[
          { source: 0, target: 1, value: 80 },
          { source: 0, target: 2, value: 20 },
        ]}
      />,
    );
    expect(container.querySelectorAll('svg > g:first-of-type > path')).toHaveLength(2);
    expect(container.querySelectorAll('svg > g:last-of-type > g > rect')).toHaveLength(3);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- SankeyChart.test.tsx`
Expected: FAIL — `Cannot find module './SankeyChart'`

- [ ] **Step 5: Implement SankeyChart**

```tsx
// src/screens/insights/SankeyChart.tsx
import { useMemo } from 'react';
import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey';

export interface SankeyLinkInput {
  source: number;
  target: number;
  value: number;
}

interface SankeyChartProps {
  nodeLabels: string[];
  links: SankeyLinkInput[];
  width?: number;
  height?: number;
}

interface NodeDatum {
  name: string;
}

const NODE_COLORS = ['var(--real)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

export function SankeyChart({ nodeLabels, links, width = 640, height = 260 }: SankeyChartProps) {
  const { nodes, links: laidOutLinks } = useMemo(() => {
    const layout = sankey<NodeDatum, SankeyLinkInput>()
      .nodeWidth(14)
      .nodePadding(20)
      .extent([
        [1, 1],
        [width - 1, height - 1],
      ]);
    return layout({
      nodes: nodeLabels.map((name) => ({ name })),
      links: links.map((l) => ({ ...l })),
    });
  }, [nodeLabels, links, width, height]);

  const pathGenerator = sankeyLinkHorizontal<NodeDatum, SankeyLinkInput>();

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Case journey sankey diagram">
      <g>
        {laidOutLinks.map((link, i) => {
          const sourceIndex = typeof link.source === 'object' ? (link.source as SankeyNode<NodeDatum, SankeyLinkInput>).index! : link.source;
          return (
            <path
              key={i}
              d={pathGenerator(link as SankeyLink<NodeDatum, SankeyLinkInput>) ?? undefined}
              fill="none"
              stroke={NODE_COLORS[sourceIndex % NODE_COLORS.length]}
              strokeOpacity={0.35}
              strokeWidth={Math.max(1, link.width ?? 1)}
            />
          );
        })}
      </g>
      <g>
        {nodes.map((node, i) => (
          <g key={node.name}>
            <rect
              x={node.x0}
              y={node.y0}
              width={(node.x1 ?? 0) - (node.x0 ?? 0)}
              height={(node.y1 ?? 0) - (node.y0 ?? 0)}
              fill={NODE_COLORS[i % NODE_COLORS.length]}
            />
            <text x={(node.x1 ?? 0) + 6} y={((node.y0 ?? 0) + (node.y1 ?? 0)) / 2} dy="0.35em" fontSize={10.5} fill="var(--text)">
              {node.name} ({(node.value ?? 0).toLocaleString()})
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- SankeyChart.test.tsx`
Expected: PASS

- [ ] **Step 7: Wire SankeyChart into OverviewTab's Case Journey card**

In `src/screens/insights/OverviewTab.tsx`, add to the imports:
```tsx
import { SankeyChart } from './SankeyChart';
```
and add `getCaseJourneySankeyDemo` to the `demoAnalyticsData` import list.

Replace lines 54-56:
```tsx
      <InsightCard title="Case Journey" live={false} note="Registration through final outcome.">
        <SankeyChart nodeLabels={journeySankey.nodeLabels} links={journeySankey.links} />
      </InsightCard>
```

and add, alongside the other `const journey = getCaseJourneyStages();` line (line 29):
```tsx
  const journeySankey = getCaseJourneySankeyDemo();
```

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS — `OverviewTab.test.tsx` still finds the "Case Journey" card title; if it previously asserted on `RankedBarList`-specific DOM (e.g. `.cat-bar-row`), update that assertion to check for the new `<svg aria-label="Case journey sankey diagram">` instead.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/api/demoAnalyticsData.ts \
  src/screens/insights/SankeyChart.tsx src/screens/insights/SankeyChart.test.tsx \
  src/screens/insights/OverviewTab.tsx src/screens/insights/OverviewTab.test.tsx
git commit -m "feat: replace Case Journey ranked-bar stand-in with a real Sankey diagram"
```

---

### Task 7: Add a Chord diagram for Crime Head ↔ Act Linkage

**Files:**
- Modify: `package.json` (add `d3-chord`, `d3-shape`, `@types/d3-chord`, `@types/d3-shape`)
- Modify: `src/api/demoAnalyticsData.ts` (add `getCrimeHeadActMatrixDemo`)
- Create: `src/screens/insights/ChordDiagram.tsx`
- Test: `src/screens/insights/ChordDiagram.test.tsx`
- Modify: `src/screens/insights/InvestigationNetworkTab.tsx:22,32-34`

**Interfaces:**
- Produces: `ChordDiagram({ labels: string[]; matrix: number[][]; size?: number })`.
- Produces: `getCrimeHeadActMatrixDemo(): { labels: string[]; matrix: number[][] }`.

- [ ] **Step 1: Install d3-chord and d3-shape**

Run: `npm install d3-chord d3-shape && npm install -D @types/d3-chord @types/d3-shape`

- [ ] **Step 2: Add the matrix demo-data function**

Append to `src/api/demoAnalyticsData.ts` (after `getCrimeHeadActLinkageDemo`):

```ts
export interface CrimeHeadActMatrix {
  labels: string[];
  matrix: number[][];
}

// Derives a symmetric bipartite matrix (crime heads x acts) from the same edge list
// getCrimeHeadActLinkageDemo() already returns, so the chord diagram and the ranked-bar
// fallback never disagree on the underlying counts.
export function getCrimeHeadActMatrixDemo(): CrimeHeadActMatrix {
  const linkage = getCrimeHeadActLinkageDemo();
  const heads: string[] = [];
  const acts: string[] = [];
  const edges: Array<[string, string, number]> = [];
  linkage.forEach(({ label, count }) => {
    const [head, act] = label.split(' → ');
    if (!heads.includes(head)) heads.push(head);
    if (!acts.includes(act)) acts.push(act);
    edges.push([head, act, count]);
  });
  const labels = [...heads, ...acts];
  const matrix: number[][] = Array.from({ length: labels.length }, () => Array(labels.length).fill(0));
  edges.forEach(([head, act, count]) => {
    const hi = labels.indexOf(head);
    const ai = labels.indexOf(act);
    matrix[hi][ai] = count;
    matrix[ai][hi] = count;
  });
  return { labels, matrix };
}
```

- [ ] **Step 3: Write the failing test for ChordDiagram**

```tsx
// src/screens/insights/ChordDiagram.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChordDiagram } from './ChordDiagram';

describe('ChordDiagram', () => {
  it('renders one arc per label and at least one ribbon for a non-zero matrix', () => {
    const { container } = render(
      <ChordDiagram
        labels={['Head A', 'Head B', 'Act X']}
        matrix={[
          [0, 0, 10],
          [0, 0, 5],
          [10, 5, 0],
        ]}
      />,
    );
    expect(container.querySelectorAll('svg > g > g > path.chord-arc')).toHaveLength(3);
    expect(container.querySelectorAll('svg > g > path.chord-ribbon').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- ChordDiagram.test.tsx`
Expected: FAIL — `Cannot find module './ChordDiagram'`

- [ ] **Step 5: Implement ChordDiagram**

```tsx
// src/screens/insights/ChordDiagram.tsx
import { useMemo } from 'react';
import { chord, ribbon } from 'd3-chord';
import { arc as d3arc } from 'd3-shape';

interface ChordDiagramProps {
  labels: string[];
  matrix: number[][];
  size?: number;
}

const CHORD_COLORS = ['var(--real)', 'var(--predicted)', 'var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--muted-2)'];

export function ChordDiagram({ labels, matrix, size = 320 }: ChordDiagramProps) {
  const outerRadius = size / 2 - 44;
  const innerRadius = outerRadius - 14;

  const chordLayout = useMemo(
    () => chord().padAngle(0.04).sortSubgroups((a, b) => b - a)(matrix),
    [matrix],
  );

  const arcGenerator = useMemo(() => d3arc<never, (typeof chordLayout.groups)[number]>().innerRadius(innerRadius).outerRadius(outerRadius), [innerRadius, outerRadius]);
  const ribbonGenerator = useMemo(() => ribbon<never, (typeof chordLayout)[number]>().radius(innerRadius), [innerRadius]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="img" aria-label="Crime head to act chord diagram">
      <g transform={`translate(${size / 2},${size / 2})`}>
        {chordLayout.map((d, i) => (
          <path
            key={i}
            className="chord-ribbon"
            d={ribbonGenerator(d) ?? undefined}
            fill={CHORD_COLORS[d.source.index % CHORD_COLORS.length]}
            fillOpacity={0.55}
            stroke="var(--panel)"
            strokeWidth={0.5}
          />
        ))}
        {chordLayout.groups.map((group, i) => {
          const midAngle = (group.startAngle + group.endAngle) / 2;
          return (
            <g key={i}>
              <path className="chord-arc" d={arcGenerator(group) ?? undefined} fill={CHORD_COLORS[i % CHORD_COLORS.length]} />
              <text
                transform={`rotate(${(midAngle * 180) / Math.PI - 90}) translate(${outerRadius + 8})`}
                textAnchor={midAngle > Math.PI ? 'end' : 'start'}
                fontSize={9.5}
                fill="var(--text)"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- ChordDiagram.test.tsx`
Expected: PASS

- [ ] **Step 7: Wire ChordDiagram into InvestigationNetworkTab**

In `src/screens/insights/InvestigationNetworkTab.tsx`, add `getCrimeHeadActMatrixDemo` to the `demoAnalyticsData` import and add:
```tsx
import { ChordDiagram } from './ChordDiagram';
```

Replace line 22 (`const linkage = getCrimeHeadActLinkageDemo();`) — keep it (still used for the lightbox table in Task 12) and add:
```tsx
  const linkage = getCrimeHeadActLinkageDemo();
  const linkageMatrix = getCrimeHeadActMatrixDemo();
```

Replace lines 32-34:
```tsx
      <InsightCard title="Crime Head ↔ Act Linkage" live={false} note="Flow weight = number of act-section associations linking a crime head to a legal act.">
        <ChordDiagram labels={linkageMatrix.labels} matrix={linkageMatrix.matrix} />
      </InsightCard>
```

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS — update `InvestigationNetworkTab.test.tsx`'s "always renders the demo IO Leaderboard and Crime Head <-> Act linkage cards" assertion if it queried `RankedBarList`-specific DOM under that card; the `getByText('Crime Head ↔ Act Linkage')` assertion itself keeps passing unchanged.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/api/demoAnalyticsData.ts \
  src/screens/insights/ChordDiagram.tsx src/screens/insights/ChordDiagram.test.tsx \
  src/screens/insights/InvestigationNetworkTab.tsx src/screens/insights/InvestigationNetworkTab.test.tsx
git commit -m "feat: replace Crime Head <-> Act ranked-bar stand-in with a real chord diagram"
```

---

### Task 8: Add the chart-tile lightbox

**Files:**
- Create: `src/screens/insights/ChartLightbox.tsx`
- Test: `src/screens/insights/ChartLightbox.test.tsx`
- Modify: `src/screens/insights/InsightCard.tsx`
- Modify: `src/design-system/components.css` (append new rules after the `.insight-card-body` rule, currently line 380)
- Test: `src/screens/insights/InsightCard.test.tsx`

**Interfaces:**
- Produces: `InsightCard`'s new optional prop `expand?: { columns: string[]; rows: Array<Array<string | number>> }`. When present, the card renders an expand button that opens a `ChartLightbox` showing the same `children` larger plus a table built from `columns`/`rows`. Tasks 9-13 pass this prop from each tab.

- [ ] **Step 1: Write the failing test for ChartLightbox**

```tsx
// src/screens/insights/ChartLightbox.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartLightbox } from './ChartLightbox';

describe('ChartLightbox', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ChartLightbox open={false} title="Gravity of Offence" columns={['Gravity', 'Count']} rows={[['Heinous', 100]]} onClose={vi.fn()}>
        <p>chart</p>
      </ChartLightbox>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the chart, a data table, and closes on button click', () => {
    const onClose = vi.fn();
    render(
      <ChartLightbox open title="Gravity of Offence" columns={['Gravity', 'Count']} rows={[['Heinous', 100], ['Non-Heinous', 400]]} onClose={onClose}>
        <p>chart content</p>
      </ChartLightbox>,
    );
    expect(screen.getByText('chart content')).toBeInTheDocument();
    expect(screen.getByText('Heinous')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close expanded chart'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <ChartLightbox open title="Gravity of Offence" columns={['Gravity', 'Count']} rows={[]} onClose={onClose}>
        <p>chart</p>
      </ChartLightbox>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ChartLightbox.test.tsx`
Expected: FAIL — `Cannot find module './ChartLightbox'`

- [ ] **Step 3: Implement ChartLightbox**

```tsx
// src/screens/insights/ChartLightbox.tsx
import { useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ChartLightboxProps {
  open: boolean;
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  onClose: () => void;
  children: ReactNode;
}

export function ChartLightbox({ open, title, columns, rows, onClose, children }: ChartLightboxProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="scrim open" onClick={onClose} />
      <div className="chart-lightbox" role="dialog" aria-label={`${title} - expanded`} aria-modal="true">
        <div className="chart-lightbox-head">
          <h3>{title}</h3>
          <button className="evidence-close" aria-label="Close expanded chart" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="chart-lightbox-chart">{children}</div>
        <div className="chart-lightbox-table case-table-wrap">
          <table className="case-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ChartLightbox.test.tsx`
Expected: PASS

- [ ] **Step 5: Add lightbox CSS**

Append after the `.insight-card-body` rule (currently line 380) in `src/design-system/components.css`:

```css
.insight-card-head-actions { display: flex; align-items: center; gap: 8px; }
.insight-card-expand { width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--line); background: var(--canvas); color: var(--muted); cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }
.insight-card-expand:hover { color: var(--text); border-color: var(--muted-2); }
.insight-card-expand svg { width: 13px; height: 13px; }

.chart-lightbox {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(920px, 94vw); max-height: 88vh;
  background: var(--panel); border: 1px solid var(--line); border-radius: 14px;
  box-shadow: 0 24px 60px -20px rgba(0,0,0,0.45);
  z-index: 51; display: flex; flex-direction: column; overflow: hidden;
}
.chart-lightbox-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); flex-shrink: 0; }
.chart-lightbox-head h3 { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; margin: 0; }
.chart-lightbox-chart { padding: 20px; overflow: auto; }
.chart-lightbox-chart svg { width: 100%; height: auto; }
.chart-lightbox-table { margin: 0 20px 20px; max-height: 240px; overflow-y: auto; flex-shrink: 0; }
```

- [ ] **Step 6: Write the failing test for InsightCard's expand button**

Add to `src/screens/insights/InsightCard.test.tsx`:

```tsx
  it('shows an expand button that opens a lightbox with the chart and a data table, when `expand` is provided', () => {
    render(
      <InsightCard title="Gravity of Offence" live={false} expand={{ columns: ['Gravity', 'Count'], rows: [['Heinous', 100]] }}>
        <p>chart body</p>
      </InsightCard>,
    );
    expect(screen.queryByLabelText('Expand Gravity of Offence')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Expand Gravity of Offence'));
    expect(screen.getByText('chart body')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows no expand button when `expand` is omitted', () => {
    render(
      <InsightCard title="Top Districts" live>
        <p>chart</p>
      </InsightCard>,
    );
    expect(screen.queryByLabelText('Expand Top Districts')).not.toBeInTheDocument();
  });
```

Update that file's existing Testing Library import line to also pull in `fireEvent`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm run test -- InsightCard.test.tsx`
Expected: FAIL — no expand button exists yet.

- [ ] **Step 8: Add the `expand` prop to InsightCard**

Replace `src/screens/insights/InsightCard.tsx`:

```tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { DemoDataBadge } from './DemoDataBadge';
import { ChartLightbox } from './ChartLightbox';

export interface InsightCardExpand {
  columns: string[];
  rows: Array<Array<string | number>>;
}

interface InsightCardProps {
  title: string;
  note?: string;
  live: boolean;
  children: ReactNode;
  expand?: InsightCardExpand;
}

export function InsightCard({ title, note, live, children, expand }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="insight-card">
      <div className="insight-card-head">
        <h3>{title}</h3>
        <div className="insight-card-head-actions">
          {!live && <DemoDataBadge />}
          {expand && (
            <button type="button" className="insight-card-expand" aria-label={`Expand ${title}`} onClick={() => setIsExpanded(true)}>
              <ExpandIcon />
            </button>
          )}
        </div>
      </div>
      {note && <p className="insight-card-note">{note}</p>}
      <div className="insight-card-body">{children}</div>
      {expand && (
        <ChartLightbox open={isExpanded} title={title} columns={expand.columns} rows={expand.rows} onClose={() => setIsExpanded(false)}>
          {children}
        </ChartLightbox>
      )}
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm run test -- InsightCard.test.tsx`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/screens/insights/ChartLightbox.tsx src/screens/insights/ChartLightbox.test.tsx \
  src/screens/insights/InsightCard.tsx src/screens/insights/InsightCard.test.tsx \
  src/design-system/components.css
git commit -m "feat: add chart-tile lightbox (enlarged chart + data table) via InsightCard's new expand prop"
```

---

### Task 9: Wire the lightbox into the Overview tab

**Files:**
- Modify: `src/screens/insights/OverviewTab.tsx`

**Interfaces:** consumes `InsightCard`'s `expand` prop (Task 8).

- [ ] **Step 1: Add `expand` to the four demo-data chart cards**

In `src/screens/insights/OverviewTab.tsx`, update each `InsightCard` (the "Top Districts" and "Recent FIRs" cards are skipped — the former depends on a live query with loading/error branches, the latter is already a plain table):

```tsx
      <InsightCard
        title="Registrations vs Chargesheeted"
        live={false}
        note="Monthly, last 12 months."
        expand={{ columns: ['Month', 'Registered', 'Chargesheeted'], rows: trend.map((t) => [t.monthLabel, t.registered, t.chargesheeted]) }}
      >
```
```tsx
      <InsightCard
        title="Case Journey"
        live={false}
        note="Registration through final outcome."
        expand={{ columns: ['Stage', 'Count'], rows: journey.map((j) => [j.stage, j.count]) }}
      >
```
```tsx
      <InsightCard
        title="Case Category Mix"
        live={false}
        note="FIR / UDR / Zero FIR / PAR."
        expand={{ columns: ['Category', 'Count'], rows: categoryMixDemo.map((c) => [c.category, c.count]) }}
      >
```
```tsx
      <InsightCard
        title="Gravity of Offence"
        live={false}
        expand={{ columns: ['Gravity', 'Count'], rows: gravityDemo.map((g) => [g.gravity, g.count]) }}
      >
```

(Only the opening `<InsightCard ...>` tags change; `note` text for Case Category Mix also drops "NCR" to match Task 5's data fix.)

- [ ] **Step 2: Run the full test suite**

Run: `npm run test -- OverviewTab.test.tsx`
Expected: PASS — existing assertions target card titles/content, unaffected by the new prop.

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`, open `/insights` (Overview tab), click each of the 4 cards' expand icons, confirm a modal opens with the enlarged chart and a matching data table, and closes via the × button, Escape, and clicking the scrim.

- [ ] **Step 4: Commit**

```bash
git add src/screens/insights/OverviewTab.tsx
git commit -m "feat: wire chart lightbox into Overview tab's demo-data cards"
```

---

### Task 10: Wire the lightbox into the Crime Trends tab

**Files:**
- Modify: `src/screens/insights/CrimeTrendsTab.tsx`

- [ ] **Step 1: Add `expand` to the three demo-data chart cards**

("Crime Head Distribution" and "Incident Location Hotspots" are skipped — both depend on live queries with loading/error branches.)

```tsx
      <InsightCard
        title="Crime Head Trend by Month"
        live={false}
        note="Stacked monthly volume across the top crime heads."
        expand={{
          columns: ['Month', ...CRIME_HEADS_DEMO],
          rows: monthlyTrend.map((p) => [p.monthLabel, ...CRIME_HEADS_DEMO.map((h) => p[h] as number)]),
        }}
      >
```
```tsx
      <InsightCard
        title="Cohort Analysis — Case Closure Velocity"
        live={false}
        note="% of each monthly cohort chargesheeted within N months of registration."
        expand={{ columns: ['Cohort', 'Lag', '% Chargesheeted'], rows: cohort.map((c) => [c.cohortLabel, c.lagLabel, `${Math.round(c.pct * 100)}%`]) }}
      >
```
```tsx
      <InsightCard
        title="District × Crime Head Hotspot Matrix"
        live={false}
        note="Case counts per district per crime head."
        expand={{ columns: ['District', 'Crime Head', 'Count'], rows: matrix.map((m) => [m.districtName, m.crimeHead, m.count]) }}
      >
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test -- CrimeTrendsTab.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/screens/insights/CrimeTrendsTab.tsx
git commit -m "feat: wire chart lightbox into Crime Trends tab's demo-data cards"
```

---

### Task 11: Wire the lightbox into the Demographics tab

**Files:**
- Modify: `src/screens/insights/DemographicsTab.tsx`

- [ ] **Step 1: Add `expand` to all seven chart cards**

(The "Victim Gender × Crime Head Cross-tab" card is skipped — already a plain table.)

```tsx
      <InsightCard title="Victim Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: victimGender.map((g) => [g.gender, g.count]) }}>
```
```tsx
      <InsightCard title="Accused Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: accusedGender.map((g) => [g.gender, g.count]) }}>
```
```tsx
      <InsightCard title="Complainant Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: complainantGender.map((g) => [g.gender, g.count]) }}>
```
```tsx
      <InsightCard
        title="Age Distribution — Victims vs Accused"
        live={false}
        note="5-year age bands."
        expand={{ columns: ['Band', 'Victims', 'Accused'], rows: ageDistribution.map((a) => [a.band, a.victims, a.accused]) }}
      >
```
```tsx
      <InsightCard title="Complainant Religion" live={false} expand={{ columns: ['Religion', 'Count'], rows: religion.map((r) => [r.label, r.count]) }}>
```
```tsx
      <InsightCard title="Complainant Caste Category" live={false} expand={{ columns: ['Caste', 'Count'], rows: caste.map((c) => [c.label, c.count]) }}>
```
```tsx
      <InsightCard title="Complainant Occupation" live={false} expand={{ columns: ['Occupation', 'Count'], rows: occupation.map((o) => [o.label, o.count]) }}>
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test -- DemographicsTab.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/screens/insights/DemographicsTab.tsx
git commit -m "feat: wire chart lightbox into Demographics tab's cards"
```

---

### Task 12: Wire the lightbox into the Investigation Network tab

**Files:**
- Modify: `src/screens/insights/InvestigationNetworkTab.tsx`

- [ ] **Step 1: Add `expand` to the Chord diagram and Arrests vs Surrenders cards**

("Top Repeat Offenders" and "Accused: First-time vs Repeat" are skipped — both branch on live vs demo data; "Investigating Officer Leaderboard" is skipped — already a plain table.)

```tsx
      <InsightCard
        title="Crime Head ↔ Act Linkage"
        live={false}
        note="Flow weight = number of act-section associations linking a crime head to a legal act."
        expand={{ columns: ['Linkage', 'Cases'], rows: linkage.map((l) => [l.label, l.count]) }}
      >
```
```tsx
      <InsightCard
        title="Arrests vs Surrenders by Month"
        live={false}
        expand={{ columns: ['Month', 'Arrests', 'Surrenders'], rows: arrestsVsSurrenders.map((a) => [a.monthLabel, a.arrests, a.surrenders]) }}
      >
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test -- InvestigationNetworkTab.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/screens/insights/InvestigationNetworkTab.tsx
git commit -m "feat: wire chart lightbox into Investigation Network tab's demo-data cards"
```

---

### Task 13: Wire the lightbox into the Judicial & Units tab

**Files:**
- Modify: `src/screens/insights/JudicialUnitsTab.tsx`

- [ ] **Step 1: Add `expand` to the three eligible cards**

("District → Unit Case Load" and "Unit Performance" are skipped — the former already shows its own inline data table alongside the treemap, the latter is already a plain table.)

```tsx
      <InsightCard
        title="Court-wise Pending Cases"
        live={false}
        note="Top 12 courts by pending load."
        expand={{ columns: ['Court', 'Pending'], rows: courtPending.map((c) => [c.court, c.pending]) }}
      >
```
```tsx
      <InsightCard title="Final Report Outcome" live={false} expand={{ columns: ['Outcome', 'Count'], rows: outcome.map((o) => [o.outcome, o.count]) }}>
```
```tsx
      <InsightCard
        title="Employee Rank Distribution"
        live={false}
        expand={{ columns: ['Rank', 'Headcount'], rows: rankDistribution.map((r) => [r.rank, r.headcount]) }}
      >
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test -- JudicialUnitsTab.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/screens/insights/JudicialUnitsTab.tsx
git commit -m "feat: wire chart lightbox into Judicial & Units tab's demo-data cards"
```

---

## Final verification (all tasks)

- [ ] Run: `npm run test` — full suite passes.
- [ ] Run: `npm run build` — `tsc -b && vite build` succeeds with no type errors (pay particular attention to the `d3-sankey`/`d3-chord`/`d3-shape` generic types in Tasks 6-7 — these are the most likely to need small type-signature tweaks not fully nailed down in this plan).
- [ ] Run: `npm run dev` and manually verify, per the "For UI or frontend changes" rule that automated tests can't cover:
  - The left rail shows visible icon + label for all 6 items, and is no longer a blank column.
  - The whole app now reads in the navy/gold palette (header gradient, gold accents, navy primary buttons/links).
  - `/insights`' 5 pillar tabs render as gold/navy pills under the navy header.
  - Every wired card's expand icon opens a lightbox with a bigger chart + matching table, and closes via ×, Escape, and scrim click.
  - The Overview tab's "Case Journey" card shows a real Sankey diagram (not a bar list).
  - The Investigation Network tab's "Crime Head ↔ Act Linkage" card shows a real chord diagram (not a bar list).
  - The Recent FIRs table shows 18-character structured Crime Numbers (e.g. `100050176202600001`), and Case Category Mix no longer lists NCR.
