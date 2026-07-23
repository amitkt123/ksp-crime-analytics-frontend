import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeatmapGrid, type HeatmapCell } from './HeatmapGrid';

const cells: HeatmapCell[] = [
  { row: 'Aug', col: 'M+0', intensity: 0.1, display: '10%' },
  { row: 'Aug', col: 'M+1', intensity: 0.4, display: '40%' },
];

describe('HeatmapGrid', () => {
  it('renders every row/col label plus each cell\'s display text', () => {
    render(<HeatmapGrid rows={['Aug']} cols={['M+0', 'M+1']} cells={cells} />);
    expect(screen.getByText('Aug')).toBeInTheDocument();
    expect(screen.getByText('M+0')).toBeInTheDocument();
    expect(screen.getByText('M+1')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders an em dash for a row/col pair with no matching cell', () => {
    render(<HeatmapGrid rows={['Aug', 'Sep']} cols={['M+0']} cells={[cells[0]]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
