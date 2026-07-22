import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IndicatorScatterPlot, splitHighlightedPoint } from './IndicatorScatterPlot';
import { linearRegression } from './linearRegression';

const points = [
  { districtId: 5, districtName: 'Bengaluru Urban', x: 87.7, y: 19.0 },
  { districtId: 18, districtName: 'Kodagu', x: 82.3, y: 48.2 },
  { districtId: 3, districtName: 'Belagavi', x: 79.1, y: 55.0 },
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
        points={[{ districtId: 99, districtName: 'Solo District', x: 87.7, y: 19.0 }]}
        regression={null}
        isStrongest={false}
      />,
    );

    expect(screen.getByText('Not enough data for a trend line.')).toBeInTheDocument();
    expect(screen.queryByText(/r = /)).not.toBeInTheDocument();
  });

  it('shows a badge naming the highlighted district when highlightedDistrictId matches a point', () => {
    const regression = linearRegression(points.map((p) => ({ x: p.x, y: p.y })));
    render(
      <IndicatorScatterPlot
        label="Literacy rate"
        yLabel="Cases per 100k"
        points={points}
        regression={regression}
        isStrongest={false}
        highlightedDistrictId={18}
      />,
    );

    expect(screen.getByText('Kodagu')).toBeInTheDocument();
  });

  it('shows no highlight badge when highlightedDistrictId is null or matches no point', () => {
    const regression = linearRegression(points.map((p) => ({ x: p.x, y: p.y })));
    const { rerender } = render(
      <IndicatorScatterPlot
        label="Literacy rate"
        yLabel="Cases per 100k"
        points={points}
        regression={regression}
        isStrongest={false}
        highlightedDistrictId={null}
      />,
    );
    expect(screen.queryByText('Kodagu')).not.toBeInTheDocument();

    rerender(
      <IndicatorScatterPlot
        label="Literacy rate"
        yLabel="Cases per 100k"
        points={points}
        regression={regression}
        isStrongest={false}
        highlightedDistrictId={999}
      />,
    );
    expect(screen.queryByText('Bengaluru Urban')).not.toBeInTheDocument();
    expect(screen.queryByText('Kodagu')).not.toBeInTheDocument();
    expect(screen.queryByText('Belagavi')).not.toBeInTheDocument();
  });
});

describe('splitHighlightedPoint', () => {
  it('separates the matching point from the rest', () => {
    const result = splitHighlightedPoint(points, 18);
    expect(result.highlighted).toEqual(points[1]);
    expect(result.base).toEqual([points[0], points[2]]);
  });

  it('returns everything as base and null highlighted when nothing matches', () => {
    expect(splitHighlightedPoint(points, 999)).toEqual({ base: points, highlighted: null });
    expect(splitHighlightedPoint(points, null)).toEqual({ base: points, highlighted: null });
    expect(splitHighlightedPoint(points, undefined)).toEqual({ base: points, highlighted: null });
  });
});
