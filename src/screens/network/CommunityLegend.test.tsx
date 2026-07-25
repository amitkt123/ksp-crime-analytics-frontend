import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityLegend } from './CommunityLegend';
import type { CommunityResponse } from '../../api/networkApi';

const communities: CommunityResponse[] = [
  { communityId: 2, size: 4, memberDisplayNames: ['Suresh Naik', 'Vijay Kumar'] },
  { communityId: 1, size: 2, memberDisplayNames: ['Rakesh Yadav'] },
];

describe('CommunityLegend', () => {
  it('renders node-type labels and one row per community with its size', () => {
    render(<CommunityLegend communities={communities} onSelect={vi.fn()} />);

    expect(screen.getByText('Person')).toBeInTheDocument();
    expect(screen.getByText('Case')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Community 2 · 4')).toBeInTheDocument();
    expect(screen.getByText('Community 1 · 2')).toBeInTheDocument();
  });

  it('calls onSelect with the communityId when a community row is clicked', async () => {
    const onSelect = vi.fn();
    render(<CommunityLegend communities={communities} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Community 2 · 4'));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('renders nothing under "Detected communities" when there are none', () => {
    render(<CommunityLegend communities={[]} onSelect={vi.fn()} />);
    expect(screen.queryByText(/Community/)).not.toBeInTheDocument();
  });

  it('renders a legend row for every relationship type', () => {
    render(<CommunityLegend communities={communities} onSelect={vi.fn()} />);

    expect(screen.getByText('Accused in')).toBeInTheDocument();
    expect(screen.getByText('Arrested by')).toBeInTheDocument();
    expect(screen.getByText('Co-accused with')).toBeInTheDocument();
    expect(screen.getByText('Occurred at')).toBeInTheDocument();
    expect(screen.getByText('Shares MO with')).toBeInTheDocument();
    expect(screen.getByText('Victim in')).toBeInTheDocument();
  });
});
