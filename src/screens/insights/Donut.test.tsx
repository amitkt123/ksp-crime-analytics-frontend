import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Donut } from './Donut';

describe('Donut', () => {
  it('renders the total in the center and every slice label with its percentage', () => {
    render(<Donut slices={[{ label: 'Heinous', value: 30 }, { label: 'Non-Heinous', value: 70 }]} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/Heinous \(30%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Non-Heinous \(70%\)/)).toBeInTheDocument();
  });

  it('renders 0% slices without dividing by zero when total is 0', () => {
    render(<Donut slices={[{ label: 'Empty', value: 0 }]} />);
    expect(screen.getByText(/Empty \(0%\)/)).toBeInTheDocument();
  });
});
