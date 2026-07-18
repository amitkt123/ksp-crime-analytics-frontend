import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMockResponse } from './mockData';
import { STATIONS_BY_DISTRICT } from './generatedStationFixtures';

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

describe('getMockResponse district time-of-day', () => {
  it('returns four buckets, each with a case count for every district', async () => {
    const result = (await getMockResponse('/api/geo/districts/time-of-day', { method: 'GET' })) as {
      buckets: Array<{ bucket: string; label: string; districtCaseCounts: Record<number, number> }>;
    };

    expect(result.buckets.map((b) => b.bucket)).toEqual(['night', 'morning', 'afternoon', 'evening']);
    for (const bucket of result.buckets) {
      expect(bucket.districtCaseCounts[5]).toBeGreaterThan(0);
    }
  });

  it('gives each district a single peak bucket rather than an even split', async () => {
    const result = (await getMockResponse('/api/geo/districts/time-of-day', { method: 'GET' })) as {
      buckets: Array<{ bucket: string; districtCaseCounts: Record<number, number> }>;
    };

    const districtId = 5; // Bengaluru Urban, caseCount 1840
    const counts = result.buckets.map((b) => b.districtCaseCounts[districtId]);
    const max = Math.max(...counts);
    const peakBuckets = counts.filter((c) => c === max);

    expect(peakBuckets).toHaveLength(1);
    expect(max).toBeGreaterThan(counts.reduce((a, b) => a + b, 0) / counts.length);
  });

  it('is deterministic across calls', async () => {
    const first = await getMockResponse('/api/geo/districts/time-of-day', { method: 'GET' });
    const second = await getMockResponse('/api/geo/districts/time-of-day', { method: 'GET' });
    expect(first).toEqual(second);
  });
});

describe('getMockResponse stations', () => {
  it('returns one entry per real station in the district, ids/names matching the generated fixture', async () => {
    const result = (await getMockResponse('/api/geo/districts/5/stations', { method: 'GET' })) as Array<{
      unitId: number;
      unitName: string;
      caseCount: number;
    }>;
    const roster = STATIONS_BY_DISTRICT[5];

    expect(result).toHaveLength(roster.length);
    expect(result.map((s) => s.unitId)).toEqual(roster.map((s) => s.unitId));
    expect(result.map((s) => s.unitName)).toEqual(roster.map((s) => s.unitName));
    expect(result.every((s) => s.caseCount >= 1)).toBe(true);
  });
});

describe('getMockResponse station boundaries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the per-district station geojson fixture', async () => {
    const fixture = { type: 'FeatureCollection', features: [] };
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(fixture),
    } as unknown as Response);

    const result = await getMockResponse('/api/geo/districts/5/stations/boundaries', { method: 'GET' });

    expect(fetchSpy).toHaveBeenCalledWith('/data/stations/5.geojson');
    expect(result).toEqual(fixture);
  });
});
