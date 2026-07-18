import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as caseApiModule from '../../api/caseApi';
import { CaseDetailScreen } from './CaseDetailScreen';

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
  narrative: 'Chain Snatching reported to Whitefield PS.',
  parties: [
    {
      role: 'victim',
      name: { masked: 'R***** K****', real: 'Ramesh Kumar' },
      phone: { masked: '98******00', real: '9810000000' },
      address: { masked: '**********, Karnataka', real: '12 MG Road, Karnataka' },
    },
  ],
  timeline: [
    { status: 'registered', timestamp: '2026-05-26', note: 'FIR registered.' },
    { status: 'under_investigation', timestamp: '2026-05-29', note: 'Investigation taken up by the station.' },
  ],
};

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt',
    roles: ['INVESTIGATOR'],
    username: 'demo.investigator',
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(
    mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
  );
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/case-explorer/176000']}>
      <Routes>
        <Route path="/case-explorer/:caseId" element={<CaseDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CaseDetailScreen', () => {
  it('renders facts, a masked party, and the timeline once the case loads', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    renderScreen();

    expect(screen.getAllByText('276/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Under Investigation').length).toBeGreaterThan(0);
    expect(screen.getByText('R***** K****')).toBeInTheDocument();
    expect(screen.queryByText('Ramesh Kumar')).not.toBeInTheDocument();
    expect(screen.getByText('FIR registered.')).toBeInTheDocument();
    expect(screen.getByText('Investigation taken up by the station.')).toBeInTheDocument();
  });

  it('reveals the real value when a PII field is toggled', async () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    renderScreen();
    await userEvent.click(screen.getAllByRole('button', { name: 'Reveal' })[0]);

    expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
  });

  it('shows an alert and retry button when the query fails', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<caseApiModule.CaseDetailResponse, Error>);

    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this case");
  });

  it('shows a not-found message with a link back when the case does not exist', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(
      mockSuccess<caseApiModule.CaseDetailResponse | undefined>(undefined),
    );

    renderScreen();

    expect(screen.getByText('Case not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Case Explorer' })).toHaveAttribute('href', '/case-explorer');
  });
});
