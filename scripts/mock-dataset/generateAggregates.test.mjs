import { describe, it, expect } from 'vitest';
import { mulberry32 } from './prng.mjs';
import {
  buildCommandCenterSummary, buildDistrictSummaries, buildDistrictCorrelation,
  buildTimeOfDayBuckets, buildPredictiveRisk, buildCaseAnomalies, buildSearchIndex,
} from './generateAggregates.mjs';

const DISTRICTS = [
  { districtId: 1, districtName: 'A', caseCount: 100, population: 500000, literacyRate: 70, unemploymentRate: 3, urbanizationRate: 30, perCapitaIncome: 100000 },
  { districtId: 2, districtName: 'B', caseCount: 300, population: 600000, literacyRate: 75, unemploymentRate: 4, urbanizationRate: 40, perCapitaIncome: 120000 },
];
const CRIME_SUB_HEADS = [{ crimeSubHeadId: 101, crimeSubHeadName: 'Theft', crimeHeadId: 2, crimeGroupName: 'Property' }];

function fakeCases(districtName, count, status) {
  return Array.from({ length: count }, (_, i) => ({
    caseId: i, unitId: 1, unitName: 'Test PS', district: districtName, status,
    crimeSubHeadId: 101, firDate: '2026-01-01',
  }));
}

describe('buildCommandCenterSummary', () => {
  it('totals caseCount across all districts and names the top crime sub-head', () => {
    const result = buildCommandCenterSummary(DISTRICTS, CRIME_SUB_HEADS);
    expect(result.kpi.stateCaseCount).toBe(400);
    expect(result.kpi.topCrimeSubHead).toBe('Theft');
  });
});

describe('buildDistrictSummaries', () => {
  it('returns one entry per district with its caseCount', () => {
    const result = buildDistrictSummaries(DISTRICTS);
    expect(result).toEqual([
      { districtId: 1, districtName: 'A', caseCount: 100 },
      { districtId: 2, districtName: 'B', caseCount: 300 },
    ]);
  });
});

describe('buildDistrictCorrelation', () => {
  it('carries through each district\'s socioeconomic figures unchanged', () => {
    const result = buildDistrictCorrelation(DISTRICTS);
    expect(result[0]).toEqual({
      districtId: 1, districtName: 'A', caseCount: 100, population: 500000,
      literacyRate: 70, unemploymentRate: 3, urbanizationRate: 30, perCapitaIncome: 100000,
    });
  });
});

describe('buildTimeOfDayBuckets', () => {
  it('returns four buckets each covering every district, summing back to the district total', () => {
    const buckets = buildTimeOfDayBuckets(DISTRICTS);
    expect(buckets.map((b) => b.bucket)).toEqual(['night', 'morning', 'afternoon', 'evening']);
    const total = buckets.reduce((sum, b) => sum + b.districtCaseCounts[1], 0);
    expect(total).toBe(100);
  });
});

describe('buildPredictiveRisk', () => {
  it('produces a non-empty forecast with a non-negative backtest error', () => {
    const cases = fakeCases('A', 30, 'closed');
    const result = buildPredictiveRisk(cases, CRIME_SUB_HEADS, mulberry32(1));
    expect(result.length).toBeGreaterThan(0);
    result.forEach((r) => expect(r.backtestAbsoluteError).toBeGreaterThanOrEqual(0));
  });
});

describe('buildCaseAnomalies', () => {
  it('returns the requested count of anomalies, each with a positive zScore', () => {
    const cases = fakeCases('A', 50, 'registered');
    const result = buildCaseAnomalies(cases, mulberry32(2), 5);
    expect(result).toHaveLength(5);
    result.forEach((r) => expect(r.zScore).toBeGreaterThan(0));
  });
});

describe('buildSearchIndex', () => {
  it('includes an entry for every case and every distinct accused person', () => {
    const cases = [{ caseId: 1, caseNumber: '1/2026', unitId: 1, unitName: 'Test PS' }];
    const tuples = [{ caseId: 1, caseNumber: '1/2026', unitId: 1, unitName: 'Test PS', accusedId: 500001, accusedName: 'Suresh Naik' }];
    const index = buildSearchIndex(cases, tuples);
    expect(index).toContainEqual({ id: 'case-1', type: 'CASE', label: '1/2026' });
    expect(index).toContainEqual({ id: '500001', type: 'PERSON', label: 'Suresh Naik' });
  });
});
