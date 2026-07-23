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
