import { describe, it, expect } from 'vitest';
import { DISTRICTS, CRIME_SUB_HEADS, scaleWeightsToTarget } from './seedData.mjs';

describe('DISTRICTS', () => {
  it('has all 30 Karnataka districts with a positive relative weight', () => {
    expect(DISTRICTS).toHaveLength(30);
    DISTRICTS.forEach((d) => expect(d.relativeWeight).toBeGreaterThan(0));
  });

  it('has a unique districtId per entry, matching public/data/karnataka-districts.geojson ordering (1-30)', () => {
    const ids = DISTRICTS.map((d) => d.districtId).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });
});

describe('CRIME_SUB_HEADS', () => {
  it('has at least the six existing crime types plus their crimeHeadId/crimeGroupName', () => {
    expect(CRIME_SUB_HEADS.length).toBeGreaterThanOrEqual(6);
    CRIME_SUB_HEADS.forEach((c) => {
      expect(c.crimeSubHeadId).toBeGreaterThan(0);
      expect(typeof c.crimeGroupName).toBe('string');
    });
  });
});

describe('scaleWeightsToTarget', () => {
  it('scales relative weights so the resulting caseCounts sum exactly to the target', () => {
    const items = [{ id: 1, relativeWeight: 10 }, { id: 2, relativeWeight: 30 }, { id: 3, relativeWeight: 60 }];
    const scaled = scaleWeightsToTarget(items, 1000);
    expect(scaled.reduce((sum, x) => sum + x.caseCount, 0)).toBe(1000);
  });

  it('preserves each item plus adds caseCount, without mutating the input', () => {
    const items = [{ id: 1, relativeWeight: 5 }, { id: 2, relativeWeight: 5 }];
    const scaled = scaleWeightsToTarget(items, 100);
    expect(scaled).toEqual([{ id: 1, relativeWeight: 5, caseCount: 50 }, { id: 2, relativeWeight: 5, caseCount: 50 }]);
    expect(items[0]).not.toHaveProperty('caseCount');
  });

  it('gives every item at least 1 case when relativeWeight > 0 and target >= item count', () => {
    const items = [{ id: 1, relativeWeight: 1 }, { id: 2, relativeWeight: 1000 }];
    const scaled = scaleWeightsToTarget(items, 10);
    expect(scaled.every((x) => x.caseCount >= 1)).toBe(true);
  });
});
