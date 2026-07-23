import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as commandCenterApiModule from '../../api/commandCenterApi';
import * as geoApiModule from '../../api/geoApi';
import * as caseApiModule from '../../api/caseApi';
import { OverviewScreen } from './OverviewScreen';

function queryResult<T>(data: T) {
  return { data, isLoading: false, isError: false, refetch: vi.fn() } as never;
}

describe('OverviewScreen', () => {
  it('renders the Header title and the Overview tab content', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['POLICYMAKER'], username: 'demo.policymaker', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(queryResult({ username: 'demo.policymaker', firstName: 'Demo', rank: null, unit: null, unitId: null, districtId: null, roles: ['POLICYMAKER'] }));
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(queryResult(undefined));
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(undefined));
    vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(queryResult([]));

    render(
      <MemoryRouter>
        <OverviewScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Registrations vs Chargesheeted')).toBeInTheDocument();
  });
});
