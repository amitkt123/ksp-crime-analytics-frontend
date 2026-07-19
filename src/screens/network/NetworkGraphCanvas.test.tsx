import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkGraphCanvas } from './NetworkGraphCanvas';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const nodes: GraphNodeResponse[] = [
  { id: '5001', type: 'PERSON', label: 'Suresh Naik', confidence: 0.83 },
  { id: '5002', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.73 },
  { id: 'case-176000', type: 'CASE', label: '276/2026', confidence: null },
  { id: 'location-176', type: 'LOCATION', label: 'Whitefield PS', confidence: null },
];
const edges: GraphEdgeResponse[] = [
  { id: 'e1', sourceId: '5001', targetId: 'case-176000', type: 'ACCUSED_IN', confidence: null },
  { id: 'e2', sourceId: 'case-176000', targetId: 'location-176', type: 'OCCURRED_AT', confidence: null },
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
        onPersonClick={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('.graph-node')).toHaveLength(4);
  });

  it('calls onPersonClick with the numeric personId when a person node is clicked', async () => {
    const onPersonClick = vi.fn();
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onPersonClick={onPersonClick}
      />,
    );

    await userEvent.click(screen.getByLabelText('Suresh Naik'));

    expect(onPersonClick).toHaveBeenCalledWith(5001);
  });

  it('marks a person in pathEndpointIds with the path-endpoint class', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={['5001']}
        pathMemberIds={[]}
        onPersonClick={vi.fn()}
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
        onPersonClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Vijay Kumar')).toHaveClass('path-highlight');
  });
});
