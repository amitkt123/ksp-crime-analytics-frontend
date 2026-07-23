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
