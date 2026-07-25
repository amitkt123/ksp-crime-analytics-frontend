import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryMixChart } from './CategoryMixChart';
import type { CategorySliceResponse } from '../../api/commandCenterApi';

const sampleMix: CategorySliceResponse[] = [
  { crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 200 },
  { crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 600 },
  { crimeHeadId: 3, crimeGroupName: 'Crimes Against Women', count: 150 },
  { crimeHeadId: 4, crimeGroupName: 'Economic Offences', count: 40 },
  { crimeHeadId: 5, crimeGroupName: 'Cyber Crimes', count: 10 },
];

describe('CategoryMixChart', () => {
  it('renders every category name and count, sorted by count descending', () => {
    render(<CategoryMixChart categoryMix={sampleMix} />);

    const labels = screen.getAllByText(/Crimes|Offences/).map((el) => el.textContent);
    expect(labels.indexOf('Crimes Against Property')).toBeLessThan(labels.indexOf('Crimes Against Body'));
    expect(screen.getAllByText('600')).not.toHaveLength(0);
  });

  it('never assigns the green slot (--cat-1) to Crimes Against Women', () => {
    render(<CategoryMixChart categoryMix={sampleMix} />);

    const womenLegendItem = screen
      .getAllByText('Crimes Against Women')
      .map((el) => el.closest('.cat-legend-item'))
      .find((el): el is HTMLElement => el !== null)!;
    const swatch = womenLegendItem.querySelector('.cat-swatch') as HTMLElement;
    expect(swatch.style.background).not.toBe('var(--cat-1)');
  });
});
