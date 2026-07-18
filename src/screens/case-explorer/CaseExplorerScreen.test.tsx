import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as caseApiModule from '../../api/caseApi';
import { CaseExplorerScreen } from './CaseExplorerScreen';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

const cases: caseApiModule.CaseSummaryResponse[] = [
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

const me: meApiModule.MeResponse = {
  username: 'demo.investigator',
  firstName: 'Demo',
  rank: 'Investigator',
  unit: 'Whitefield PS',
  unitId: 176,
  roles: ['INVESTIGATOR'],
};

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt',
    roles: ['INVESTIGATOR'],
    username: 'demo.investigator',
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(mockSuccess(me));
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/case-explorer']}>
      <Routes>
        <Route path="/case-explorer" element={<CaseExplorerScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CaseExplorerScreen', () => {
  it('renders the case list once cases load, scoped to the current unitId', async () => {
    mockAuth();
    const useCasesSpy = vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess(cases));

    renderScreen();

    expect(await screen.findByText('276/2026')).toBeInTheDocument();
    expect(useCasesSpy).toHaveBeenCalledWith('jwt', 176, { status: undefined, crimeSubHeadId: undefined, q: undefined });
  });

  it('changing the status filter re-queries with the new status', async () => {
    mockAuth();
    const useCasesSpy = vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess(cases));

    renderScreen();
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'closed');

    expect(useCasesSpy).toHaveBeenLastCalledWith('jwt', 176, {
      status: 'closed',
      crimeSubHeadId: undefined,
      q: undefined,
    });
  });

  it('shows an alert and retry button when the cases query fails', async () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<caseApiModule.CaseSummaryResponse[], Error>);

    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load cases");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows an empty state when no cases match the filters', async () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess([]));

    renderScreen();

    expect(await screen.findByText('No cases match these filters.')).toBeInTheDocument();
  });
});
