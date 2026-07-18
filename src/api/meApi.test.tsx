import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import { getMe, useMe, type MeResponse } from './meApi';

const sampleMe: MeResponse = {
  username: 'demo.analyst',
  firstName: 'R.',
  rank: 'SCRB Analyst',
  unit: 'State CID HQ',
  unitId: null,
  roles: ['SCRB_ANALYST'],
};

describe('getMe', () => {
  it('fetches /api/me with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleMe);

    const result = await getMe('test-token');

    expect(apiFetchSpy).toHaveBeenCalledWith('/api/me', {}, 'test-token');
    expect(result).toEqual(sampleMe);
  });
});

describe('useMe', () => {
  it('returns the fetched profile once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleMe);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useMe('test-token'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleMe);
  });
});
