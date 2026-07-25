import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaseList } from './CaseList';
import type { CaseSummaryResponse } from '../../api/caseApi';

const cases: CaseSummaryResponse[] = [
  {
    caseId: 176000,
    caseNumber: '276/2026',
    unitId: 176,
    unitName: 'Whitefield PS',
    crimeSubHeadId: 103,
    crimeSubHeadName: 'Chain Snatching',
    status: 'registered',
    firDate: '2026-05-26',
    crimeNumber: 'FIR-2026-KA-17600',
    station: 'Whitefield PS',
    district: 'Bengaluru Urban',
    gravity: 'serious',
  },
];

describe('CaseList', () => {
  it('renders a table row per case with the mockup-parity columns', () => {
    render(
      <MemoryRouter>
        <CaseList cases={cases} />
      </MemoryRouter>,
    );

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByText('FIR-2026-KA-17600')).toBeInTheDocument();
    expect(within(row).getByText('276/2026')).toBeInTheDocument();
    expect(within(row).getByText('Bengaluru Urban')).toBeInTheDocument();
    expect(within(row).getByText('Chain Snatching')).toBeInTheDocument();
    expect(within(row).getByText('Serious')).toBeInTheDocument();
    expect(within(row).getByText('Registered')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/case-explorer/176000');
  });

  it('falls back to an em dash for fields the backend has not returned yet', () => {
    const minimalCase: CaseSummaryResponse = {
      caseId: 177000,
      caseNumber: '99/2026',
      unitId: 177,
      unitName: 'Yeshwanthpur PS',
      crimeSubHeadId: 101,
      crimeSubHeadName: 'Theft of Motor Vehicle',
      status: 'closed',
      firDate: '2026-04-01',
    };

    render(
      <MemoryRouter>
        <CaseList cases={[minimalCase]} />
      </MemoryRouter>,
    );

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getAllByText('—')).toHaveLength(3); // crime no. + district + gravity
    expect(within(row).getByText('Yeshwanthpur PS')).toBeInTheDocument(); // station falls back to unitName
  });

  it('shows an empty state when there are no cases', () => {
    render(
      <MemoryRouter>
        <CaseList cases={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText('No cases match these filters.')).toBeInTheDocument();
  });
});
