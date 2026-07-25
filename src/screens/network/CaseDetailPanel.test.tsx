import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as caseApiModule from '../../api/caseApi';
import type { GraphNodeResponse } from '../../api/networkApi';
import { CaseDetailPanel } from './CaseDetailPanel';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<T, Error>;
}

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
  });
}

const caseNode: GraphNodeResponse = {
  id: '9001', type: 'CASE', label: '144/2026', confidence: null,
  crimeNo: 'FIR-144', caseNo: '144/2026', crimeRegisteredDate: '2026-06-01', gravityWeight: 8,
  moKeywordTags: null, locationKey: null, latitude: null, longitude: null,
};

const detail: caseApiModule.CaseDetailResponse = {
  caseId: 9001, caseNumber: '144/2026', unitId: 12, unitName: 'MG Road PS',
  crimeSubHeadId: 5, crimeSubHeadName: 'Robbery', status: 'under_investigation', firDate: '2026-06-02',
  station: 'MG Road PS', district: 'Bengaluru Urban', gravity: 'serious',
  narrative: 'A robbery was reported near MG Road metro station involving two accused on a motorbike.',
  parties: [
    { role: 'complainant', name: { masked: 'A***', real: 'Amit' }, phone: { masked: '9*', real: '9000000000' }, address: { masked: '*', real: 'x' } },
    { role: 'accused', name: { masked: 'B***', real: 'Bala' }, phone: { masked: '9*', real: '9000000001' }, address: { masked: '*', real: 'y' } },
    { role: 'accused', name: { masked: 'C***', real: 'Chetan' }, phone: { masked: '9*', real: '9000000002' }, address: { masked: '*', real: 'z' } },
  ],
  timeline: [],
};

describe('CaseDetailPanel', () => {
  it('renders nothing when node is null', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(undefined as unknown as caseApiModule.CaseDetailResponse));

    render(
      <MemoryRouter>
        <CaseDetailPanel node={null} onClose={vi.fn()} onFocus={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pre-fills the header from the subgraph node while the case detail fetch is in flight', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue({
      data: undefined, isLoading: true, isError: false, isSuccess: false, refetch: vi.fn(),
    } as unknown as UseQueryResult<caseApiModule.CaseDetailResponse, Error>);

    render(
      <MemoryRouter>
        <CaseDetailPanel node={caseNode} onClose={vi.fn()} onFocus={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog', { name: '144/2026' })).toBeInTheDocument();
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders the full body once the case detail loads', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    render(
      <MemoryRouter>
        <CaseDetailPanel node={caseNode} onClose={vi.fn()} onFocus={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Under Investigation')).toBeInTheDocument();
    expect(screen.getByText('Serious')).toBeInTheDocument();
    expect(screen.getByText('Robbery')).toBeInTheDocument();
    expect(screen.getByText('MG Road PS')).toBeInTheDocument();
    expect(screen.getByText('Bengaluru Urban')).toBeInTheDocument();
    expect(screen.getByText('2026-06-02')).toBeInTheDocument();
    expect(screen.getByText(/robbery was reported near MG Road/)).toBeInTheDocument();
    expect(screen.getByText('Complainant')).toBeInTheDocument();
    expect(screen.getByText('Accused')).toBeInTheDocument();
  });

  it('shows an inline error with retry when the case detail fetch fails', async () => {
    mockAuth();
    const refetch = vi.fn();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue({
      data: undefined, isLoading: false, isError: true, isSuccess: false, refetch,
    } as unknown as UseQueryResult<caseApiModule.CaseDetailResponse, Error>);

    render(
      <MemoryRouter>
        <CaseDetailPanel node={caseNode} onClose={vi.fn()} onFocus={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load case details");
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('fires onFocus with the case id and links to Case Explorer', async () => {
    mockAuth();
    const onFocus = vi.fn();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    render(
      <MemoryRouter>
        <CaseDetailPanel node={caseNode} onClose={vi.fn()} onFocus={onFocus} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Focus on Case' }));
    expect(onFocus).toHaveBeenCalledWith(9001);
    expect(screen.getByRole('link', { name: 'Open in Case Explorer' })).toHaveAttribute('href', '/case-explorer/9001');
  });
});
