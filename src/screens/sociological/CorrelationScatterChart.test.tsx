import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CorrelationScatterChart } from './CorrelationScatterChart';
import type { DistrictCorrelationResponse } from '../../api/sociologicalApi';

const districts: DistrictCorrelationResponse[] = [
  {
    districtId: 5, districtName: 'Bengaluru Urban', caseCount: 1840, population: 9700000,
    literacyRate: 87.7, unemploymentRate: 4.1, urbanizationRate: 91.0, perCapitaIncome: 341000,
  },
  {
    districtId: 18, districtName: 'Kodagu', caseCount: 265, population: 550000,
    literacyRate: 82.3, unemploymentRate: 2.9, urbanizationRate: 22.4, perCapitaIncome: 210000,
  },
];

describe('CorrelationScatterChart', () => {
  it('defaults the indicator selector to literacy rate', () => {
    render(<CorrelationScatterChart districts={districts} />);

    const select = screen.getByLabelText('Correlation indicator') as HTMLSelectElement;
    expect(select.value).toBe('literacyRate');
  });

  it('lets the user switch the correlated indicator', async () => {
    render(<CorrelationScatterChart districts={districts} />);

    const select = screen.getByLabelText('Correlation indicator') as HTMLSelectElement;
    await userEvent.selectOptions(select, 'unemploymentRate');
    expect(select.value).toBe('unemploymentRate');
  });

  it('offers all four socio-economic indicators', () => {
    render(<CorrelationScatterChart districts={districts} />);

    expect(screen.getByRole('option', { name: 'Literacy rate' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Unemployment rate' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Urbanization rate' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Per-capita income' })).toBeInTheDocument();
  });
});
