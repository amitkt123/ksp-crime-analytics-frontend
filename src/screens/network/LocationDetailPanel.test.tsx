import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { GraphEdgeResponse, GraphNodeResponse } from '../../api/networkApi';
import { LocationDetailPanel } from './LocationDetailPanel';

const locationNode: GraphNodeResponse = {
  id: '7001', type: 'LOCATION', label: 'MG Road Metro Station', confidence: null,
  crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null,
  moKeywordTags: null, locationKey: 'MG_ROAD_METRO', latitude: 12.9758, longitude: 77.6065,
};

const caseNodeA: GraphNodeResponse = {
  id: '9001', type: 'CASE', label: '144/2026', confidence: null,
  crimeNo: 'FIR-144', caseNo: '144/2026', crimeRegisteredDate: '2026-06-01', gravityWeight: 8,
  moKeywordTags: null, locationKey: null, latitude: null, longitude: null,
};

const personNodeA: GraphNodeResponse = {
  id: '5001', type: 'PERSON', label: 'Suresh Naik', confidence: 0.83,
  crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null,
  moKeywordTags: null, locationKey: null, latitude: null, longitude: null,
};

const personNodeB: GraphNodeResponse = {
  id: '5002', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.61,
  crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null,
  moKeywordTags: null, locationKey: null, latitude: null, longitude: null,
};

const edges: GraphEdgeResponse[] = [
  { id: 'e1', sourceId: '9001', targetId: '7001', type: 'OCCURRED_AT', confidence: null, sharedCaseLabel: null },
  { id: 'e2', sourceId: '5001', targetId: '7001', type: 'ARRESTED_BY', confidence: null, sharedCaseLabel: null },
  { id: 'e3', sourceId: '5002', targetId: '7001', type: 'ARRESTED_BY', confidence: null, sharedCaseLabel: null },
];

describe('LocationDetailPanel', () => {
  it('renders nothing when node is null', () => {
    render(
      <MemoryRouter>
        <LocationDetailPanel node={null} nodes={[]} edges={[]} onClose={vi.fn()} onFocus={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('computes connected case/person counts and lists connected case labels', () => {
    render(
      <MemoryRouter>
        <LocationDetailPanel
          node={locationNode}
          nodes={[locationNode, caseNodeA, personNodeA, personNodeB]}
          edges={edges}
          onClose={vi.fn()}
          onFocus={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog', { name: 'MG Road Metro Station' })).toBeInTheDocument();
    expect(screen.getByText('12.9758, 77.6065')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: '144/2026' })).toHaveAttribute('href', '/case-explorer/9001');
  });

  it('shows an empty state when no edges reference the node', () => {
    render(
      <MemoryRouter>
        <LocationDetailPanel node={locationNode} nodes={[locationNode]} edges={[]} onClose={vi.fn()} onFocus={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('No connections in the current view.')).toBeInTheDocument();
  });

  it('fires onFocus with the location id when "Focus on Location" is clicked', async () => {
    const onFocus = vi.fn();
    render(
      <MemoryRouter>
        <LocationDetailPanel
          node={locationNode}
          nodes={[locationNode, caseNodeA, personNodeA]}
          edges={edges}
          onClose={vi.fn()}
          onFocus={onFocus}
        />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Focus on Location' }));
    expect(onFocus).toHaveBeenCalledWith(7001);
  });
});
