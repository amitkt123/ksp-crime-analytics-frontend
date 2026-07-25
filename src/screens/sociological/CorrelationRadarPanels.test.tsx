import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorrelationRadarPanels } from './CorrelationRadarPanels';
import type { DistrictCorrelationResponse } from '../../api/sociologicalApi';

// caseRatePer100k is 10/20/30/40 for these four districts (caseCount/population * 100000).
// literacyRate = caseRatePer100k * 2 -- a perfect positive linear relationship (r = 1),
// which must sort first and be badged "Strongest driver" regardless of the other three.
// unemploymentRate is constant across all districts -- zero x-variance, so its regression
// is null ("not enough data") and it must sort last.
const districts: DistrictCorrelationResponse[] = [
  { districtId: 1, districtName: 'District A', caseCount: 100, population: 1_000_000, literacyRate: 20, unemploymentRate: 5, urbanizationRate: 10, perCapitaIncome: 400 },
  { districtId: 2, districtName: 'District B', caseCount: 200, population: 1_000_000, literacyRate: 40, unemploymentRate: 5, urbanizationRate: 15, perCapitaIncome: 320 },
  { districtId: 3, districtName: 'District C', caseCount: 300, population: 1_000_000, literacyRate: 60, unemploymentRate: 5, urbanizationRate: 25, perCapitaIncome: 250 },
  { districtId: 4, districtName: 'District D', caseCount: 400, population: 1_000_000, literacyRate: 80, unemploymentRate: 5, urbanizationRate: 20, perCapitaIncome: 150 },
];

describe('CorrelationRadarPanels', () => {
  it('renders all four socio-economic indicator panels', () => {
    render(<CorrelationRadarPanels districts={districts} />);

    expect(screen.getByText('Literacy rate')).toBeInTheDocument();
    expect(screen.getByText('Unemployment rate')).toBeInTheDocument();
    expect(screen.getByText('Urbanization rate')).toBeInTheDocument();
    expect(screen.getByText('Per-capita income')).toBeInTheDocument();
  });

  it('sorts panels by |r| descending and badges only the strongest driver', () => {
    const { container } = render(<CorrelationRadarPanels districts={districts} />);

    const labels = Array.from(container.querySelectorAll('.indicator-panel-label')).map((el) => el.textContent);
    expect(labels[0]).toBe('Literacy rate');
    expect(labels[labels.length - 1]).toBe('Unemployment rate');

    expect(screen.getAllByText('Strongest driver')).toHaveLength(1);
    expect(screen.getByText('r = 1.00')).toBeInTheDocument();
  });

  it('shows "not enough data" for an indicator with zero variance across districts', () => {
    render(<CorrelationRadarPanels districts={districts} />);

    expect(screen.getByText('Not enough data for a trend line.')).toBeInTheDocument();
  });

  it('shows a highlight badge naming the selected district on every panel', () => {
    const { container } = render(<CorrelationRadarPanels districts={districts} highlightedDistrictId={1} />);

    const badges = Array.from(container.querySelectorAll('.chip.highlighted'));
    expect(badges).toHaveLength(4);
    expect(badges.every((el) => el.textContent === 'District A')).toBe(true);
  });

  it('shows no highlight badge when highlightedDistrictId is not provided', () => {
    const { container } = render(<CorrelationRadarPanels districts={districts} />);

    expect(container.querySelectorAll('.chip.highlighted')).toHaveLength(0);
  });

  it('shows a fallback message when there are no districts', () => {
    render(<CorrelationRadarPanels districts={[]} />);

    expect(screen.getByText('No district data available.')).toBeInTheDocument();
  });
});
