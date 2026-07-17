// Dev-only canned responses, used when sessionStorage['ksp-mock'] === '1' (see client.ts).
// Lets Command Center render fully populated without a live backend. Not wired into any
// production path -- safe to leave in.

import { STATIONS_BY_DISTRICT } from './generatedStationFixtures';

// districtId assignments here match the ones baked into
// public/data/karnataka-districts.geojson (alphabetical order) so boundaries and
// summaries join correctly. Real district shapes, sourced from
// github.com/udit-001/india-maps-data (2011 census districts), coordinates rounded to
// 5dp and simplified for bundle size.
const MOCK_DISTRICTS = [
  { districtId: 1, districtName: 'Bagalkote', caseCount: 89 },
  { districtId: 2, districtName: 'Ballari', caseCount: 350 },
  { districtId: 3, districtName: 'Belagavi', caseCount: 586 },
  { districtId: 4, districtName: 'Bengaluru Rural', caseCount: 107 },
  { districtId: 5, districtName: 'Bengaluru Urban', caseCount: 1840 },
  { districtId: 6, districtName: 'Bidar', caseCount: 282 },
  { districtId: 7, districtName: 'Chamarajanagara', caseCount: 349 },
  { districtId: 8, districtName: 'Chikkaballapura', caseCount: 187 },
  { districtId: 9, districtName: 'Chikkamagaluru', caseCount: 80 },
  { districtId: 10, districtName: 'Chitradurga', caseCount: 289 },
  { districtId: 11, districtName: 'Dakshina Kannada', caseCount: 396 },
  { districtId: 12, districtName: 'Davanagere', caseCount: 327 },
  { districtId: 13, districtName: 'Dharwad', caseCount: 293 },
  { districtId: 14, districtName: 'Gadag', caseCount: 182 },
  { districtId: 15, districtName: 'Hassan', caseCount: 422 },
  { districtId: 16, districtName: 'Haveri', caseCount: 449 },
  { districtId: 17, districtName: 'Kalaburagi', caseCount: 526 },
  { districtId: 18, districtName: 'Kodagu', caseCount: 265 },
  { districtId: 19, districtName: 'Kolar', caseCount: 253 },
  { districtId: 20, districtName: 'Koppal', caseCount: 127 },
  { districtId: 21, districtName: 'Mandya', caseCount: 288 },
  { districtId: 22, districtName: 'Mysuru', caseCount: 687 },
  { districtId: 23, districtName: 'Raichur', caseCount: 269 },
  { districtId: 24, districtName: 'Ramanagara', caseCount: 458 },
  { districtId: 25, districtName: 'Shivamogga', caseCount: 406 },
  { districtId: 26, districtName: 'Tumakuru', caseCount: 678 },
  { districtId: 27, districtName: 'Udupi', caseCount: 401 },
  { districtId: 28, districtName: 'Uttara Kannada', caseCount: 185 },
  { districtId: 29, districtName: 'Vijayapura', caseCount: 451 },
  { districtId: 30, districtName: 'Yadgir', caseCount: 268 },
];

let boundariesPromise: Promise<unknown> | null = null;
function loadBoundaries(): Promise<unknown> {
  if (!boundariesPromise) {
    boundariesPromise = fetch('/data/karnataka-districts.geojson').then((r) => r.json());
  }
  return boundariesPromise;
}

const stationBoundaryPromises = new Map<number, Promise<unknown>>();
function loadStationBoundaries(districtId: number): Promise<unknown> {
  if (!stationBoundaryPromises.has(districtId)) {
    stationBoundaryPromises.set(
      districtId,
      fetch(`/data/stations/${districtId}.geojson`).then((r) => r.json()),
    );
  }
  return stationBoundaryPromises.get(districtId)!;
}

function weeklySeries(base: number, weeks = 12) {
  return Array.from({ length: weeks }, (_, i) => ({
    isoYear: 2026,
    isoWeek: 20 + i,
    count: Math.round(base + Math.sin(i / 2) * base * 0.15 + i * 2),
  }));
}

const MOCK_SUMMARY = {
  kpi: {
    stateCaseCount: 12480,
    stateCaseCountDeltaPct: 4.2,
    resolvedPct: 61.3,
    resolvedPctDeltaPts: 1.8,
    topCrimeSubHead: 'Theft of Motor Vehicle',
    topCrimeSubHeadCount: 1120,
  },
  stateCaseVolumeWeekly: weeklySeries(900),
  crimesAgainstPropertyWeekly: weeklySeries(380),
  arrestsWeekly: weeklySeries(210),
  categoryMix: [
    { crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 3210 },
    { crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 4890 },
    { crimeHeadId: 3, crimeGroupName: 'Crimes Against Women', count: 1870 },
    { crimeHeadId: 4, crimeGroupName: 'Economic Offences', count: 1640 },
    { crimeHeadId: 5, crimeGroupName: 'Cyber Crimes', count: 870 },
  ],
};

const MOCK_ALERTS = [
  {
    unitId: 101,
    unitName: 'Whitefield PS',
    crimeSubHeadId: 12,
    crimeSubHeadName: 'Chain Snatching',
    currentWeekCount: 14,
    baselineMean: 5.2,
    zScore: 3.8,
    explanation:
      'Whitefield PS logged 14 chain snatching cases this week against an 8-week baseline mean of 5.2 -- a 3.8 sigma deviation, the sharpest rise in the district.',
  },
  {
    unitId: 205,
    unitName: 'Hubballi Rural PS',
    crimeSubHeadId: 21,
    crimeSubHeadName: 'Cattle Theft',
    currentWeekCount: 9,
    baselineMean: 3.1,
    zScore: 3.1,
    explanation:
      'Hubballi Rural PS recorded 9 cattle theft cases this week versus a baseline mean of 3.1, consistent with a coordinated pattern across two adjoining jurisdictions.',
  },
  {
    unitId: 340,
    unitName: 'Mangaluru City PS',
    crimeSubHeadId: 34,
    crimeSubHeadName: 'Cyber Financial Fraud',
    currentWeekCount: 22,
    baselineMean: 11.4,
    zScore: 2.6,
    explanation:
      'Mangaluru City PS saw 22 cyber financial fraud complaints this week against a baseline of 11.4, driven by a UPI-linked phishing campaign.',
  },
];

const MOCK_ME = {
  username: 'demo.analyst',
  firstName: 'Demo',
  rank: 'SCRB Analyst',
  unit: 'State Crime Records Bureau',
  roles: ['SCRB_ANALYST'],
};

// Real KGIS station names/ids (see src/api/generatedStationFixtures.ts), each given a
// deterministic proportional share of the district's case count -- no Math.random(), so
// results (and tests) are stable across runs.
function mockStations(districtId: number) {
  const district = MOCK_DISTRICTS.find((d) => d.districtId === districtId);
  const base = district?.caseCount ?? 100;
  const roster = STATIONS_BY_DISTRICT[districtId] ?? [];
  if (roster.length === 0) return [];

  const share = base / roster.length;
  return roster.map((station, index) => {
    const wobble = 1 + (((index % 3) - 1) * 0.2); // cycles 0.8, 1.0, 1.2
    return {
      unitId: station.unitId,
      unitName: station.unitName,
      caseCount: Math.max(1, Math.round(share * wobble)),
    };
  });
}

function mockDistrictDetail(districtId: number) {
  const district = MOCK_DISTRICTS.find((d) => d.districtId === districtId);
  const ratio = (district?.caseCount ?? 0) / MOCK_SUMMARY.kpi.stateCaseCount;
  return {
    kpi: {
      ...MOCK_SUMMARY.kpi,
      stateCaseCount: Math.round(MOCK_SUMMARY.kpi.stateCaseCount * ratio),
      topCrimeSubHeadCount: Math.round(MOCK_SUMMARY.kpi.topCrimeSubHeadCount * ratio),
    },
    categoryMix: MOCK_SUMMARY.categoryMix.map((slice) => ({
      ...slice,
      count: Math.round(slice.count * ratio),
    })),
  };
}

export async function getMockResponse(path: string, options: RequestInit): Promise<unknown | undefined> {
  if (path === '/api/auth/login' && options.method === 'POST') {
    return { token: 'mock-token', roles: ['SCRB_ANALYST'] };
  }
  if (path === '/api/me') return MOCK_ME;
  if (path === '/api/command-center/summary') return MOCK_SUMMARY;
  if (path === '/api/alerts/emerging') return MOCK_ALERTS;
  if (path === '/api/geo/districts') return MOCK_DISTRICTS;
  if (path === '/api/geo/districts/boundaries') return loadBoundaries();

  const stationMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations$/);
  if (stationMatch) return mockStations(Number(stationMatch[1]));

  const stationBoundariesMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations\/boundaries$/);
  if (stationBoundariesMatch) return loadStationBoundaries(Number(stationBoundariesMatch[1]));

  const districtDetailMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/summary$/);
  if (districtDetailMatch) return mockDistrictDetail(Number(districtDetailMatch[1]));

  return undefined;
}
