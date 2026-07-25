import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CommandCenterSummaryResponse } from '../../api/commandCenterApi';
import { MetricDetailModal } from './MetricDetailModal';

const summary: CommandCenterSummaryResponse = {
  kpi: {
    stateCaseCount: 58214, stateCaseCountDeltaPct: 4.2, resolvedPct: 41.6,
    resolvedPctDeltaPts: 1.1, topCrimeSubHead: 'Theft — motor vehicle', topCrimeSubHeadCount: 3410,
  },
  stateCaseVolumeWeekly: [
    { isoYear: 2026, isoWeek: 1, count: 1842 },
    { isoYear: 2026, isoWeek: 2, count: 1901 },
  ],
  crimesAgainstPropertyWeekly: [
    { isoYear: 2026, isoWeek: 1, count: 612 },
    { isoYear: 2026, isoWeek: 2, count: 640 },
  ],
  arrestsWeekly: [
    { isoYear: 2026, isoWeek: 1, count: 397 },
    { isoYear: 2026, isoWeek: 2, count: 410 },
  ],
  categoryMix: [{ crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 612 }],
};

describe('MetricDetailModal', () => {
  it('renders nothing when no metric is selected', () => {
    const { container } = render(<MetricDetailModal metricKey={null} summary={summary} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the state case count headline and category mix', () => {
    render(<MetricDetailModal metricKey="case-count" summary={summary} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'State case count' })).toBeInTheDocument();
    expect(screen.getByText('58,214')).toBeInTheDocument();
    expect(screen.getByText(/4\.2% vs\. prior 30 days/)).toBeInTheDocument();
    expect(screen.getAllByText('Crimes Against Property').length).toBeGreaterThan(0);
  });

  it('shows the resolved % headline for that metric key', () => {
    render(<MetricDetailModal metricKey="resolved-pct" summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText('41.6')).toBeInTheDocument();
    expect(screen.getByText(/1\.1 pt vs\. prior 30 days/)).toBeInTheDocument();
  });

  it('shows the top crime sub-head headline for that metric key', () => {
    render(<MetricDetailModal metricKey="top-crime-subhead" summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText('Theft — motor vehicle')).toBeInTheDocument();
    expect(screen.getByText('3,410')).toBeInTheDocument();
  });
});
