import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('filters the treemap and its breakdown table to a single district, and Reset restores all districts', async () => {
    render(<JudicialUnitsTab />);
    const card = screen.getByText('District → Unit Case Load').closest('.insight-card') as HTMLElement;

    await userEvent.selectOptions(within(card).getByLabelText('Filter by district'), 'Mysuru');

    expect(within(card).queryByText('Whitefield PS')).not.toBeInTheDocument();
    expect(within(card).getAllByText(/Mysuru/).length).toBeGreaterThan(0);

    await userEvent.click(within(card).getByRole('button', { name: 'Reset' }));

    expect(within(card).getAllByText('Whitefield PS').length).toBeGreaterThan(0);
    expect((within(card).getByLabelText('Filter by district') as HTMLSelectElement).value).toBe('');
  });
});
