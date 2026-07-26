import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkGraphCanvas } from './NetworkGraphCanvas';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const NODE_DETAIL_DEFAULTS = {
  crimeNo: null,
  caseNo: null,
  crimeRegisteredDate: null,
  gravityWeight: null,
  moKeywordTags: null,
  locationKey: null,
  latitude: null,
  longitude: null,
};

const nodes: GraphNodeResponse[] = [
  { id: '5001', type: 'PERSON', label: 'Suresh Naik', confidence: 0.83, ...NODE_DETAIL_DEFAULTS },
  { id: '5002', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.73, ...NODE_DETAIL_DEFAULTS },
  { id: 'case-176000', type: 'CASE', label: '276/2026', confidence: null, ...NODE_DETAIL_DEFAULTS },
  { id: 'location-176', type: 'LOCATION', label: 'Whitefield PS', confidence: null, ...NODE_DETAIL_DEFAULTS },
];
const edges: GraphEdgeResponse[] = [
  { id: 'e1', sourceId: '5001', targetId: 'case-176000', type: 'ACCUSED_IN', confidence: null, sharedCaseLabel: null },
  { id: 'e2', sourceId: 'case-176000', targetId: 'location-176', type: 'OCCURRED_AT', confidence: null, sharedCaseLabel: null },
];

describe('NetworkGraphCanvas', () => {
  it('renders one graph-node element per node', () => {
    const { container } = render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onNodeClick={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('.graph-node')).toHaveLength(4);
  });

  it('renders the full label for every node type, not a truncated first word', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onNodeClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Suresh Naik')).toBeInTheDocument();
    expect(screen.getByText('Vijay Kumar')).toBeInTheDocument();
    expect(screen.getByText('276/2026')).toBeInTheDocument();
    expect(screen.getByText('Whitefield PS')).toBeInTheDocument();
  });

  it('calls onNodeClick with the full node when a person node is clicked', async () => {
    const onNodeClick = vi.fn();
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onNodeClick={onNodeClick}
      />,
    );

    await userEvent.click(screen.getByLabelText('Suresh Naik'));

    expect(onNodeClick).toHaveBeenCalledWith(nodes[0]);
  });

  it('calls onNodeClick with the full node when a case node is clicked', async () => {
    const onNodeClick = vi.fn();
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onNodeClick={onNodeClick}
      />,
    );

    await userEvent.click(screen.getByLabelText('276/2026'));

    expect(onNodeClick).toHaveBeenCalledWith(nodes[2]);
  });

  it('calls onNodeClick with the full node when a location node is clicked', async () => {
    const onNodeClick = vi.fn();
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onNodeClick={onNodeClick}
      />,
    );

    await userEvent.click(screen.getByLabelText('Whitefield PS'));

    expect(onNodeClick).toHaveBeenCalledWith(nodes[3]);
  });

  it('marks a person in pathEndpointIds with the path-endpoint class', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={['5001']}
        pathMemberIds={[]}
        onNodeClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Suresh Naik')).toHaveClass('path-endpoint');
  });

  it('marks a person in pathMemberIds with the path-highlight class', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={['5002']}
        onNodeClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Vijay Kumar')).toHaveClass('path-highlight');
  });

  it('labels every edge with its relationship type, not just ones touching a selected node', () => {
    const { container } = render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onNodeClick={vi.fn()}
        selectedNodeId={null}
      />,
    );
    const labels = Array.from(container.querySelectorAll('.edge-label')).map((el) => el.textContent);
    expect(labels).toHaveLength(edges.length);
    expect(labels).toEqual(expect.arrayContaining(['Accused in', 'Occurred at']));
  });

  it('marks the edge along the resolved shortest path with the path-edge class and dims the rest', () => {
    const { container } = render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={['5001', 'location-176']}
        pathMemberIds={['5001', 'location-176']}
        pathContextIds={['case-176000']}
        pathEdgeIds={['e1', 'e2']}
        onNodeClick={vi.fn()}
      />,
    );
    const pathEdges = container.querySelectorAll('.graph-edge.path-edge');
    expect(pathEdges).toHaveLength(2);
    expect(container.querySelectorAll('.graph-edge.dimmed')).toHaveLength(0);
  });

  it('marks a Case node justifying a path hop with the path-highlight class via pathContextIds', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={['5001', 'location-176']}
        pathMemberIds={['5001', 'location-176']}
        pathContextIds={['case-176000']}
        pathEdgeIds={['e1', 'e2']}
        onNodeClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('276/2026')).toHaveClass('path-highlight');
    expect(screen.getByLabelText('276/2026')).not.toHaveClass('dimmed');
  });

  it('dims nodes and edges outside the resolved path once both endpoints are set', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={['5001', '5002']}
        pathMemberIds={['5001', '5002']}
        onNodeClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Whitefield PS')).toHaveClass('dimmed');
    expect(screen.getByLabelText('276/2026')).toHaveClass('dimmed');
    expect(screen.getByLabelText('Suresh Naik')).not.toHaveClass('dimmed');
    expect(screen.getByLabelText('Vijay Kumar')).not.toHaveClass('dimmed');
  });

  it('does not dim anything while path mode has fewer than two endpoints selected', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={['5001']}
        pathMemberIds={[]}
        onNodeClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Vijay Kumar')).not.toHaveClass('dimmed');
  });

  it('places the first path endpoint left of the second on a shared horizontal line', () => {
    const { container } = render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={['5001', '5002']}
        pathMemberIds={['5001', '5002']}
        onNodeClick={vi.fn()}
      />,
    );
    const first = container.querySelector('circle[aria-label="Suresh Naik"]')!;
    const second = container.querySelector('circle[aria-label="Vijay Kumar"]')!;
    expect(Number(first.getAttribute('cx'))).toBeLessThan(Number(second.getAttribute('cx')));
    expect(first.getAttribute('cy')).toBe(second.getAttribute('cy'));
  });
});
