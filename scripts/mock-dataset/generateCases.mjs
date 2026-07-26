import { readFile } from 'node:fs/promises';

// Extracts a TS `export const NAME: Type = {...};` object literal by text
// slicing + JSON.parse -- works for generatedStationFixtures.ts/generatedStationCentroids.ts
// because their literals are plain JSON-shaped data (quoted string keys, no TS-only
// syntax), and this script has no TS loader to import them properly.
export async function readTsJsonConst(filePath, constName) {
  const source = await readFile(filePath, 'utf8');
  const marker = `export const ${constName}`;
  const startOfDecl = source.indexOf(marker);
  if (startOfDecl === -1) throw new Error(`${constName} not found in ${filePath}`);
  const equalsIndex = source.indexOf('=', startOfDecl);
  const literal = source.slice(equalsIndex + 1).trim().replace(/;\s*$/, '');
  return JSON.parse(literal);
}

const CASE_STATUSES = ['registered', 'under_investigation', 'closed'];
const CASE_GRAVITIES = ['serious', 'heinous', 'minor'];

// core-platform's case_category seed reserves this 1-digit code for FIR
// (see R__seed_reference_data.sql); this generator only models FIR-type
// records, so every crimeNumber below uses it.
const CASE_CATEGORY_CODE_FIR = 1;

const VICTIM_NAMES = [
  'Ramesh Kumar', 'Sunita Devi', 'Arjun Rao', 'Lakshmi Bai', 'Manjunath Gowda', 'Fathima Begum',
  'Chandrashekar Naidu', 'Vidya Bhat', 'Srinivas Murthy', 'Anita Kulkarni', 'Basavaraj Hiremath',
  'Geetha Nair', 'Mohan Das', 'Padma Priya', 'Ravi Shankar', 'Sharada Devi', 'Umesh Pawar', 'Vani Rani',
];
const ACCUSED_NAMES = [
  'Suresh Naik', 'Vijay Kumar', 'Rakesh Yadav', 'Prakash Shetty', 'Imran Khan', 'Ganesh Bhat',
  'Anand Deshpande', 'Farhan Sheikh', 'Girish Kulkarni', 'Harish Poojary', 'Iqbal Ahmed', 'Jagadish Rao',
  'Kiran Kumar', 'Lokesh Reddy', 'Manoj Tiwari', 'Naveen Gowda', 'Om Prakash', 'Pavan Hegde',
];
const COMPLAINANT_NAMES = [
  'Nagaraj Setty', 'Kavitha Reddy', 'Basavaraj Patil', 'Meena Iyer', 'Yusuf Ali', 'Shobha Rani',
  'Ashwin Rao', 'Bhavana Shetty', 'Chidananda Murthy', 'Divya Prasad', 'Eshwar Bhandari', 'Firoz Pasha',
];
const ADDRESS_STREETS = [
  '12 MG Road', '45 Church Street', '7 Station Road', '3 Market Lane', '21 Temple Street', '9 Ring Road',
  '18 Gandhi Nagar', '2 Nehru Circle', '30 Lake View Road', '14 College Street', '6 Fort Road', '25 Hosur Road',
];
const COURTS = ['JMFC Court, Bengaluru Urban', 'Sessions Court, Belagavi', 'JMFC Court, Mysuru'];

function maskName(real) {
  return real.split(' ').map((part) => part[0] + '*'.repeat(Math.max(part.length - 1, 1))).join(' ');
}
function maskPhone(real) {
  return `${real.slice(0, 2)}${'*'.repeat(real.length - 4)}${real.slice(-2)}`;
}
function maskAddress(real) {
  const [street, ...rest] = real.split(', ');
  return ['*'.repeat(street.length), ...rest].join(', ');
}

function pick(rng, pool) {
  return pool[Math.floor(rng() * pool.length)];
}

function offsetDate(base, deltaDays) {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function mockParty(rng, role, pool) {
  const real = pick(rng, pool);
  const phoneDigits = String(10_000_000 + Math.floor(rng() * 89_999_999));
  const phone = `9${phoneDigits}`;
  const address = `${pick(rng, ADDRESS_STREETS)}, Karnataka`;
  return {
    role,
    name: { masked: maskName(real), real },
    phone: { masked: maskPhone(phone), real: phone },
    address: { masked: maskAddress(address), real: address },
  };
}

function generateTimeline(status, firDate) {
  const timeline = [{ status: 'registered', timestamp: firDate, note: 'FIR registered.' }];
  if (status === 'registered') return timeline;
  timeline.push({ status: 'under_investigation', timestamp: offsetDate(firDate, 3), note: 'Investigation taken up by the station.' });
  if (status === 'under_investigation') return timeline;
  timeline.push({ status: 'closed', timestamp: offsetDate(firDate, 21), note: 'Case closed.' });
  return timeline;
}

function generateArrests(status, firDate) {
  if (status === 'registered') return undefined;
  return [{ arrestDate: offsetDate(firDate, 5), custodyStatus: status === 'closed' ? 'Released on bail' : 'Judicial custody' }];
}

function generateChargesheet(status, firDate, rng) {
  if (status !== 'closed') return undefined;
  return {
    filedDate: offsetDate(firDate, 18),
    sectionsApplied: rng() < 0.5 ? '379, 411 IPC' : '392, 34 IPC',
    court: pick(rng, COURTS),
  };
}

function generateLocation(rng, station) {
  const spread = rng() < 0.15 ? 0.035 : 0.007; // mostly tight clusters, some background scatter
  const [centerLng, centerLat] = station.centroid ?? [76.5, 15.3];
  return { lat: centerLat + (rng() - 0.5) * spread, lng: centerLng + (rng() - 0.5) * spread };
}

// One full CaseDetailResponse-shaped record per index -- matches
// src/api/caseApi.ts's CaseDetailResponse exactly.
export function generateStationCases(station, districtId, districtName, caseCount, rng) {
  const cases = [];
  // Crime Number's running serial (last 5 digits) is scoped per police
  // station + case category + year; since every case here is category FIR
  // at this one station, a single per-year counter is enough.
  const crimeNoSerialsByYear = new Map();
  for (let index = 0; index < caseCount; index++) {
    const crimeType = pick(rng, GLOBAL_CRIME_SUB_HEADS);
    const status = pick(rng, CASE_STATUSES);
    const gravity = pick(rng, CASE_GRAVITIES);
    const dayOffset = Math.floor(rng() * 400);
    const firDate = offsetDate('2026-06-01', -dayOffset);
    const caseId = station.unitId * 100_000 + index;
    const firYear = Number(firDate.slice(0, 4));
    const crimeNoSerial = (crimeNoSerialsByYear.get(firYear) ?? 0) + 1;
    crimeNoSerialsByYear.set(firYear, crimeNoSerial);

    const parties = [mockParty(rng, 'victim', VICTIM_NAMES), mockParty(rng, 'accused', ACCUSED_NAMES)];
    if (rng() < 0.3) parties.unshift(mockParty(rng, 'complainant', COMPLAINANT_NAMES));

    cases.push({
      caseId,
      // CaseNo per the ER diagram spec: YYYY + 5-digit running serial (last 9 digits of crimeNumber below).
      caseNumber: `${firYear}${String(crimeNoSerial).padStart(5, '0')}`,
      unitId: station.unitId,
      unitName: station.unitName,
      crimeSubHeadId: crimeType.crimeSubHeadId,
      crimeSubHeadName: crimeType.crimeSubHeadName,
      status,
      firDate,
      crimeNumber: `${CASE_CATEGORY_CODE_FIR}${String(districtId).padStart(4, '0')}${String(station.unitId).padStart(4, '0')}${firYear}${String(crimeNoSerial).padStart(5, '0')}`,
      station: station.unitName,
      district: districtName,
      gravity,
      location: generateLocation(rng, station),
      narrative: `${crimeType.crimeSubHeadName} reported to ${station.unitName}. Field verification and evidence collection are logged in the case diary.`,
      parties,
      timeline: generateTimeline(status, firDate),
      arrests: generateArrests(status, firDate),
      chargesheet: generateChargesheet(status, firDate, rng),
    });
  }
  return cases;
}

// Set by generateAllCases (Task 5's entrypoint) before calling generateStationCases,
// so this module doesn't need a circular import from seedData.mjs for every call site.
let GLOBAL_CRIME_SUB_HEADS = [];
export function setCrimeSubHeads(crimeSubHeads) {
  GLOBAL_CRIME_SUB_HEADS = crimeSubHeads;
}

export function distributeDistrictCasesAcrossStations(districtCaseCount, stations, rng) {
  const equalWeights = stations.map((station) => ({ station, relativeWeight: 1 + rng() }));
  const totalWeight = equalWeights.reduce((sum, s) => sum + s.relativeWeight, 0);
  const distributed = equalWeights.map(({ station, relativeWeight }) => ({
    station,
    caseCount: Math.max(1, Math.round((relativeWeight / totalWeight) * districtCaseCount)),
  }));
  const currentTotal = distributed.reduce((sum, d) => sum + d.caseCount, 0);
  const remainder = districtCaseCount - currentTotal;
  if (remainder !== 0) {
    const biggest = distributed.reduce((a, b) => (b.caseCount > a.caseCount ? b : a));
    biggest.caseCount += remainder;
  }
  return distributed;
}
