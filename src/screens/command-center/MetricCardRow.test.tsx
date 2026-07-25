import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricCardRow } from './MetricCardRow';
import type { KpiResponse, SparklinePointResponse } from '../../api/commandCenterApi';

const kpi: KpiResponse = {
  stateCaseCount: 58214,
  stateCaseCountDeltaPct: 4.2,
  resolvedPct: 41.6,
  resolvedPctDeltaPts: 1.1,
  topCrimeSubHead: 'Theft — motor vehicle',
  topCrimeSubHeadCount: 3410,
};
const rising: SparklinePointResponse[] = [
  { isoYear: 2026, isoWeek: 1, count: 100 },
  { isoYear: 2026, isoWeek: 2, count: 110 },
];
const falling: SparklinePointResponse[] = [
  { isoYear: 2026, isoWeek: 1, count: 200 },
  { isoYear: 2026, isoWeek: 2, count: 180 },
];

describe('MetricCardRow', () => {
  it('renders all 4 cards with real values', () => {
    render(<MetricCardRow kpi={kpi} arrestsWeekly={rising} stateCaseVolumeWeekly={falling} onSelectMetric={vi.fn()} />);

    expect(screen.getByText('State case count')).toBeInTheDocument();
    expect(screen.getByText('58,214')).toBeInTheDocument();
    expect(screen.getByText(/▲ 4\.2/)).toBeInTheDocument();

    expect(screen.getByText('Cases resolved')).toBeInTheDocument();
    expect(screen.getByText('41.6%')).toBeInTheDocument();
    expect(screen.getByText(/▲ 1\.1/)).toBeInTheDocument();

    expect(screen.getByText('Arrests logged, weekly')).toBeInTheDocument();
    expect(screen.getByText('110')).toBeInTheDocument();
    expect(screen.getByText(/▲ 10\.0%/)).toBeInTheDocument();

    expect(screen.getByText('State case volume, weekly')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText(/▼ 10\.0%/)).toBeInTheDocument();
  });

  it('calls onSelectMetric for the state case count and resolved % cards', async () => {
    const onSelectMetric = vi.fn();
    render(<MetricCardRow kpi={kpi} arrestsWeekly={rising} stateCaseVolumeWeekly={falling} onSelectMetric={onSelectMetric} />);

    await userEvent.click(screen.getByText('State case count'));
    expect(onSelectMetric).toHaveBeenCalledWith('case-count');

    await userEvent.click(screen.getByText('Cases resolved'));
    expect(onSelectMetric).toHaveBeenCalledWith('resolved-pct');
  });

  it('does not render the arrests/case-volume cards as buttons (no metric-detail route for them)', () => {
    render(<MetricCardRow kpi={kpi} arrestsWeekly={rising} stateCaseVolumeWeekly={falling} onSelectMetric={vi.fn()} />);

    expect(screen.getByText('Arrests logged, weekly').closest('button')).not.toBeInTheDocument();
    expect(screen.getByText('State case volume, weekly').closest('button')).not.toBeInTheDocument();
  });
});
