import { describe, it, expect } from 'vitest';
import { getMockResponse } from './mockData';

describe('getMockResponse district summary', () => {
  it('scales the state-wide kpi and category mix proportionally to the district case count', async () => {
    const result = await getMockResponse('/api/geo/districts/5/summary', { method: 'GET' });

    expect(result).toEqual({
      kpi: {
        stateCaseCount: 1840,
        stateCaseCountDeltaPct: 4.2,
        resolvedPct: 61.3,
        resolvedPctDeltaPts: 1.8,
        topCrimeSubHead: 'Theft of Motor Vehicle',
        topCrimeSubHeadCount: 165,
      },
      categoryMix: [
        { crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 473 },
        { crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 721 },
        { crimeHeadId: 3, crimeGroupName: 'Crimes Against Women', count: 276 },
        { crimeHeadId: 4, crimeGroupName: 'Economic Offences', count: 242 },
        { crimeHeadId: 5, crimeGroupName: 'Cyber Crimes', count: 128 },
      ],
    });
  });

  it('returns undefined for unrelated paths', async () => {
    const result = await getMockResponse('/api/unrelated', { method: 'GET' });
    expect(result).toBeUndefined();
  });
});
