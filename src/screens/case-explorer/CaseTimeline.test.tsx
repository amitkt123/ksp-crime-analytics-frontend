import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseTimeline } from './CaseTimeline';
import type { CaseTimelineEntryResponse } from '../../api/caseApi';

// Deliberately out of order to prove the component re-sorts chronologically.
const entries: CaseTimelineEntryResponse[] = [
  { status: 'closed', timestamp: '2026-06-16', note: 'Case closed.' },
  { status: 'registered', timestamp: '2026-05-26', note: 'FIR registered.' },
  { status: 'under_investigation', timestamp: '2026-05-29', note: 'Investigation taken up by the station.' },
];

describe('CaseTimeline', () => {
  it('renders entries in chronological order regardless of input order', () => {
    render(<CaseTimeline entries={entries} />);

    const timestamps = screen.getAllByText(/2026-\d{2}-\d{2}/).map((el) => el.textContent);
    expect(timestamps).toEqual(['2026-05-26', '2026-05-29', '2026-06-16']);
  });

  it('marks the most recent entry as current and shows its note by default', () => {
    render(<CaseTimeline entries={entries} />);

    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Case closed.')).toBeInTheDocument();
  });

  it('keeps earlier entries collapsed until clicked', async () => {
    render(<CaseTimeline entries={entries} />);

    expect(screen.queryByText('FIR registered.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('2026-05-26'));

    expect(screen.getByText('FIR registered.')).toBeInTheDocument();
  });

  it('shows the day gap between consecutive steps', () => {
    render(<CaseTimeline entries={entries} />);

    expect(screen.getByText('+3 days')).toBeInTheDocument(); // 2026-05-26 -> 2026-05-29
    expect(screen.getByText('+18 days')).toBeInTheDocument(); // 2026-05-29 -> 2026-06-16
  });

  it('shows a placeholder when there are no timeline entries', () => {
    render(<CaseTimeline entries={[]} />);

    expect(screen.getByText('No timeline entries yet.')).toBeInTheDocument();
  });
});
