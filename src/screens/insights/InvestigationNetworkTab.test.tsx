import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as AuthContextModule from '../../auth/AuthContext';
import * as networkApiModule from '../../api/networkApi';
import { InvestigationNetworkTab } from './InvestigationNetworkTab';

function queryResult<T>(data: T) {
  return { data, isLoading: false, isError: false, refetch: vi.fn() } as never;
}

function mockAuth(roles: string[]) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles, username: 'demo', login: vi.fn(), logout: vi.fn(),
  });
}

describe('InvestigationNetworkTab', () => {
  it('shows live repeat-offender data with no Demo badge for SCRB_ANALYST', () => {
    mockAuth(['SCRB_ANALYST']);
    vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(
      queryResult([{ personId: 1, displayName: 'Real Name', caseCount: 4, gravityWeight: 1, confidenceScore: 0.9 }]),
    );

    render(<InvestigationNetworkTab />);

    const card = screen.getByText('Top Repeat Offenders').closest('.insight-card')!;
    expect(card.querySelector('.chip.predicted')).toBeNull();
    expect(screen.getByText('Real Name')).toBeInTheDocument();
  });

  it('falls back to demo repeat-offender data with a Demo badge for DISTRICT_SUPERVISOR', () => {
    mockAuth(['DISTRICT_SUPERVISOR']);
    vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(queryResult(undefined));

    render(<InvestigationNetworkTab />);

    const card = screen.getByText('Top Repeat Offenders').closest('.insight-card')!;
    expect(card.querySelector('.chip.predicted')).not.toBeNull();
    expect(screen.getByText('M**** K****')).toBeInTheDocument();
  });

  it('always renders the demo IO Leaderboard and Crime Head <-> Act linkage cards', () => {
    mockAuth(['SCRB_ANALYST']);
    vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(queryResult([]));

    render(<InvestigationNetworkTab />);

    expect(screen.getByText('Investigating Officer Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Crime Head ↔ Act Linkage')).toBeInTheDocument();
  });
});
