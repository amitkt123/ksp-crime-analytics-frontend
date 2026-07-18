import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import {
  getCases,
  useCases,
  getCaseDetail,
  useCaseDetail,
  getCaseExplanation,
  useCaseExplanation,
  caseStatusLabel,
  caseStatusChipClass,
  gravityLabel,
  gravityDotClass,
  partyRoleLabel,
  type CaseSummaryResponse,
  type CaseDetailResponse,
  type CaseExplanationResponse,
} from './caseApi';

const sampleCases: CaseSummaryResponse[] = [
  {
    caseId: 176000,
    caseNumber: '276/2026',
    unitId: 176,
    unitName: 'Whitefield PS',
    crimeSubHeadId: 103,
    crimeSubHeadName: 'Chain Snatching',
    status: 'registered',
    firDate: '2026-05-26',
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getCases', () => {
  it('fetches /api/cases with unitId and any set filters as query params', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleCases);
    await getCases('test-token', 176, { status: 'closed', q: 'ramesh' });
    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/api/cases?unitId=176&status=closed&q=ramesh',
      {},
      'test-token',
    );
  });

  it('omits unset filters from the query string', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleCases);
    await getCases('test-token', 176, {});
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/cases?unitId=176', {}, 'test-token');
  });
});

describe('getCaseDetail', () => {
  it('fetches /api/cases/{caseId} with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({} as CaseDetailResponse);
    await getCaseDetail('test-token', 176000);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/cases/176000', {}, 'test-token');
  });
});

describe('useCases', () => {
  it('returns the fetched cases once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleCases);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCases('test-token', 176, {}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleCases);
  });

  it('does not fetch when unitId is null', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleCases);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    renderHook(() => useCases('test-token', null, {}), { wrapper });

    expect(apiFetchSpy).not.toHaveBeenCalled();
  });
});

describe('useCaseDetail', () => {
  it('returns the fetched case detail once loaded', async () => {
    const detail = { ...sampleCases[0], narrative: 'x', parties: [], timeline: [] } as CaseDetailResponse;
    vi.spyOn(client, 'apiFetch').mockResolvedValue(detail);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCaseDetail('test-token', 176000), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(detail);
  });
});

describe('caseStatusLabel', () => {
  it('maps every status to a plain-language label', () => {
    expect(caseStatusLabel('registered')).toBe('Registered');
    expect(caseStatusLabel('under_investigation')).toBe('Under Investigation');
    expect(caseStatusLabel('closed')).toBe('Closed');
  });
});

describe('caseStatusChipClass', () => {
  it('maps every status to a chip CSS class', () => {
    expect(caseStatusChipClass('registered')).toBe('status-neutral');
    expect(caseStatusChipClass('under_investigation')).toBe('status-warning');
    expect(caseStatusChipClass('closed')).toBe('status-good');
  });
});

describe('gravityLabel', () => {
  it('maps every gravity to a plain-language label', () => {
    expect(gravityLabel('heinous')).toBe('Heinous');
    expect(gravityLabel('serious')).toBe('Serious');
    expect(gravityLabel('minor')).toBe('Minor');
  });
});

describe('gravityDotClass', () => {
  it('maps every gravity to a dot CSS class', () => {
    expect(gravityDotClass('heinous')).toBe('gravity-heinous');
    expect(gravityDotClass('serious')).toBe('gravity-serious');
    expect(gravityDotClass('minor')).toBe('gravity-minor');
  });
});

describe('partyRoleLabel', () => {
  it('maps every party role to a plain-language label', () => {
    expect(partyRoleLabel('complainant')).toBe('Complainant');
    expect(partyRoleLabel('victim')).toBe('Victim');
    expect(partyRoleLabel('accused')).toBe('Accused');
  });
});

describe('getCaseExplanation', () => {
  it('fetches /api/cases/{caseId}/explain with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({} as CaseExplanationResponse);
    await getCaseExplanation('test-token', 176000);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/cases/176000/explain', {}, 'test-token');
  });
});

describe('useCaseExplanation', () => {
  it('returns the fetched explanation once loaded', async () => {
    const explanation: CaseExplanationResponse = {
      claim: 'x',
      confidence: 0.7,
      confidenceLabel: 'Pattern confidence',
      method: 'x',
      baseline: 'x',
      generatedAt: '2026-05-29',
      records: ['276/2026'],
    };
    vi.spyOn(client, 'apiFetch').mockResolvedValue(explanation);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCaseExplanation('test-token', 176000, true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(explanation);
  });

  it('does not fetch when not enabled', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({} as CaseExplanationResponse);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    renderHook(() => useCaseExplanation('test-token', 176000, false), { wrapper });

    expect(apiFetchSpy).not.toHaveBeenCalled();
  });
});
