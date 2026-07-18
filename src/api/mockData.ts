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

// unitId/districtId pulled from STATIONS_BY_DISTRICT (real KGIS rosters) so an
// alert's pulsing marker lands on the correct station polygon once its district is
// drilled into, and on the correct district polygon on the state-wide map.
const MOCK_ALERTS = [
  {
    unitId: 176,
    unitName: 'Whitefield PS',
    districtId: 5,
    crimeSubHeadId: 12,
    crimeSubHeadName: 'Chain Snatching',
    currentWeekCount: 14,
    baselineMean: 5.2,
    zScore: 3.8,
    explanation:
      'Whitefield PS logged 14 chain snatching cases this week against an 8-week baseline mean of 5.2 -- a 3.8 sigma deviation, the sharpest rise in the district.',
  },
  {
    unitId: 403,
    unitName: 'Hubli SubUrban PS',
    districtId: 13,
    crimeSubHeadId: 21,
    crimeSubHeadName: 'Cattle Theft',
    currentWeekCount: 9,
    baselineMean: 3.1,
    zScore: 3.1,
    explanation:
      'Hubli SubUrban PS recorded 9 cattle theft cases this week versus a baseline mean of 3.1, consistent with a coordinated pattern across two adjoining jurisdictions.',
  },
  {
    unitId: 355,
    unitName: 'Panambur PS',
    districtId: 11,
    crimeSubHeadId: 34,
    crimeSubHeadName: 'Cyber Financial Fraud',
    currentWeekCount: 22,
    baselineMean: 11.4,
    zScore: 2.6,
    explanation:
      'Panambur PS saw 22 cyber financial fraud complaints this week against a baseline of 11.4, driven by a UPI-linked phishing campaign.',
  },
];

const TIME_OF_DAY_BUCKETS: Array<{ bucket: 'night' | 'morning' | 'afternoon' | 'evening'; label: string }> = [
  { bucket: 'night', label: 'Night · 12–6 AM' },
  { bucket: 'morning', label: 'Morning · 6 AM–12 PM' },
  { bucket: 'afternoon', label: 'Afternoon · 12–6 PM' },
  { bucket: 'evening', label: 'Evening · 6 PM–12 AM' },
];

// Deterministic per-district skew (no Math.random(), so results stay stable across
// runs): each district's peak bucket rotates with its id, giving visibly different
// hotspots as the analyst steps through time-of-day buckets instead of every
// district splitting its total case count evenly across all four.
function timeOfDayShares(districtId: number): [number, number, number, number] {
  const shares: [number, number, number, number] = [0.18, 0.18, 0.18, 0.18];
  shares[districtId % 4] = 0.46;
  return shares;
}

function districtTimeOfDayBuckets() {
  return TIME_OF_DAY_BUCKETS.map(({ bucket, label }, bucketIndex) => {
    const districtCaseCounts: Record<number, number> = {};
    for (const district of MOCK_DISTRICTS) {
      districtCaseCounts[district.districtId] = Math.round(
        district.caseCount * timeOfDayShares(district.districtId)[bucketIndex],
      );
    }
    return { bucket, label, districtCaseCounts };
  });
}

const MOCK_ME = {
  username: 'demo.analyst',
  firstName: 'Demo',
  rank: 'SCRB Analyst',
  unit: 'State Crime Records Bureau',
  unitId: null as number | null,
  roles: ['SCRB_ANALYST'],
};

// Distinct demo personas so mock mode can actually reach /case-explorer -- the real
// backend issues one token per user; here the token itself encodes which demo persona
// is "logged in" so /api/me (which has no other way to know who's asking) can look up
// the right profile.
const MOCK_ME_INVESTIGATOR = {
  username: 'demo.investigator',
  firstName: 'Demo',
  rank: 'Investigator',
  unit: 'Whitefield PS',
  unitId: 176,
  roles: ['INVESTIGATOR'],
};

const MOCK_ME_SUPERVISOR = {
  username: 'demo.supervisor',
  firstName: 'Demo',
  rank: 'Station Supervisor',
  unit: 'Whitefield PS',
  unitId: 176,
  roles: ['STATION_SUPERVISOR'],
};

const DEMO_LOGINS: Record<string, { token: string; roles: string[] }> = {
  'demo.investigator': { token: 'mock-token-investigator', roles: ['INVESTIGATOR'] },
  'demo.supervisor': { token: 'mock-token-supervisor', roles: ['STATION_SUPERVISOR'] },
};

const MOCK_ME_BY_TOKEN: Record<string, typeof MOCK_ME> = {
  'mock-token-investigator': MOCK_ME_INVESTIGATOR,
  'mock-token-supervisor': MOCK_ME_SUPERVISOR,
};

function mockLogin(username: string): { token: string; roles: string[] } {
  return DEMO_LOGINS[username] ?? { token: 'mock-token', roles: ['SCRB_ANALYST'] };
}

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

export type CaseStatus = 'registered' | 'under_investigation' | 'closed';

const CASE_CRIME_TYPES: Array<{ crimeSubHeadId: number; crimeSubHeadName: string; crimeHeadId: number }> = [
  { crimeSubHeadId: 101, crimeSubHeadName: 'Theft of Motor Vehicle', crimeHeadId: 2 },
  { crimeSubHeadId: 102, crimeSubHeadName: 'House Break-in', crimeHeadId: 2 },
  { crimeSubHeadId: 103, crimeSubHeadName: 'Chain Snatching', crimeHeadId: 1 },
  { crimeSubHeadId: 104, crimeSubHeadName: 'Cyber Financial Fraud', crimeHeadId: 5 },
  { crimeSubHeadId: 105, crimeSubHeadName: 'Assault', crimeHeadId: 1 },
  { crimeSubHeadId: 106, crimeSubHeadName: 'Cattle Theft', crimeHeadId: 2 },
];

const CASE_STATUSES: CaseStatus[] = ['registered', 'under_investigation', 'closed'];
const CASES_PER_STATION = 6;

function offsetDate(base: string, deltaDays: number): string {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function findStationName(unitId: number): string | undefined {
  for (const roster of Object.values(STATIONS_BY_DISTRICT)) {
    const match = roster.find((station) => station.unitId === unitId);
    if (match) return match.unitName;
  }
  return undefined;
}

// Deterministic per-station case list -- no Math.random(), so a given unitId always
// produces the same 6 cases (stable across runs and tests). index rotates through
// crime type and status so a station's list isn't visually uniform.
function mockCaseSummaries(unitId: number, unitName: string) {
  return Array.from({ length: CASES_PER_STATION }, (_, index) => {
    const crimeType = CASE_CRIME_TYPES[(unitId + index) % CASE_CRIME_TYPES.length];
    const status = CASE_STATUSES[index % CASE_STATUSES.length];
    const dayOffset = (unitId % 10) + index * 5;
    return {
      caseId: unitId * 1000 + index,
      caseNumber: `${100 + unitId + index}/2026`,
      unitId,
      unitName,
      crimeSubHeadId: crimeType.crimeSubHeadId,
      crimeSubHeadName: crimeType.crimeSubHeadName,
      status,
      firDate: offsetDate('2026-06-01', -dayOffset),
    };
  });
}

const VICTIM_NAMES = ['Ramesh Kumar', 'Sunita Devi', 'Arjun Rao', 'Lakshmi Bai', 'Manjunath Gowda', 'Fathima Begum'];
const ACCUSED_NAMES = ['Suresh Naik', 'Vijay Kumar', 'Rakesh Yadav', 'Prakash Shetty', 'Imran Khan', 'Ganesh Bhat'];
const ADDRESS_STREETS = ['12 MG Road', '45 Church Street', '7 Station Road', '3 Market Lane', '21 Temple Street', '9 Ring Road'];

function maskName(real: string): string {
  return real
    .split(' ')
    .map((part) => part[0] + '*'.repeat(Math.max(part.length - 1, 1)))
    .join(' ');
}

function maskPhone(real: string): string {
  return `${real.slice(0, 2)}${'*'.repeat(real.length - 4)}${real.slice(-2)}`;
}

function maskAddress(real: string): string {
  const [street, ...rest] = real.split(', ');
  return ['*'.repeat(street.length), ...rest].join(', ');
}

function mockParty(role: 'victim' | 'accused', index: number) {
  const names = role === 'victim' ? VICTIM_NAMES : ACCUSED_NAMES;
  const real = names[index % names.length];
  const phone = `98${String(10000000 + index * 37).slice(0, 8)}`;
  const address = `${ADDRESS_STREETS[index % ADDRESS_STREETS.length]}, Karnataka`;
  return {
    role,
    name: { masked: maskName(real), real },
    phone: { masked: maskPhone(phone), real: phone },
    address: { masked: maskAddress(address), real: address },
  };
}

function mockNarrative(crimeSubHeadName: string, unitName: string): string {
  return `${crimeSubHeadName} reported to ${unitName}. Field verification and evidence collection are logged in the case diary.`;
}

function mockTimeline(status: CaseStatus, firDate: string) {
  const timeline = [{ status: 'registered' as CaseStatus, timestamp: firDate, note: 'FIR registered.' }];
  if (status === 'registered') return timeline;
  timeline.push({
    status: 'under_investigation' as CaseStatus,
    timestamp: offsetDate(firDate, 3),
    note: 'Investigation taken up by the station.',
  });
  if (status === 'under_investigation') return timeline;
  timeline.push({ status: 'closed' as CaseStatus, timestamp: offsetDate(firDate, 21), note: 'Case closed.' });
  return timeline;
}

function mockCaseDetail(caseId: number) {
  const unitId = Math.floor(caseId / 1000);
  const index = caseId % 1000;
  const unitName = findStationName(unitId);
  if (!unitName) return undefined;
  const summary = mockCaseSummaries(unitId, unitName)[index];
  if (!summary) return undefined;
  return {
    ...summary,
    narrative: mockNarrative(summary.crimeSubHeadName, unitName),
    parties: [mockParty('victim', index), mockParty('accused', index + 1)],
    timeline: mockTimeline(summary.status, summary.firDate),
  };
}

function filterCaseSummaries(
  cases: ReturnType<typeof mockCaseSummaries>,
  filters: { status?: string; crimeSubHeadId?: string; q?: string },
) {
  return cases.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.crimeSubHeadId && String(c.crimeSubHeadId) !== filters.crimeSubHeadId) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const matchesNumber = c.caseNumber.toLowerCase().includes(q);
      const detail = mockCaseDetail(c.caseId);
      const matchesParty = detail?.parties.some((p) => p.name.real.toLowerCase().includes(q)) ?? false;
      if (!matchesNumber && !matchesParty) return false;
    }
    return true;
  });
}

export async function getMockResponse(
  path: string,
  options: RequestInit,
  token?: string | null,
): Promise<unknown | undefined> {
  if (path === '/api/auth/login' && options.method === 'POST') {
    const { username } = JSON.parse((options.body as string) ?? '{}');
    return mockLogin(username);
  }
  if (path === '/api/me') return MOCK_ME_BY_TOKEN[token ?? ''] ?? MOCK_ME;
  if (path === '/api/command-center/summary') return MOCK_SUMMARY;
  if (path === '/api/alerts/emerging') return MOCK_ALERTS;
  if (path === '/api/geo/districts') return MOCK_DISTRICTS;
  if (path === '/api/geo/districts/boundaries') return loadBoundaries();
  if (path === '/api/geo/districts/time-of-day') return { buckets: districtTimeOfDayBuckets() };

  const stationMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations$/);
  if (stationMatch) return mockStations(Number(stationMatch[1]));

  const stationBoundariesMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations\/boundaries$/);
  if (stationBoundariesMatch) return loadStationBoundaries(Number(stationBoundariesMatch[1]));

  const districtDetailMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/summary$/);
  if (districtDetailMatch) return mockDistrictDetail(Number(districtDetailMatch[1]));

  if (path.startsWith('/api/cases?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const unitId = Number(query.get('unitId'));
    const unitName = findStationName(unitId);
    if (!unitName) return [];
    const all = mockCaseSummaries(unitId, unitName);
    return filterCaseSummaries(all, {
      status: query.get('status') ?? undefined,
      crimeSubHeadId: query.get('crimeSubHeadId') ?? undefined,
      q: query.get('q') ?? undefined,
    });
  }

  const caseDetailMatch = path.match(/^\/api\/cases\/(\d+)$/);
  if (caseDetailMatch) return mockCaseDetail(Number(caseDetailMatch[1]));

  return undefined;
}
