import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkFilterBar } from './NetworkFilterBar';
import type { CommunityResponse, NetworkPathResponse } from '../../api/networkApi';

const communities: CommunityResponse[] = [
  { communityId: 1, size: 4, memberDisplayNames: ['A', 'B', 'C', 'D'] },
  { communityId: 2, size: 3, memberDisplayNames: ['E', 'F', 'G'] },
];

const personOptions = [
  { id: 101, label: 'Suresh Naik' },
  { id: 102, label: 'Vijay Kumar' },
];

function renderBar(overrides: Partial<React.ComponentProps<typeof NetworkFilterBar>> = {}) {
  const props: React.ComponentProps<typeof NetworkFilterBar> = {
    fullDetail: false,
    onToggleFullDetail: vi.fn(),
    showCase: true,
    onToggleShowCase: vi.fn(),
    showLocation: true,
    onToggleShowLocation: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    communities,
    selectedCommunityId: 'all',
    onCommunityChange: vi.fn(),
    personOptions,
    pathFrom: '',
    pathTo: '',
    onPathFromChange: vi.fn(),
    onPathToChange: vi.fn(),
    pathResult: undefined,
    isPathLoading: false,
    isPathError: false,
    onReset: vi.fn(),
    ...overrides,
  };
  return { ...render(<NetworkFilterBar {...props} />), props };
}

describe('NetworkFilterBar', () => {
  it('hides the Show cases/locations checkboxes until Full detail is on', () => {
    renderBar({ fullDetail: false });
    expect(screen.queryByLabelText('Cases')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Locations')).not.toBeInTheDocument();
  });

  it('shows the Show cases/locations checkboxes once Full detail is on', () => {
    renderBar({ fullDetail: true });
    expect(screen.getByLabelText('Cases')).toBeInTheDocument();
    expect(screen.getByLabelText('Locations')).toBeInTheDocument();
  });

  it('calls onToggleFullDetail when the Full detail checkbox is clicked', async () => {
    const { props } = renderBar();
    await userEvent.click(screen.getByLabelText(/Full detail/));
    expect(props.onToggleFullDetail).toHaveBeenCalled();
  });

  it('calls onSearchChange as the user types in the search field', async () => {
    const { props } = renderBar();
    await userEvent.type(screen.getByLabelText('Search'), 'sur');
    expect(props.onSearchChange).toHaveBeenCalled();
  });

  it('lists communities in the Community select, defaulting to All communities', () => {
    renderBar();
    const select = screen.getByLabelText('Community') as HTMLSelectElement;
    expect(select.value).toBe('all');
    expect(screen.getByRole('option', { name: 'Community 1 · 4' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Community 2 · 3' })).toBeInTheDocument();
  });

  it('calls onCommunityChange with the numeric community id when selected', async () => {
    const { props } = renderBar();
    await userEvent.selectOptions(screen.getByLabelText('Community'), 'Community 1 · 4');
    expect(props.onCommunityChange).toHaveBeenCalledWith(1);
  });

  it('lists person names in the Path from / Path to selects', () => {
    renderBar();
    expect(screen.getByLabelText('Path from')).toBeInTheDocument();
    expect(screen.getByLabelText('Path to')).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'Suresh Naik' })).toHaveLength(2);
  });

  it('calls onPathFromChange/onPathToChange with the numeric personId when selected', async () => {
    const { props } = renderBar();
    await userEvent.selectOptions(screen.getByLabelText('Path from'), 'Suresh Naik');
    expect(props.onPathFromChange).toHaveBeenCalledWith(101);
    await userEvent.selectOptions(screen.getByLabelText('Path to'), 'Vijay Kumar');
    expect(props.onPathToChange).toHaveBeenCalledWith(102);
  });

  it('shows nothing about a path result until both endpoints are chosen', () => {
    renderBar({ pathFrom: 101, pathTo: '' });
    expect(screen.queryByText(/hop/)).not.toBeInTheDocument();
  });

  it('shows the hop count and full path once both endpoints are chosen and a path is found', () => {
    const pathResult: NetworkPathResponse = { personIds: [101, 102], displayNames: ['Suresh Naik', 'Vijay Kumar'], hopCount: 1 };
    renderBar({ pathFrom: 101, pathTo: 102, pathResult });
    expect(screen.getByText('1 hop')).toBeInTheDocument();
    expect(screen.getByText(/Suresh Naik.*Vijay Kumar/)).toBeInTheDocument();
  });

  it('shows a "no path found" message when both endpoints are chosen but no path exists', () => {
    renderBar({ pathFrom: 101, pathTo: 102, pathResult: null });
    expect(screen.getByText(/No path found/)).toBeInTheDocument();
  });

  it('calls onReset when the Reset filters button is clicked', async () => {
    const { props } = renderBar();
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(props.onReset).toHaveBeenCalled();
  });
});
