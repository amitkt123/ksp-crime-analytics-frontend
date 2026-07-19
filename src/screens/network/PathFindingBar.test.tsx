import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PathFindingBar } from './PathFindingBar';
import type { NetworkPathResponse } from '../../api/networkApi';

describe('PathFindingBar', () => {
  it('shows "Off" and calls onToggle when the toggle is clicked', async () => {
    const onToggle = vi.fn();
    render(
      <PathFindingBar
        pathMode={false}
        onToggle={onToggle}
        pathEndpoints={[]}
        pathResult={undefined}
        isPathLoading={false}
        isPathError={false}
      />,
    );

    expect(screen.getByText('Off')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toggle path-finding mode' }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('prompts to click two people once path mode is on', () => {
    render(
      <PathFindingBar
        pathMode={true}
        onToggle={vi.fn()}
        pathEndpoints={[]}
        pathResult={undefined}
        isPathLoading={false}
        isPathError={false}
      />,
    );
    expect(screen.getByText('Click two people')).toBeInTheDocument();
  });

  it('shows the hop count and name chain once a path resolves', () => {
    const pathResult: NetworkPathResponse = {
      personIds: [5001, 5002],
      displayNames: ['Suresh Naik', 'Vijay Kumar'],
      hopCount: 1,
    };
    render(
      <PathFindingBar
        pathMode={true}
        onToggle={vi.fn()}
        pathEndpoints={[5001, 5002]}
        pathResult={pathResult}
        isPathLoading={false}
        isPathError={false}
      />,
    );
    expect(screen.getByText('1 hop')).toBeInTheDocument();
    expect(screen.getByText(/Suresh Naik → Vijay Kumar/)).toBeInTheDocument();
  });

  it('shows a "no path found" message when the path result is null', () => {
    render(
      <PathFindingBar
        pathMode={true}
        onToggle={vi.fn()}
        pathEndpoints={[5001, 5002]}
        pathResult={null}
        isPathLoading={false}
        isPathError={false}
      />,
    );
    expect(screen.getByText('No path found within 6 hops.')).toBeInTheDocument();
  });
});
