import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('renders state case count, resolved %, and top crime sub-head with up-deltas', () => {
    render(<KpiPanel kpi={sampleKpi} />);

    expect(screen.getByText('58,214')).toBeInTheDocument();
    expect(screen.getByText(/4\.2% vs\. prior 30 days/)).toBeInTheDocument();
    expect(screen.getByText('41.6')).toBeInTheDocument();
    expect(screen.getByText(/1\.1 pt vs\. prior 30 days/)).toBeInTheDocument();
    expect(screen.getByText('Theft — motor vehicle')).toBeInTheDocument();
    expect(screen.getByText('3,410')).toBeInTheDocument();
  });

  it('shows a down arrow when a delta is negative', () => {
    render(<KpiPanel kpi={{ ...sampleKpi, stateCaseCountDeltaPct: -2.5 }} />);

    expect(screen.getByText(/▼ 2\.5% vs\. prior 30 days/)).toBeInTheDocument();
  });
});
