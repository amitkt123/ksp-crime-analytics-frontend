import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as networkApiModule from '../../api/networkApi';
import { NetworkScreen } from './NetworkScreen';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<T, Error>;
}

const subgraph: networkApiModule.SubgraphResponse = {
  nodes: [{ id: '5001', type: 'PERSON', label: 'Suresh Naik', confidence: 0.83 }],
  edges: [],
  generatedAt: '2026-07-19T06:00:00Z',
};

const offenders: networkApiModule.RepeatOffenderResponse[] = [
  { personId: 5001, displayName: 'Suresh Naik', caseCount: 3, gravityWeight: 9, confidenceScore: 0.73 },
];

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(
    mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
  );
}

function mockNetworkQueries(overrides: Partial<{ subgraph: UseQueryResult<networkApiModule.SubgraphResponse, Error> }> = {}) {
  vi.spyOn(networkApiModule, 'useSubgraph').mockReturnValue(overrides.subgraph ?? mockSuccess(subgraph));
  vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(mockSuccess(offenders));
  vi.spyOn(networkApiModule, 'useCommunities').mockReturnValue(mockSuccess([{ communityId: 2, size: 1, memberDisplayNames: ['Suresh Naik'] }]));
  vi.spyOn(networkApiModule, 'useNetworkPath').mockReturnValue(mockSuccess(null));
}

describe('NetworkScreen', () => {
  it('renders the graph once loaded, defaulting to top-offenders focus', async () => {
    mockAuth();
    mockNetworkQueries();

    render(<NetworkScreen />);

    expect(await screen.findByLabelText('Suresh Naik')).toBeInTheDocument();
    expect(networkApiModule.useSubgraph).toHaveBeenCalledWith('jwt', { focus: 'top-offenders', limit: 10 });
  });

  it('shows the loading skeleton while the subgraph is loading', () => {
    mockAuth();
    mockNetworkQueries({
      subgraph: { data: undefined, isLoading: true, isError: false, isSuccess: false, refetch: vi.fn() } as unknown as UseQueryResult<
        networkApiModule.SubgraphResponse,
        Error
      >,
    });

    render(<NetworkScreen />);

    expect(screen.getByLabelText('Loading network graph')).toBeInTheDocument();
  });

  it('shows an alert and retry button when the subgraph query fails', () => {
    mockAuth();
    mockNetworkQueries({
      subgraph: { data: undefined, isLoading: false, isError: true, isSuccess: false, refetch: vi.fn() } as unknown as UseQueryResult<
        networkApiModule.SubgraphResponse,
        Error
      >,
    });

    render(<NetworkScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the network");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows an empty-focus message when the subgraph has no nodes', async () => {
    mockAuth();
    mockNetworkQueries({ subgraph: mockSuccess({ nodes: [], edges: [], generatedAt: '2026-07-19T06:00:00Z' }) });

    render(<NetworkScreen />);

    expect(await screen.findByText('No linked records for this view.')).toBeInTheDocument();
  });

  it('clicking the repeat-offender rail card switches focus to that person and opens the evidence panel', async () => {
    mockAuth();
    mockNetworkQueries();

    render(<NetworkScreen />);
    await userEvent.click(await screen.findByText('Suresh Naik'));

    expect(await screen.findByRole('dialog', { name: 'Evidence panel' })).toBeInTheDocument();
    await waitFor(() => expect(networkApiModule.useSubgraph).toHaveBeenLastCalledWith('jwt', { focus: 'person', personId: 5001, hops: 2 }));
  });

  it('clicking a community legend row switches focus to that community', async () => {
    mockAuth();
    mockNetworkQueries();

    render(<NetworkScreen />);
    await userEvent.click(await screen.findByText('Community 2 · 1'));

    await waitFor(() => expect(networkApiModule.useSubgraph).toHaveBeenLastCalledWith('jwt', { focus: 'community', communityId: 2 }));
  });

  it('toggling path mode and clicking two people queries useNetworkPath with both ids and switches focus to path', async () => {
    mockAuth();
    mockNetworkQueries({
      subgraph: mockSuccess({
        nodes: [
          ...subgraph.nodes,
          { id: '5002', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.73 },
        ],
        edges: [],
        generatedAt: '2026-07-19T06:00:00Z',
      }),
    });

    render(<NetworkScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Toggle path-finding mode' }));
    await userEvent.click(await screen.findByLabelText('Suresh Naik'));
    await userEvent.click(screen.getByLabelText('Vijay Kumar'));

    await waitFor(() => expect(networkApiModule.useNetworkPath).toHaveBeenLastCalledWith('jwt', 5001, 5002, 6));
    await waitFor(() => expect(networkApiModule.useSubgraph).toHaveBeenLastCalledWith('jwt', { focus: 'path', from: 5001, to: 5002, maxHops: 6 }));
  });
});
