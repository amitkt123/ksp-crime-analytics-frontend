import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import {
  getDistrictSummaries,
  getDistrictBoundaries,
  getStationSummaries,
  useDistrictSummaries,
  type DistrictSummaryResponse,
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
