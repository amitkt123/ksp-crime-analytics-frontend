import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';

vi.mock('./OverviewTab', () => ({ OverviewTab: () => <div>Overview content</div> }));
vi.mock('./CrimeTrendsTab', () => ({ CrimeTrendsTab: () => <div>Crime Trends content</div> }));
vi.mock('./DemographicsTab', () => ({ DemographicsTab: () => <div>Demographics content</div> }));
vi.mock('./InvestigationNetworkTab', () => ({ InvestigationNetworkTab: () => <div>Investigation Network content</div> }));
vi.mock('./JudicialUnitsTab', () => ({ JudicialUnitsTab: () => <div>Judicial Units content</div> }));

import { CrimeAnalyticsScreen } from './CrimeAnalyticsScreen';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as ReturnType<
    typeof meApiModule.useMe
  >;
}

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt',
    roles: ['SCRB_ANALYST'],
    username: 'demo.analyst',
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(mockSuccess(undefined));
}

describe('CrimeAnalyticsScreen', () => {
  it('defaults to the Overview tab', () => {
    mockAuth();
    render(<CrimeAnalyticsScreen />);

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Overview content')).toBeInTheDocument();
  });

  it('switches tabs on click', async () => {
    mockAuth();
    render(<CrimeAnalyticsScreen />);

    await userEvent.click(screen.getByRole('tab', { name: 'Judicial & Units' }));

    expect(screen.getByRole('tab', { name: 'Judicial & Units' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Judicial Units content')).toBeInTheDocument();
    expect(screen.queryByText('Overview content')).not.toBeInTheDocument();
  });
});