import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import * as AuthContextModule from '../../auth/AuthContext';
import * as commandCenterApiModule from '../../api/commandCenterApi';
import { CrimeTrendsTab } from './CrimeTrendsTab';

function queryResult<T>(data: T, overrides: Partial<{ isLoading: boolean; isError: boolean }> = {}) {
  return { data, isLoading: false, isError: false, refetch: vi.fn(), ...overrides } as never;
}

const summary = {
  kpi: { stateCaseCount: 1, stateCaseCountDeltaPct: 0, resolvedPct: 0, resolvedPctDeltaPts: 0, topCrimeSubHead: '', topCrimeSubHeadCount: 0 },
  stateCaseVolumeWeekly: [], crimesAgainstPropertyWeekly: [], arrestsWeekly: [],
  categoryMix: [
    { crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 200 },
    { crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 600 },
  ],
};

function mockAuth(roles: string[]) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles, username: 'demo', login: vi.fn(), logout: vi.fn(),
  });
}

describe('CrimeTrendsTab', () => {
  it('renders the live Crime Head Distribution chart with no Demo badge', () => {
    mockAuth(['SCRB_ANALYST']);
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(summary));

    render(<CrimeTrendsTab />);

    const card = screen.getByText('Crime Head Distribution').closest<HTMLElement>('.insight-card')!;
    expect(card.querySelector('.chip.predicted')).toBeNull();
    expect(within(card).getAllByText('Crimes Against Property').length).toBeGreaterThan(0);
  });

  it('renders the Cohort Analysis and District x Crime Head heatmaps as demo data', () => {
    mockAuth(['SCRB_ANALYST']);
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(summary));

    render(<CrimeTrendsTab />);

    expect(screen.getByText('Cohort Analysis — Case Closure Velocity')).toBeInTheDocument();
    expect(screen.getByText('District × Crime Head Hotspot Matrix')).toBeInTheDocument();
  });
});
