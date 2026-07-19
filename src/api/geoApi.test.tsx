import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import {
  getDistrictSummaries,
  getDistrictBoundaries,
  getStationSummaries,
  getStationBoundaries,
  getDistrictDetail,
  getDistrictTimeOfDay,
  useDistrictSummaries,
  useStationBoundaries,
  useDistrictDetail,
  useDistrictTimeOfDay,
  getStationIncidents,
  useStationIncidents,
  type DistrictSummaryResponse,
  type DistrictDetailResponse,
  type DistrictTimeOfDayResponse,
  type StationIncidentPointResponse,
} from './geoApi';

const sampleDistricts: DistrictSummaryResponse[] = [
  { districtId: 1, districtName: 'Bengaluru Urban', caseCount: 500 },
  { districtId: 3, districtName: 'Mysuru', caseCount: 120 },
];

describe('getDistrictSummaries', () => {
  it('fetches /api/geo/districts with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleDistricts);
    const result = await getDistrictSummaries('test-token');
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/districts', {}, 'test-token');
    expect(result).toEqual(sampleDistricts);
  });
});

describe('getDistrictBoundaries', () => {
  it('fetches /api/geo/districts/boundaries with the auth token', async () => {
    const boundaries = { type: 'FeatureCollection' as const, features: [] };
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(boundaries);
    const result = await getDistrictBoundaries('test-token');
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/districts/boundaries', {}, 'test-token');
    expect(result).toEqual(boundaries);
  });
});

describe('getStationSummaries', () => {
  it('fetches /api/geo/districts/{id}/stations with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getStationSummaries('test-token', 1);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/districts/1/stations', {}, 'test-token');
  });
});

describe('useDistrictSummaries', () => {
  it('returns the fetched districts once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleDistricts);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useDistrictSummaries('test-token'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleDistricts);
  });
});

const sampleDetail: DistrictDetailResponse = {
  kpi: {
    stateCaseCount: 1840,
    stateCaseCountDeltaPct: 4.2,
    resolvedPct: 61.3,
    resolvedPctDeltaPts: 1.8,
    topCrimeSubHead: 'Theft of Motor Vehicle',
    topCrimeSubHeadCount: 165,
  },
  categoryMix: [{ crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 473 }],
};

describe('getDistrictDetail', () => {
  it('fetches /api/geo/districts/{id}/summary with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleDetail);

    const result = await getDistrictDetail('test-token', 5);

    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/districts/5/summary', {}, 'test-token');
    expect(result).toEqual(sampleDetail);
  });
});

describe('useDistrictDetail', () => {
  it('returns the fetched detail once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleDetail);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useDistrictDetail('test-token', 5), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleDetail);
  });
});

describe('getStationBoundaries', () => {
  it('fetches /api/geo/districts/{id}/stations/boundaries with the auth token', async () => {
    const boundaries = { type: 'FeatureCollection' as const, features: [] };
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(boundaries);
    const result = await getStationBoundaries('test-token', 3);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/districts/3/stations/boundaries', {}, 'test-token');
    expect(result).toEqual(boundaries);
  });
});

describe('useStationBoundaries', () => {
  it('returns the fetched station boundaries once loaded', async () => {
    const boundaries = {
      type: 'FeatureCollection' as const,
      features: [{ type: 'Feature' as const, properties: { unitId: 1, unitName: 'Cowlbazar PS' }, geometry: {} }],
    };
    vi.spyOn(client, 'apiFetch').mockResolvedValue(boundaries);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useStationBoundaries('test-token', 3), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(boundaries);
  });
});

const sampleTimeOfDay: DistrictTimeOfDayResponse = {
  buckets: [
    { bucket: 'night', label: 'Night · 12–6 AM', districtCaseCounts: { 1: 40, 3: 25 } },
    { bucket: 'morning', label: 'Morning · 6 AM–12 PM', districtCaseCounts: { 1: 90, 3: 22 } },
    { bucket: 'afternoon', label: 'Afternoon · 12–6 PM', districtCaseCounts: { 1: 90, 3: 55 } },
    { bucket: 'evening', label: 'Evening · 6 PM–12 AM', districtCaseCounts: { 1: 230, 3: 18 } },
  ],
};

describe('getDistrictTimeOfDay', () => {
  it('fetches /api/geo/districts/time-of-day with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleTimeOfDay);

    const result = await getDistrictTimeOfDay('test-token');

    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/districts/time-of-day', {}, 'test-token');
    expect(result).toEqual(sampleTimeOfDay);
  });
});

describe('useDistrictTimeOfDay', () => {
  it('returns the fetched time-of-day buckets once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleTimeOfDay);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useDistrictTimeOfDay('test-token'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleTimeOfDay);
  });
});

const samplePoints: StationIncidentPointResponse[] = [
  { caseMasterId: 501, crimeNo: '12/2026', latitude: 12.9757, longitude: 77.6057 },
];

describe('getStationIncidents', () => {
  it('fetches /api/geo/stations/{unitId}/incidents with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(samplePoints);
    const result = await getStationIncidents('test-token', 301);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/geo/stations/301/incidents', {}, 'test-token');
    expect(result).toEqual(samplePoints);
  });
});

describe('useStationIncidents', () => {
  it('returns the fetched incident points once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(samplePoints);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useStationIncidents('test-token', 301), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(samplePoints);
  });
});
