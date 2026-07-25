import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IndicatorRadarChart, type RadarAxisPoint } from './IndicatorRadarChart';
import { linearRegression } from './linearRegression';

const points: RadarAxisPoint[] = [
  { districtId: 5, districtName: 'Bengaluru Urban', value: 87.7, rawValue: 87.7 },
  { districtId: 18, districtName: 'Kodagu', value: 82.3, rawValue: 82.3 },
  { districtId: 3, districtName: 'Belagavi', value: 79.1, rawValue: 79.1 },
];
const regressionInput = [
  { x: 87.7, y: 19.0 },
  { x: 82.3, y: 48.2 },
  { x: 79.1, y: 55.0 },
];

describe('IndicatorRadarChart', () => {
  it('renders the indicator label and its r-value', () => {
    const regression = linearRegression(regressionInput);
    render(
      <IndicatorRadarChart
        label="Literacy rate"
        yLabel="Cases per 100k"
        color="var(--indicator-3)"
        points={points}
        regression={regression}
        isStrongest={false}
      />,
    );

    expect(screen.getByText('Literacy rate')).toBeInTheDocument();
    expect(screen.getByText(`r = ${regression!.r.toFixed(2)}`)).toBeInTheDocument();
  });

  it('shows a "Strongest driver" badge only when isStrongest is true', () => {
    const regression = linearRegression(regressionInput);
    const { rerender } = render(
      <IndicatorRadarChart
        label="Literacy rate"
        yLabel="Cases per 100k"
        color="var(--indicator-3)"
        points={points}
        regression={regression}
        isStrongest={true}
      />,
    );
    expect(screen.getByText('Strongest driver')).toBeInTheDocument();

    rerender(
      <IndicatorRadarChart
        label="Literacy rate"
        yLabel="Cases per 100k"
        color="var(--indicator-3)"
        points={points}
        regression={regression}
        isStrongest={false}
      />,
    );
    expect(screen.queryByText('Strongest driver')).not.toBeInTheDocument();
  });

  it('shows a "not enough data" message and no r-value when regression is null', () => {
    render(
      <IndicatorRadarChart
        label="Literacy rate"
        yLabel="Cases per 100k"
        color="var(--indicator-3)"
        points={points}
        regression={null}
        isStrongest={false}
      />,
    );

    expect(screen.getByText('Not enough data for a trend line.')).toBeInTheDocument();
    expect(screen.queryByText(/r = /)).not.toBeInTheDocument();
  });

  it('shows a badge naming the highlighted district when provided', () => {
    const regression = linearRegression(regressionInput);
    const { container } = render(
      <IndicatorRadarChart
        label="Literacy rate"
        yLabel="Cases per 100k"
        color="var(--indicator-3)"
        points={points}
        regression={regression}
        isStrongest={false}
        highlightedDistrictId={18}
        highlightedDistrictName="Kodagu"
      />,
    );

    const badge = container.querySelector('.chip.highlighted');
    expect(badge).toHaveTextContent('Kodagu');
  });

  it('shows no highlight badge when highlightedDistrictName is null', () => {
    const regression = linearRegression(regressionInput);
    const { container } = render(
      <IndicatorRadarChart
        label="Literacy rate"
        yLabel="Cases per 100k"
        color="var(--indicator-3)"
        points={points}
        regression={regression}
        isStrongest={false}
        highlightedDistrictName={null}
      />,
    );

    expect(container.querySelector('.chip.highlighted')).not.toBeInTheDocument();
  });

  it('shows a placeholder message instead of a chart when there are no points', () => {
    const regression = linearRegression(regressionInput);
    render(
      <IndicatorRadarChart
        label="Literacy rate"
        yLabel="Cases per 100k"
        color="var(--indicator-3)"
        points={[]}
        regression={regression}
        isStrongest={false}
      />,
    );

    expect(screen.getByText('No district data to plot.')).toBeInTheDocument();
  });
});
