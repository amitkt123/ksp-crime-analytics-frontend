import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorrelationScatterChart } from './CorrelationScatterChart';
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

describe('CorrelationScatterChart', () => {
  it('renders all four socio-economic indicator panels', () => {
    render(<CorrelationScatterChart districts={districts} />);

    expect(screen.getByText('Literacy rate')).toBeInTheDocument();
    expect(screen.getByText('Unemployment rate')).toBeInTheDocument();
    expect(screen.getByText('Urbanization rate')).toBeInTheDocument();
    expect(screen.getByText('Per-capita income')).toBeInTheDocument();
  });

  it('sorts panels by |r| descending and badges only the strongest driver', () => {
    const { container } = render(<CorrelationScatterChart districts={districts} />);

    const labels = Array.from(container.querySelectorAll('.indicator-scatter-label')).map((el) => el.textContent);
    expect(labels[0]).toBe('Literacy rate');
    expect(labels[labels.length - 1]).toBe('Unemployment rate');

    expect(screen.getAllByText('Strongest driver')).toHaveLength(1);
    expect(screen.getByText('r = 1.00')).toBeInTheDocument();
  });

  it('shows "not enough data" for an indicator with zero variance across districts', () => {
    render(<CorrelationScatterChart districts={districts} />);

    expect(screen.getByText('Not enough data for a trend line.')).toBeInTheDocument();
  });

  it('passes highlightedDistrictId through to every panel', () => {
    render(<CorrelationScatterChart districts={districts} highlightedDistrictId={1} />);

    expect(screen.getAllByText('District A')).toHaveLength(4);
  });

  it('shows no highlight badges when highlightedDistrictId is not provided', () => {
    render(<CorrelationScatterChart districts={districts} />);

    expect(screen.queryByText('District A')).not.toBeInTheDocument();
  });
});
