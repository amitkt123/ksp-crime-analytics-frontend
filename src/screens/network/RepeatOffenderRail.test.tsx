import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepeatOffenderRail } from './RepeatOffenderRail';
import type { RepeatOffenderResponse } from '../../api/networkApi';

const offenders: RepeatOffenderResponse[] = [
  { personId: 5001, displayName: 'Suresh Naik', caseCount: 5, gravityWeight: 15, confidenceScore: 0.83 },
  { personId: 5002, displayName: 'Vijay Kumar', caseCount: 3, gravityWeight: 9, confidenceScore: 0.73 },
];

describe('RepeatOffenderRail', () => {
  it('renders each offender ranked, with display name, case count, and confidence', () => {
    render(<RepeatOffenderRail offenders={offenders} onSelect={vi.fn()} />);

    expect(screen.getByText('Suresh Naik')).toBeInTheDocument();
    expect(screen.getByText('5 linked cases')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
  });

  it('calls onSelect with the numeric personId when a card is clicked', async () => {
    const onSelect = vi.fn();
    render(<RepeatOffenderRail offenders={offenders} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Suresh Naik'));

    expect(onSelect).toHaveBeenCalledWith(5001);
  });

  it('shows an empty state when there are no repeat offenders', () => {
    render(<RepeatOffenderRail offenders={[]} onSelect={vi.fn()} />);
    expect(screen.getByText('No repeat offenders in this scope.')).toBeInTheDocument();
  });
});
