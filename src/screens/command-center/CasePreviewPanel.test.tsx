import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as caseApiModule from '../../api/caseApi';
import { CasePreviewPanel } from './CasePreviewPanel';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

const detail: caseApiModule.CaseDetailResponse = {
  caseId: 176000,
  caseNumber: '276/2026',
  unitId: 176,
  unitName: 'Whitefield PS',
  crimeSubHeadId: 103,
  crimeSubHeadName: 'Chain Snatching',
  status: 'under_investigation',
  firDate: '2026-05-26',
  crimeNumber: 'FIR-2026-KA-17600',
  gravity: 'serious',
  narrative: 'Chain Snatching reported to Whitefield PS.',
  parties: [
    {
      role: 'complainant',
      name: { masked: 'N***** S****', real: 'Nagaraj Setty' },
      phone: { masked: '98******01', real: '9810000001' },
      address: { masked: '**********, Karnataka', real: '45 Church Street, Karnataka' },
    },
  ],
  timeline: [{ status: 'registered', timestamp: '2026-05-26', note: 'FIR registered.' }],
};

function renderPanel(caseId: number | null, roles: string[] = ['SCRB_ANALYST']) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt',
    roles,
    username: 'demo.analyst',
    login: vi.fn(),
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <CasePreviewPanel caseId={caseId} onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('CasePreviewPanel', () => {
  it('renders nothing when no case is selected', () => {
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(
      mockSuccess<caseApiModule.CaseDetailResponse>(undefined as unknown as caseApiModule.CaseDetailResponse),
    );

    renderPanel(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows case facts and masked party info once loaded', () => {
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    renderPanel(176000);

    expect(screen.getByText('276/2026')).toBeInTheDocument();
    expect(screen.getByText('Under Investigation')).toBeInTheDocument();
    expect(screen.getByText('Serious')).toBeInTheDocument();
    expect(screen.getByText('N***** S****')).toBeInTheDocument();
  });

  it('hides "View full case" for roles that cannot reach Case Explorer', () => {
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    renderPanel(176000, ['SCRB_ANALYST']);

    expect(screen.queryByRole('link', { name: 'View full case' })).not.toBeInTheDocument();
  });

  it('shows "View full case" for roles that can reach Case Explorer', () => {
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    renderPanel(176000, ['STATION_SUPERVISOR']);

    expect(screen.getByRole('link', { name: 'View full case' })).toHaveAttribute(
      'href',
      '/case-explorer/176000',
    );
  });

  it('shows a retry control on error', () => {
    const refetch = vi.fn();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch,
    } as unknown as UseQueryResult<caseApiModule.CaseDetailResponse, Error>);

    renderPanel(176000);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this case");
  });
});
