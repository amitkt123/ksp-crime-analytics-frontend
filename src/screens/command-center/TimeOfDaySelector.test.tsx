import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeOfDaySelector } from './TimeOfDaySelector';
import type { TimeOfDayBucket } from '../../api/geoApi';

const buckets: TimeOfDayBucket[] = [
  { bucket: 'night', label: 'Night · 12–6 AM', districtCaseCounts: { 1: 40 } },
  { bucket: 'morning', label: 'Morning · 6 AM–12 PM', districtCaseCounts: { 1: 90 } },
  { bucket: 'afternoon', label: 'Afternoon · 12–6 PM', districtCaseCounts: { 1: 90 } },
  { bucket: 'evening', label: 'Evening · 6 PM–12 AM', districtCaseCounts: { 1: 230 } },
];

describe('TimeOfDaySelector', () => {
  it('renders an "All day" option plus one per bucket', () => {
    render(<TimeOfDaySelector buckets={buckets} value="all" onChange={vi.fn()} />);

    expect(screen.getByText('All day')).toBeInTheDocument();
    for (const bucket of buckets) {
      expect(screen.getByText(bucket.label)).toBeInTheDocument();
    }
  });

  it('marks the active option as pressed', () => {
    render(<TimeOfDaySelector buckets={buckets} value="evening" onChange={vi.fn()} />);

    expect(screen.getByText('Evening · 6 PM–12 AM')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('All day')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked bucket key', async () => {
    const onChange = vi.fn();
    render(<TimeOfDaySelector buckets={buckets} value="all" onChange={onChange} />);

    await userEvent.click(screen.getByText('Night · 12–6 AM'));

    expect(onChange).toHaveBeenCalledWith('night');
  });

  it('calls onChange with "all" when the All day option is clicked', async () => {
    const onChange = vi.fn();
    render(<TimeOfDaySelector buckets={buckets} value="evening" onChange={onChange} />);

    await userEvent.click(screen.getByText('All day'));

    expect(onChange).toHaveBeenCalledWith('all');
  });
});
