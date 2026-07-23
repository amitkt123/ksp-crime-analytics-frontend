import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as agentApiModule from '../../api/agentApi';
import { AlertFeed } from './AlertFeed';
import type { EmergingAlertResponse } from '../../api/alertsApi';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

const alerts: EmergingAlertResponse[] = [
  {
    unitId: 102, unitName: 'Halasuru PS', districtId: 5, crimeSubHeadId: 5, crimeSubHeadName: 'Theft',
    currentWeekCount: 20, baselineMean: 4.2, zScore: 3.8,
    explanation: 'Current count 20 is 3.8 standard deviations above the trailing baseline mean 4.2',
  },
];

const explainResponse: agentApiModule.AgentExplainResponse = {
  narrative: 'Current count 20 is 3.8 standard deviations above the trailing baseline mean 4.2',
  evidence: {
    claim: 'spike', supportingRecordIds: ['Halasuru PS · Theft'], queryOrMethod: 'get_trend_deviation',
    confidence: 0.85, generatedAt: '2026-07-22T00:00:00Z', modelVersion: 'template-stub-v1',
  },
  agentAvailable: true,
};

describe('AlertFeed', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'test-token', roles: [], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(agentApiModule, 'useExplainTrendAlert').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.AgentExplainResponse),
    );
  });

  it('renders the active count and each alert', () => {
    render(<AlertFeed alerts={alerts} />);

    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('Halasuru PS')).toBeInTheDocument();
    expect(screen.getByText('Theft')).toBeInTheDocument();
  });

  it('opens the EvidencePanel with the real fetched narrative for the clicked alert, and closes it', async () => {
    vi.spyOn(agentApiModule, 'useExplainTrendAlert').mockReturnValue(mockSuccess(explainResponse));
    render(<AlertFeed alerts={alerts} />);

    await userEvent.click(screen.getByText('Halasuru PS'));
    expect(screen.getByText(explainResponse.narrative!)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close evidence panel/i }));
    expect(screen.queryByText(explainResponse.narrative!)).not.toBeInTheDocument();
  });

  it('shows a plain-voice empty state when there are no alerts', () => {
    render(<AlertFeed alerts={[]} />);
    expect(screen.getByText('No emerging alerts in this window.')).toBeInTheDocument();
  });

  it('marks a critical-severity alert (z >= 3.5) with a pulsing red-zone indicator', () => {
    render(<AlertFeed alerts={alerts} />);
    const card = screen.getByText('Halasuru PS').closest('button');
    expect(card).toHaveClass('severity-critical');
    expect(card?.querySelector('.alert-pulse-dot.severity-critical')).toBeInTheDocument();
  });

  it('does not pulse a moderate-severity alert', () => {
    const moderateAlert: EmergingAlertResponse[] = [
      { ...alerts[0], zScore: 1.2 },
    ];
    render(<AlertFeed alerts={moderateAlert} />);
    const card = screen.getByText('Halasuru PS').closest('button');
    expect(card).toHaveClass('severity-moderate');
    expect(card?.querySelector('.alert-pulse-dot.severity-critical')).not.toBeInTheDocument();
    expect(card?.querySelector('.alert-pulse-dot.severity-high')).not.toBeInTheDocument();
  });
});
