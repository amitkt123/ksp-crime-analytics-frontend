// Dev-only canned responses, used when sessionStorage['ksp-mock'] === '1' (see client.ts).
// Lets Command Center render fully populated without a live backend. Not wired into any
// production path -- safe to leave in.

import { STATIONS_BY_DISTRICT } from './generatedStationFixtures';
import { featureCentroid } from '../screens/command-center/geoBounds';
import { STATION_CENTROIDS } from './generatedStationCentroids';
import { CRIME_TYPE_OPTIONS } from '../constants/crimeTypes';
import { formatCrimeNo, CASE_CATEGORY_CODES } from '../utils/crimeNumber';
import type {
  DistrictCorrelationResponse,
  PredictiveRiskForecastResponse,
  CaseAnomalyResponse,
} from './sociologicalApi';

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
  districtId: null as number | null,
  roles: ['SCRB_ANALYST'],
};

// Distinct demo personas so mock mode can actually reach /case-explorer -- the real
// backend issues one token per user; here the token itself encodes which demo persona
// is "logged in" so /api/me (which has no other way to know who's asking) can look up
// the right profile.
// Whitefield PS (unitId 176) is in Bengaluru Urban (districtId 5, see MOCK_DISTRICTS
// above) -- lets Case Explorer fetch this station's jurisdiction boundary the same way
// Command Center does, via getStationBoundaries(token, districtId).
const MOCK_ME_INVESTIGATOR = {
  username: 'demo.investigator',
  firstName: 'Demo',
  rank: 'Investigator',
  unit: 'Whitefield PS',
  unitId: 176,
  districtId: 5,
  roles: ['INVESTIGATOR'],
};

const MOCK_ME_SUPERVISOR = {
  username: 'demo.supervisor',
  firstName: 'Demo',
  rank: 'Station Supervisor',
  unit: 'Whitefield PS',
  unitId: 176,
  districtId: 5,
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
const CASES_PER_STATION = 40;

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

function findStationDistrictId(unitId: number): number | undefined {
  for (const [districtId, roster] of Object.entries(STATIONS_BY_DISTRICT)) {
    if (roster.some((s) => s.unitId === unitId)) return Number(districtId);
  }
  return undefined;
}

function findDistrictName(unitId: number): string | undefined {
  for (const [districtId, roster] of Object.entries(STATIONS_BY_DISTRICT)) {
    if (roster.some((station) => station.unitId === unitId)) {
      return MOCK_DISTRICTS.find((d) => d.districtId === Number(districtId))?.districtName;
    }
  }
  return undefined;
}

type CaseGravity = 'heinous' | 'serious' | 'minor';
const CASE_GRAVITIES: CaseGravity[] = ['serious', 'heinous', 'minor'];

// A few small offsets from the station centroid, standing in for 2-3 real crime-prone
// spots within the jurisdiction (a market, a highway junction, etc).
const CLUSTER_OFFSETS: Array<[number, number]> = [
  [0, 0],
  [0.014, 0.01],
  [-0.012, 0.013],
];

// Real per-station centroid (STATION_CENTROIDS, derived from public/data/stations/*.geojson
// via scripts/build-station-centroids.mjs), jittered deterministically -- no Math.random(),
// matching this file's convention -- into a few tight clusters plus a sparser background
// scatter (index % 6 === 5). Gives the case density heatmap believable higher/lower-crime
// areas within the station's real jurisdiction, rather than a Karnataka-wide random spread.
// Stands in for real FIR geo-coordinates until mock mode is retired in favor of the real
// `location` field GET /api/cases now returns.
function mockLocation(unitId: number, index: number): { lat: number; lng: number } {
  const [centerLng, centerLat] = STATION_CENTROIDS[unitId] ?? [76.5, 15.3];
  const isBackground = index % 6 === 5;
  const cluster = CLUSTER_OFFSETS[(unitId + index) % CLUSTER_OFFSETS.length];
  const spread = isBackground ? 0.035 : 0.007;
  const latJitter = (((unitId * 7 + index * 13) % 100) / 100 - 0.5) * spread;
  const lngJitter = (((unitId * 11 + index * 17) % 100) / 100 - 0.5) * spread;
  return { lat: centerLat + cluster[1] + latJitter, lng: centerLng + cluster[0] + lngJitter };
}

// Deterministic per-station case list -- no Math.random(), so a given unitId always
// produces the same CASES_PER_STATION cases (stable across runs and tests). index
// rotates through crime type and status so a station's list isn't visually uniform.
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

// Deterministic jitter around the station's real boundary centroid (no Math.random(),
// same spirit as mockCaseSummaries) -- reuses CASES_PER_STATION's count so the heatmap
// and the station's own case list agree on volume.
async function mockStationIncidents(unitId: number) {
  const districtId = findStationDistrictId(unitId);
  if (districtId == null) return [];
  const boundaries = (await loadStationBoundaries(districtId)) as {
    features: Array<{ properties: { unitId: number }; geometry: { coordinates: unknown } }>;
  };
  const feature = boundaries.features.find((f) => f.properties.unitId === unitId);
  if (!feature) return [];
  const [centerLng, centerLat] = featureCentroid(feature.geometry);
  const unitName = findStationName(unitId) ?? '';

  return mockCaseSummaries(unitId, unitName).map((c, index) => {
    const angle = (index / CASES_PER_STATION) * 2 * Math.PI;
    const radius = 0.01 + (index % 3) * 0.005; // ~1-2km wobble, cycles 3 ways
    return {
      caseMasterId: c.caseId,
      crimeNo: c.caseNumber,
      latitude: centerLat + Math.sin(angle) * radius,
      longitude: centerLng + Math.cos(angle) * radius,
    };
  });
}

const VICTIM_NAMES = ['Ramesh Kumar', 'Sunita Devi', 'Arjun Rao', 'Lakshmi Bai', 'Manjunath Gowda', 'Fathima Begum'];
const ACCUSED_NAMES = ['Suresh Naik', 'Vijay Kumar', 'Rakesh Yadav', 'Prakash Shetty', 'Imran Khan', 'Ganesh Bhat'];
const COMPLAINANT_NAMES = ['Nagaraj Setty', 'Kavitha Reddy', 'Basavaraj Patil', 'Meena Iyer', 'Yusuf Ali', 'Shobha Rani'];
const ADDRESS_STREETS = ['12 MG Road', '45 Church Street', '7 Station Road', '3 Market Lane', '21 Temple Street', '9 Ring Road'];
const COURTS = ['JMFC Court, Bengaluru Urban', 'Sessions Court, Belagavi', 'JMFC Court, Mysuru'];

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

const PARTY_NAME_POOLS: Record<'complainant' | 'victim' | 'accused', string[]> = {
  complainant: COMPLAINANT_NAMES,
  victim: VICTIM_NAMES,
  accused: ACCUSED_NAMES,
};

function mockParty(role: 'complainant' | 'victim' | 'accused', index: number) {
  const names = PARTY_NAME_POOLS[role];
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

// Only some cases have a complainant distinct from the victim (e.g. a family
// member filing on the victim's behalf) -- deterministic so it stays stable.
function mockArrests(status: CaseStatus, firDate: string) {
  if (status === 'registered') return undefined;
  return [
    {
      arrestDate: offsetDate(firDate, 5),
      custodyStatus: status === 'closed' ? 'Released on bail' : 'Judicial custody',
    },
  ];
}

function mockChargesheet(status: CaseStatus, firDate: string, index: number) {
  if (status !== 'closed') return undefined;
  return {
    filedDate: offsetDate(firDate, 18),
    sectionsApplied: index % 2 === 0 ? '379, 411 IPC' : '392, 34 IPC',
    court: COURTS[index % COURTS.length],
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
  const parties = [mockParty('victim', index), mockParty('accused', index + 1)];
  if (index % 3 === 0) parties.unshift(mockParty('complainant', index + 2));
  return {
    ...summary,
    narrative: mockNarrative(summary.crimeSubHeadName, unitName),
    parties,
    timeline: mockTimeline(summary.status, summary.firDate),
    arrests: mockArrests(summary.status, summary.firDate),
    chargesheet: mockChargesheet(summary.status, summary.firDate, index),
  };
}

// Deterministic stand-in for a real Insight & Explanation Agent -- see
// docs/superpowers/specs/2026-07-18-case-explorer-extensions-design.md for the
// endpoint contract a real backend implementation should follow.
function mockCaseExplanation(caseId: number) {
  const detail = mockCaseDetail(caseId);
  if (!detail) return undefined;
  const related = mockCaseSummaries(detail.unitId, detail.unitName)
    .filter((c) => c.crimeSubHeadId === detail.crimeSubHeadId && c.caseId !== detail.caseId)
    .map((c) => c.caseNumber);
  const confidence = Math.min(0.95, 0.5 + related.length * 0.1 + detail.timeline.length * 0.03);
  const claim =
    related.length > 0
      ? `${detail.crimeSubHeadName} case ${detail.caseNumber} at ${detail.unitName} shares its crime sub-head ` +
        `and jurisdiction with ${related.length} other case${related.length === 1 ? '' : 's'} registered at this ` +
        'station, consistent with an active local pattern.'
      : `${detail.crimeSubHeadName} case ${detail.caseNumber} at ${detail.unitName} is currently the only case ` +
        'of this crime sub-head registered at this station in the sampled window -- no local repeat pattern detected.';
  return {
    claim,
    confidence,
    confidenceLabel: 'Pattern confidence',
    method: 'Insight & Explanation Agent · case similarity within unit',
    baseline: 'Same crime sub-head, same station, most recent 6 cases',
    generatedAt: detail.timeline[detail.timeline.length - 1].timestamp,
    records: related.length > 0 ? related : [detail.caseNumber],
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
      const matchesNumber =
        c.caseNumber.toLowerCase().includes(q) || (c.crimeNumber?.toLowerCase().includes(q) ?? false);
      const detail = mockCaseDetail(c.caseId);
      const matchesParty = detail?.parties.some((p) => p.name.real.toLowerCase().includes(q)) ?? false;
      if (!matchesNumber && !matchesParty) return false;
    }
    return true;
  });
}

// Caps how many stations feed the network mock dataset so the graph stays a legible
// size -- mirrors the real backend's 75-node-per-response cap without needing to
// reproduce it station-by-station. Object.values(...).flat() has a stable insertion
// order, so this sample is deterministic.
const MOCK_NETWORK_STATION_SAMPLE = 10;

// Stand in for identity resolution's synthetic-id tier -- mock data has no real
// Neo4j id, so these fixed arrays (parallel to ACCUSED_NAMES/VICTIM_NAMES) give
// every mock person a stable numeric personId, matching the real contract's
// personId: number shape (RepeatOffenderResponse.personId, /path's from/to).
const ACCUSED_PERSON_IDS = [5001, 5002, 5003, 5004, 5005, 5006];
const VICTIM_PERSON_IDS = [6001, 6002, 6003, 6004, 6005, 6006];

const MAX_SUBGRAPH_NODES = 75;

interface NetworkCaseTuple {
  caseId: number;
  caseNumber: string;
  unitId: number;
  unitName: string;
  crimeSubHeadId: number;
  accusedId: number;
  accusedName: string;
  victimId: number;
  victimName: string;
}

function networkStations() {
  return Object.values(STATIONS_BY_DISTRICT).flat().slice(0, MOCK_NETWORK_STATION_SAMPLE);
}

// Reuses mockCaseDetail's exact party indices (mockParty('accused', index + 1),
// mockParty('victim', index)) so a person shown here is the same identity Case
// Explorer shows for the same caseId.
function networkCaseTuples(): NetworkCaseTuple[] {
  const tuples: NetworkCaseTuple[] = [];
  networkStations().forEach(({ unitId, unitName }) => {
    mockCaseSummaries(unitId, unitName).forEach((summary, index) => {
      const accused = mockParty('accused', index + 1);
      const victim = mockParty('victim', index);
      tuples.push({
        caseId: summary.caseId,
        caseNumber: summary.caseNumber,
        unitId,
        unitName,
        crimeSubHeadId: summary.crimeSubHeadId,
        accusedId: ACCUSED_PERSON_IDS[(index + 1) % ACCUSED_PERSON_IDS.length],
        accusedName: accused.name.real,
        victimId: VICTIM_PERSON_IDS[index % VICTIM_PERSON_IDS.length],
        victimName: victim.name.real,
      });
    });
  });
  return tuples;
}

interface NetworkPersonAgg {
  personId: number;
  displayName: string;
  caseIds: number[];
  crimeSubHeadId: number;
}

function aggregateAccused(tuples: NetworkCaseTuple[]): Map<number, NetworkPersonAgg> {
  const byId = new Map<number, NetworkPersonAgg>();
  tuples.forEach((t) => {
    const existing = byId.get(t.accusedId);
    if (existing) {
      existing.caseIds.push(t.caseId);
    } else {
      byId.set(t.accusedId, { personId: t.accusedId, displayName: t.accusedName, caseIds: [t.caseId], crimeSubHeadId: t.crimeSubHeadId });
    }
  });
  return byId;
}

function confidenceScoreFor(caseCount: number): number {
  return Math.min(0.97, 0.55 + caseCount * 0.06);
}

function personDisplayName(personId: number, tuples: NetworkCaseTuple[]): string | undefined {
  const accused = tuples.find((t) => t.accusedId === personId);
  if (accused) return accused.accusedName;
  const victim = tuples.find((t) => t.victimId === personId);
  if (victim) return victim.victimName;
  return undefined;
}

function buildRepeatOffenders(minCases: number, limit: number) {
  const persons = aggregateAccused(networkCaseTuples());
  return Array.from(persons.values())
    .filter((p) => p.caseIds.length >= minCases)
    .sort((a, b) => b.caseIds.length - a.caseIds.length || a.personId - b.personId)
    .slice(0, limit)
    .map((p) => ({
      personId: p.personId,
      displayName: p.displayName,
      caseCount: p.caseIds.length,
      gravityWeight: p.caseIds.length * 3,
      confidenceScore: confidenceScoreFor(p.caseIds.length),
    }));
}

// Deterministic stand-in for a real Louvain run: groups accused by their crime
// sub-head's parent category. Mirrors the real community focus's actual shape --
// PERSON nodes only, no Case/Location -- so communityId here is just as opaque
// to the frontend as a real Neo4j Louvain cluster id would be.
function buildCommunities(minSize: number) {
  const persons = aggregateAccused(networkCaseTuples());
  const byCommunity = new Map<number, string[]>();
  persons.forEach((p) => {
    const crimeType = CASE_CRIME_TYPES.find((c) => c.crimeSubHeadId === p.crimeSubHeadId)!;
    const list = byCommunity.get(crimeType.crimeHeadId) ?? [];
    list.push(p.displayName);
    byCommunity.set(crimeType.crimeHeadId, list);
  });
  return Array.from(byCommunity.entries())
    .map(([communityId, memberDisplayNames]) => ({ communityId, size: memberDisplayNames.length, memberDisplayNames }))
    .filter((c) => c.size >= minSize)
    .sort((a, b) => b.size - a.size);
}

// Two persons are "adjacent" if they appear (as accused or victim) on the same
// case, OR if two accused share a crimeSubHeadId (the same signal
// sharesMoWithEdges uses for SHARES_MO_WITH) -- a person-to-person adjacency
// graph, matching the real /path endpoint's reported shape
// (personIds/displayNames/hopCount only, no intermediate Case/Location nodes)
// even though the real graph traversal happens over the full node/edge graph,
// including computed CO_ACCUSED_WITH/SHARES_MO_WITH edges.
//
// The case-co-occurrence link alone is NOT enough here: mock accusedId and
// victimId are both pure functions of a case's index-in-station (see
// networkCaseTuples), so every occurrence of a given accusedId pairs with
// exactly one victimId and vice versa -- a perfect matching with no
// accused-to-accused connectivity at all. The crimeSubHeadId link is what
// makes two different repeat offenders reachable from each other, mirroring
// how a real deployment's SHARES_MO_WITH edges would connect them.
function personAdjacency(tuples: NetworkCaseTuple[]): Map<number, Set<number>> {
  const byCase = new Map<number, Set<number>>();
  const bySubHead = new Map<number, Set<number>>();
  tuples.forEach((t) => {
    const caseSet = byCase.get(t.caseId) ?? new Set<number>();
    caseSet.add(t.accusedId);
    caseSet.add(t.victimId);
    byCase.set(t.caseId, caseSet);

    const subHeadSet = bySubHead.get(t.crimeSubHeadId) ?? new Set<number>();
    subHeadSet.add(t.accusedId);
    bySubHead.set(t.crimeSubHeadId, subHeadSet);
  });
  const adjacency = new Map<number, Set<number>>();
  function link(a: number, b: number) {
    if (a === b) return;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }
  byCase.forEach((members) => {
    const list = Array.from(members);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) link(list[i], list[j]);
    }
  });
  bySubHead.forEach((members) => {
    const list = Array.from(members);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) link(list[i], list[j]);
    }
  });
  return adjacency;
}

function bfsPersonPath(from: number, to: number, maxHops: number, tuples: NetworkCaseTuple[]): number[] | null {
  if (from === to) return [from];
  const adjacency = personAdjacency(tuples);
  const queue: number[][] = [[from]];
  const seen = new Set<number>([from]);
  while (queue.length) {
    const current = queue.shift()!;
    const last = current[current.length - 1];
    if (last === to) return current;
    if (current.length - 1 >= maxHops) continue;
    for (const next of adjacency.get(last) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...current, next]);
      }
    }
  }
  return null;
}

function buildNetworkPath(from: number, to: number, maxHops: number) {
  const tuples = networkCaseTuples();
  const fromName = personDisplayName(from, tuples);
  const toName = personDisplayName(to, tuples);
  if (!fromName || !toName) return null;

  const path = bfsPersonPath(from, to, maxHops, tuples);
  if (!path) return null;

  return {
    personIds: path,
    displayNames: path.map((id) => personDisplayName(id, tuples)!),
    hopCount: path.length - 1,
  };
}

type MockGraphNode = { id: string; type: 'PERSON' | 'CASE' | 'LOCATION'; label: string; confidence: number | null };
type MockGraphEdge = { id: string; sourceId: string; targetId: string; type: string; confidence: number | null };

// Caps the node list at 75 and drops any edge whose endpoint didn't survive the
// cap -- mirrors the real Cypher's own documented invariant (never a dangling
// edge, never truncated after the edges were already built).
function capSubgraph(nodes: MockGraphNode[], edges: MockGraphEdge[]) {
  const seen = new Set<string>();
  const cappedNodes = nodes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  }).slice(0, MAX_SUBGRAPH_NODES);
  const nodeIds = new Set(cappedNodes.map((n) => n.id));
  const cappedEdges = edges.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));
  return { nodes: cappedNodes, edges: cappedEdges, generatedAt: '2026-07-19T06:00:00Z' };
}

function sharesMoWithEdges(personIds: number[], tuples: NetworkCaseTuple[]) {
  const bySubHead = new Map<number, Set<number>>();
  tuples.forEach((t) => {
    if (!personIds.includes(t.accusedId)) return;
    const set = bySubHead.get(t.crimeSubHeadId) ?? new Set<number>();
    set.add(t.accusedId);
    bySubHead.set(t.crimeSubHeadId, set);
  });
  const edges: MockGraphEdge[] = [];
  bySubHead.forEach((members) => {
    const list = Array.from(members);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        edges.push({
          id: `smw-${list[i]}-${list[j]}`,
          sourceId: String(list[i]),
          targetId: String(list[j]),
          type: 'SHARES_MO_WITH',
          confidence: 0.7,
        });
      }
    }
  });
  return edges;
}

function egoNetworkNodesAndEdges(seedPersonIds: number[], tuples: NetworkCaseTuple[]) {
  const nodes: MockGraphNode[] = [];
  const edges: MockGraphEdge[] = [];
  const seenNodeIds = new Set<string>();
  function addNode(node: MockGraphNode) {
    if (seenNodeIds.has(node.id)) return;
    seenNodeIds.add(node.id);
    nodes.push(node);
  }

  tuples.forEach((t) => {
    if (!seedPersonIds.includes(t.accusedId) && !seedPersonIds.includes(t.victimId)) return;
    addNode({ id: String(t.accusedId), type: 'PERSON', label: t.accusedName, confidence: confidenceScoreFor(1) });
    addNode({ id: `case-${t.caseId}`, type: 'CASE', label: `${t.caseNumber}`, confidence: null });
    addNode({ id: `location-${t.unitId}`, type: 'LOCATION', label: t.unitName, confidence: null });
    addNode({ id: String(t.victimId), type: 'PERSON', label: t.victimName, confidence: null });
    edges.push({ id: `acc-${t.accusedId}-${t.caseId}`, sourceId: String(t.accusedId), targetId: `case-${t.caseId}`, type: 'ACCUSED_IN', confidence: null });
    edges.push({ id: `vic-${t.victimId}-${t.caseId}`, sourceId: String(t.victimId), targetId: `case-${t.caseId}`, type: 'VICTIM_IN', confidence: null });
    edges.push({ id: `occ-${t.caseId}-${t.unitId}`, sourceId: `case-${t.caseId}`, targetId: `location-${t.unitId}`, type: 'OCCURRED_AT', confidence: null });
  });

  const accusedIdsOnCanvas = nodes.filter((n) => n.type === 'PERSON').map((n) => Number(n.id));
  edges.push(...sharesMoWithEdges(accusedIdsOnCanvas, tuples));

  return capSubgraph(nodes, edges);
}

function buildSubgraph(focus: string, limit: number, personId: number | undefined, hops: number, communityId: number | undefined, from: number | undefined, to: number | undefined, maxHops: number) {
  const tuples = networkCaseTuples();

  if (focus === 'person' && personId != null) {
    const clampedHops = Math.min(Math.max(hops, 1), 2);
    const seeds = [personId];
    if (clampedHops === 2) {
      const directCoParties = tuples
        .filter((t) => t.accusedId === personId || t.victimId === personId)
        .flatMap((t) => [t.accusedId, t.victimId]);
      seeds.push(...directCoParties);
    }
    return egoNetworkNodesAndEdges(seeds, tuples);
  }

  if (focus === 'community' && communityId != null) {
    const persons = aggregateAccused(tuples);
    const memberIds = Array.from(persons.values())
      .filter((p) => {
        const crimeType = CASE_CRIME_TYPES.find((c) => c.crimeSubHeadId === p.crimeSubHeadId)!;
        return crimeType.crimeHeadId === communityId;
      })
      .map((p) => p.personId);
    const nodes: MockGraphNode[] = memberIds.map((id) => {
      const person = persons.get(id)!;
      return { id: String(id), type: 'PERSON', label: person.displayName, confidence: confidenceScoreFor(person.caseIds.length) };
    });
    const edges = sharesMoWithEdges(memberIds, tuples);
    return capSubgraph(nodes, edges);
  }

  if (focus === 'path' && from != null && to != null) {
    const path = bfsPersonPath(from, to, maxHops, tuples);
    if (!path) return capSubgraph([], []);
    const nodes: MockGraphNode[] = [];
    const edges: MockGraphEdge[] = [];
    const seenNodeIds = new Set<string>();
    function addNode(node: MockGraphNode) {
      if (seenNodeIds.has(node.id)) return;
      seenNodeIds.add(node.id);
      nodes.push(node);
    }
    path.forEach((personId2) => {
      const name = personDisplayName(personId2, tuples)!;
      addNode({ id: String(personId2), type: 'PERSON', label: name, confidence: confidenceScoreFor(1) });
    });
    // A hop can be case-based (a shared tuple, i.e. one is accused and the other
    // victim of the same case) or MO-based (two accused linked only by
    // crimeSubHeadId, per personAdjacency's bySubHead links -- a case tuple never
    // has two accused, so no single tuple can "justify" that kind of hop). Fall
    // back to each endpoint's own case so the hop still has supporting evidence,
    // and add SHARES_MO_WITH edges across the whole path to show the MO link.
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const sharedCase = tuples.find((t) => (t.accusedId === a || t.victimId === a) && (t.accusedId === b || t.victimId === b));
      const justifyingCase = sharedCase ?? tuples.find((t) => t.accusedId === a || t.victimId === a) ?? tuples.find((t) => t.accusedId === b || t.victimId === b);
      if (!justifyingCase) continue;
      addNode({ id: `case-${justifyingCase.caseId}`, type: 'CASE', label: justifyingCase.caseNumber, confidence: null });
      addNode({ id: `location-${justifyingCase.unitId}`, type: 'LOCATION', label: justifyingCase.unitName, confidence: null });
      if (justifyingCase.accusedId === a || justifyingCase.victimId === a) {
        edges.push({
          id: `p-${a}-${justifyingCase.caseId}`,
          sourceId: String(a),
          targetId: `case-${justifyingCase.caseId}`,
          type: justifyingCase.accusedId === a ? 'ACCUSED_IN' : 'VICTIM_IN',
          confidence: null,
        });
      }
      if (justifyingCase.accusedId === b || justifyingCase.victimId === b) {
        edges.push({
          id: `p-${b}-${justifyingCase.caseId}`,
          sourceId: String(b),
          targetId: `case-${justifyingCase.caseId}`,
          type: justifyingCase.accusedId === b ? 'ACCUSED_IN' : 'VICTIM_IN',
          confidence: null,
        });
      }
      edges.push({ id: `occ-${justifyingCase.caseId}`, sourceId: `case-${justifyingCase.caseId}`, targetId: `location-${justifyingCase.unitId}`, type: 'OCCURRED_AT', confidence: null });
    }
    edges.push(...sharesMoWithEdges(path, tuples));
    return capSubgraph(nodes, edges);
  }

  const seeds = buildRepeatOffenders(1, limit).map((o) => o.personId);
  return egoNetworkNodesAndEdges(seeds, tuples);
}

// Deterministic (no Math.random) so fixtures are stable across reloads and in tests.
const MOCK_CORRELATION: DistrictCorrelationResponse[] = MOCK_DISTRICTS.map((d) => ({
  districtId: d.districtId,
  districtName: d.districtName,
  caseCount: d.caseCount,
  population: 400_000 + d.districtId * 137_000 + (d.districtId % 5) * 50_000,
  literacyRate: Number((68 + (d.districtId % 11) * 1.8).toFixed(1)),
  unemploymentRate: Number((2.5 + (d.districtId % 7) * 0.6).toFixed(1)),
  urbanizationRate: Number((20 + (d.districtId % 9) * 7.5).toFixed(1)),
  perCapitaIncome: 90_000 + (d.districtId % 13) * 18_000,
}));

function buildPredictiveRisk(): PredictiveRiskForecastResponse[] {
  const entries: PredictiveRiskForecastResponse[] = [];
  const districtIds = [5, 3, 17, 11]; // Bengaluru Urban, Belagavi, Kalaburagi, Dakshina Kannada
  for (const districtId of districtIds) {
    const stations = (STATIONS_BY_DISTRICT[districtId] ?? []).slice(0, 3);
    stations.forEach((station, stationIdx) => {
      CRIME_TYPE_OPTIONS.slice(0, 2).forEach((crimeType, typeIdx) => {
        const seed = station.unitId + typeIdx * 7 + stationIdx;
        const backtestActualCount = 4 + (seed % 9);
        const backtestPredictedCount = Number((backtestActualCount + (((seed % 5) - 2) * 0.6)).toFixed(1));
        entries.push({
          unitId: station.unitId,
          unitName: station.unitName,
          districtId,
          crimeSubHeadId: crimeType.crimeSubHeadId,
          crimeSubHeadName: crimeType.crimeSubHeadName,
          predictedCount: Number((backtestActualCount + 1 + (seed % 6) * 0.4).toFixed(1)),
          backtestActualCount,
          backtestPredictedCount,
          backtestAbsoluteError: Number(Math.abs(backtestActualCount - backtestPredictedCount).toFixed(1)),
        });
      });
    });
  }
  return entries;
}
const MOCK_PREDICTIVE_RISK = buildPredictiveRisk();

function predictiveRisk(crimeSubHeadId: string | null): PredictiveRiskForecastResponse[] {
  return crimeSubHeadId
    ? MOCK_PREDICTIVE_RISK.filter((f) => f.crimeSubHeadId === Number(crimeSubHeadId))
    : MOCK_PREDICTIVE_RISK;
}

interface MockCaseAnomaly extends CaseAnomalyResponse {
  crimeSubHeadId: number;
}

const MOCK_CASE_ANOMALIES: MockCaseAnomaly[] = [
  {
    caseMasterId: 90121, crimeNo: '101/2026/5/238', registrationDelayDays: 21, baselineMeanDelayDays: 4.6,
    zScore: 4.1, crimeSubHeadId: 101,
    explanation: 'Registration delay of 21 days is 4.1 standard deviations above the baseline mean of 4.6 days',
  },
  {
    caseMasterId: 90144, crimeNo: '102/2026/17/94', registrationDelayDays: 15, baselineMeanDelayDays: 5.1,
    zScore: 3.2, crimeSubHeadId: 102,
    explanation: 'Registration delay of 15 days is 3.2 standard deviations above the baseline mean of 5.1 days',
  },
  {
    caseMasterId: 90167, crimeNo: '104/2026/5/311', registrationDelayDays: 12, baselineMeanDelayDays: 3.8,
    zScore: 2.9, crimeSubHeadId: 104,
    explanation: 'Registration delay of 12 days is 2.9 standard deviations above the baseline mean of 3.8 days',
  },
  {
    caseMasterId: 90183, crimeNo: '101/2026/11/58', registrationDelayDays: 9, baselineMeanDelayDays: 4.0,
    zScore: 2.6, crimeSubHeadId: 101,
    explanation: 'Registration delay of 9 days is 2.6 standard deviations above the baseline mean of 4.0 days',
  },
  {
    caseMasterId: 90205, crimeNo: '103/2026/3/17', registrationDelayDays: 8, baselineMeanDelayDays: 3.5,
    zScore: 2.3, crimeSubHeadId: 103,
    explanation: 'Registration delay of 8 days is 2.3 standard deviations above the baseline mean of 3.5 days',
  },
  {
    caseMasterId: 90228, crimeNo: '105/2026/17/72', registrationDelayDays: 7, baselineMeanDelayDays: 3.2,
    zScore: 2.1, crimeSubHeadId: 105,
    explanation: 'Registration delay of 7 days is 2.1 standard deviations above the baseline mean of 3.2 days',
  },
];

function caseAnomalies(crimeSubHeadId: string | null): CaseAnomalyResponse[] {
  const filtered = crimeSubHeadId
    ? MOCK_CASE_ANOMALIES.filter((a) => a.crimeSubHeadId === Number(crimeSubHeadId))
    : MOCK_CASE_ANOMALIES;
  return filtered.map(({ crimeSubHeadId: _crimeSubHeadId, ...rest }) => rest);
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
  if (path === '/api/sociological/correlation' || path.startsWith('/api/sociological/correlation?')) {
    return MOCK_CORRELATION;
  }
  if (path === '/api/sociological/predictive-risk' || path.startsWith('/api/sociological/predictive-risk?')) {
    const query = new URLSearchParams(path.split('?')[1] ?? '');
    return predictiveRisk(query.get('crimeSubHeadId'));
  }
  if (path === '/api/sociological/case-anomalies' || path.startsWith('/api/sociological/case-anomalies?')) {
    const query = new URLSearchParams(path.split('?')[1] ?? '');
    return caseAnomalies(query.get('crimeSubHeadId'));
  }
  if (path === '/api/geo/districts') return MOCK_DISTRICTS;
  if (path === '/api/geo/districts/boundaries') return loadBoundaries();
  if (path === '/api/geo/districts/time-of-day') return { buckets: districtTimeOfDayBuckets() };

  const stationMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations$/);
  if (stationMatch) return mockStations(Number(stationMatch[1]));

  const stationBoundariesMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations\/boundaries$/);
  if (stationBoundariesMatch) return loadStationBoundaries(Number(stationBoundariesMatch[1]));

  const districtDetailMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/summary$/);
  if (districtDetailMatch) return mockDistrictDetail(Number(districtDetailMatch[1]));

  const stationIncidentsMatch = path.match(/^\/api\/geo\/stations\/(\d+)\/incidents$/);
  if (stationIncidentsMatch) return mockStationIncidents(Number(stationIncidentsMatch[1]));

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

  const caseExplainMatch = path.match(/^\/api\/cases\/(\d+)\/explain$/);
  if (caseExplainMatch) return mockCaseExplanation(Number(caseExplainMatch[1]));

  if (path.startsWith('/api/network/subgraph?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildSubgraph(
      query.get('focus') ?? 'top-offenders',
      Number(query.get('limit') ?? 10),
      query.get('personId') ? Number(query.get('personId')) : undefined,
      Number(query.get('hops') ?? 2),
      query.get('communityId') ? Number(query.get('communityId')) : undefined,
      query.get('from') ? Number(query.get('from')) : undefined,
      query.get('to') ? Number(query.get('to')) : undefined,
      Number(query.get('maxHops') ?? 6),
    );
  }

  if (path.startsWith('/api/network/repeat-offenders?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildRepeatOffenders(Number(query.get('minCases') ?? 2), Number(query.get('limit') ?? 10));
  }

  if (path.startsWith('/api/network/communities?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildCommunities(Number(query.get('minSize') ?? 3));
  }

  if (path.startsWith('/api/network/path?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildNetworkPath(Number(query.get('from')), Number(query.get('to')), Number(query.get('maxHops') ?? 6));
  }

  return undefined;
}
