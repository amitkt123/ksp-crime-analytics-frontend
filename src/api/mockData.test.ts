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
    expect(first).toHaveLength(40);
  });

  it('computes the expected fields for the first generated case at Whitefield PS', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176', { method: 'GET' })) as Array<{
      caseId: number;
      caseNumber: string;
      unitName: string;
      crimeSubHeadName: string;
      status: string;
      firDate: string;
      crimeNumber: string;
      station: string;
      district: string;
      gravity: string;
      location: { lat: number; lng: number };
    }>;
    expect(result[0]).toMatchObject({
      caseId: 176000,
      caseNumber: '276/2026',
      unitName: 'Whitefield PS',
      crimeSubHeadName: 'Chain Snatching',
      status: 'registered',
      firDate: '2026-05-26',
      crimeNumber: 'FIR-2026-KA-17600',
      station: 'Whitefield PS',
    });
    expect(typeof result[0].district).toBe('string');
    expect(['heinous', 'serious', 'minor']).toContain(result[0].gravity);
    expect(result[0].location).toEqual({ lat: expect.any(Number), lng: expect.any(Number) });
  });

  it('gives every case a real district name derived from its station', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176', { method: 'GET' })) as Array<{
      district: string;
    }>;
    expect(result.every((c) => typeof c.district === 'string' && c.district.length > 0)).toBe(true);
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

describe('getMockResponse case detail', () => {
  it('returns full detail for a generated caseId, including narrative, parties, and a single-entry timeline for a registered case', async () => {
    const result = (await getMockResponse('/api/cases/176000', { method: 'GET' })) as {
      caseNumber: string;
      narrative: string;
      parties: Array<{ role: string }>;
      timeline: Array<{ status: string; timestamp: string; note: string }>;
    };
    expect(result.caseNumber).toBe('276/2026');
    expect(result.narrative.length).toBeGreaterThan(0);
    // index 0 (176000 % 3 === 0) also gets a complainant distinct from the victim.
    expect(result.parties.map((p) => p.role)).toEqual(['complainant', 'victim', 'accused']);
    expect(result.timeline).toEqual([{ status: 'registered', timestamp: '2026-05-26', note: 'FIR registered.' }]);
  });

  it('masks PII in party fields while preserving the real value', async () => {
    const result = (await getMockResponse('/api/cases/176000', { method: 'GET' })) as {
      parties: Array<{ role: string; name: { masked: string; real: string } }>;
    };
    const victim = result.parties.find((p) => p.role === 'victim')!;
    expect(victim.name.real).toBe('Ramesh Kumar');
    expect(victim.name.masked).toBe('R***** K****');
  });

  it('builds a three-entry timeline for a closed case', async () => {
    // index 2 at unitId 176 has status 'closed' (see Task 2's status rotation)
    const result = (await getMockResponse('/api/cases/176002', { method: 'GET' })) as {
      timeline: Array<{ status: string }>;
    };
    expect(result.timeline.map((t) => t.status)).toEqual(['registered', 'under_investigation', 'closed']);
  });

  it('returns undefined for an unknown caseId', async () => {
    const result = await getMockResponse('/api/cases/999999000', { method: 'GET' });
    expect(result).toBeUndefined();
  });

  it('omits arrests and chargesheet for a registered case', async () => {
    const result = (await getMockResponse('/api/cases/176000', { method: 'GET' })) as {
      arrests?: unknown[];
      chargesheet?: unknown;
    };
    expect(result.arrests).toBeUndefined();
    expect(result.chargesheet).toBeUndefined();
  });

  it('includes arrests and a chargesheet for a closed case', async () => {
    const result = (await getMockResponse('/api/cases/176002', { method: 'GET' })) as {
      arrests?: Array<{ arrestDate: string; custodyStatus: string }>;
      chargesheet?: { filedDate: string; sectionsApplied: string; court: string };
    };
    expect(result.arrests).toHaveLength(1);
    expect(result.chargesheet).toBeDefined();
  });
});

describe('getMockResponse case explain', () => {
  it('returns a deterministic explanation grounded in the case and its related records', async () => {
    const first = await getMockResponse('/api/cases/176000/explain', { method: 'GET' });
    const second = await getMockResponse('/api/cases/176000/explain', { method: 'GET' });
    expect(first).toEqual(second);
  });

  it('cites the case number and a confidence between 0 and 1', async () => {
    const result = (await getMockResponse('/api/cases/176000/explain', { method: 'GET' })) as {
      claim: string;
      confidence: number;
      records: string[];
    };
    expect(result.claim).toContain('276/2026');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.records.length).toBeGreaterThan(0);
  });

  it('returns undefined for an unknown caseId', async () => {
    const result = await getMockResponse('/api/cases/999999000/explain', { method: 'GET' });
    expect(result).toBeUndefined();
  });
});

describe('getMockResponse cases list free-text search over party names', () => {
  it('matches a case by a party real name even though the case number does not match', async () => {
    // index 0 at unitId 176 has victim 'Ramesh Kumar' (see the VICTIM_NAMES pool below)
    const result = (await getMockResponse('/api/cases?unitId=176&q=ramesh', {
      method: 'GET',
    })) as Array<{ caseId: number }>;
    expect(result.map((c) => c.caseId)).toContain(176000);
  });

  it('excludes cases whose case number and party names both fail to match', async () => {
    const result = await getMockResponse('/api/cases?unitId=176&q=nonexistent-name', { method: 'GET' });
    expect(result).toEqual([]);
  });
});

describe('getMockResponse station incidents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const panamburGeometry = {
    type: 'Polygon',
    coordinates: [[[74.80, 12.94], [74.84, 12.94], [74.84, 12.98], [74.80, 12.98], [74.80, 12.94]]],
  };
  const panamburFixture = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { unitId: 355, unitName: 'Panambur PS' }, geometry: panamburGeometry }],
  };

  it('returns one point per mock case, clustered around the station boundary centroid', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(panamburFixture),
    } as unknown as Response);

    const result = (await getMockResponse('/api/geo/stations/355/incidents', { method: 'GET' })) as Array<{
      caseMasterId: number;
      crimeNo: string;
      latitude: number;
      longitude: number;
    }>;

    expect(result).toHaveLength(40); // CASES_PER_STATION
    const centerLng = 74.82;
    const centerLat = 12.96;
    for (const point of result) {
      expect(Math.abs(point.longitude - centerLng)).toBeLessThan(0.02);
      expect(Math.abs(point.latitude - centerLat)).toBeLessThan(0.02);
      expect(typeof point.caseMasterId).toBe('number');
      expect(typeof point.crimeNo).toBe('string');
    }
  });

  it('is deterministic across calls', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve(panamburFixture),
    } as unknown as Response);

    const first = await getMockResponse('/api/geo/stations/355/incidents', { method: 'GET' });
    const second = await getMockResponse('/api/geo/stations/355/incidents', { method: 'GET' });
    expect(first).toEqual(second);
  });

  it('returns an empty array for a unitId not present in any district roster', async () => {
    const result = await getMockResponse('/api/geo/stations/999999/incidents', { method: 'GET' });
    expect(result).toEqual([]);
  });
});
