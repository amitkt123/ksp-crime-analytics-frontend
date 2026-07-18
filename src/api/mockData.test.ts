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

describe('getMockResponse auth login personas', () => {
  it('returns the Investigator role and a distinct token for the investigator demo persona', async () => {
    const result = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.investigator', password: 'x' }),
    });
    expect(result).toEqual({ token: 'mock-token-investigator', roles: ['INVESTIGATOR'] });
  });

  it('returns the Station Supervisor role and a distinct token for the supervisor demo persona', async () => {
    const result = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.supervisor', password: 'x' }),
    });
    expect(result).toEqual({ token: 'mock-token-supervisor', roles: ['STATION_SUPERVISOR'] });
  });

  it('falls back to the SCRB Analyst persona for any other username', async () => {
    const result = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.analyst', password: 'x' }),
    });
    expect(result).toEqual({ token: 'mock-token', roles: ['SCRB_ANALYST'] });
  });
});

describe('getMockResponse /api/me by persona', () => {
  it('returns the investigator profile with a real station unitId for the investigator token', async () => {
    const result = await getMockResponse('/api/me', { method: 'GET' }, 'mock-token-investigator');
    expect(result).toMatchObject({ roles: ['INVESTIGATOR'], unitId: 176, unit: 'Whitefield PS' });
  });

  it('returns the supervisor profile with a real station unitId for the supervisor token', async () => {
    const result = await getMockResponse('/api/me', { method: 'GET' }, 'mock-token-supervisor');
    expect(result).toMatchObject({ roles: ['STATION_SUPERVISOR'], unitId: 176, unit: 'Whitefield PS' });
  });

  it('returns the default SCRB Analyst profile with unitId null for the default token', async () => {
    const result = await getMockResponse('/api/me', { method: 'GET' }, 'mock-token');
    expect(result).toMatchObject({ roles: ['SCRB_ANALYST'], unitId: null });
  });
});

describe('getMockResponse cases list', () => {
  it('returns a deterministic, station-scoped case list for a given unitId', async () => {
    const first = await getMockResponse('/api/cases?unitId=176', { method: 'GET' });
    const second = await getMockResponse('/api/cases?unitId=176', { method: 'GET' });
    expect(first).toEqual(second);
    expect(first).toHaveLength(6);
  });

  it('computes the expected fields for the first generated case at Whitefield PS', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176', { method: 'GET' })) as Array<{
      caseId: number;
      caseNumber: string;
      unitName: string;
      crimeSubHeadName: string;
      status: string;
      firDate: string;
    }>;
    expect(result[0]).toMatchObject({
      caseId: 176000,
      caseNumber: '276/2026',
      unitName: 'Whitefield PS',
      crimeSubHeadName: 'Chain Snatching',
      status: 'registered',
      firDate: '2026-05-26',
    });
  });

  it('filters by status', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176&status=closed', {
      method: 'GET',
    })) as Array<{ status: string }>;
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.status === 'closed')).toBe(true);
  });

  it('filters by free-text search over the case number', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176&q=276%2F2026', {
      method: 'GET',
    })) as Array<{ caseNumber: string }>;
    expect(result).toEqual([expect.objectContaining({ caseNumber: '276/2026' })]);
  });

  it('returns an empty array for a unitId with no known station', async () => {
    const result = await getMockResponse('/api/cases?unitId=999999', { method: 'GET' });
    expect(result).toEqual([]);
  });
});
