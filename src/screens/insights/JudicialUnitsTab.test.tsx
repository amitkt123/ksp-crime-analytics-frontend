import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JudicialUnitsTab } from './JudicialUnitsTab';

describe('JudicialUnitsTab', () => {
  it('renders all 5 cards, every one tagged as demo data', () => {
    render(<JudicialUnitsTab />);

    const titles = [
      'Court-wise Pending Cases', 'Final Report Outcome', 'District → Unit Case Load',
      'Employee Rank Distribution', 'Unit Performance',
    ];
    titles.forEach((title) => {
      const card = screen.getByText(title).closest('.insight-card')!;
      expect(card.querySelector('.chip.predicted')).not.toBeNull();
    });
  });

  it('renders the treemap-style district/unit breakdown and the unit performance table', () => {
    render(<JudicialUnitsTab />);
    expect(screen.getAllByText('Whitefield PS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bengaluru Urban').length).toBeGreaterThan(0);
  });
});
