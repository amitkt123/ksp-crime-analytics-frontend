import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  },
];

describe('CaseList', () => {
  it('renders a row per case, linking to its detail page', () => {
    render(
      <MemoryRouter>
        <CaseList cases={cases} />
      </MemoryRouter>,
    );

    expect(screen.getByText('276/2026')).toBeInTheDocument();
    expect(screen.getByText('Chain Snatching')).toBeInTheDocument();
    expect(screen.getByText('Registered')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/case-explorer/176000');
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
