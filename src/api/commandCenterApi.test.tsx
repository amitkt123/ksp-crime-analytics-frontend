import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import {
  getCommandCenterSummary,
  useCommandCenterSummary,
  type CommandCenterSummaryResponse,
} from './commandCenterApi';

const sampleSummary: CommandCenterSummaryResponse = {
  kpi: {
    stateCaseCount: 58214,
    stateCaseCountDeltaPct: 4.2,
    resolvedPct: 41.6,
    resolvedPctDeltaPts: 1.1,
    topCrimeSubHead: 'Theft — motor vehicle',
    topCrimeSubHeadCount: 3410,
  },
  stateCaseVolumeWeekly: [{ isoYear: 2026, isoWeek: 1, count: 1842 }],
  crimesAgainstPropertyWeekly: [{ isoYear: 2026, isoWeek: 1, count: 612 }],
  arrestsWeekly: [{ isoYear: 2026, isoWeek: 1, count: 397 }],
  categoryMix: [{ crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 612 }],
};

describe('getCommandCenterSummary', () => {
  it('fetches /api/command-center/summary with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleSummary);

    const result = await getCommandCenterSummary('test-token');

    expect(apiFetchSpy).toHaveBeenCalledWith('/api/command-center/summary', {}, 'test-token');
    expect(result).toEqual(sampleSummary);
  });
});

describe('useCommandCenterSummary', () => {
  it('returns the fetched summary once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleSummary);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCommandCenterSummary('test-token'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleSummary);
  });
});
