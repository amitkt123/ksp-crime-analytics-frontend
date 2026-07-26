import { describe, it, expect } from 'vitest';
import { mulberry32 } from './prng.mjs';
import { pickNetworkDemoCases, buildOffenderPool, buildRepeatOffenders, buildCommunities } from './generateNetwork.mjs';

const CRIME_SUB_HEADS = [
  { crimeSubHeadId: 101, crimeSubHeadName: 'Theft', crimeHeadId: 2, crimeGroupName: 'Property' },
  { crimeSubHeadId: 103, crimeSubHeadName: 'Assault', crimeHeadId: 1, crimeGroupName: 'Body' },
];

function fakeCases(count) {
  return Array.from({ length: count }, (_, i) => ({
    caseId: 1000 + i,
    caseNumber: `${i}/2026`,
    unitId: 1,
    unitName: 'Test PS',
    crimeSubHeadId: i % 2 === 0 ? 101 : 103,
  }));
}

function fakeCasesAcrossStations(stationCount, casesPerStation) {
  const cases = [];
  for (let s = 0; s < stationCount; s++) {
    for (let i = 0; i < casesPerStation; i++) {
      cases.push({
        caseId: s * 1000 + i,
        caseNumber: `${s}-${i}/2026`,
        unitId: s,
        unitName: `Station ${s}`,
        crimeSubHeadId: i % 2 === 0 ? 101 : 103,
      });
    }
  }
  return cases;
}

describe('pickNetworkDemoCases', () => {
  it('narrows to a small fixed number of stations, capped per station, instead of every generated case', () => {
    const allCases = fakeCasesAcrossStations(40, 60);
    const sample = pickNetworkDemoCases(allCases, mulberry32(7));
    const stationIds = new Set(sample.map((c) => c.unitId));
    expect(stationIds.size).toBeLessThanOrEqual(6);
    expect(sample.length).toBeLessThanOrEqual(6 * 24);
    stationIds.forEach((unitId) => {
      const countForStation = sample.filter((c) => c.unitId === unitId).length;
      expect(countForStation).toBeLessThanOrEqual(24);
    });
  });

  it('is deterministic for the same seed', () => {
    const allCases = fakeCasesAcrossStations(40, 60);
    const a = pickNetworkDemoCases(allCases, mulberry32(9));
    const b = pickNetworkDemoCases(allCases, mulberry32(9));
    expect(a).toEqual(b);
  });
});

describe('buildOffenderPool', () => {
  it('reuses a bounded pool of identities smaller than the case count, producing repeat offenders', () => {
    const rng = mulberry32(11);
    const { tuples, personCount } = buildOffenderPool(fakeCases(500), rng);
    expect(tuples).toHaveLength(500);
    expect(personCount).toBeLessThan(500);
    const accusedIds = tuples.map((t) => t.accusedId);
    expect(new Set(accusedIds).size).toBeLessThan(accusedIds.length);
  });

  it('is deterministic for the same seed', () => {
    const a = buildOffenderPool(fakeCases(50), mulberry32(3));
    const b = buildOffenderPool(fakeCases(50), mulberry32(3));
    expect(a).toEqual(b);
  });
});

describe('buildRepeatOffenders', () => {
  it('ranks by descending caseCount and respects the limit', () => {
    const { tuples } = buildOffenderPool(fakeCases(500), mulberry32(4));
    const offenders = buildRepeatOffenders(tuples, 2, 5);
    expect(offenders.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < offenders.length; i++) {
      expect(offenders[i - 1].caseCount).toBeGreaterThanOrEqual(offenders[i].caseCount);
    }
    offenders.forEach((o) => expect(o.caseCount).toBeGreaterThanOrEqual(2));
  });
});

describe('buildCommunities', () => {
  it('groups accused persons by their crime sub-head parent category', () => {
    const { tuples } = buildOffenderPool(fakeCases(200), mulberry32(5));
    const communities = buildCommunities(tuples, CRIME_SUB_HEADS, 1);
    expect(communities.length).toBeGreaterThan(0);
    communities.forEach((c) => expect(c.size).toBeGreaterThanOrEqual(1));
  });
});
