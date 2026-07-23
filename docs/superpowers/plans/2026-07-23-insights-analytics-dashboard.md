# Insights (5-pillar analytics dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `/insights` screen, reachable by all 7 roles, with 5 pill-tabs (Overview, Crime Trends, Demographics, Investigation Network, Judicial & Units) covering the 28 visualizations from the design sample — each wired to a real backend endpoint where one genuinely exists, and to clearly-badged synthetic data otherwise.

**Architecture:** One new screen folder (`src/screens/insights/`) with a tab-shell screen + 5 tab components, four small shared chart primitives (`Donut`, `RankedBarList`, `HeatmapGrid`, `InsightCard`+`DemoDataBadge`), a synthetic-data module (`demoAnalyticsData.ts`) for every chart with no backend, and a handful of pure role-gating functions (`insightsApi.ts`) since three of the real endpoints this screen touches (`/api/network/repeat-offenders`, `/api/geo/hotspots`, `/api/cases`) reject some of the 7 roles outright and must fall back to demo data for those roles specifically, not just "unbuilt pillar → always demo."

**Tech Stack:** React 19, TypeScript, Recharts (existing dependency) for chart types it supports (line, area, bar, scatter), plain SVG/CSS for the two types it doesn't (donut ring, heatmap grid — matching the codebase's existing precedent of hand-built SVG for `CategoryMixChart`/`NetworkGraphCanvas` rather than pulling in a new charting dependency). Vitest + Testing Library, matching every existing `.test.tsx`.

## Global Constraints

- No new runtime dependencies (no D3, no new chart library) — Recharts + plain SVG/CSS only, per the approved design spec.
- No new backend endpoints. One exception, confirmed safe: `GET /api/geo/hotspots` already exists and is fully implemented in `KSP-CORE-PLATFORM` (`GeoController.java:78-83`) but has no frontend fetch function yet — wiring it up is frontend-only work, not new backend work.
- Dark theme only; reuse existing `tokens.css` variables (`--real`, `--predicted`, `--cat-1..5`, `--line`, `--muted`, `--panel`) — no new color values.
- Demo/synthetic data generators must be deterministic — **no `Math.random()`** — matching the explicit convention already documented throughout `mockData.ts` ("Deterministic ... no Math.random(), so results stay stable across reloads"). `Math.sin`/`Math.cos` over a fixed index are fine (already used for `weeklySeries` in `mockData.ts`); a seeded PRNG class is not needed and must not be introduced.
- Every new component gets a co-located `.test.tsx`/`.test.ts`, matching 100% of existing files in `src/`.
- `/insights` must still require a valid token (redirect anonymous users to `/login`), but must **not** narrow by role — implemented as `ProtectedRoute allowedRoles={[...all 7 role codes]}`, not by omitting `ProtectedRoute`, so the auth gate every other route has is preserved.

## Corrections made during planning (read before starting)

Three visualizations the approved design spec (`docs/superpowers/specs/2026-07-23-insights-analytics-dashboard-design.md`) classified as `LIVE` turned out, on verifying the actual backend RBAC checks, to 403 for some of the 7 roles. This plan fixes the classification; the spec's overall shape (which pillars, which route, which tabs) is unchanged:

1. **Overview → "Case Category Mix" donut**: the spec's `LIVE` classification confused two different fields. The real `categoryMix` (from `commandCenterApi`) is *crime-head* breakdown (Body/Property/Women/...), not *FIR-type* breakdown (FIR/UDR/Zero FIR/PAR/NCR) — there is no backend field for the latter at all. **Now DEMO.** (Crime Trends' "Crime Head Distribution" bar is the chart that genuinely uses `categoryMix`, unchanged.)
2. **Investigation Network → "Top Repeat Offenders" bar and "First-time vs Repeat" donut**: `/api/network/repeat-offenders` requires `STATE` scope **and** `rawCaseAccess=true` (`NetworkQueryService.requireFullNetworkAccess()`) — in practice **`SCRB_ANALYST`/`SUPER_ADMIN` only**; every other role gets a 403. **Now role-gated: LIVE for SCRB_ANALYST/SUPER_ADMIN, DEMO for the other 5 roles.**
3. **Crime Trends → "Incident Location Hotspots" scatter**: `/api/geo/hotspots` denies `UNIT`/`OWN_OR_UNIT` scope (`GeoAnalyticsQueryService.hotspots()`) — **`INVESTIGATOR`/`STATION_SUPERVISOR` get a 403**. **Now role-gated: LIVE for DISTRICT_SUPERVISOR/SCRB_ANALYST/POLICYMAKER/ADMIN/SUPER_ADMIN, DEMO for INVESTIGATOR/STATION_SUPERVISOR.** (Also: this endpoint returns precomputed DBSCAN *cluster centroids* — `{id, crimeSubHeadId, timeBucket, caseCount, centroidLat, centroidLon, districtId}` — not raw per-case points, so the live chart plots clusters sized by `caseCount`, not individual incidents.)

Overview's "Recent FIRs" table keeps the spec's original role split (LIVE for INVESTIGATOR/STATION_SUPERVISOR only, verified permissive/no extra 403 risk since it's the same `/api/cases?unitId=` call `CaseExplorerScreen` already makes for exactly those two roles).

## File structure

New:
- `src/api/demoAnalyticsData.ts` — every synthetic generator, grouped by pillar (Tasks 1-3)
- `src/api/demoAnalyticsData.test.ts`
- `src/api/insightsApi.ts` — pure role-gating + derived-data functions (Task 5)
- `src/api/insightsApi.test.ts`
- `src/screens/insights/DemoDataBadge.tsx` + `.test.tsx` (Task 6)
- `src/screens/insights/Donut.tsx` + `.test.tsx` (Task 6)
- `src/screens/insights/RankedBarList.tsx` + `.test.tsx` (Task 6)
- `src/screens/insights/InsightCard.tsx` + `.test.tsx` (Task 6)
- `src/screens/insights/HeatmapGrid.tsx` + `.test.tsx` (Task 7)
- `src/screens/insights/OverviewTab.tsx` + `.test.tsx` (Task 8)
- `src/screens/insights/CrimeTrendsTab.tsx` + `.test.tsx` (Task 9)
- `src/screens/insights/DemographicsTab.tsx` + `.test.tsx` (Task 10)
- `src/screens/insights/InvestigationNetworkTab.tsx` + `.test.tsx` (Task 11)
- `src/screens/insights/JudicialUnitsTab.tsx` + `.test.tsx` (Task 12)
- `src/screens/insights/InsightsScreen.tsx` + `.test.tsx` (Task 13)

Modified:
- `src/api/geoApi.ts` + `.test.tsx` — add `getHotspots`/`useHotspots` (Task 4)
- `src/design-system/components.css` — new `.insight-card*`, `.insight-grid`, `.donut-*`, `.heatmap-*`, `.insights-main` rules (Tasks 6, 7, 13)
- `src/app/App.tsx` + `.test.tsx` — new `/insights` route (Task 14)
- `src/app/Rail.tsx` + `.test.tsx` — new nav entry (Task 14)

---

### Task 1: Demo data generators — Overview & Crime Trends

**Files:**
- Create: `src/api/demoAnalyticsData.ts`
- Test: `src/api/demoAnalyticsData.test.ts`

**Interfaces:**
- Produces: `OverviewTrendPoint`, `getOverviewTrend()`, `CaseJourneyStage`, `getCaseJourneyStages()`, `CaseCategorySlice`, `getCaseCategoryMixDemo()`, `GravitySlice`, `getGravityMixDemo()`, `getRecentFirsDemo(): CaseSummaryResponse[]`, `CRIME_HEADS_DEMO: readonly string[]`, `CrimeHeadMonthlyPoint`, `getCrimeHeadMonthlyTrend()`, `CohortCell`, `getCohortHeatmap()`, `DistrictCrimeHeadCell`, `getDistrictCrimeHeadMatrix()`, `DemoHotspotPoint`, `getIncidentHotspotsDemo()`.
- Consumes: `CaseSummaryResponse` type from `./caseApi`.

- [ ] **Step 1: Write the failing test**

```ts
// src/api/demoAnalyticsData.test.ts
import { describe, it, expect } from 'vitest';
import {
  getOverviewTrend,
  getCaseJourneyStages,
  getCaseCategoryMixDemo,
  getGravityMixDemo,
  getRecentFirsDemo,
  getCrimeHeadMonthlyTrend,
  getCohortHeatmap,
  getDistrictCrimeHeadMatrix,
  getIncidentHotspotsDemo,
  CRIME_HEADS_DEMO,
} from './demoAnalyticsData';

describe('demoAnalyticsData: Overview + Crime Trends', () => {
  it('getOverviewTrend is deterministic and has 12 months of non-negative counts', () => {
    const a = getOverviewTrend();
    const b = getOverviewTrend();
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
    a.forEach((point) => {
      expect(point.registered).toBeGreaterThan(0);
      expect(point.chargesheeted).toBeGreaterThanOrEqual(0);
    });
  });

  it('getCaseJourneyStages sums to the state case count used elsewhere in mock data (12480)', () => {
    const stages = getCaseJourneyStages();
    const total = stages.reduce((sum, s) => sum + s.count, 0);
    expect(total).toBe(12480);
    expect(stages[0]).toEqual({ stage: 'Registered', count: 12480 });
  });

  it('getCaseCategoryMixDemo and getGravityMixDemo both sum to 12480', () => {
    expect(getCaseCategoryMixDemo().reduce((s, c) => s + c.count, 0)).toBe(12480);
    expect(getGravityMixDemo().reduce((s, g) => s + g.count, 0)).toBe(12480);
  });

  it('getRecentFirsDemo returns CaseSummaryResponse-shaped rows with negative synthetic ids', () => {
    const rows = getRecentFirsDemo();
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row.caseId).toBeLessThan(0);
      expect(row.crimeNumber).toBeTruthy();
      expect(row.station).toBeTruthy();
      expect(['registered', 'under_investigation', 'closed']).toContain(row.status);
    });
  });

  it('getCrimeHeadMonthlyTrend has one point per month with every crime head as a numeric key', () => {
    const trend = getCrimeHeadMonthlyTrend();
    expect(trend).toHaveLength(12);
    trend.forEach((point) => {
      CRIME_HEADS_DEMO.forEach((head) => {
        expect(typeof point[head]).toBe('number');
        expect(point[head] as number).toBeGreaterThan(0);
      });
    });
  });

  it('getCohortHeatmap covers 8 cohorts x 7 lag buckets with pct in [0,1]', () => {
    const cells = getCohortHeatmap();
    expect(cells).toHaveLength(8 * 7);
    cells.forEach((c) => {
      expect(c.pct).toBeGreaterThanOrEqual(0);
      expect(c.pct).toBeLessThanOrEqual(1);
    });
  });

  it('getDistrictCrimeHeadMatrix covers every demo district x every demo crime head', () => {
    const cells = getDistrictCrimeHeadMatrix();
    const districts = new Set(cells.map((c) => c.districtName));
    const heads = new Set(cells.map((c) => c.crimeHead));
    expect(cells).toHaveLength(districts.size * heads.size);
    expect(heads.size).toBe(CRIME_HEADS_DEMO.length);
  });

  it('getIncidentHotspotsDemo returns points clustered around 5 district centers', () => {
    const points = getIncidentHotspotsDemo();
    expect(points.length).toBe(40);
    points.forEach((p) => {
      expect(p.lat).toBeGreaterThan(10);
      expect(p.lat).toBeLessThan(19);
      expect(p.lon).toBeGreaterThan(73);
      expect(p.lon).toBeLessThan(79);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/api/demoAnalyticsData.test.ts`
Expected: FAIL — `Cannot find module './demoAnalyticsData'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/api/demoAnalyticsData.ts
// Always-on synthetic data for visualizations with no real backend endpoint (or, for a few
// endpoints that do exist, no access for every role -- see insightsApi.ts's canShowLiveX
// functions). Deterministic by construction (no Math.random()), matching the existing
// convention documented throughout mockData.ts. NOT gated behind the `ksp-mock` session-storage
// flag client.ts checks -- these charts have nothing real to fall back to in any mode, so they're
// just plain data, always on.

import type { CaseSummaryResponse } from './caseApi';

const MONTH_LABELS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

// ---- Overview ----

export interface OverviewTrendPoint {
  monthLabel: string;
  registered: number;
  chargesheeted: number;
}

export function getOverviewTrend(): OverviewTrendPoint[] {
  return MONTH_LABELS.map((monthLabel, i) => {
    const registered = 780 + (i % 4) * 40 + i * 6;
    const chargesheeted = Math.max(0, Math.round(registered * 0.6 - (11 - i) * 8));
    return { monthLabel, registered, chargesheeted };
  });
}

export interface CaseJourneyStage {
  stage: string;
  count: number;
}

export function getCaseJourneyStages(): CaseJourneyStage[] {
  return [
    { stage: 'Registered', count: 12480 },
    { stage: 'Under Investigation', count: 4210 },
    { stage: 'Chargesheeted', count: 6850 },
    { stage: 'Closed - False Case', count: 850 },
    { stage: 'Undetected', count: 570 },
  ];
}

export interface CaseCategorySlice {
  category: string;
  count: number;
}

// CaseCategory (FIR/UDR/Zero FIR/PAR/NCR) has no backend field anywhere -- distinct from
// commandCenterApi's categoryMix, which is crime-HEAD breakdown, not FIR-type breakdown.
export function getCaseCategoryMixDemo(): CaseCategorySlice[] {
  return [
    { category: 'FIR', count: 8736 },
    { category: 'UDR', count: 1248 },
    { category: 'Zero FIR', count: 998 },
    { category: 'PAR', count: 874 },
    { category: 'NCR', count: 624 },
  ];
}

export interface GravitySlice {
  gravity: string;
  count: number;
}

export function getGravityMixDemo(): GravitySlice[] {
  return [
    { gravity: 'Heinous', count: 2870 },
    { gravity: 'Non-Heinous', count: 9610 },
  ];
}

const RECENT_FIRS_DEMO_ROWS: Array<[string, string, string, string, string]> = [
  ['FIR26051201', '202612345', 'Theft of Motor Vehicle', 'Whitefield PS', 'Bengaluru Urban'],
  ['FIR26051202', '202612346', 'Chain Snatching', 'Koramangala PS', 'Bengaluru Urban'],
  ['FIR26051203', '202612347', 'Cheating', 'Mysuru Town PS', 'Mysuru'],
  ['FIR26051204', '202612348', 'Grievous Hurt', 'Belagavi Town PS', 'Belagavi'],
  ['FIR26051205', '202612349', 'Online Financial Fraud', 'Tumakuru Town PS', 'Tumakuru'],
  ['FIR26051206', '202612350', 'Burglary', 'Kalaburagi Town PS', 'Kalaburagi'],
  ['FIR26051207', '202612351', 'Dowry Death', 'Ballari Town PS', 'Ballari'],
  ['FIR26051208', '202612352', 'NDPS Violations', 'Hubli SubUrban PS', 'Dharwad'],
];

// Negative caseIds mark these as synthetic -- never a real case-explorer link target. The
// screen that renders this (OverviewTab) uses a plain, non-clickable table for this data, unlike
// the live branch which reuses <CaseList>'s clickable rows.
export function getRecentFirsDemo(): CaseSummaryResponse[] {
  const statuses = ['registered', 'under_investigation', 'closed'] as const;
  const gravities = ['heinous', 'serious', 'minor'] as const;
  return RECENT_FIRS_DEMO_ROWS.map(([crimeNumber, caseNumber, crimeSubHeadName, station, district], i) => ({
    caseId: -1000 - i,
    caseNumber,
    unitId: -1,
    unitName: station,
    crimeSubHeadId: -1,
    crimeSubHeadName,
    status: statuses[i % statuses.length],
    firDate: `2026-0${(i % 9) + 1}-1${i % 9}`,
    crimeNumber,
    station,
    district,
    gravity: gravities[i % gravities.length],
  }));
}

// ---- Crime Trends ----

export const CRIME_HEADS_DEMO = [
  'Crimes Against Body',
  'Crimes Against Property',
  'Crimes Against Women',
  'Economic Offences',
  'Cyber Crimes',
] as const;

export interface CrimeHeadMonthlyPoint {
  monthLabel: string;
  [head: string]: number | string;
}

export function getCrimeHeadMonthlyTrend(): CrimeHeadMonthlyPoint[] {
  const base: Record<string, number> = {
    'Crimes Against Body': 260,
    'Crimes Against Property': 400,
    'Crimes Against Women': 150,
    'Economic Offences': 135,
    'Cyber Crimes': 70,
  };
  return MONTH_LABELS.map((monthLabel, i) => {
    const point: CrimeHeadMonthlyPoint = { monthLabel };
    CRIME_HEADS_DEMO.forEach((head, h) => {
      point[head] = Math.round(base[head] + Math.sin((i + h) / 2) * base[head] * 0.12 + i * 2);
    });
    return point;
  });
}

export interface CohortCell {
  cohortLabel: string;
  lagLabel: string;
  pct: number;
}

export function getCohortHeatmap(): CohortCell[] {
  const cohorts = MONTH_LABELS.slice(0, 8);
  const lags = [0, 1, 2, 3, 4, 5, 6];
  const cells: CohortCell[] = [];
  cohorts.forEach((cohortLabel, ci) => {
    lags.forEach((lag) => {
      const pct = Math.min(0.92, 0.08 * lag + 0.03 * ci + 0.05);
      cells.push({ cohortLabel, lagLabel: `M+${lag}`, pct: Number(pct.toFixed(2)) });
    });
  });
  return cells;
}

export interface DistrictCrimeHeadCell {
  districtName: string;
  crimeHead: string;
  count: number;
}

// Case-count weights copied from mockData.ts's MOCK_DISTRICTS so this matrix's per-district
// totals are consistent with the numbers Command Center already shows in mock mode.
const TOP_DISTRICTS_DEMO: Array<[string, number]> = [
  ['Bengaluru Urban', 1840],
  ['Mysuru', 687],
  ['Tumakuru', 678],
  ['Belagavi', 586],
  ['Kalaburagi', 526],
  ['Dakshina Kannada', 396],
  ['Shivamogga', 406],
  ['Ballari', 350],
];

export function getDistrictCrimeHeadMatrix(): DistrictCrimeHeadCell[] {
  const headShare: Record<string, number> = {
    'Crimes Against Body': 0.22,
    'Crimes Against Property': 0.35,
    'Crimes Against Women': 0.16,
    'Economic Offences': 0.15,
    'Cyber Crimes': 0.12,
  };
  const cells: DistrictCrimeHeadCell[] = [];
  TOP_DISTRICTS_DEMO.forEach(([districtName, weight]) => {
    CRIME_HEADS_DEMO.forEach((crimeHead) => {
      cells.push({ districtName, crimeHead, count: Math.round(weight * headShare[crimeHead]) });
    });
  });
  return cells;
}

export interface DemoHotspotPoint {
  lat: number;
  lon: number;
  crimeHead: string;
}

// Fallback for roles GeoAnalyticsQueryService.hotspots() 403s (INVESTIGATOR/STATION_SUPERVISOR
// -- UNIT/OWN_OR_UNIT scope isn't allowed to call the district-granularity cluster endpoint).
export function getIncidentHotspotsDemo(): DemoHotspotPoint[] {
  const centers: Array<[number, number]> = [
    [12.97, 77.59],
    [12.3, 76.64],
    [13.34, 77.1],
    [15.85, 74.5],
    [17.33, 76.83],
  ];
  const points: DemoHotspotPoint[] = [];
  centers.forEach(([lat, lon], ci) => {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      points.push({
        lat: Number((lat + Math.sin(angle + ci) * 0.18).toFixed(4)),
        lon: Number((lon + Math.cos(angle + ci) * 0.18).toFixed(4)),
        crimeHead: CRIME_HEADS_DEMO[(ci + i) % CRIME_HEADS_DEMO.length],
      });
    }
  });
  return points;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/api/demoAnalyticsData.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/api/demoAnalyticsData.test.ts
git commit -m "feat: add Overview and Crime Trends demo data generators"
```

---

### Task 2: Demo data generators — Demographics

**Files:**
- Modify: `src/api/demoAnalyticsData.ts` (append)
- Modify: `src/api/demoAnalyticsData.test.ts` (append)

**Interfaces:**
- Produces: `GenderSlice`, `getVictimGenderDemo()`, `getAccusedGenderDemo()`, `getComplainantGenderDemo()`, `AgeBandCount`, `getAgeDistributionDemo()`, `LabeledCount`, `getReligionDemo()`, `getCasteDemo()`, `getOccupationDemo()`, `GenderCrimeHeadCrossTab`, `getVictimGenderByCrimeHeadDemo()`.
- Consumes: `CRIME_HEADS_DEMO` from Task 1 (same file).

- [ ] **Step 1: Write the failing test**

Append to `src/api/demoAnalyticsData.test.ts`:

```ts
import {
  getVictimGenderDemo,
  getAccusedGenderDemo,
  getComplainantGenderDemo,
  getAgeDistributionDemo,
  getReligionDemo,
  getCasteDemo,
  getOccupationDemo,
  getVictimGenderByCrimeHeadDemo,
} from './demoAnalyticsData';

describe('demoAnalyticsData: Demographics', () => {
  it('all three gender donuts have exactly Male/Female/Third Gender slices with positive counts', () => {
    [getVictimGenderDemo(), getAccusedGenderDemo(), getComplainantGenderDemo()].forEach((slices) => {
      expect(slices.map((s) => s.gender).sort()).toEqual(['Female', 'Male', 'Third Gender'].sort());
      slices.forEach((s) => expect(s.count).toBeGreaterThan(0));
    });
  });

  it('getAgeDistributionDemo covers 16 five-year bands from 0-4 to 75+ with a single peak', () => {
    const bands = getAgeDistributionDemo();
    expect(bands).toHaveLength(16);
    expect(bands[0].band).toBe('0-4');
    expect(bands[bands.length - 1].band).toBe('75+');
    const peakIndex = bands.reduce((best, b, i) => (b.victims > bands[best].victims ? i : best), 0);
    expect(peakIndex).toBeGreaterThan(0);
    expect(peakIndex).toBeLessThan(bands.length - 1);
  });

  it('religion, caste, and occupation demo bars each have positive counts and unique labels', () => {
    [getReligionDemo(), getCasteDemo(), getOccupationDemo()].forEach((rows) => {
      const labels = rows.map((r) => r.label);
      expect(new Set(labels).size).toBe(labels.length);
      rows.forEach((r) => expect(r.count).toBeGreaterThan(0));
    });
  });

  it('getVictimGenderByCrimeHeadDemo has one row per demo crime head, percentages summing to ~100', () => {
    const rows = getVictimGenderByCrimeHeadDemo();
    expect(rows).toHaveLength(5);
    rows.forEach((row) => {
      expect(row.malePct + row.femalePct + row.thirdGenderPct).toBe(100);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/api/demoAnalyticsData.test.ts`
Expected: FAIL — `getVictimGenderDemo` (and siblings) not exported

- [ ] **Step 3: Write minimal implementation**

Append to `src/api/demoAnalyticsData.ts`:

```ts
// ---- Demographics ----

export interface GenderSlice {
  gender: string;
  count: number;
}

export function getVictimGenderDemo(): GenderSlice[] {
  return [
    { gender: 'Male', count: 5310 },
    { gender: 'Female', count: 6890 },
    { gender: 'Third Gender', count: 280 },
  ];
}

export function getAccusedGenderDemo(): GenderSlice[] {
  return [
    { gender: 'Male', count: 10820 },
    { gender: 'Female', count: 1520 },
    { gender: 'Third Gender', count: 140 },
  ];
}

export function getComplainantGenderDemo(): GenderSlice[] {
  return [
    { gender: 'Male', count: 7240 },
    { gender: 'Female', count: 5100 },
    { gender: 'Third Gender', count: 140 },
  ];
}

export interface AgeBandCount {
  band: string;
  victims: number;
  accused: number;
}

const AGE_BANDS = [
  '0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39',
  '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75+',
];

export function getAgeDistributionDemo(): AgeBandCount[] {
  const peakIndex = 6; // 30-34 band
  return AGE_BANDS.map((band, i) => {
    const distance = Math.abs(i - peakIndex);
    return {
      band,
      victims: Math.max(20, Math.round(620 - distance * distance * 9)),
      accused: Math.max(15, Math.round(540 - distance * distance * 8)),
    };
  });
}

export interface LabeledCount {
  label: string;
  count: number;
}

export function getReligionDemo(): LabeledCount[] {
  return [
    { label: 'Hindu', count: 8985 },
    { label: 'Muslim', count: 1872 },
    { label: 'Christian', count: 874 },
    { label: 'Jain', count: 250 },
    { label: 'Sikh', count: 125 },
    { label: 'Buddhist', count: 250 },
    { label: 'Other', count: 124 },
  ];
}

export function getCasteDemo(): LabeledCount[] {
  return [
    { label: 'General', count: 2746 },
    { label: 'OBC', count: 4742 },
    { label: 'SC', count: 2496 },
    { label: 'ST', count: 1498 },
    { label: 'Other', count: 998 },
  ];
}

export function getOccupationDemo(): LabeledCount[] {
  return [
    { label: 'Farmer', count: 2246 },
    { label: 'Govt Employee', count: 1248 },
    { label: 'Private Employee', count: 2496 },
    { label: 'Business', count: 1872 },
    { label: 'Student', count: 1498 },
    { label: 'Daily Wage Labour', count: 1747 },
    { label: 'Homemaker', count: 998 },
    { label: 'Unemployed', count: 375 },
  ];
}

export interface GenderCrimeHeadCrossTab {
  crimeHead: string;
  malePct: number;
  femalePct: number;
  thirdGenderPct: number;
}

export function getVictimGenderByCrimeHeadDemo(): GenderCrimeHeadCrossTab[] {
  return [
    { crimeHead: 'Crimes Against Body', malePct: 62, femalePct: 36, thirdGenderPct: 2 },
    { crimeHead: 'Crimes Against Property', malePct: 58, femalePct: 40, thirdGenderPct: 2 },
    { crimeHead: 'Crimes Against Women', malePct: 3, femalePct: 96, thirdGenderPct: 1 },
    { crimeHead: 'Economic Offences', malePct: 54, femalePct: 44, thirdGenderPct: 2 },
    { crimeHead: 'Cyber Crimes', malePct: 49, femalePct: 49, thirdGenderPct: 2 },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/api/demoAnalyticsData.test.ts`
Expected: PASS (11 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/api/demoAnalyticsData.test.ts
git commit -m "feat: add Demographics demo data generators"
```

---

### Task 3: Demo data generators — Investigation Network & Judicial/Units

**Files:**
- Modify: `src/api/demoAnalyticsData.ts` (append)
- Modify: `src/api/demoAnalyticsData.test.ts` (append)

**Interfaces:**
- Produces: `RepeatOffenderDemoRow`, `getRepeatOffendersDemo()`, `getFirstTimeVsRepeatDemo()`, `LinkageBar`, `getCrimeHeadActLinkageDemo()`, `ArrestSurrenderPoint`, `getArrestsVsSurrendersDemo()`, `IoLeaderboardRow`, `getIoLeaderboardDemo()`, `CourtPendingRow`, `getCourtPendingDemo()`, `OutcomeSlice`, `getFinalReportOutcomeDemo()`, `UnitCaseLoad`, `getDistrictUnitCaseLoadDemo()`, `RankHeadcount`, `getRankDistributionDemo()`, `UnitPerformanceRow`, `getUnitPerformanceDemo()`.

- [ ] **Step 1: Write the failing test**

Append to `src/api/demoAnalyticsData.test.ts`:

```ts
import {
  getRepeatOffendersDemo,
  getFirstTimeVsRepeatDemo,
  getCrimeHeadActLinkageDemo,
  getArrestsVsSurrendersDemo,
  getIoLeaderboardDemo,
  getCourtPendingDemo,
  getFinalReportOutcomeDemo,
  getDistrictUnitCaseLoadDemo,
  getRankDistributionDemo,
  getUnitPerformanceDemo,
} from './demoAnalyticsData';

describe('demoAnalyticsData: Investigation Network + Judicial & Units', () => {
  it('getRepeatOffendersDemo is sorted descending by caseCount with masked-style names', () => {
    const rows = getRepeatOffendersDemo();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].caseCount).toBeLessThanOrEqual(rows[i - 1].caseCount);
    }
    rows.forEach((r) => expect(r.displayName).toMatch(/^\S\*+ \S\*+$/));
  });

  it('getFirstTimeVsRepeatDemo returns two positive counts', () => {
    const { firstTime, repeat } = getFirstTimeVsRepeatDemo();
    expect(firstTime).toBeGreaterThan(0);
    expect(repeat).toBeGreaterThan(0);
  });

  it('getCrimeHeadActLinkageDemo and getArrestsVsSurrendersDemo produce non-empty positive series', () => {
    getCrimeHeadActLinkageDemo().forEach((row) => expect(row.count).toBeGreaterThan(0));
    const arrests = getArrestsVsSurrendersDemo();
    expect(arrests).toHaveLength(12);
    arrests.forEach((row) => {
      expect(row.arrests).toBeGreaterThan(0);
      expect(row.surrenders).toBeGreaterThan(0);
    });
  });

  it('getIoLeaderboardDemo rows have masked-style officer names and a rate in [0,100]', () => {
    getIoLeaderboardDemo().forEach((row) => {
      expect(row.officer).toMatch(/^\S\*+ \S\*+$/);
      expect(row.chargesheetRatePct).toBeGreaterThanOrEqual(0);
      expect(row.chargesheetRatePct).toBeLessThanOrEqual(100);
    });
  });

  it('getCourtPendingDemo and getFinalReportOutcomeDemo are non-empty positive series', () => {
    expect(getCourtPendingDemo().length).toBeGreaterThan(0);
    getFinalReportOutcomeDemo().forEach((row) => expect(row.count).toBeGreaterThan(0));
  });

  it('getDistrictUnitCaseLoadDemo covers multiple units per district, all positive counts', () => {
    const rows = getDistrictUnitCaseLoadDemo();
    const byDistrict = new Map<string, number>();
    rows.forEach((r) => byDistrict.set(r.districtName, (byDistrict.get(r.districtName) ?? 0) + 1));
    byDistrict.forEach((count) => expect(count).toBeGreaterThan(1));
    rows.forEach((r) => expect(r.caseCount).toBeGreaterThan(0));
  });

  it('getRankDistributionDemo forms a pyramid: DGP has the smallest headcount, Constable the largest', () => {
    const ranks = getRankDistributionDemo();
    const dgp = ranks.find((r) => r.rank === 'DGP')!;
    const constable = ranks.find((r) => r.rank === 'Constable')!;
    expect(dgp.headcount).toBeLessThan(constable.headcount);
    ranks.forEach((r) => expect(r.headcount).toBeGreaterThan(0));
  });

  it('getUnitPerformanceDemo rows have a pending share in [0,100]', () => {
    getUnitPerformanceDemo().forEach((row) => {
      expect(row.pendingSharePct).toBeGreaterThanOrEqual(0);
      expect(row.pendingSharePct).toBeLessThanOrEqual(100);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/api/demoAnalyticsData.test.ts`
Expected: FAIL — the new exports don't exist yet

- [ ] **Step 3: Write minimal implementation**

Append to `src/api/demoAnalyticsData.ts`:

```ts
// ---- Investigation Network ----

export interface RepeatOffenderDemoRow {
  displayName: string;
  caseCount: number;
}

// Fallback for roles NetworkQueryService.requireFullNetworkAccess() 403s -- everyone except
// SCRB_ANALYST/SUPER_ADMIN (STATE scope + rawCaseAccess=true required).
export function getRepeatOffendersDemo(): RepeatOffenderDemoRow[] {
  return [
    { displayName: 'M**** K****', caseCount: 7 },
    { displayName: 'R**** P****', caseCount: 6 },
    { displayName: 'S**** N****', caseCount: 5 },
    { displayName: 'A**** V****', caseCount: 5 },
    { displayName: 'G**** H****', caseCount: 4 },
    { displayName: 'D**** S****', caseCount: 4 },
    { displayName: 'K**** B****', caseCount: 3 },
    { displayName: 'P**** M****', caseCount: 3 },
    { displayName: 'V**** T****', caseCount: 2 },
    { displayName: 'N**** L****', caseCount: 2 },
  ];
}

export function getFirstTimeVsRepeatDemo(): { firstTime: number; repeat: number } {
  return { firstTime: 9840, repeat: 1720 };
}

export interface LinkageBar {
  label: string;
  count: number;
}

export function getCrimeHeadActLinkageDemo(): LinkageBar[] {
  return [
    { label: 'Crimes Against Property → IPC', count: 4680 },
    { label: 'Crimes Against Body → IPC', count: 3120 },
    { label: 'Crimes Against Women → IPC', count: 1580 },
    { label: 'Economic Offences → IPC', count: 900 },
    { label: 'Cyber Crimes → IT Act 2000', count: 780 },
    { label: 'Economic Offences → IT Act 2000', count: 640 },
    { label: 'Crimes Against Women → SC/ST (POA) Act', count: 420 },
  ];
}

export interface ArrestSurrenderPoint {
  monthLabel: string;
  arrests: number;
  surrenders: number;
}

export function getArrestsVsSurrendersDemo(): ArrestSurrenderPoint[] {
  return MONTH_LABELS.map((monthLabel, i) => ({
    monthLabel,
    arrests: 340 + (i % 3) * 22 + i * 4,
    surrenders: 60 + (i % 4) * 6,
  }));
}

export interface IoLeaderboardRow {
  officer: string;
  unit: string;
  casesHandled: number;
  chargesheetRatePct: number;
  avgDaysToChargesheet: number;
}

export function getIoLeaderboardDemo(): IoLeaderboardRow[] {
  return [
    { officer: 'R**** K****', unit: 'Whitefield PS', casesHandled: 84, chargesheetRatePct: 71, avgDaysToChargesheet: 42 },
    { officer: 'S**** M****', unit: 'Hubli SubUrban PS', casesHandled: 76, chargesheetRatePct: 68, avgDaysToChargesheet: 47 },
    { officer: 'P**** N****', unit: 'Mysuru Town PS', casesHandled: 71, chargesheetRatePct: 74, avgDaysToChargesheet: 39 },
    { officer: 'V**** G****', unit: 'Belagavi Rural PS', casesHandled: 68, chargesheetRatePct: 65, avgDaysToChargesheet: 51 },
    { officer: 'A**** S****', unit: 'Kalaburagi Town PS', casesHandled: 63, chargesheetRatePct: 70, avgDaysToChargesheet: 44 },
    { officer: 'D**** R****', unit: 'Tumakuru Circle Office', casesHandled: 59, chargesheetRatePct: 66, avgDaysToChargesheet: 49 },
    { officer: 'K**** P****', unit: 'Ballari Town PS', casesHandled: 55, chargesheetRatePct: 72, avgDaysToChargesheet: 41 },
    { officer: 'N**** H****', unit: 'Shivamogga Rural PS', casesHandled: 52, chargesheetRatePct: 63, avgDaysToChargesheet: 53 },
  ];
}

// ---- Judicial & Units ----

export interface CourtPendingRow {
  court: string;
  pending: number;
}

export function getCourtPendingDemo(): CourtPendingRow[] {
  return [
    { court: 'Bengaluru City Civil & Sessions Court', pending: 612 },
    { court: 'Mysuru District & Sessions Court', pending: 348 },
    { court: 'Belagavi Fast Track Court', pending: 297 },
    { court: 'Tumakuru JMFC Court', pending: 264 },
    { court: 'Kalaburagi District & Sessions Court', pending: 231 },
    { court: 'Ballari Civil Court', pending: 198 },
    { court: 'Dakshina Kannada JMFC Court', pending: 176 },
    { court: 'Shivamogga Fast Track Court', pending: 154 },
    { court: 'Hassan District & Sessions Court', pending: 132 },
    { court: 'Vijayapura JMFC Court', pending: 118 },
    { court: 'Raichur Civil Court', pending: 97 },
    { court: 'Udupi Fast Track Court', pending: 84 },
  ];
}

export interface OutcomeSlice {
  outcome: string;
  count: number;
}

export function getFinalReportOutcomeDemo(): OutcomeSlice[] {
  return [
    { outcome: 'Chargesheet (A)', count: 6850 },
    { outcome: 'False Case (B)', count: 850 },
    { outcome: 'Undetected (C)', count: 570 },
  ];
}

export interface UnitCaseLoad {
  districtName: string;
  unitName: string;
  caseCount: number;
}

const DISTRICT_UNITS_DEMO: Record<string, string[]> = {
  'Bengaluru Urban': ['Whitefield PS', 'Koramangala PS', 'Yeshwanthpur PS', 'Electronic City PS'],
  Mysuru: ['Mysuru Town PS', 'Mysuru Rural PS', 'Nazarbad PS'],
  Tumakuru: ['Tumakuru Town PS', 'Tumakuru Rural PS', 'Tumakuru Circle Office'],
  Belagavi: ['Belagavi Town PS', 'Belagavi Rural PS', 'Belagavi Circle Office'],
  Kalaburagi: ['Kalaburagi Town PS', 'Kalaburagi Rural PS'],
};

const DISTRICT_WEIGHTS_DEMO: Record<string, number> = {
  'Bengaluru Urban': 1840,
  Mysuru: 687,
  Tumakuru: 678,
  Belagavi: 586,
  Kalaburagi: 526,
};

export function getDistrictUnitCaseLoadDemo(): UnitCaseLoad[] {
  const rows: UnitCaseLoad[] = [];
  Object.entries(DISTRICT_UNITS_DEMO).forEach(([districtName, units]) => {
    const share = Math.round(DISTRICT_WEIGHTS_DEMO[districtName] / units.length);
    units.forEach((unitName, i) => {
      rows.push({ districtName, unitName, caseCount: Math.max(20, share - i * Math.round(share * 0.12)) });
    });
  });
  return rows;
}

export interface RankHeadcount {
  rank: string;
  headcount: number;
}

export function getRankDistributionDemo(): RankHeadcount[] {
  return [
    { rank: 'DGP', headcount: 1 },
    { rank: 'ADGP', headcount: 6 },
    { rank: 'IGP', headcount: 14 },
    { rank: 'DIG', headcount: 22 },
    { rank: 'SP', headcount: 34 },
    { rank: 'Addl. SP', headcount: 41 },
    { rank: 'DySP', headcount: 96 },
    { rank: 'Circle Inspector', headcount: 210 },
    { rank: 'Police Inspector', headcount: 480 },
    { rank: 'Sub-Inspector', headcount: 920 },
    { rank: 'ASI', headcount: 1380 },
    { rank: 'Head Constable', headcount: 2860 },
    { rank: 'Constable', headcount: 6240 },
  ];
}

export interface UnitPerformanceRow {
  unitName: string;
  caseCount: number;
  pendingSharePct: number;
  avgResolutionDays: number;
}

export function getUnitPerformanceDemo(): UnitPerformanceRow[] {
  return [
    { unitName: 'Whitefield PS', caseCount: 412, pendingSharePct: 28, avgResolutionDays: 46 },
    { unitName: 'Koramangala PS', caseCount: 388, pendingSharePct: 31, avgResolutionDays: 52 },
    { unitName: 'Mysuru Town PS', caseCount: 356, pendingSharePct: 24, avgResolutionDays: 41 },
    { unitName: 'Hubli SubUrban PS', caseCount: 329, pendingSharePct: 33, avgResolutionDays: 55 },
    { unitName: 'Belagavi Town PS', caseCount: 301, pendingSharePct: 27, avgResolutionDays: 44 },
    { unitName: 'Tumakuru Town PS', caseCount: 284, pendingSharePct: 29, avgResolutionDays: 48 },
    { unitName: 'Kalaburagi Town PS', caseCount: 263, pendingSharePct: 35, avgResolutionDays: 58 },
    { unitName: 'Ballari Town PS', caseCount: 241, pendingSharePct: 26, avgResolutionDays: 43 },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/api/demoAnalyticsData.test.ts`
Expected: PASS (19 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/api/demoAnalyticsData.test.ts
git commit -m "feat: add Investigation Network and Judicial & Units demo data generators"
```

---

### Task 4: Wire up the existing `/api/geo/hotspots` endpoint

**Files:**
- Modify: `src/api/geoApi.ts`
- Modify: `src/api/geoApi.test.tsx`

**Interfaces:**
- Produces: `HotspotClusterResponse` interface, `getHotspots(token, enabled, crimeSubHeadId?)`, `useHotspots(token, enabled, crimeSubHeadId?)`.
- Consumes: `apiFetch` from `./client` (existing).

- [ ] **Step 1: Write the failing test**

Append to `src/api/geoApi.test.tsx` (check the existing file's top-of-file mock-fetch setup first and follow the same pattern used for other `getX`/`useX` pairs in that file):

```tsx
import { getHotspots, useHotspots, type HotspotClusterResponse } from './geoApi';

describe('getHotspots / useHotspots', () => {
  const sample: HotspotClusterResponse[] = [
    { id: 1, crimeSubHeadId: 12, timeBucket: 'evening', caseCount: 14, centroidLat: 12.97, centroidLon: 77.59, districtId: 5 },
  ];

  it('getHotspots calls /api/geo/hotspots with no query string when crimeSubHeadId is omitted', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    );
    const result = await getHotspots('jwt', 5);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/geo/hotspots'), expect.anything());
    expect(fetchSpy.mock.calls[0][0]).not.toContain('crimeSubHeadId');
    expect(result).toEqual(sample);
  });

  it('getHotspots appends crimeSubHeadId when provided', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    );
    await getHotspots('jwt', 5, 12);
    expect(fetchSpy.mock.calls[0][0]).toContain('crimeSubHeadId=12');
  });
});
```

Note: match this file's *actual* existing test setup for mocking `fetch`/`apiFetch` (open `src/api/geoApi.test.tsx` first and copy its established pattern for e.g. `getStationIncidents`'s test) rather than the illustrative sketch above if it differs — the assertions (no query string when omitted, `crimeSubHeadId=12` when provided, response passed through unchanged) are what must hold either way.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/api/geoApi.test.tsx`
Expected: FAIL — `getHotspots`/`useHotspots`/`HotspotClusterResponse` not exported

- [ ] **Step 3: Write minimal implementation**

Append to `src/api/geoApi.ts`:

```ts
export interface HotspotClusterResponse {
  id: number;
  crimeSubHeadId: number;
  timeBucket: string;
  caseCount: number;
  centroidLat: number;
  centroidLon: number;
  districtId: number;
}

// GET /api/geo/hotspots -- precomputed PostGIS ST_ClusterDBSCAN clusters, district-granularity.
// Denies UNIT/OWN_OR_UNIT scope server-side (GeoAnalyticsQueryService.hotspots()), so callers
// must gate this behind insightsApi.ts's canShowLiveHotspots(roles) before enabling the hook --
// this file has no role awareness of its own, same as every other function here.
export function getHotspots(token: string | null, enabled: boolean, crimeSubHeadId?: number): Promise<HotspotClusterResponse[]> {
  if (!enabled) return Promise.resolve([]);
  const query = new URLSearchParams();
  if (crimeSubHeadId != null) query.set('crimeSubHeadId', String(crimeSubHeadId));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<HotspotClusterResponse[]>(`/api/geo/hotspots${suffix}`, {}, token);
}

export function useHotspots(token: string | null, enabled: boolean, crimeSubHeadId?: number) {
  return useQuery({
    queryKey: ['geo-hotspots', crimeSubHeadId],
    queryFn: () => getHotspots(token, enabled, crimeSubHeadId),
    staleTime: 5 * 60_000,
    enabled: token != null && enabled,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/api/geoApi.test.tsx`
Expected: PASS (all existing geoApi tests plus the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/api/geoApi.ts src/api/geoApi.test.tsx
git commit -m "feat: wire up the existing GET /api/geo/hotspots endpoint"
```

---

### Task 5: `insightsApi.ts` — role gating and derived data

**Files:**
- Create: `src/api/insightsApi.ts`
- Test: `src/api/insightsApi.test.ts`

**Interfaces:**
- Produces: `canShowLiveRecentFirs(roles, unitId)`, `canShowLiveHotspots(roles)`, `canShowLiveRepeatOffenderData(roles)`, `deriveRepeatVsFirstTime(offenders)`.
- Consumes: `RepeatOffenderResponse` type from `./networkApi`.

- [ ] **Step 1: Write the failing test**

```ts
// src/api/insightsApi.test.ts
import { describe, it, expect } from 'vitest';
import {
  canShowLiveRecentFirs,
  canShowLiveHotspots,
  canShowLiveRepeatOffenderData,
  deriveRepeatVsFirstTime,
} from './insightsApi';
import type { RepeatOffenderResponse } from './networkApi';

describe('canShowLiveRecentFirs', () => {
  it('is true only for INVESTIGATOR/STATION_SUPERVISOR with a resolved unitId', () => {
    expect(canShowLiveRecentFirs(['INVESTIGATOR'], 12)).toBe(true);
    expect(canShowLiveRecentFirs(['STATION_SUPERVISOR'], 12)).toBe(true);
    expect(canShowLiveRecentFirs(['INVESTIGATOR'], null)).toBe(false);
    expect(canShowLiveRecentFirs(['DISTRICT_SUPERVISOR'], 12)).toBe(false);
    expect(canShowLiveRecentFirs(['SCRB_ANALYST'], 12)).toBe(false);
  });
});

describe('canShowLiveHotspots', () => {
  it('is false for the two UNIT/OWN_OR_UNIT-scoped roles, true for the rest', () => {
    expect(canShowLiveHotspots(['INVESTIGATOR'])).toBe(false);
    expect(canShowLiveHotspots(['STATION_SUPERVISOR'])).toBe(false);
    expect(canShowLiveHotspots(['DISTRICT_SUPERVISOR'])).toBe(true);
    expect(canShowLiveHotspots(['SCRB_ANALYST'])).toBe(true);
    expect(canShowLiveHotspots(['POLICYMAKER'])).toBe(true);
    expect(canShowLiveHotspots(['ADMIN'])).toBe(true);
    expect(canShowLiveHotspots(['SUPER_ADMIN'])).toBe(true);
  });
});

describe('canShowLiveRepeatOffenderData', () => {
  it('is true only for SCRB_ANALYST or SUPER_ADMIN', () => {
    expect(canShowLiveRepeatOffenderData(['SCRB_ANALYST'])).toBe(true);
    expect(canShowLiveRepeatOffenderData(['SUPER_ADMIN'])).toBe(true);
    expect(canShowLiveRepeatOffenderData(['DISTRICT_SUPERVISOR'])).toBe(false);
    expect(canShowLiveRepeatOffenderData(['POLICYMAKER'])).toBe(false);
    expect(canShowLiveRepeatOffenderData(['INVESTIGATOR'])).toBe(false);
  });
});

describe('deriveRepeatVsFirstTime', () => {
  it('splits offenders into first-time (caseCount===1) and repeat (caseCount>=2)', () => {
    const offenders: RepeatOffenderResponse[] = [
      { personId: 1, displayName: 'A', caseCount: 1, gravityWeight: 1, confidenceScore: 0.9 },
      { personId: 2, displayName: 'B', caseCount: 1, gravityWeight: 1, confidenceScore: 0.9 },
      { personId: 3, displayName: 'C', caseCount: 3, gravityWeight: 1, confidenceScore: 0.9 },
    ];
    expect(deriveRepeatVsFirstTime(offenders)).toEqual({ firstTime: 2, repeat: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(deriveRepeatVsFirstTime([])).toEqual({ firstTime: 0, repeat: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/api/insightsApi.test.ts`
Expected: FAIL — `Cannot find module './insightsApi'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/api/insightsApi.ts
// Pure role-gating and derived-data helpers for the /insights screen. No fetch calls of its own
// -- screens call the existing hooks (useCases, useHotspots, useRepeatOffenders) directly and use
// these functions only to decide whether it's safe to enable the live one for the current role,
// per the corrections documented in docs/superpowers/plans/2026-07-23-insights-analytics-dashboard.md.

import type { RepeatOffenderResponse } from './networkApi';

// caseApi.getCases requires a single unitId and has no multi-unit/state-wide equivalent, so
// Recent FIRs can only be live for the two unit-scoped roles once /api/me has resolved a unitId.
export function canShowLiveRecentFirs(roles: string[], unitId: number | null): boolean {
  return unitId != null && (roles.includes('INVESTIGATOR') || roles.includes('STATION_SUPERVISOR'));
}

// GeoAnalyticsQueryService.hotspots() 403s UNIT/OWN_OR_UNIT scope callers.
const HOTSPOT_DENIED_ROLES = new Set(['INVESTIGATOR', 'STATION_SUPERVISOR']);

export function canShowLiveHotspots(roles: string[]): boolean {
  return !roles.some((role) => HOTSPOT_DENIED_ROLES.has(role));
}

// NetworkQueryService.requireFullNetworkAccess() requires STATE scope + rawCaseAccess=true --
// only SCRB_ANALYST and the SUPER_ADMIN demo bypass satisfy that.
export function canShowLiveRepeatOffenderData(roles: string[]): boolean {
  return roles.includes('SCRB_ANALYST') || roles.includes('SUPER_ADMIN');
}

export function deriveRepeatVsFirstTime(offenders: RepeatOffenderResponse[]): { firstTime: number; repeat: number } {
  let firstTime = 0;
  let repeat = 0;
  offenders.forEach((o) => {
    if (o.caseCount >= 2) repeat += 1;
    else firstTime += 1;
  });
  return { firstTime, repeat };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/api/insightsApi.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/api/insightsApi.ts src/api/insightsApi.test.ts
git commit -m "feat: add role-gating and derived-data helpers for Insights"
```

---

### Task 6: Shared chart primitives — DemoDataBadge, Donut, RankedBarList, InsightCard

**Files:**
- Create: `src/screens/insights/DemoDataBadge.tsx`, `.test.tsx`
- Create: `src/screens/insights/Donut.tsx`, `.test.tsx`
- Create: `src/screens/insights/RankedBarList.tsx`, `.test.tsx`
- Create: `src/screens/insights/InsightCard.tsx`, `.test.tsx`
- Modify: `src/design-system/components.css`

**Interfaces:**
- Produces: `DemoDataBadge()`, `Donut({ slices: {label,value}[] })`, `RankedBarList({ items: {label,value}[], valueFormatter? })`, `InsightCard({ title, note?, live, children })`.
- Consumes: nothing new (reuses `.chip`, `.cat-legend*`, `.cat-bars`/`.cat-bar-row`/`.cat-bar-track`/`.cat-bar-fill`/`.cat-bar-label`/`.cat-bar-count` from `components.css`, unchanged).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/screens/insights/DemoDataBadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemoDataBadge } from './DemoDataBadge';

describe('DemoDataBadge', () => {
  it('renders a "Demo data" chip', () => {
    render(<DemoDataBadge />);
    expect(screen.getByText('Demo data')).toBeInTheDocument();
  });
});
```

```tsx
// src/screens/insights/Donut.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Donut } from './Donut';

describe('Donut', () => {
  it('renders the total in the center and every slice label with its percentage', () => {
    render(<Donut slices={[{ label: 'Heinous', value: 30 }, { label: 'Non-Heinous', value: 70 }]} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/Heinous \(30%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Non-Heinous \(70%\)/)).toBeInTheDocument();
  });

  it('renders 0% slices without dividing by zero when total is 0', () => {
    render(<Donut slices={[{ label: 'Empty', value: 0 }]} />);
    expect(screen.getByText(/Empty \(0%\)/)).toBeInTheDocument();
  });
});
```

```tsx
// src/screens/insights/RankedBarList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankedBarList } from './RankedBarList';

describe('RankedBarList', () => {
  it('renders items sorted descending by value regardless of input order', () => {
    render(<RankedBarList items={[{ label: 'Low', value: 5 }, { label: 'High', value: 50 }]} />);
    const labels = screen.getAllByText(/Low|High/).map((el) => el.textContent);
    expect(labels.indexOf('High')).toBeLessThan(labels.indexOf('Low'));
  });

  it('applies a custom valueFormatter when provided', () => {
    render(<RankedBarList items={[{ label: 'Rate', value: 71 }]} valueFormatter={(v) => `${v}%`} />);
    expect(screen.getByText('71%')).toBeInTheDocument();
  });
});
```

```tsx
// src/screens/insights/InsightCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightCard } from './InsightCard';

describe('InsightCard', () => {
  it('renders the title and children, with no Demo data badge when live', () => {
    render(<InsightCard title="Top Districts" live><p>chart</p></InsightCard>);
    expect(screen.getByText('Top Districts')).toBeInTheDocument();
    expect(screen.getByText('chart')).toBeInTheDocument();
    expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
  });

  it('renders the Demo data badge and an optional note when not live', () => {
    render(
      <InsightCard title="Gravity of Offence" live={false} note="Representative data.">
        <p>chart</p>
      </InsightCard>,
    );
    expect(screen.getByText('Demo data')).toBeInTheDocument();
    expect(screen.getByText('Representative data.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/screens/insights/`
Expected: FAIL — none of the four modules exist yet

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/insights/DemoDataBadge.tsx
export function DemoDataBadge() {
  return <span className="chip predicted">Demo data</span>;
}
```

```tsx
// src/screens/insights/Donut.tsx
export interface DonutSlice {
  label: string;
  value: number;
}

interface DonutProps {
  slices: DonutSlice[];
}

const SLOT_COLORS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--muted-2)'];
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Donut({ slices }: DonutProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 160 160" width={160} height={160} role="img" aria-label="Donut chart">
        <g transform="translate(80,80) rotate(-90)">
          {slices.map((slice, i) => {
            const fraction = total === 0 ? 0 : slice.value / total;
            const dash = fraction * CIRCUMFERENCE;
            const gap = CIRCUMFERENCE - dash;
            const offset = -cumulative * CIRCUMFERENCE;
            cumulative += fraction;
            return (
              <circle
                key={slice.label}
                r={RADIUS}
                fill="none"
                stroke={SLOT_COLORS[i % SLOT_COLORS.length]}
                strokeWidth={24}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" className="donut-total mono">
          {total.toLocaleString()}
        </text>
        <text x="80" y="94" textAnchor="middle" className="donut-total-label">
          total
        </text>
      </svg>
      <div className="cat-legend">
        {slices.map((slice, i) => (
          <span key={slice.label} className="cat-legend-item">
            <span className="cat-swatch" style={{ background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
            {slice.label} ({total === 0 ? 0 : Math.round((slice.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/screens/insights/RankedBarList.tsx
export interface RankedBarItem {
  label: string;
  value: number;
}

interface RankedBarListProps {
  items: RankedBarItem[];
  valueFormatter?: (value: number) => string;
}

export function RankedBarList({ items, valueFormatter }: RankedBarListProps) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 0;
  const format = valueFormatter ?? ((value: number) => value.toLocaleString());

  return (
    <div className="cat-bars">
      {sorted.map((item) => (
        <div key={item.label} className="cat-bar-row">
          <span className="cat-bar-label">{item.label}</span>
          <div className="cat-bar-track">
            <div
              className="cat-bar-fill"
              style={{ width: `${max === 0 ? 0 : (item.value / max) * 100}%`, background: 'var(--real)' }}
            />
          </div>
          <span className="cat-bar-count mono">{format(item.value)}</span>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/screens/insights/InsightCard.tsx
import type { ReactNode } from 'react';
import { DemoDataBadge } from './DemoDataBadge';

interface InsightCardProps {
  title: string;
  note?: string;
  live: boolean;
  children: ReactNode;
}

export function InsightCard({ title, note, live, children }: InsightCardProps) {
  return (
    <div className="insight-card">
      <div className="insight-card-head">
        <h3>{title}</h3>
        {!live && <DemoDataBadge />}
      </div>
      {note && <p className="insight-card-note">{note}</p>}
      <div className="insight-card-body">{children}</div>
    </div>
  );
}
```

Append to `src/design-system/components.css`:

```css
/* ---- Insights screen: shared card + donut primitives ---- */
.insight-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
.insight-card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.insight-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.insight-card-head h3 { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; margin: 0; }
.insight-card-note { font-size: 11px; color: var(--muted); margin: 0; }
.insight-card-body { min-width: 0; }

.donut-chart { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.donut-total { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 700; fill: var(--text); }
.donut-total-label { font-size: 9px; fill: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/screens/insights/`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/insights/DemoDataBadge.tsx src/screens/insights/DemoDataBadge.test.tsx \
        src/screens/insights/Donut.tsx src/screens/insights/Donut.test.tsx \
        src/screens/insights/RankedBarList.tsx src/screens/insights/RankedBarList.test.tsx \
        src/screens/insights/InsightCard.tsx src/screens/insights/InsightCard.test.tsx \
        src/design-system/components.css
git commit -m "feat: add shared Insights chart primitives (badge, donut, bar list, card)"
```

---

### Task 7: Shared chart primitive — HeatmapGrid

**Files:**
- Create: `src/screens/insights/HeatmapGrid.tsx`
- Test: `src/screens/insights/HeatmapGrid.test.tsx`
- Modify: `src/design-system/components.css`

**Interfaces:**
- Produces: `HeatmapCell { row: string; col: string; intensity: number; display: string }`, `HeatmapGrid({ rows, cols, cells })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/insights/HeatmapGrid.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeatmapGrid, type HeatmapCell } from './HeatmapGrid';

const cells: HeatmapCell[] = [
  { row: 'Aug', col: 'M+0', intensity: 0.1, display: '10%' },
  { row: 'Aug', col: 'M+1', intensity: 0.4, display: '40%' },
];

describe('HeatmapGrid', () => {
  it('renders every row/col label plus each cell\'s display text', () => {
    render(<HeatmapGrid rows={['Aug']} cols={['M+0', 'M+1']} cells={cells} />);
    expect(screen.getByText('Aug')).toBeInTheDocument();
    expect(screen.getByText('M+0')).toBeInTheDocument();
    expect(screen.getByText('M+1')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders an em dash for a row/col pair with no matching cell', () => {
    render(<HeatmapGrid rows={['Aug', 'Sep']} cols={['M+0']} cells={[cells[0]]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/screens/insights/HeatmapGrid.test.tsx`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/insights/HeatmapGrid.tsx
export interface HeatmapCell {
  row: string;
  col: string;
  intensity: number; // 0..1, clamped when rendered
  display: string;
}

interface HeatmapGridProps {
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
}

// Fixed rgba over the dark-theme --real hex (57,135,229) -- acceptable since this app is
// dark-theme-only by design (see the approved spec's "Dark theme only" decision), so there's no
// light-theme variant of this color to keep in sync.
export function HeatmapGrid({ rows, cols, cells }: HeatmapGridProps) {
  const lookup = new Map(cells.map((c) => [`${c.row}|${c.col}`, c]));

  return (
    <div className="heatmap-grid" role="table">
      <div className="heatmap-row heatmap-header" role="row">
        <div className="heatmap-corner" role="columnheader" />
        {cols.map((col) => (
          <div key={col} className="heatmap-col-label" role="columnheader">
            {col}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row} className="heatmap-row" role="row">
          <div className="heatmap-row-label" role="rowheader">
            {row}
          </div>
          {cols.map((col) => {
            const cell = lookup.get(`${row}|${col}`);
            const intensity = Math.min(1, Math.max(0, cell?.intensity ?? 0));
            return (
              <div
                key={col}
                className="heatmap-cell"
                role="cell"
                style={{ background: `rgba(57, 135, 229, ${intensity})` }}
              >
                {cell?.display ?? '—'}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

Append to `src/design-system/components.css`:

```css
/* ---- Insights screen: heatmap grid (cohort velocity, district x crime-head matrix) ---- */
.heatmap-grid { display: flex; flex-direction: column; gap: 2px; overflow-x: auto; }
.heatmap-row { display: flex; gap: 2px; }
.heatmap-corner { width: 90px; flex-shrink: 0; }
.heatmap-col-label { width: 56px; flex-shrink: 0; font-size: 9px; color: var(--muted); text-align: center; }
.heatmap-row-label { width: 90px; flex-shrink: 0; font-size: 10.5px; color: var(--text); display: flex; align-items: center; }
.heatmap-cell { width: 56px; height: 26px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 9.5px; color: #fff; border-radius: 3px; font-family: 'IBM Plex Mono', monospace; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/screens/insights/HeatmapGrid.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/insights/HeatmapGrid.tsx src/screens/insights/HeatmapGrid.test.tsx src/design-system/components.css
git commit -m "feat: add HeatmapGrid shared primitive"
```

---

### Task 8: OverviewTab

**Files:**
- Create: `src/screens/insights/OverviewTab.tsx`
- Test: `src/screens/insights/OverviewTab.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`../../auth/AuthContext`), `useMe` (`../../api/meApi`), `useCommandCenterSummary` (`../../api/commandCenterApi`), `useDistrictSummaries` (`../../api/geoApi`), `useCases` + `CaseSummaryResponse` (`../../api/caseApi`), `canShowLiveRecentFirs` (`../../api/insightsApi`), `getOverviewTrend`/`getCaseJourneyStages`/`getCaseCategoryMixDemo`/`getGravityMixDemo`/`getRecentFirsDemo` (`../../api/demoAnalyticsData`), `InsightCard`, `Donut`, `RankedBarList` (this folder), `CaseList` (`../case-explorer/CaseList`).
- Produces: `OverviewTab()` component, used by `InsightsScreen.tsx` (Task 13).

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/insights/OverviewTab.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as commandCenterApiModule from '../../api/commandCenterApi';
import * as geoApiModule from '../../api/geoApi';
import * as caseApiModule from '../../api/caseApi';
import { OverviewTab } from './OverviewTab';

function queryResult<T>(data: T) {
  return { data, isLoading: false, isError: false, refetch: vi.fn() } as never;
}

const summary = {
  kpi: { stateCaseCount: 12480, stateCaseCountDeltaPct: 4.2, resolvedPct: 61.3, resolvedPctDeltaPts: 1.8, topCrimeSubHead: 'Theft', topCrimeSubHeadCount: 1000 },
  stateCaseVolumeWeekly: [], crimesAgainstPropertyWeekly: [], arrestsWeekly: [],
  categoryMix: [{ crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 200 }],
};
const districtSummaries = [
  { districtId: 1, districtName: 'Bengaluru Urban', caseCount: 1840 },
  { districtId: 2, districtName: 'Mysuru', caseCount: 687 },
];

function mockShared() {
  vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(summary));
  vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(queryResult(districtSummaries));
}

describe('OverviewTab', () => {
  it('shows the live CaseList and no Demo badge on Recent FIRs for an INVESTIGATOR with a resolved unit', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['INVESTIGATOR'], username: 'demo.investigator', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(queryResult({ username: 'demo.investigator', firstName: 'Demo', rank: 'PI', unit: 'Whitefield PS', unitId: 176, districtId: 5, roles: ['INVESTIGATOR'] }));
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(queryResult([
      { caseId: 1, caseNumber: '2026001', unitId: 176, unitName: 'Whitefield PS', crimeSubHeadId: 1, crimeSubHeadName: 'Theft', status: 'registered', firDate: '2026-01-01' },
    ]));
    mockShared();

    render(
      <MemoryRouter>
        <OverviewTab />
      </MemoryRouter>,
    );

    const recentFirsCard = screen.getByText('Recent FIRs').closest('.insight-card')!;
    expect(recentFirsCard.querySelector('.chip.predicted')).toBeNull();
    expect(screen.getByText('2026001')).toBeInTheDocument();
  });

  it('falls back to the demo Recent FIRs table with a Demo badge for a POLICYMAKER', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['POLICYMAKER'], username: 'demo.policymaker', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(queryResult({ username: 'demo.policymaker', firstName: 'Demo', rank: null, unit: null, unitId: null, districtId: null, roles: ['POLICYMAKER'] }));
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(queryResult(undefined));
    mockShared();

    render(
      <MemoryRouter>
        <OverviewTab />
      </MemoryRouter>,
    );

    const recentFirsCard = screen.getByText('Recent FIRs').closest('.insight-card')!;
    expect(recentFirsCard.querySelector('.chip.predicted')).not.toBeNull();
    expect(screen.getByText(/isn't available state\/district-wide yet/)).toBeInTheDocument();
  });

  it('renders Top Districts sorted descending from live district summaries', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(queryResult({ username: 'demo.analyst', firstName: 'Demo', rank: null, unit: null, unitId: null, districtId: null, roles: ['SCRB_ANALYST'] }));
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(queryResult(undefined));
    mockShared();

    render(
      <MemoryRouter>
        <OverviewTab />
      </MemoryRouter>,
    );

    const topDistrictsCard = screen.getByText('Top Districts by Case Volume').closest('.insight-card')!;
    const labels = Array.from(topDistrictsCard.querySelectorAll('.cat-bar-label')).map((el) => el.textContent);
    expect(labels.indexOf('Bengaluru Urban')).toBeLessThan(labels.indexOf('Mysuru'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/screens/insights/OverviewTab.test.tsx`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/insights/OverviewTab.tsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { useMe } from '../../api/meApi';
import { useCommandCenterSummary } from '../../api/commandCenterApi';
import { useDistrictSummaries } from '../../api/geoApi';
import { useCases, type CaseSummaryResponse } from '../../api/caseApi';
import { canShowLiveRecentFirs } from '../../api/insightsApi';
import {
  getOverviewTrend,
  getCaseJourneyStages,
  getCaseCategoryMixDemo,
  getGravityMixDemo,
  getRecentFirsDemo,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';
import { CaseList } from '../case-explorer/CaseList';

export function OverviewTab() {
  const { token, roles } = useAuth();
  const meQuery = useMe(token);
  const summaryQuery = useCommandCenterSummary(token);
  const districtSummariesQuery = useDistrictSummaries(token);

  const unitId = meQuery.data?.unitId ?? null;
  const liveRecentFirs = canShowLiveRecentFirs(roles, unitId);
  const recentFirsQuery = useCases(token, liveRecentFirs ? unitId : null, {});

  const trend = getOverviewTrend();
  const journey = getCaseJourneyStages();
  const categoryMixDemo = getCaseCategoryMixDemo();
  const gravityDemo = getGravityMixDemo();
  const demoRecentFirs = getRecentFirsDemo();

  const topDistricts = [...(districtSummariesQuery.data ?? [])]
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, 10)
    .map((d) => ({ label: d.districtName, value: d.caseCount }));

  return (
    <div className="insight-grid">
      <InsightCard title="Registrations vs Chargesheeted" live={false} note="Monthly, last 12 months.">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" stroke="var(--muted)" fontSize={10} />
            <YAxis stroke="var(--muted)" fontSize={10} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            <Line type="monotone" dataKey="registered" stroke="var(--real)" strokeWidth={2} dot={false} name="Registered" />
            <Line type="monotone" dataKey="chargesheeted" stroke="var(--predicted)" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Chargesheeted" />
          </LineChart>
        </ResponsiveContainer>
      </InsightCard>

      <InsightCard title="Case Journey" live={false} note="Registration through final outcome.">
        <RankedBarList items={journey.map((j) => ({ label: j.stage, value: j.count }))} />
      </InsightCard>

      <InsightCard title="Case Category Mix" live={false} note="FIR / UDR / Zero FIR / PAR / NCR.">
        <Donut slices={categoryMixDemo.map((c) => ({ label: c.category, value: c.count }))} />
      </InsightCard>

      <InsightCard title="Gravity of Offence" live={false}>
        <Donut slices={gravityDemo.map((g) => ({ label: g.gravity, value: g.count }))} />
      </InsightCard>

      <InsightCard title="Top Districts by Case Volume" live>
        {districtSummariesQuery.isLoading ? (
          <p>Loading…</p>
        ) : districtSummariesQuery.isError ? (
          <p role="alert">Couldn't load district data.</p>
        ) : (
          <RankedBarList items={topDistricts} />
        )}
      </InsightCard>

      <InsightCard
        title="Recent FIRs"
        live={liveRecentFirs}
        note={liveRecentFirs ? undefined : "Recent FIRs isn't available state/district-wide yet — showing representative data."}
      >
        {liveRecentFirs ? (
          recentFirsQuery.isLoading ? <p>Loading…</p> : <CaseList cases={recentFirsQuery.data ?? []} />
        ) : (
          <DemoRecentFirsTable cases={demoRecentFirs} />
        )}
      </InsightCard>
    </div>
  );
}

function DemoRecentFirsTable({ cases }: { cases: CaseSummaryResponse[] }) {
  return (
    <div className="case-table-wrap">
      <table className="case-table">
        <thead>
          <tr>
            <th>Crime no.</th>
            <th>Case no.</th>
            <th>Registered</th>
            <th>Station</th>
            <th>District</th>
            <th>Crime head</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.caseId}>
              <td className="mono crime-no">{c.crimeNumber}</td>
              <td className="mono">{c.caseNumber}</td>
              <td className="mono">{c.firDate}</td>
              <td>{c.station}</td>
              <td>{c.district}</td>
              <td>{c.crimeSubHeadName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/screens/insights/OverviewTab.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/insights/OverviewTab.tsx src/screens/insights/OverviewTab.test.tsx
git commit -m "feat: add Insights Overview tab"
```

---

### Task 9: CrimeTrendsTab

**Files:**
- Create: `src/screens/insights/CrimeTrendsTab.tsx`
- Test: `src/screens/insights/CrimeTrendsTab.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useCommandCenterSummary`, `useHotspots` (Task 4), `canShowLiveHotspots` (Task 5), `CategoryMixChart` (`../command-center/CategoryMixChart`), `getCrimeHeadMonthlyTrend`/`getCohortHeatmap`/`getDistrictCrimeHeadMatrix`/`getIncidentHotspotsDemo`/`CRIME_HEADS_DEMO` (Task 1), `InsightCard`, `HeatmapGrid` (+ its `HeatmapCell` type).
- Produces: `CrimeTrendsTab()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/insights/CrimeTrendsTab.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as AuthContextModule from '../../auth/AuthContext';
import * as commandCenterApiModule from '../../api/commandCenterApi';
import * as geoApiModule from '../../api/geoApi';
import { CrimeTrendsTab } from './CrimeTrendsTab';

function queryResult<T>(data: T, overrides: Partial<{ isLoading: boolean; isError: boolean }> = {}) {
  return { data, isLoading: false, isError: false, refetch: vi.fn(), ...overrides } as never;
}

const summary = {
  kpi: { stateCaseCount: 1, stateCaseCountDeltaPct: 0, resolvedPct: 0, resolvedPctDeltaPts: 0, topCrimeSubHead: '', topCrimeSubHeadCount: 0 },
  stateCaseVolumeWeekly: [], crimesAgainstPropertyWeekly: [], arrestsWeekly: [],
  categoryMix: [
    { crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 200 },
    { crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 600 },
  ],
};

function mockAuth(roles: string[]) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles, username: 'demo', login: vi.fn(), logout: vi.fn(),
  });
}

describe('CrimeTrendsTab', () => {
  it('renders the live Crime Head Distribution chart with no Demo badge', () => {
    mockAuth(['SCRB_ANALYST']);
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(summary));
    vi.spyOn(geoApiModule, 'useHotspots').mockReturnValue(queryResult([]));

    render(<CrimeTrendsTab />);

    const card = screen.getByText('Crime Head Distribution').closest('.insight-card')!;
    expect(card.querySelector('.chip.predicted')).toBeNull();
    expect(screen.getByText('Crimes Against Property')).toBeInTheDocument();
  });

  it('shows the Demo badge on Incident Location Hotspots for an INVESTIGATOR', () => {
    mockAuth(['INVESTIGATOR']);
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(summary));
    vi.spyOn(geoApiModule, 'useHotspots').mockReturnValue(queryResult(undefined));

    render(<CrimeTrendsTab />);

    const card = screen.getByText('Incident Location Hotspots').closest('.insight-card')!;
    expect(card.querySelector('.chip.predicted')).not.toBeNull();
  });

  it('shows no Demo badge on Incident Location Hotspots for a DISTRICT_SUPERVISOR', () => {
    mockAuth(['DISTRICT_SUPERVISOR']);
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(summary));
    vi.spyOn(geoApiModule, 'useHotspots').mockReturnValue(queryResult([]));

    render(<CrimeTrendsTab />);

    const card = screen.getByText('Incident Location Hotspots').closest('.insight-card')!;
    expect(card.querySelector('.chip.predicted')).toBeNull();
  });

  it('renders the Cohort Analysis and District x Crime Head heatmaps as demo data', () => {
    mockAuth(['SCRB_ANALYST']);
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(summary));
    vi.spyOn(geoApiModule, 'useHotspots').mockReturnValue(queryResult([]));

    render(<CrimeTrendsTab />);

    expect(screen.getByText('Cohort Analysis — Case Closure Velocity')).toBeInTheDocument();
    expect(screen.getByText('District × Crime Head Hotspot Matrix')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/screens/insights/CrimeTrendsTab.test.tsx`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/insights/CrimeTrendsTab.tsx
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { useCommandCenterSummary } from '../../api/commandCenterApi';
import { useHotspots } from '../../api/geoApi';
import { canShowLiveHotspots } from '../../api/insightsApi';
import {
  CRIME_HEADS_DEMO,
  getCrimeHeadMonthlyTrend,
  getCohortHeatmap,
  getDistrictCrimeHeadMatrix,
  getIncidentHotspotsDemo,
} from '../../api/demoAnalyticsData';
import { CategoryMixChart } from '../command-center/CategoryMixChart';
import { InsightCard } from './InsightCard';
import { HeatmapGrid, type HeatmapCell } from './HeatmapGrid';

export function CrimeTrendsTab() {
  const { token, roles } = useAuth();
  const summaryQuery = useCommandCenterSummary(token);
  const liveHotspots = canShowLiveHotspots(roles);
  const hotspotsQuery = useHotspots(token, liveHotspots);

  const monthlyTrend = getCrimeHeadMonthlyTrend();
  const cohort = getCohortHeatmap();
  const matrix = getDistrictCrimeHeadMatrix();
  const demoHotspots = getIncidentHotspotsDemo();

  const cohortCells: HeatmapCell[] = cohort.map((c) => ({
    row: c.cohortLabel, col: c.lagLabel, intensity: c.pct, display: `${Math.round(c.pct * 100)}%`,
  }));
  const cohortRows = [...new Set(cohort.map((c) => c.cohortLabel))];
  const cohortCols = [...new Set(cohort.map((c) => c.lagLabel))];

  const maxMatrixCount = Math.max(...matrix.map((m) => m.count), 1);
  const matrixCells: HeatmapCell[] = matrix.map((m) => ({
    row: m.districtName, col: m.crimeHead, intensity: m.count / maxMatrixCount, display: m.count.toLocaleString(),
  }));
  const matrixRows = [...new Set(matrix.map((m) => m.districtName))];
  const matrixCols = [...new Set(matrix.map((m) => m.crimeHead))];

  return (
    <div className="insight-grid">
      <InsightCard title="Crime Head Distribution" live>
        {summaryQuery.isLoading ? (
          <p>Loading…</p>
        ) : summaryQuery.isError ? (
          <p role="alert">Couldn't load crime head data.</p>
        ) : (
          <CategoryMixChart categoryMix={summaryQuery.data!.categoryMix} />
        )}
      </InsightCard>

      <InsightCard title="Crime Head Trend by Month" live={false} note="Stacked monthly volume across the top crime heads.">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyTrend}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" stroke="var(--muted)" fontSize={10} />
            <YAxis stroke="var(--muted)" fontSize={10} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            {CRIME_HEADS_DEMO.map((head, i) => (
              <Area
                key={head}
                type="monotone"
                dataKey={head}
                stackId="1"
                stroke={`var(--cat-${(i % 5) + 1})`}
                fill={`var(--cat-${(i % 5) + 1})`}
                fillOpacity={0.65}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </InsightCard>

      <InsightCard
        title="Cohort Analysis — Case Closure Velocity"
        live={false}
        note="% of each monthly cohort chargesheeted within N months of registration."
      >
        <HeatmapGrid rows={cohortRows} cols={cohortCols} cells={cohortCells} />
      </InsightCard>

      <InsightCard title="District × Crime Head Hotspot Matrix" live={false} note="Case counts per district per crime head.">
        <HeatmapGrid rows={matrixRows} cols={matrixCols} cells={matrixCells} />
      </InsightCard>

      <InsightCard
        title="Incident Location Hotspots"
        live={liveHotspots}
        note={
          liveHotspots
            ? 'District-level DBSCAN clusters, bubble size = case count.'
            : "Cluster hotspots aren't available for unit-scoped roles — showing representative data."
        }
      >
        {liveHotspots ? (
          hotspotsQuery.isLoading ? (
            <p>Loading…</p>
          ) : hotspotsQuery.isError ? (
            <p role="alert">Couldn't load hotspot clusters.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="centroidLon" name="Longitude" stroke="var(--muted)" fontSize={10} />
                <YAxis type="number" dataKey="centroidLat" name="Latitude" stroke="var(--muted)" fontSize={10} />
                <ZAxis type="number" dataKey="caseCount" range={[40, 300]} />
                <Tooltip cursor={{ stroke: 'var(--line)' }} />
                <Scatter data={hotspotsQuery.data ?? []} fill="var(--real)" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          )
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="lon" name="Longitude" stroke="var(--muted)" fontSize={10} />
              <YAxis type="number" dataKey="lat" name="Latitude" stroke="var(--muted)" fontSize={10} />
              <Tooltip cursor={{ stroke: 'var(--line)' }} />
              <Scatter data={demoHotspots} fill="var(--predicted)" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </InsightCard>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/screens/insights/CrimeTrendsTab.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/insights/CrimeTrendsTab.tsx src/screens/insights/CrimeTrendsTab.test.tsx
git commit -m "feat: add Insights Crime Trends tab"
```

---

### Task 10: DemographicsTab

**Files:**
- Create: `src/screens/insights/DemographicsTab.tsx`
- Test: `src/screens/insights/DemographicsTab.test.tsx`

**Interfaces:**
- Consumes: all Demographics generators from Task 2, `InsightCard`, `Donut`, `RankedBarList`.
- Produces: `DemographicsTab()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/insights/DemographicsTab.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemographicsTab } from './DemographicsTab';

describe('DemographicsTab', () => {
  it('renders all 7 cards, every one tagged as demo data', () => {
    render(<DemographicsTab />);

    const titles = [
      'Victim Gender', 'Accused Gender', 'Complainant Gender',
      'Age Distribution — Victims vs Accused', 'Complainant Religion', 'Complainant Caste Category',
      'Complainant Occupation', 'Victim Gender × Crime Head Cross-tab',
    ];
    titles.forEach((title) => {
      const card = screen.getByText(title).closest('.insight-card')!;
      expect(card.querySelector('.chip.predicted')).not.toBeNull();
    });
  });

  it('renders the cross-tab table with one row per demo crime head', () => {
    render(<DemographicsTab />);
    expect(screen.getByText('Crimes Against Women')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/screens/insights/DemographicsTab.test.tsx`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/insights/DemographicsTab.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  getVictimGenderDemo,
  getAccusedGenderDemo,
  getComplainantGenderDemo,
  getAgeDistributionDemo,
  getReligionDemo,
  getCasteDemo,
  getOccupationDemo,
  getVictimGenderByCrimeHeadDemo,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';

export function DemographicsTab() {
  const victimGender = getVictimGenderDemo();
  const accusedGender = getAccusedGenderDemo();
  const complainantGender = getComplainantGenderDemo();
  const ageDistribution = getAgeDistributionDemo();
  const religion = getReligionDemo();
  const caste = getCasteDemo();
  const occupation = getOccupationDemo();
  const crossTab = getVictimGenderByCrimeHeadDemo();

  return (
    <div className="insight-grid">
      <InsightCard title="Victim Gender" live={false}>
        <Donut slices={victimGender.map((g) => ({ label: g.gender, value: g.count }))} />
      </InsightCard>
      <InsightCard title="Accused Gender" live={false}>
        <Donut slices={accusedGender.map((g) => ({ label: g.gender, value: g.count }))} />
      </InsightCard>
      <InsightCard title="Complainant Gender" live={false}>
        <Donut slices={complainantGender.map((g) => ({ label: g.gender, value: g.count }))} />
      </InsightCard>

      <InsightCard title="Age Distribution — Victims vs Accused" live={false} note="5-year age bands.">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ageDistribution}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="band" stroke="var(--muted)" fontSize={9} />
            <YAxis stroke="var(--muted)" fontSize={10} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="victims" name="Victims" fill="var(--cat-3)" />
            <Bar dataKey="accused" name="Accused" fill="var(--real)" />
          </BarChart>
        </ResponsiveContainer>
      </InsightCard>

      <InsightCard title="Complainant Religion" live={false}>
        <RankedBarList items={religion.map((r) => ({ label: r.label, value: r.count }))} />
      </InsightCard>
      <InsightCard title="Complainant Caste Category" live={false}>
        <RankedBarList items={caste.map((c) => ({ label: c.label, value: c.count }))} />
      </InsightCard>
      <InsightCard title="Complainant Occupation" live={false}>
        <RankedBarList items={occupation.map((o) => ({ label: o.label, value: o.count }))} />
      </InsightCard>

      <InsightCard title="Victim Gender × Crime Head Cross-tab" live={false}>
        <div className="case-table-wrap">
          <table className="case-table">
            <thead>
              <tr>
                <th>Crime head</th>
                <th>Male</th>
                <th>Female</th>
                <th>Third gender</th>
              </tr>
            </thead>
            <tbody>
              {crossTab.map((row) => (
                <tr key={row.crimeHead}>
                  <td>{row.crimeHead}</td>
                  <td className="mono">{row.malePct}%</td>
                  <td className="mono">{row.femalePct}%</td>
                  <td className="mono">{row.thirdGenderPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InsightCard>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/screens/insights/DemographicsTab.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/insights/DemographicsTab.tsx src/screens/insights/DemographicsTab.test.tsx
git commit -m "feat: add Insights Demographics tab"
```

---

### Task 11: InvestigationNetworkTab

**Files:**
- Create: `src/screens/insights/InvestigationNetworkTab.tsx`
- Test: `src/screens/insights/InvestigationNetworkTab.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useRepeatOffenders` (`../../api/networkApi`), `canShowLiveRepeatOffenderData` + `deriveRepeatVsFirstTime` (Task 5), `getRepeatOffendersDemo`/`getFirstTimeVsRepeatDemo`/`getCrimeHeadActLinkageDemo`/`getArrestsVsSurrendersDemo`/`getIoLeaderboardDemo` (Task 3), `InsightCard`, `Donut`, `RankedBarList`.
- Produces: `InvestigationNetworkTab()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/insights/InvestigationNetworkTab.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as AuthContextModule from '../../auth/AuthContext';
import * as networkApiModule from '../../api/networkApi';
import { InvestigationNetworkTab } from './InvestigationNetworkTab';

function queryResult<T>(data: T) {
  return { data, isLoading: false, isError: false, refetch: vi.fn() } as never;
}

function mockAuth(roles: string[]) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles, username: 'demo', login: vi.fn(), logout: vi.fn(),
  });
}

describe('InvestigationNetworkTab', () => {
  it('shows live repeat-offender data with no Demo badge for SCRB_ANALYST', () => {
    mockAuth(['SCRB_ANALYST']);
    vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(
      queryResult([{ personId: 1, displayName: 'Real Name', caseCount: 4, gravityWeight: 1, confidenceScore: 0.9 }]),
    );

    render(<InvestigationNetworkTab />);

    const card = screen.getByText('Top Repeat Offenders').closest('.insight-card')!;
    expect(card.querySelector('.chip.predicted')).toBeNull();
    expect(screen.getByText('Real Name')).toBeInTheDocument();
  });

  it('falls back to demo repeat-offender data with a Demo badge for DISTRICT_SUPERVISOR', () => {
    mockAuth(['DISTRICT_SUPERVISOR']);
    vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(queryResult(undefined));

    render(<InvestigationNetworkTab />);

    const card = screen.getByText('Top Repeat Offenders').closest('.insight-card')!;
    expect(card.querySelector('.chip.predicted')).not.toBeNull();
    expect(screen.getByText('M**** K****')).toBeInTheDocument();
  });

  it('always renders the demo IO Leaderboard and Crime Head <-> Act linkage cards', () => {
    mockAuth(['SCRB_ANALYST']);
    vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(queryResult([]));

    render(<InvestigationNetworkTab />);

    expect(screen.getByText('Investigating Officer Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Crime Head ↔ Act Linkage')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/screens/insights/InvestigationNetworkTab.test.tsx`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/insights/InvestigationNetworkTab.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { useRepeatOffenders } from '../../api/networkApi';
import { canShowLiveRepeatOffenderData, deriveRepeatVsFirstTime } from '../../api/insightsApi';
import {
  getRepeatOffendersDemo,
  getFirstTimeVsRepeatDemo,
  getCrimeHeadActLinkageDemo,
  getArrestsVsSurrendersDemo,
  getIoLeaderboardDemo,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';

export function InvestigationNetworkTab() {
  const { token, roles } = useAuth();
  const liveRepeatOffenders = canShowLiveRepeatOffenderData(roles);
  const topOffendersQuery = useRepeatOffenders(token, 2, 10);
  const sampleOffendersQuery = useRepeatOffenders(token, 1, 500);

  const linkage = getCrimeHeadActLinkageDemo();
  const arrestsVsSurrenders = getArrestsVsSurrendersDemo();
  const ioLeaderboard = getIoLeaderboardDemo();
  const demoRepeatOffenders = getRepeatOffendersDemo();
  const demoFirstTimeVsRepeat = getFirstTimeVsRepeatDemo();

  const liveFirstTimeVsRepeat = sampleOffendersQuery.data ? deriveRepeatVsFirstTime(sampleOffendersQuery.data) : null;

  return (
    <div className="insight-grid">
      <InsightCard title="Crime Head ↔ Act Linkage" live={false} note="Rendered as ranked linkage bars, not a chord diagram.">
        <RankedBarList items={linkage.map((l) => ({ label: l.label, value: l.count }))} />
      </InsightCard>

      <InsightCard title="Arrests vs Surrenders by Month" live={false}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={arrestsVsSurrenders}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" stroke="var(--muted)" fontSize={10} />
            <YAxis stroke="var(--muted)" fontSize={10} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="arrests" name="Arrests" fill="var(--real)" />
            <Bar dataKey="surrenders" name="Surrenders" fill="var(--predicted)" />
          </BarChart>
        </ResponsiveContainer>
      </InsightCard>

      <InsightCard
        title="Top Repeat Offenders"
        live={liveRepeatOffenders}
        note={liveRepeatOffenders ? undefined : "Repeat-offender data isn't available for this role — showing representative data."}
      >
        {liveRepeatOffenders ? (
          topOffendersQuery.isLoading ? (
            <p>Loading…</p>
          ) : topOffendersQuery.isError ? (
            <p role="alert">Couldn't load repeat-offender data.</p>
          ) : (
            <RankedBarList items={(topOffendersQuery.data ?? []).map((o) => ({ label: o.displayName, value: o.caseCount }))} />
          )
        ) : (
          <RankedBarList items={demoRepeatOffenders.map((o) => ({ label: o.displayName, value: o.caseCount }))} />
        )}
      </InsightCard>

      <InsightCard title="Accused: First-time vs Repeat" live={liveRepeatOffenders}>
        {liveRepeatOffenders ? (
          sampleOffendersQuery.isLoading ? (
            <p>Loading…</p>
          ) : sampleOffendersQuery.isError ? (
            <p role="alert">Couldn't load offender data.</p>
          ) : (
            <Donut
              slices={[
                { label: 'First-time', value: liveFirstTimeVsRepeat?.firstTime ?? 0 },
                { label: 'Repeat', value: liveFirstTimeVsRepeat?.repeat ?? 0 },
              ]}
            />
          )
        ) : (
          <Donut
            slices={[
              { label: 'First-time', value: demoFirstTimeVsRepeat.firstTime },
              { label: 'Repeat', value: demoFirstTimeVsRepeat.repeat },
            ]}
          />
        )}
      </InsightCard>

      <InsightCard title="Investigating Officer Leaderboard" live={false}>
        <div className="case-table-wrap">
          <table className="case-table">
            <thead>
              <tr>
                <th>Officer</th>
                <th>Unit</th>
                <th>Cases</th>
                <th>Chargesheet rate</th>
                <th>Avg. days</th>
              </tr>
            </thead>
            <tbody>
              {ioLeaderboard.map((row) => (
                <tr key={row.officer + row.unit}>
                  <td>{row.officer}</td>
                  <td>{row.unit}</td>
                  <td className="mono">{row.casesHandled}</td>
                  <td className="mono">{row.chargesheetRatePct}%</td>
                  <td className="mono">{row.avgDaysToChargesheet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InsightCard>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/screens/insights/InvestigationNetworkTab.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/insights/InvestigationNetworkTab.tsx src/screens/insights/InvestigationNetworkTab.test.tsx
git commit -m "feat: add Insights Investigation Network tab"
```

---

### Task 12: JudicialUnitsTab

**Files:**
- Create: `src/screens/insights/JudicialUnitsTab.tsx`
- Test: `src/screens/insights/JudicialUnitsTab.test.tsx`

**Interfaces:**
- Consumes: all Judicial & Units generators from Task 3, `InsightCard`, `Donut`, `RankedBarList`.
- Produces: `JudicialUnitsTab()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/insights/JudicialUnitsTab.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JudicialUnitsTab } from './JudicialUnitsTab';

describe('JudicialUnitsTab', () => {
  it('renders all 5 cards, every one tagged as demo data', () => {
    render(<JudicialUnitsTab />);

    const titles = [
      'Court-wise Pending Cases', 'Final Report Outcome', 'District → Unit Case Load',
      'Employee Rank Distribution', 'Unit Performance',
    ];
    titles.forEach((title) => {
      const card = screen.getByText(title).closest('.insight-card')!;
      expect(card.querySelector('.chip.predicted')).not.toBeNull();
    });
  });

  it('renders the treemap-style district/unit breakdown and the unit performance table', () => {
    render(<JudicialUnitsTab />);
    expect(screen.getByText('Whitefield PS')).toBeInTheDocument();
    expect(screen.getAllByText('Bengaluru Urban').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/screens/insights/JudicialUnitsTab.test.tsx`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/insights/JudicialUnitsTab.tsx
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import {
  getCourtPendingDemo,
  getFinalReportOutcomeDemo,
  getDistrictUnitCaseLoadDemo,
  getRankDistributionDemo,
  getUnitPerformanceDemo,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';

export function JudicialUnitsTab() {
  const courtPending = getCourtPendingDemo();
  const outcome = getFinalReportOutcomeDemo();
  const unitCaseLoad = getDistrictUnitCaseLoadDemo();
  const rankDistribution = getRankDistributionDemo();
  const unitPerformance = getUnitPerformanceDemo();

  const treemapData = Object.entries(
    unitCaseLoad.reduce<Record<string, { districtName: string; unitName: string; caseCount: number }[]>>((acc, row) => {
      (acc[row.districtName] ??= []).push(row);
      return acc;
    }, {}),
  ).map(([districtName, units]) => ({
    name: districtName,
    children: units.map((u) => ({ name: u.unitName, size: u.caseCount })),
  }));

  return (
    <div className="insight-grid">
      <InsightCard title="Court-wise Pending Cases" live={false} note="Top 12 courts by pending load.">
        <RankedBarList items={courtPending.map((c) => ({ label: c.court, value: c.pending }))} />
      </InsightCard>

      <InsightCard title="Final Report Outcome" live={false}>
        <Donut slices={outcome.map((o) => ({ label: o.outcome, value: o.count }))} />
      </InsightCard>

      <InsightCard title="District → Unit Case Load" live={false} note="Area = FIRs registered per unit, grouped by district.">
        <ResponsiveContainer width="100%" height={260}>
          <Treemap data={treemapData} dataKey="size" stroke="var(--panel)" fill="var(--real)">
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
          </Treemap>
        </ResponsiveContainer>
      </InsightCard>

      <InsightCard title="Employee Rank Distribution" live={false}>
        <RankedBarList items={rankDistribution.map((r) => ({ label: r.rank, value: r.headcount }))} />
      </InsightCard>

      <InsightCard title="Unit Performance" live={false} note="Case count, pending share & average resolution time per unit.">
        <div className="case-table-wrap">
          <table className="case-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Cases</th>
                <th>Pending share</th>
                <th>Avg. resolution</th>
              </tr>
            </thead>
            <tbody>
              {unitPerformance.map((row) => (
                <tr key={row.unitName}>
                  <td>{row.unitName}</td>
                  <td className="mono">{row.caseCount}</td>
                  <td className="mono">{row.pendingSharePct}%</td>
                  <td className="mono">{row.avgResolutionDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InsightCard>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/screens/insights/JudicialUnitsTab.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/insights/JudicialUnitsTab.tsx src/screens/insights/JudicialUnitsTab.test.tsx
git commit -m "feat: add Insights Judicial & Units tab"
```

---

### Task 13: InsightsScreen (tab shell)

**Files:**
- Create: `src/screens/insights/InsightsScreen.tsx`
- Test: `src/screens/insights/InsightsScreen.test.tsx`
- Modify: `src/design-system/components.css`

**Interfaces:**
- Consumes: `Header` (`../../app/Header`), the 5 tab components (Tasks 8-12).
- Produces: `InsightsScreen()`, used by `App.tsx` (Task 14).

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/insights/InsightsScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import { InsightsScreen } from './InsightsScreen';

vi.mock('./OverviewTab', () => ({ OverviewTab: () => <div>overview-tab-content</div> }));
vi.mock('./CrimeTrendsTab', () => ({ CrimeTrendsTab: () => <div>crime-trends-tab-content</div> }));
vi.mock('./DemographicsTab', () => ({ DemographicsTab: () => <div>demographics-tab-content</div> }));
vi.mock('./InvestigationNetworkTab', () => ({ InvestigationNetworkTab: () => <div>investigation-network-tab-content</div> }));
vi.mock('./JudicialUnitsTab', () => ({ JudicialUnitsTab: () => <div>judicial-units-tab-content</div> }));

describe('InsightsScreen', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({
      data: { username: 'demo.analyst', firstName: 'Demo', rank: 'Analyst', unit: null, unitId: null, districtId: null, roles: ['SCRB_ANALYST'] },
      isLoading: false, isError: false,
    } as never);
  });

  it('renders the Header title and defaults to the Overview tab', () => {
    render(
      <MemoryRouter>
        <InsightsScreen />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument();
    expect(screen.getByText('overview-tab-content')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Judicial & Units when its pill is clicked', () => {
    render(
      <MemoryRouter>
        <InsightsScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Judicial & Units' }));
    expect(screen.getByText('judicial-units-tab-content')).toBeInTheDocument();
    expect(screen.queryByText('overview-tab-content')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/screens/insights/InsightsScreen.test.tsx`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/insights/InsightsScreen.tsx
import { useSearchParams } from 'react-router-dom';
import { Header } from '../../app/Header';
import { OverviewTab } from './OverviewTab';
import { CrimeTrendsTab } from './CrimeTrendsTab';
import { DemographicsTab } from './DemographicsTab';
import { InvestigationNetworkTab } from './InvestigationNetworkTab';
import { JudicialUnitsTab } from './JudicialUnitsTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'crime-trends', label: 'Crime Trends' },
  { key: 'demographics', label: 'Demographics' },
  { key: 'investigation-network', label: 'Investigation Network' },
  { key: 'judicial-units', label: 'Judicial & Units' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((t) => t.key === value);
}

export function InsightsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: TabKey = isTabKey(requestedTab) ? requestedTab : 'overview';

  function selectTab(tab: TabKey) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  }

  return (
    <>
      <Header title="Insights" />
      <main className="main-single insights-main">
        <div className="view-tabs" role="tablist" aria-label="Insights pillar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`view-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => selectTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'crime-trends' && <CrimeTrendsTab />}
        {activeTab === 'demographics' && <DemographicsTab />}
        {activeTab === 'investigation-network' && <InvestigationNetworkTab />}
        {activeTab === 'judicial-units' && <JudicialUnitsTab />}
      </main>
    </>
  );
}
```

Append to `src/design-system/components.css`:

```css
/* ---- Insights screen shell ---- */
.insights-main { padding: 16px 24px 40px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/screens/insights/InsightsScreen.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/insights/InsightsScreen.tsx src/screens/insights/InsightsScreen.test.tsx src/design-system/components.css
git commit -m "feat: add Insights tab-shell screen"
```

---

### Task 14: Wire `/insights` into routing and navigation

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/Rail.tsx`
- Modify: `src/app/Rail.test.tsx`

**Interfaces:**
- Consumes: `InsightsScreen` (Task 13).

- [ ] **Step 1: Write the failing tests**

In `src/app/Rail.test.tsx`, update the existing test to expect the new link (the file currently asserts exactly 5 links plus admin — this replaces that assertion):

```tsx
// src/app/Rail.test.tsx (full replacement of the existing single test body)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Rail } from './Rail';

describe('Rail', () => {
  it('renders all 6 screen links with the current one marked active', () => {
    render(
      <MemoryRouter initialEntries={['/case-explorer']}>
        <Rail />
      </MemoryRouter>,
    );

    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Case Explorer')).toBeInTheDocument();
    expect(screen.getByText('Network / Link Analysis')).toBeInTheDocument();
    expect(screen.getByText('Sociological & Predictive')).toBeInTheDocument();
    expect(screen.getByText('Admin / Audit')).toBeInTheDocument();

    const caseExplorerLink = screen.getByRole('link', { name: 'Case Explorer' });
    expect(caseExplorerLink).toHaveAttribute('aria-current', 'page');
  });
});
```

Append to `src/app/App.test.tsx`, inside the existing `describe('App', ...)` block:

```tsx
it('an INVESTIGATOR can reach /insights (no role restriction on this route)', async () => {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['INVESTIGATOR'], username: 'demo.investigator', login: vi.fn(), logout: vi.fn(),
  });
  window.history.pushState({}, '', '/insights');

  render(<App />);

  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument());
});

it('a POLICYMAKER can also reach /insights', async () => {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['POLICYMAKER'], username: 'demo.policymaker', login: vi.fn(), logout: vi.fn(),
  });
  window.history.pushState({}, '', '/insights');

  render(<App />);

  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument());
});

it('an unauthenticated user hitting /insights is redirected to login', () => {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: null, roles: [], username: null, login: vi.fn(), logout: vi.fn(),
  });
  window.history.pushState({}, '', '/insights');

  render(<App />);

  expect(screen.getByRole('heading', { name: /crime analytics/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/app/Rail.test.tsx src/app/App.test.tsx`
Expected: FAIL — Rail test can't find "Insights" text; App tests can't find the "Insights" heading (route doesn't exist, falls through to the default-route redirect instead)

- [ ] **Step 3: Write minimal implementation**

In `src/app/Rail.tsx`, add the new entry (placed right after Command Center):

```tsx
const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center' },
  { path: '/insights', label: 'Insights' },
  { path: '/case-explorer', label: 'Case Explorer' },
  { path: '/network', label: 'Network / Link Analysis' },
  { path: '/sociological', label: 'Sociological & Predictive' },
  { path: '/admin', label: 'Admin / Audit' },
];
```

In `src/app/App.tsx`, add the import and the new route. `ProtectedRoute` is still used — with every role code listed — so the auth-required gate every other route has is preserved; only the role-narrowing is deliberately absent (all 7 roles are listed, so it never rejects a role, only a missing token):

```tsx
import { InsightsScreen } from '../screens/insights/InsightsScreen';
```

```tsx
<Route
  path="/insights"
  element={
    <ProtectedRoute
      allowedRoles={[
        'INVESTIGATOR', 'STATION_SUPERVISOR', 'DISTRICT_SUPERVISOR',
        'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN', 'SUPER_ADMIN',
      ]}
    >
      <InsightsScreen />
    </ProtectedRoute>
  }
/>
```

(Place this route anywhere among the existing `<Route>` entries inside `AuthenticatedShell`, e.g. directly after `/command-center`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/app/Rail.test.tsx src/app/App.test.tsx`
Expected: PASS (Rail: 1 test; App: 7 tests total, 3 new)

- [ ] **Step 5: Run the full test suite**

Run: `pnpm vitest run`
Expected: PASS — every existing test plus all Insights tests green, no regressions

- [ ] **Step 6: Commit**

```bash
git add src/app/App.tsx src/app/App.test.tsx src/app/Rail.tsx src/app/Rail.test.tsx
git commit -m "feat: wire /insights into routing and the nav rail for all roles"
```

---

## Self-review notes

- **Spec coverage:** every one of the 28 visualizations in the approved design spec's per-pillar tables has a corresponding card in Tasks 8-12; the routing/RBAC decisions (all 7 roles, no pillar-level restriction, PII-safe fallbacks) are implemented in Task 14 + the `canShowLiveX` functions in Task 5. The three LIVE→role-gated corrections (see "Corrections made during planning") were verified against actual backend source before writing any task code, not assumed.
- **Placeholder scan:** no TBD/TODO; every step has runnable code; no step says "similar to Task N" without repeating the code.
- **Type consistency:** `HeatmapCell` (Task 7) is used identically in Task 9's two heatmap cards; `CaseSummaryResponse` (existing `caseApi.ts`) is the exact shape `getRecentFirsDemo()` (Task 1) returns and `<CaseList>`/`DemoRecentFirsTable` (Task 8) consume; `RepeatOffenderResponse` (existing `networkApi.ts`) is the exact shape `deriveRepeatVsFirstTime` (Task 5) and the live branch of Task 11 consume; `HotspotClusterResponse` (Task 4) matches the Recharts `dataKey`s used in Task 9's live scatter (`centroidLon`/`centroidLat`/`caseCount`).

## Execution options

Plan complete and saved to `docs/superpowers/plans/2026-07-23-insights-analytics-dashboard.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
