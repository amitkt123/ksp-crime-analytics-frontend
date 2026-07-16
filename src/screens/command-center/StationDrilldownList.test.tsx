import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StationDrilldownList } from './StationDrilldownList';
import type { StationSummaryResponse } from '../../api/geoApi';

const stations: StationSummaryResponse[] = [
  { unitId: 101, unitName: 'Cubbon Park PS', caseCount: 40 },
  { unitId: 102, unitName: 'Halasuru PS', caseCount: 120 },
];

describe('StationDrilldownList', () => {
  it('renders the district breadcrumb and stations sorted by case count descending', () => {
    render(<StationDrilldownList districtName="Bengaluru Urban" stations={stations} onBack={vi.fn()} />);

    expect(screen.getByText('Bengaluru Urban')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem').map((el) => el.textContent);
    expect(rows[0]).toContain('Halasuru PS');
    expect(rows[1]).toContain('Cubbon Park PS');
  });

  it('calls onBack when the breadcrumb "State" link is clicked', async () => {
    const onBack = vi.fn();
    render(<StationDrilldownList districtName="Bengaluru Urban" stations={stations} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: 'State' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows a plain-voice empty state when the district has no stations with cases', () => {
    render(<StationDrilldownList districtName="Bengaluru Urban" stations={[]} onBack={vi.fn()} />);
    expect(screen.getByText('No stations with cases in this district.')).toBeInTheDocument();
  });
});
