import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KpiPanel } from './KpiPanel';
import type { KpiResponse } from '../../api/commandCenterApi';

const sampleKpi: KpiResponse = {
  stateCaseCount: 58214,
  stateCaseCountDeltaPct: 4.2,
  resolvedPct: 41.6,
  resolvedPctDeltaPts: 1.1,
  topCrimeSubHead: 'Theft — motor vehicle',
  topCrimeSubHeadCount: 3410,
};

describe('KpiPanel', () => {
  it('renders state case count and resolved % with up-deltas', () => {
    render(<KpiPanel kpi={sampleKpi} />);

    expect(screen.getByText('58,214')).toBeInTheDocument();
    expect(screen.getByText(/4\.2% vs\. prior 30 days/)).toBeInTheDocument();
    expect(screen.getByText('41.6')).toBeInTheDocument();
    expect(screen.getByText(/1\.1 pt vs\. prior 30 days/)).toBeInTheDocument();
  });

  it('shows a down arrow when a delta is negative', () => {
    render(<KpiPanel kpi={{ ...sampleKpi, stateCaseCountDeltaPct: -2.5 }} />);

    expect(screen.getByText(/▼ 2\.5% vs\. prior 30 days/)).toBeInTheDocument();
  });

  it('defaults the first tile label to "State case count"', () => {
    render(<KpiPanel kpi={sampleKpi} />);

    expect(screen.getByText('State case count')).toBeInTheDocument();
  });

  it('renders a custom scope label when provided', () => {
    render(<KpiPanel kpi={sampleKpi} scopeLabel="District case count" />);

    expect(screen.getByText('District case count')).toBeInTheDocument();
    expect(screen.queryByText('State case count')).not.toBeInTheDocument();
  });

  it('renders plain tiles (no buttons) when onSelectMetric is not provided', () => {
    render(<KpiPanel kpi={sampleKpi} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onSelectMetric with the clicked tile\'s metric key', async () => {
    const onSelectMetric = vi.fn();
    render(<KpiPanel kpi={sampleKpi} onSelectMetric={onSelectMetric} />);

    await userEvent.click(screen.getByText('State case count').closest('button')!);
    expect(onSelectMetric).toHaveBeenCalledWith('case-count');

    await userEvent.click(screen.getByText('Cases resolved').closest('button')!);
    expect(onSelectMetric).toHaveBeenCalledWith('resolved-pct');
  });
});
