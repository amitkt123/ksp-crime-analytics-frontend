import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskForecastChart } from './RiskForecastChart';
import type { PredictiveRiskForecastResponse } from '../../api/sociologicalApi';

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

describe('RiskForecastChart', () => {
  it('renders every station with its predicted count and backtest error', () => {
    render(<RiskForecastChart forecasts={forecasts} />);

    expect(screen.getByText('Halasuru PS')).toBeInTheDocument();
    expect(screen.getByText('Madikeri PS')).toBeInTheDocument();
    expect(screen.getByText('14.2')).toBeInTheDocument();
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
});
