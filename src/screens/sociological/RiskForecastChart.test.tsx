import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as agentApiModule from '../../api/agentApi';
import { RiskForecastChart } from './RiskForecastChart';
import type { PredictiveRiskForecastResponse } from '../../api/sociologicalApi';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

const forecasts: PredictiveRiskForecastResponse[] = [
  {
    unitId: 12, unitName: 'Halasuru PS', districtId: 5, crimeSubHeadId: 101,
    crimeSubHeadName: 'Theft of Motor Vehicle', predictedCount: 14.2,
    backtestActualCount: 12, backtestPredictedCount: 13.1, backtestAbsoluteError: 1.1,
  },
  {
    unitId: 44, unitName: 'Madikeri PS', districtId: 18, crimeSubHeadId: 101,
    crimeSubHeadName: 'Theft of Motor Vehicle', predictedCount: 3.5,
    backtestActualCount: 3, backtestPredictedCount: 3.4, backtestAbsoluteError: 0.4,
  },
];

const explainResponse: agentApiModule.AgentExplainResponse = {
  narrative: 'Halasuru PS is forecast 14 cases of Theft of Motor Vehicle next period.',
  evidence: {
    claim: 'risk forecast', supportingRecordIds: ['12'], queryOrMethod: 'get_predictive_risk',
    confidence: 0.6, generatedAt: '2026-07-22T00:00:00Z', modelVersion: 'template-stub-v1',
  },
  agentAvailable: true,
};

describe('RiskForecastChart', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'test-token', roles: [], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(agentApiModule, 'useExplainRiskForecast').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.AgentExplainResponse),
    );
  });

  it('renders a legend for the two bar series', () => {
    render(<RiskForecastChart forecasts={forecasts} />);

    expect(screen.getByText('Predicted')).toBeInTheDocument();
    expect(screen.getByText('Backtest actual')).toBeInTheDocument();
  });

  it('renders every station with its predicted count, backtest-actual count, and error', () => {
    render(<RiskForecastChart forecasts={forecasts} />);

    expect(screen.getByText('Halasuru PS')).toBeInTheDocument();
    expect(screen.getByText('Madikeri PS')).toBeInTheDocument();
    expect(screen.getByText('14.2')).toBeInTheDocument();
    expect(screen.getByText('12.0')).toBeInTheDocument();
    expect(screen.getByText('±1.1')).toBeInTheDocument();
  });

  it('ranks the highest-forecast station first', () => {
    render(<RiskForecastChart forecasts={forecasts} />);

    const labels = screen.getAllByText(/PS$/).map((el) => el.textContent);
    expect(labels.indexOf('Halasuru PS')).toBeLessThan(labels.indexOf('Madikeri PS'));
  });

  it('shows a message when there are no forecasts', () => {
    render(<RiskForecastChart forecasts={[]} />);

    expect(screen.getByText('No predictive risk forecasts for this crime type.')).toBeInTheDocument();
  });

  it('opens the EvidencePanel with the fetched narrative when a row is clicked, and closes it', async () => {
    vi.spyOn(agentApiModule, 'useExplainRiskForecast').mockReturnValue(mockSuccess(explainResponse));
    render(<RiskForecastChart forecasts={forecasts} />);

    await userEvent.click(screen.getByText('Halasuru PS'));
    expect(screen.getByText(explainResponse.narrative!)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close evidence panel/i }));
    expect(screen.queryByText(explainResponse.narrative!)).not.toBeInTheDocument();
  });
});
