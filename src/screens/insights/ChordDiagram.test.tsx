import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
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
});
