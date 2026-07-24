import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getMockResponse } from './mockData';

function mockFetchJson(responsesByUrl: Record<string, unknown>) {
  vi.spyOn(global, 'fetch').mockImplementation(((url: string) => {
    if (!(url in responsesByUrl)) throw new Error(`unexpected fetch: ${url}`);
    return Promise.resolve({ json: () => Promise.resolve(responsesByUrl[url]) } as Response);
  }) as typeof fetch);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getMockResponse auth/me', () => {
  it('returns the Investigator persona for demo.investigator login', async () => {
    const result = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.investigator', password: 'x' }),
    });
    expect(result).toEqual({ token: 'mock-token-investigator', roles: ['INVESTIGATOR'] });
  });

  it('falls back to the SCRB Analyst persona for any other username', async () => {
    const result = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'someone.else', password: 'x' }),
    });
    expect(result).toEqual({ token: 'mock-token', roles: ['SCRB_ANALYST'] });
  });

  it('returns the investigator profile for the investigator token', async () => {
    const result = await getMockResponse('/api/me', { method: 'GET' }, 'mock-token-investigator');
    expect(result).toMatchObject({ roles: ['INVESTIGATOR'], unitId: 176, unit: 'Whitefield PS' });
  });

  it('returns undefined for unrelated paths', async () => {
    const result = await getMockResponse('/api/unrelated', { method: 'GET' });
    expect(result).toBeUndefined();
  });
});

describe('getMockResponse geo districts', () => {
  beforeEach(() => {
    mockFetchJson({
      '/data/mock/aggregates/district-summaries.json': [
        { districtId: 5, districtName: 'Bengaluru Urban', caseCount: 32000 },
      ],
    });
  });

  it('returns the generated district summaries', async () => {
    const result = await getMockResponse('/api/geo/districts', { method: 'GET' });
    expect(result).toEqual([{ districtId: 5, districtName: 'Bengaluru Urban', caseCount: 32000 }]);
  });
});

describe('getMockResponse cases list', () => {
  const sampleStationCases = [
    {
      caseId: 17_600_000, caseNumber: '100/2026', unitId: 176, unitName: 'Whitefield PS',
      crimeSubHeadId: 103, crimeSubHeadName: 'Chain Snatching', status: 'registered', firDate: '2026-05-01',
      crimeNumber: 'FIR-2026-KA-176000', station: 'Whitefield PS', district: 'Bengaluru Urban', gravity: 'serious',
      location: { lat: 12.9, lng: 77.7 }, narrative: 'x',
      parties: [{ role: 'victim', name: { masked: 'R***** K****', real: 'Ramesh Kumar' }, phone: { masked: 'xx', real: '9800000000' }, address: { masked: 'x', real: 'x, Karnataka' } }],
      timeline: [{ status: 'registered', timestamp: '2026-05-01', note: 'FIR registered.' }],
    },
  ];

  beforeEach(() => {
    mockFetchJson({ '/data/mock/cases/station-176.json': sampleStationCases });
  });

  it('returns the station\'s cases with detail fields stripped down to the summary shape', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176', { method: 'GET' })) as Array<{ caseId: number; narrative?: string }>;
    expect(result).toHaveLength(1);
    expect(result[0].caseId).toBe(17_600_000);
    expect(result[0].narrative).toBeUndefined();
  });

  it('filters by status', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176&status=closed', { method: 'GET' })) as unknown[];
    expect(result).toHaveLength(0);
  });

  it('filters by free-text search matching a party real name', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176&q=ramesh', { method: 'GET' })) as Array<{ caseId: number }>;
    expect(result.map((c) => c.caseId)).toEqual([17_600_000]);
  });

  it('returns an empty array for a unitId with no known station', async () => {
    const result = await getMockResponse('/api/cases?unitId=999999', { method: 'GET' });
    expect(result).toEqual([]);
  });
});

describe('getMockResponse case detail', () => {
  // Uses a different unitId (177) from the "cases list" describe block above --
  // mockData.ts's loadJson caches responses per-URL for the lifetime of the module,
  // so reusing station-176.json here would silently return that block's cached
  // fixture instead of this block's own.
  const sampleStationCases = [
    { caseId: 17_700_000, caseNumber: '100/2026', unitId: 177, unitName: 'Test PS 177', crimeSubHeadId: 103, crimeSubHeadName: 'Chain Snatching', status: 'registered', firDate: '2026-05-01', narrative: 'Full narrative', parties: [], timeline: [{ status: 'registered', timestamp: '2026-05-01', note: 'FIR registered.' }] },
  ];

  beforeEach(() => {
    mockFetchJson({ '/data/mock/cases/station-177.json': sampleStationCases });
  });

  it('returns the full detail including narrative for a known caseId', async () => {
    const result = await getMockResponse('/api/cases/17700000', { method: 'GET' });
    expect(result).toMatchObject({ caseNumber: '100/2026', narrative: 'Full narrative' });
  });

  it('returns undefined for an unknown caseId', async () => {
    const result = await getMockResponse('/api/cases/17700999', { method: 'GET' });
    expect(result).toBeUndefined();
  });
});

describe('getMockResponse network search', () => {
  beforeEach(() => {
    mockFetchJson({
      '/data/mock/search-index.json': [
        { id: 'case-1', type: 'CASE', label: '100/2026' },
        { id: '500001', type: 'PERSON', label: 'Suresh Naik' },
      ],
    });
  });

  it('matches entries by case-insensitive label substring', async () => {
    const result = (await getMockResponse('/api/network/search?q=suresh&limit=10', {})) as Array<{ id: string; type: string }>;
    expect(result).toEqual([expect.objectContaining({ id: '500001', type: 'PERSON' })]);
  });

  it('returns an empty array for a query shorter than 2 characters', async () => {
    const result = await getMockResponse('/api/network/search?q=s&limit=10', {});
    expect(result).toEqual([]);
  });
});

describe('getMockResponse network path', () => {
  it('returns null (path-finding over the generated graph is out of scope for this pivot)', async () => {
    const result = await getMockResponse('/api/network/path?from=1&to=2&maxHops=6', {});
    expect(result).toBeNull();
  });
});
