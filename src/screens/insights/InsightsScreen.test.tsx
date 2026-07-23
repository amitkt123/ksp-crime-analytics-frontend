import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import { InsightsScreen } from './InsightsScreen';

vi.mock('./OverviewTab', () => ({ OverviewTab: () => <div>overview-tab-content</div> }));
vi.mock('./CrimeTrendsTab', () => ({ CrimeTrendsTab: () => <div>crime-trends-tab-content</div> }));
vi.mock('./DemographicsTab', () => ({ DemographicsTab: () => <div>demographics-tab-content</div> }));
vi.mock('./InvestigationNetworkTab', () => ({ InvestigationNetworkTab: () => <div>investigation-network-tab-content</div> }));
vi.mock('./JudicialUnitsTab', () => ({ JudicialUnitsTab: () => <div>judicial-units-tab-content</div> }));

describe('InsightsScreen', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({
      data: { username: 'demo.analyst', firstName: 'Demo', rank: 'Analyst', unit: null, unitId: null, districtId: null, roles: ['SCRB_ANALYST'] },
      isLoading: false, isError: false,
    } as never);
  });

  it('renders the Header title and defaults to the Overview tab', () => {
    render(
      <MemoryRouter>
        <InsightsScreen />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument();
    expect(screen.getByText('overview-tab-content')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Judicial & Units when its pill is clicked', () => {
    render(
      <MemoryRouter>
        <InsightsScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Judicial & Units' }));
    expect(screen.getByText('judicial-units-tab-content')).toBeInTheDocument();
    expect(screen.queryByText('overview-tab-content')).not.toBeInTheDocument();
  });
});
