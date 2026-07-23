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

  it('uses dark text on low-intensity (light) cells and light text on high-intensity (dark) cells', () => {
    const { container } = render(
      <HeatmapGrid
        rows={['R1']}
        cols={['C1', 'C2']}
        cells={[
          { row: 'R1', col: 'C1', intensity: 0.1, display: 'low' },
          { row: 'R1', col: 'C2', intensity: 0.9, display: 'high' },
        ]}
      />,
    );
    const heatmapCells = container.querySelectorAll('.heatmap-cell');
    expect(heatmapCells[0]).toHaveStyle({ color: 'var(--text)' });
    expect(heatmapCells[1]).toHaveStyle({ color: '#ffffff' });
  });
});
