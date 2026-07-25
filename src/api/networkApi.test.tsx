import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import { ApiError } from './client';
import {
  personIdOfNode,
  subgraphQueryString,
  getSubgraph,
  useSubgraph,
  getRepeatOffenders,
  getCommunities,
  getNetworkPath,
  useNetworkPath,
  type SubgraphResponse,
} from './networkApi';

afterEach(() => {
  vi.restoreAllMocks();
});

function wrapperWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('personIdOfNode', () => {
  it('converts a subgraph node id string back to the numeric personId', () => {
    expect(personIdOfNode({ id: '482910' })).toBe(482910);
  });
});

describe('subgraphQueryString', () => {
  it('includes only focus for top-offenders with no limit given', () => {
    expect(subgraphQueryString({ focus: 'top-offenders' })).toBe('focus=top-offenders');
  });

  it('includes personId and hops for the person focus', () => {
    const query = subgraphQueryString({ focus: 'person', personId: 42, hops: 2 });
    expect(query).toBe('focus=person&personId=42&hops=2');
  });

  it('includes from/to/maxHops for the path focus', () => {
    const query = subgraphQueryString({ focus: 'path', from: 1, to: 2, maxHops: 6 });
    expect(query).toBe('focus=path&from=1&to=2&maxHops=6');
  });

  it('includes caseId for the case focus', () => {
    expect(subgraphQueryString({ focus: 'case', caseId: 9001 })).toBe('focus=case&caseId=9001');
  });

  it('includes locationId for the location focus', () => {
    expect(subgraphQueryString({ focus: 'location', locationId: 7001 })).toBe('focus=location&locationId=7001');
  });
});

describe('getSubgraph', () => {
  it('fetches /api/network/subgraph with the built query string', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ nodes: [], edges: [], generatedAt: '2026-07-19T00:00:00Z' });
    await getSubgraph('test-token', { focus: 'community', communityId: 7 });
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/subgraph?focus=community&communityId=7', {}, 'test-token');
  });
});

describe('useSubgraph', () => {
  it('returns the fetched subgraph once loaded', async () => {
    const data: SubgraphResponse = { nodes: [], edges: [], generatedAt: '2026-07-19T00:00:00Z' };
    vi.spyOn(client, 'apiFetch').mockResolvedValue(data);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useSubgraph('test-token', { focus: 'top-offenders' }), {
      wrapper: wrapperWith(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });

  it('does not fetch when params is null', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ nodes: [], edges: [], generatedAt: '' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useSubgraph('test-token', null), { wrapper: wrapperWith(queryClient) });

    expect(apiFetchSpy).not.toHaveBeenCalled();
  });
});

describe('getRepeatOffenders', () => {
  it('fetches /api/network/repeat-offenders with minCases and limit', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getRepeatOffenders('test-token', 2, 8);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/repeat-offenders?minCases=2&limit=8', {}, 'test-token');
  });
});

describe('getCommunities', () => {
  it('fetches /api/network/communities with minSize', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getCommunities('test-token', 4);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/communities?minSize=4', {}, 'test-token');
  });
});

describe('getNetworkPath', () => {
  it('fetches /api/network/path with from/to/maxHops', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ personIds: [1, 2], displayNames: ['A', 'B'], hopCount: 1 });
    await getNetworkPath('test-token', 1, 2, 6);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/network/path?from=1&to=2&maxHops=6', {}, 'test-token');
  });

  it('returns null when apiFetch resolves null (mock "no path")', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(null);
    const result = await getNetworkPath('test-token', 1, 99, 6);
    expect(result).toBeNull();
  });

  it('returns null when apiFetch throws a 404 ApiError (real backend "no path")', async () => {
    vi.spyOn(client, 'apiFetch').mockRejectedValue(new ApiError(404, 'not found'));
    const result = await getNetworkPath('test-token', 1, 99, 6);
    expect(result).toBeNull();
  });

  it('rethrows non-404 errors', async () => {
    vi.spyOn(client, 'apiFetch').mockRejectedValue(new ApiError(500, 'server error'));
    await expect(getNetworkPath('test-token', 1, 99, 6)).rejects.toThrow('server error');
  });
});

describe('useNetworkPath', () => {
  it('does not fetch until both from and to are set', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(null);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useNetworkPath('test-token', 1, null), { wrapper: wrapperWith(queryClient) });

    expect(apiFetchSpy).not.toHaveBeenCalled();
  });
});
