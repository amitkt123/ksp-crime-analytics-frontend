import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as agentApiModule from '../../api/agentApi';
import { AnomalyList } from './AnomalyList';
import type { CaseAnomalyResponse } from '../../api/sociologicalApi';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

const anomalies: CaseAnomalyResponse[] = [
  {
    caseMasterId: 9001, crimeNo: '101/2026/5/12', registrationDelayDays: 19,
    baselineMeanDelayDays: 4.2, zScore: 3.9,
    explanation: 'Registration delay of 19 days is 3.9 standard deviations above the baseline mean of 4.2 days',
  },
  {
    caseMasterId: 9002, crimeNo: '103/2026/3/44', registrationDelayDays: 8,
    baselineMeanDelayDays: 3.1, zScore: 2.3,
    explanation: 'Registration delay of 8 days is 2.3 standard deviations above the baseline mean of 3.1 days',
  },
];

const explainResponse: agentApiModule.AgentExplainResponse = {
  narrative: 'Registration delay of 19 days is 3.9 standard deviations above the baseline mean of 4.2 days',
  evidence: {
    claim: 'delay anomaly', supportingRecordIds: ['101/2026/5/12'], queryOrMethod: 'get_case_anomalies',
    confidence: 0.8, generatedAt: '2026-07-22T00:00:00Z', modelVersion: 'template-stub-v1',
  },
  agentAvailable: true,
};

describe('AnomalyList', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'test-token', roles: [], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(agentApiModule, 'useExplainCaseAnomaly').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.AgentExplainResponse),
    );
  });

  it('renders a severity legend for the delay-vs-zscore scatter', () => {
    render(<AnomalyList anomalies={anomalies} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders the flagged count and each anomaly', () => {
    render(<AnomalyList anomalies={anomalies} />);

    expect(screen.getByText('2 flagged')).toBeInTheDocument();
    expect(screen.getByText('101/2026/5/12')).toBeInTheDocument();
    expect(screen.getByText('19-day registration delay')).toBeInTheDocument();
  });

  it('opens the EvidencePanel with the fetched narrative and baseline, and closes it', async () => {
    vi.spyOn(agentApiModule, 'useExplainCaseAnomaly').mockReturnValue(mockSuccess(explainResponse));
    render(<AnomalyList anomalies={anomalies} crimeSubHeadId={5} />);

    await userEvent.click(screen.getByText('101/2026/5/12'));
    expect(screen.getByText(explainResponse.narrative!)).toBeInTheDocument();
    expect(screen.getByText('District baseline mean delay: 4.2 days')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close evidence panel/i }));
    expect(screen.queryByText(explainResponse.narrative!)).not.toBeInTheDocument();
  });

  it('shows a message and no severity legend when there are no anomalies', () => {
    render(<AnomalyList anomalies={[]} />);

    expect(screen.getByText('No registration-delay anomalies for this crime type.')).toBeInTheDocument();
    expect(screen.queryByText('Critical')).not.toBeInTheDocument();
  });
});
