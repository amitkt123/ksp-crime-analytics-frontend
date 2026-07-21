import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IndicatorScatterPlot } from './IndicatorScatterPlot';
import { linearRegression } from './linearRegression';

const points = [
  { districtName: 'Bengaluru Urban', x: 87.7, y: 19.0 },
  { districtName: 'Kodagu', x: 82.3, y: 48.2 },
  { districtName: 'Belagavi', x: 79.1, y: 55.0 },
];

describe('IndicatorScatterPlot', () => {
  it('renders the indicator label and its r-value', () => {
    const regression = linearRegression(points.map((p) => ({ x: p.x, y: p.y })));
    render(
      <IndicatorScatterPlot
        label="Literacy rate"
        yLabel="Cases per 100k"
        points={points}
        regression={regression}
        isStrongest={false}
      />,
    );

    expect(screen.getByText('Literacy rate')).toBeInTheDocument();
    expect(screen.getByText(`r = ${regression!.r.toFixed(2)}`)).toBeInTheDocument();
  });

  it('shows a "Strongest driver" badge only when isStrongest is true', () => {
    const regression = linearRegression(points.map((p) => ({ x: p.x, y: p.y })));
    const { rerender } = render(
      <IndicatorScatterPlot
        label="Literacy rate"
        yLabel="Cases per 100k"
        points={points}
        regression={regression}
        isStrongest={true}
      />,
    );
    expect(screen.getByText('Strongest driver')).toBeInTheDocument();

    rerender(
      <IndicatorScatterPlot
        label="Literacy rate"
        yLabel="Cases per 100k"
        points={points}
        regression={regression}
        isStrongest={false}
      />,
    );
    expect(screen.queryByText('Strongest driver')).not.toBeInTheDocument();
  });

  it('shows a "not enough data" message and no r-value when regression is null', () => {
    render(
      <IndicatorScatterPlot
        label="Literacy rate"
        yLabel="Cases per 100k"
        points={[{ districtName: 'Solo District', x: 87.7, y: 19.0 }]}
        regression={null}
        isStrongest={false}
      />,
    );

    expect(screen.getByText('Not enough data for a trend line.')).toBeInTheDocument();
    expect(screen.queryByText(/r = /)).not.toBeInTheDocument();
  });
});
