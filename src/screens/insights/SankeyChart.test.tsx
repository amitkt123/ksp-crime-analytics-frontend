import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SankeyChart } from './SankeyChart';

describe('SankeyChart', () => {
  it('renders one rect per node and one path per link', () => {
    const { container } = render(
      <SankeyChart
        nodeLabels={['Registered', 'Chargesheeted', 'Undetected']}
        links={[
          { source: 0, target: 1, value: 80 },
          { source: 0, target: 2, value: 20 },
        ]}
      />,
    );
    expect(container.querySelectorAll('svg > g:first-of-type > path')).toHaveLength(2);
    expect(container.querySelectorAll('svg > g:last-of-type > g > rect')).toHaveLength(3);
  });

  it('colors each link by its target node, not its source', () => {
    const { container } = render(
      <SankeyChart
        nodeLabels={['Registered', 'Chargesheeted', 'Undetected']}
        links={[
          { source: 0, target: 1, value: 80 },
          { source: 0, target: 2, value: 20 },
        ]}
      />,
    );
    const paths = container.querySelectorAll('svg > g:first-of-type > path');
    expect(paths[0]).toHaveAttribute('stroke', 'var(--cat-2)');
    expect(paths[1]).toHaveAttribute('stroke', 'var(--cat-3)');
  });
});
