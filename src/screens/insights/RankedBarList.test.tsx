import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankedBarList } from './RankedBarList';

describe('RankedBarList', () => {
  it('renders items sorted descending by value regardless of input order', () => {
    render(<RankedBarList items={[{ label: 'Low', value: 5 }, { label: 'High', value: 50 }]} />);
    const labels = screen.getAllByText(/Low|High/).map((el) => el.textContent);
    expect(labels.indexOf('High')).toBeLessThan(labels.indexOf('Low'));
  });

  it('applies a custom valueFormatter when provided', () => {
    render(<RankedBarList items={[{ label: 'Rate', value: 71 }]} valueFormatter={(v) => `${v}%`} />);
    expect(screen.getByText('71%')).toBeInTheDocument();
  });
});
