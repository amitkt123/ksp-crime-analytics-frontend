import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as AuthContextModule from '../auth/AuthContext';
import * as meApiModule from '../api/meApi';
import { Header } from './Header';

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
  });
}

describe('Header', () => {
  it('renders the title, "Rank · Unit", and any filter children once /api/me resolves', () => {
    mockAuth();
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({
      data: {
        username: 'demo.analyst', firstName: 'R.', rank: 'SCRB Analyst', unit: 'State CID HQ',
        roles: ['SCRB_ANALYST'],
      },
      isSuccess: true,
    } as unknown as ReturnType<typeof meApiModule.useMe>);

    render(
      <Header title="Command Center">
        <span>Date range filter</span>
      </Header>,
    );

    expect(screen.getByRole('heading', { name: 'Command Center' })).toBeInTheDocument();
    expect(screen.getByText('demo.analyst')).toBeInTheDocument();
    expect(screen.getByText('SCRB Analyst · State CID HQ')).toBeInTheDocument();
    expect(screen.getByText('Date range filter')).toBeInTheDocument();
  });

  it('falls back to the raw role list while /api/me has not resolved yet', () => {
    mockAuth();
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({
      data: undefined,
      isSuccess: false,
    } as unknown as ReturnType<typeof meApiModule.useMe>);

    render(<Header title="Command Center" />);

    expect(screen.getByText('SCRB_ANALYST')).toBeInTheDocument();
  });

  it('renders a 6-tile KPI strip', () => {
    mockAuth();
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({ data: undefined, isSuccess: false } as unknown as ReturnType<typeof meApiModule.useMe>);

    render(<Header title="Overview" />);

    expect(screen.getByText('Total FIRs (24 mo)')).toBeInTheDocument();
    expect(screen.getByText('Heinous Offences')).toBeInTheDocument();
    expect(screen.getByText('Chargesheet Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg. Days to Chargesheet')).toBeInTheDocument();
    expect(screen.getByText('Pending Investigation')).toBeInTheDocument();
    expect(screen.getByText('Accused Arrested')).toBeInTheDocument();
  });
});
