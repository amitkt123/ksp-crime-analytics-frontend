import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnomalyList } from './AnomalyList';
import type { CaseAnomalyResponse } from '../../api/sociologicalApi';

const anomalies: CaseAnomalyResponse[] = [
  {
    caseMasterId: 9001, crimeNo: '101/2026/5/12', registrationDelayDays: 19,
    baselineMeanDelayDays: 4.2, zScore: 3.9,
    explanation: 'Registration delay of 19 days is 3.9 standard deviations above the baseline mean of 4.2 days',
  },
];

describe('AnomalyList', () => {
  it('renders the flagged count and each anomaly', () => {
    render(<AnomalyList anomalies={anomalies} />);

    expect(screen.getByText('1 flagged')).toBeInTheDocument();
    expect(screen.getByText('101/2026/5/12')).toBeInTheDocument();
    expect(screen.getByText('19-day registration delay')).toBeInTheDocument();
  });

  it('opens the EvidencePanel with the explanation and baseline, and closes it', async () => {
    render(<AnomalyList anomalies={anomalies} />);

    await userEvent.click(screen.getByText('101/2026/5/12'));
    expect(screen.getByText(anomalies[0].explanation)).toBeInTheDocument();
    expect(screen.getByText('District baseline mean delay: 4.2 days')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close evidence panel/i }));
    expect(screen.queryByText(anomalies[0].explanation)).not.toBeInTheDocument();
  });

  it('shows a message when there are no anomalies', () => {
    render(<AnomalyList anomalies={[]} />);

    expect(screen.getByText('No registration-delay anomalies for this crime type.')).toBeInTheDocument();
  });
});
