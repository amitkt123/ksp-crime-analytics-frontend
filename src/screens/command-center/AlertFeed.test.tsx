import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertFeed } from './AlertFeed';
import type { EmergingAlertResponse } from '../../api/alertsApi';

const alerts: EmergingAlertResponse[] = [
  {
    unitId: 102, unitName: 'Halasuru PS', crimeSubHeadId: 5, crimeSubHeadName: 'Theft',
    currentWeekCount: 20, baselineMean: 4.2, zScore: 3.8,
    explanation: 'Current count 20 is 3.8 standard deviations above the trailing baseline mean 4.2',
  },
];

describe('AlertFeed', () => {
  it('renders the active count and each alert', () => {
    render(<AlertFeed alerts={alerts} />);

    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('Halasuru PS')).toBeInTheDocument();
    expect(screen.getByText('Theft')).toBeInTheDocument();
  });

  it('opens the real EvidencePanel with the clicked alert\'s explanation, and closes it', async () => {
    render(<AlertFeed alerts={alerts} />);

    await userEvent.click(screen.getByText('Halasuru PS'));
    expect(screen.getByText(alerts[0].explanation)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close evidence panel/i }));
    expect(screen.queryByText(alerts[0].explanation)).not.toBeInTheDocument();
  });

  it('shows a plain-voice empty state when there are no alerts', () => {
    render(<AlertFeed alerts={[]} />);
    expect(screen.getByText('No emerging alerts in this window.')).toBeInTheDocument();
  });
});
