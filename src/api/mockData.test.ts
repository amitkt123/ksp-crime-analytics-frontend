import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getMockResponse } from './mockData';

function mockFetchJson(responsesByUrl: Record<string, unknown>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(((url: string) => {
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

// Shared across both describe blocks below -- mockData.ts's loadJson/tuples
// adjacency caches are module-scoped for the file's lifetime, so every test
// that touches '/data/mock/network/tuples.json' must agree on its content
// (see the station-176/177 comment above for the same caveat).
const sampleTuples = [
  { caseId: 1, caseNumber: '100/2026', unitId: 1, unitName: 'Test PS', crimeSubHeadId: 101, accusedId: 500001, accusedName: 'Suresh Naik', victimId: 700001, victimName: 'Ramesh Rao' },
  { caseId: 2, caseNumber: '200/2026', unitId: 2, unitName: 'Other PS', crimeSubHeadId: 101, accusedId: 500002, accusedName: 'Suresh Kumar', victimId: 700001, victimName: 'Ramesh Rao' },
];

describe('getMockResponse network people', () => {
  beforeEach(() => {
    mockFetchJson({
      '/data/mock/search-index.json': [
        { id: 'case-1', type: 'CASE', label: '100/2026' },
        { id: '500001', type: 'PERSON', label: 'Suresh Naik' },
        { id: '500002', type: 'PERSON', label: 'Suresh Kumar' },
      ],
      '/data/mock/network/tuples.json': sampleTuples,
    });
  });

  it('matches PERSON entries by case-insensitive name substring', async () => {
    const result = await getMockResponse('/api/network/people?q=suresh&limit=10', {});
    expect(result).toEqual([
      { personId: 500001, displayName: 'Suresh Naik' },
      { personId: 500002, displayName: 'Suresh Kumar' },
    ]);
  });

  it('returns an empty array for a query shorter than 2 characters', async () => {
    const result = await getMockResponse('/api/network/people?q=s&limit=10', {});
    expect(result).toEqual([]);
  });

  it('narrows by FIR/case number when the name alone is ambiguous', async () => {
    const result = await getMockResponse('/api/network/people?q=suresh&caseNo=200%2F2026&limit=10', {});
    expect(result).toEqual([{ personId: 500002, displayName: 'Suresh Kumar' }]);
  });
});

describe('getMockResponse network path', () => {
  beforeEach(() => {
    mockFetchJson({ '/data/mock/network/tuples.json': sampleTuples });
  });

  it('finds the shortest path between two people who share a victim', async () => {
    const result = await getMockResponse('/api/network/path?from=500001&to=500002&maxHops=6', {});
    expect(result).toEqual({
      personIds: [500001, 700001, 500002],
      displayNames: ['Suresh Naik', 'Ramesh Rao', 'Suresh Kumar'],
      hopCount: 2,
    });
  });

  it('returns null when no path exists within maxHops', async () => {
    const result = await getMockResponse('/api/network/path?from=500001&to=999999&maxHops=6', {});
    expect(result).toBeNull();
  });
});

describe('getMockResponse network subgraph — path focus', () => {
  beforeEach(() => {
    mockFetchJson({ '/data/mock/network/tuples.json': sampleTuples });
  });

  it('returns the path persons plus the justifying case and location, not an unrelated top-offenders network', async () => {
    const result = (await getMockResponse(
      '/api/network/subgraph?focus=path&from=500001&to=500002&maxHops=6',
      {},
    )) as { nodes: Array<{ id: string; type: string; label: string }>; edges: Array<{ sourceId: string; targetId: string; type: string }> };

    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['700001', 'case-1', 'case-2', 'location-1', 'location-2', '500001', '500002'].sort());
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: '500001', targetId: 'case-1', type: 'ACCUSED_IN' }),
        expect.objectContaining({ sourceId: '700001', targetId: 'case-1', type: 'VICTIM_IN' }),
        expect.objectContaining({ sourceId: '500002', targetId: 'case-2', type: 'ACCUSED_IN' }),
        expect.objectContaining({ sourceId: '700001', targetId: 'case-2', type: 'VICTIM_IN' }),
      ]),
    );
  });

  it('returns just the one person, no adjacency lookup needed, when from === to', async () => {
    const result = (await getMockResponse(
      '/api/network/subgraph?focus=path&from=500001&to=500001&maxHops=6',
      {},
    )) as { nodes: Array<{ id: string }>; edges: unknown[] };

    expect(result.nodes.map((n) => n.id)).toEqual(['500001']);
    expect(result.edges).toEqual([]);
  });

  it('returns an empty subgraph when no path exists within maxHops', async () => {
    const result = (await getMockResponse(
      '/api/network/subgraph?focus=path&from=500001&to=999999&maxHops=6',
      {},
    )) as { nodes: unknown[]; edges: unknown[] };

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
