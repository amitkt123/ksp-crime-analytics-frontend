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
  it('renders the crimes-against-property card with its label, latest value, and up delta', () => {
    render(<SparklineStrip crimesAgainstPropertyWeekly={rising} />);

    expect(screen.getByText('Crimes against property, weekly')).toBeInTheDocument();
    expect(screen.getByText('110')).toBeInTheDocument();
    expect(screen.getByText(/▲ 10\.0%/)).toBeInTheDocument();
  });

  it('shows a down delta for a falling series', () => {
    render(<SparklineStrip crimesAgainstPropertyWeekly={falling} />);

    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText(/▼ 10\.0%/)).toBeInTheDocument();
  });
});
