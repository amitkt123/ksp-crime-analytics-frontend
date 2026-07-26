import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { KpiResponse, CategorySliceResponse, SparklinePointResponse } from '../../api/commandCenterApi';
import { MetricDetailModal } from './MetricDetailModal';

const kpi: KpiResponse = {
  stateCaseCount: 58214, stateCaseCountDeltaPct: 4.2, resolvedPct: 41.6,
  resolvedPctDeltaPts: 1.1, topCrimeSubHead: 'Theft — motor vehicle', topCrimeSubHeadCount: 3410,
};
const caseVolumeWeekly: SparklinePointResponse[] = [
  { isoYear: 2026, isoWeek: 1, count: 1842 },
  { isoYear: 2026, isoWeek: 2, count: 1901 },
];
const arrestsWeekly: SparklinePointResponse[] = [
  { isoYear: 2026, isoWeek: 1, count: 397 },
  { isoYear: 2026, isoWeek: 2, count: 410 },
];
const categoryMix: CategorySliceResponse[] = [{ crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 612 }];

const baseProps = { kpi, categoryMix, caseVolumeWeekly, arrestsWeekly, onClose: vi.fn() };

describe('MetricDetailModal', () => {
  it('renders nothing when no metric is selected', () => {
    const { container } = render(<MetricDetailModal metricKey={null} scope="state" {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the state case count headline and category mix', () => {
    render(<MetricDetailModal metricKey="case-count" scope="state" {...baseProps} />);

    expect(screen.getByRole('dialog', { name: 'State case count' })).toBeInTheDocument();
    expect(screen.getByText('58,214')).toBeInTheDocument();
    expect(screen.getByText(/4\.2% vs\. prior 30 days/)).toBeInTheDocument();
    expect(screen.getAllByText('Crimes Against Property').length).toBeGreaterThan(0);
  });

  it('shows the district case count headline when scoped to a district', () => {
    render(<MetricDetailModal metricKey="case-count" scope="district" {...baseProps} />);

    expect(screen.getByRole('dialog', { name: 'District case count' })).toBeInTheDocument();
    expect(screen.getByText('District case volume vs. arrests, weekly')).toBeInTheDocument();
  });

  it('shows the resolved % headline for that metric key', () => {
    render(<MetricDetailModal metricKey="resolved-pct" scope="state" {...baseProps} />);

    expect(screen.getByText('41.6')).toBeInTheDocument();
    expect(screen.getByText(/1\.1 pt vs\. prior 30 days/)).toBeInTheDocument();
  });

  it('shows the top crime sub-head headline for that metric key', () => {
    render(<MetricDetailModal metricKey="top-crime-subhead" scope="state" {...baseProps} />);

    expect(screen.getByText('Theft — motor vehicle')).toBeInTheDocument();
    expect(screen.getByText('3,410')).toBeInTheDocument();
  });
});
