import { describe, it, expect, beforeAll } from 'vitest';
import { mulberry32 } from './prng.mjs';
import { generateStationCases, distributeDistrictCasesAcrossStations, setCrimeSubHeads } from './generateCases.mjs';
import { CRIME_SUB_HEADS } from './seedData.mjs';

const STATION = { unitId: 176, unitName: 'Whitefield PS' };
const DISTRICT_ID = 5; // Bengaluru Urban

beforeAll(() => {
  setCrimeSubHeads(CRIME_SUB_HEADS);
});

describe('generateStationCases', () => {
  it('generates exactly caseCount cases, each with a full CaseDetailResponse shape', () => {
    const rng = mulberry32(1);
    const cases = generateStationCases(STATION, DISTRICT_ID, 'Bengaluru Urban', 20, rng);

    expect(cases).toHaveLength(20);
    cases.forEach((c) => {
      expect(c.unitId).toBe(176);
      expect(c.unitName).toBe('Whitefield PS');
      expect(c.district).toBe('Bengaluru Urban');
      expect(['registered', 'under_investigation', 'closed']).toContain(c.status);
      expect(['heinous', 'serious', 'minor']).toContain(c.gravity);
      expect(typeof c.caseNumber).toBe('string');
      expect(typeof c.narrative).toBe('string');
      expect(Array.isArray(c.parties)).toBe(true);
      expect(Array.isArray(c.timeline)).toBe(true);
      expect(c.location).toEqual({ lat: expect.any(Number), lng: expect.any(Number) });
    });
  });

  it('gives every case a crimeNumber matching the 1+4+4+4+5 digit CrimeNo format, with per-year serials', () => {
    const rng = mulberry32(7);
    const cases = generateStationCases(STATION, DISTRICT_ID, 'Bengaluru Urban', 30, rng);
    const serialsByYear = new Map();
    cases.forEach((c) => {
      expect(c.crimeNumber).toMatch(/^\d{18}$/);
      const category = c.crimeNumber.slice(0, 1);
      const districtId = c.crimeNumber.slice(1, 5);
      const unitId = c.crimeNumber.slice(5, 9);
      const year = c.crimeNumber.slice(9, 13);
      const serial = Number(c.crimeNumber.slice(13, 18));
      expect(category).toBe('1');
      expect(districtId).toBe('0005');
      expect(unitId).toBe('0176');
      expect(year).toBe(String(c.firDate.slice(0, 4)));
      const nextSerial = (serialsByYear.get(year) ?? 0) + 1;
      expect(serial).toBe(nextSerial);
      serialsByYear.set(year, nextSerial);
    });
  });

  it('gives every case a caseNumber matching the CaseNo format (last 9 digits of crimeNumber)', () => {
    const rng = mulberry32(7);
    const cases = generateStationCases(STATION, DISTRICT_ID, 'Bengaluru Urban', 30, rng);
    cases.forEach((c) => {
      expect(c.caseNumber).toMatch(/^\d{9}$/);
      expect(c.caseNumber).toBe(c.crimeNumber.slice(-9));
    });
  });

  it('gives every case a unique caseId within the station', () => {
    const rng = mulberry32(2);
    const cases = generateStationCases(STATION, DISTRICT_ID, 'Bengaluru Urban', 50, rng);
    expect(new Set(cases.map((c) => c.caseId)).size).toBe(50);
  });

  it('is deterministic for the same seed', () => {
    const a = generateStationCases(STATION, DISTRICT_ID, 'Bengaluru Urban', 10, mulberry32(9));
    const b = generateStationCases(STATION, DISTRICT_ID, 'Bengaluru Urban', 10, mulberry32(9));
    expect(a).toEqual(b);
  });

  it('omits arrests and chargesheet for registered cases, includes both for closed cases', () => {
    const rng = mulberry32(3);
    const cases = generateStationCases(STATION, DISTRICT_ID, 'Bengaluru Urban', 100, rng);
    cases.filter((c) => c.status === 'registered').forEach((c) => {
      expect(c.arrests).toBeUndefined();
      expect(c.chargesheet).toBeUndefined();
    });
    cases.filter((c) => c.status === 'closed').forEach((c) => {
      expect(c.arrests).toBeDefined();
      expect(c.chargesheet).toBeDefined();
    });
  });

  it('gives a registered case a single-entry timeline and a closed case a three-entry timeline', () => {
    const rng = mulberry32(4);
    const cases = generateStationCases(STATION, DISTRICT_ID, 'Bengaluru Urban', 100, rng);
    cases.filter((c) => c.status === 'registered').forEach((c) => expect(c.timeline).toHaveLength(1));
    cases.filter((c) => c.status === 'closed').forEach((c) => expect(c.timeline).toHaveLength(3));
  });
});

describe('distributeDistrictCasesAcrossStations', () => {
  it('distributes the full district case count across its stations with no case lost', () => {
    const stations = [{ unitId: 1, unitName: 'A PS' }, { unitId: 2, unitName: 'B PS' }, { unitId: 3, unitName: 'C PS' }];
    const rng = mulberry32(5);
    const result = distributeDistrictCasesAcrossStations(1000, stations, rng);
    expect(result.reduce((sum, r) => sum + r.caseCount, 0)).toBe(1000);
    expect(result).toHaveLength(3);
  });

  it('gives every station at least 1 case', () => {
    const stations = Array.from({ length: 50 }, (_, i) => ({ unitId: i, unitName: `S${i} PS` }));
    const result = distributeDistrictCasesAcrossStations(60, stations, mulberry32(6));
    expect(result.every((r) => r.caseCount >= 1)).toBe(true);
  });
});
