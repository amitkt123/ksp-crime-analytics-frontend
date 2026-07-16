import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SparklineStrip } from './SparklineStrip';
import type { SparklinePointResponse } from '../../api/commandCenterApi';

const rising: SparklinePointResponse[] = [
  { isoYear: 2026, isoWeek: 1, count: 100 },
  { isoYear: 2026, isoWeek: 2, count: 110 },
];
const falling: SparklinePointResponse[] = [
  { isoYear: 2026, isoWeek: 1, count: 200 },
  { isoYear: 2026, isoWeek: 2, count: 180 },
];

describe('SparklineStrip', () => {
  it('renders all 3 cards with their labels, latest values, and delta direction', () => {
    render(
      <SparklineStrip
        stateCaseVolumeWeekly={rising}
        crimesAgainstPropertyWeekly={falling}
        arrestsWeekly={rising}
      />,
    );

    expect(screen.getByText('State case volume, weekly')).toBeInTheDocument();
    expect(screen.getByText('Crimes against property, weekly')).toBeInTheDocument();
    expect(screen.getByText('Arrests logged, weekly')).toBeInTheDocument();

    // rising series (100 -> 110): latest value 110, +10.0% up
    expect(screen.getAllByText('110')).toHaveLength(2); // stateCaseVolumeWeekly + arrestsWeekly
    expect(screen.getAllByText(/▲ 10\.0%/)).toHaveLength(2);

    // falling series (200 -> 180): latest value 180, -10.0% down
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText(/▼ 10\.0%/)).toBeInTheDocument();
  });
});
