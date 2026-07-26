import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ChordDiagram } from './ChordDiagram';

describe('ChordDiagram', () => {
  it('renders one arc per label and at least one ribbon for a non-zero matrix', () => {
    const { container } = render(
      <ChordDiagram
        labels={['Head A', 'Head B', 'Act X']}
        matrix={[
          [0, 0, 10],
          [0, 0, 5],
          [10, 5, 0],
        ]}
      />,
    );
    expect(container.querySelectorAll('svg > g > g > path.chord-arc')).toHaveLength(3);
    expect(container.querySelectorAll('svg > g > path.chord-ribbon').length).toBeGreaterThan(0);
  });

  it('shows a value label for each arc', () => {
    const { getByText } = render(
      <ChordDiagram labels={['Head A', 'Head B', 'Act X']} matrix={[[0, 0, 10], [0, 0, 5], [10, 5, 0]]} />,
    );
    expect(getByText('10')).toBeInTheDocument();
  });

  it('fades unrelated ribbons and arcs on hover, and keeps the hovered arc at full opacity', () => {
    const { container } = render(
      <ChordDiagram labels={['Head A', 'Head B', 'Act X']} matrix={[[0, 0, 10], [0, 0, 5], [10, 5, 0]]} />,
    );
    const arcs = container.querySelectorAll('path.chord-arc');
    fireEvent.mouseEnter(arcs[0].parentElement!);
    const ribbons = container.querySelectorAll('path.chord-ribbon');
    const unrelatedRibbon = Array.from(ribbons).find((r) => !r.classList.contains('chord-ribbon-active'));
    expect(unrelatedRibbon).toBeDefined();
    expect(arcs[0]).toHaveClass('chord-arc-active');
  });
});
