import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemographicsTab } from './DemographicsTab';

describe('DemographicsTab', () => {
  it('renders all 11 cards, every one tagged as demo data', () => {
    render(<DemographicsTab />);

    const titles = [
      'Victim Gender', 'Accused Gender', 'Complainant Gender',
      'Age Distribution — Victims vs Accused', 'Complainant Religion', 'Complainant Caste Category',
      'Complainant Occupation', 'Accused Religion', 'Accused Caste Category', 'Accused Occupation',
      'Victim Gender × Crime Head Cross-tab',
    ];
    titles.forEach((title) => {
      const card = screen.getByText(title).closest('.insight-card')!;
      expect(card.querySelector('.chip.predicted')).not.toBeNull();
    });
  });

  it('renders the cross-tab table with one row per demo crime head', () => {
    render(<DemographicsTab />);
    expect(screen.getByText('Crimes Against Women')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
  });
});
