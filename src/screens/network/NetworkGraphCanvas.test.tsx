import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('dims person nodes that do not match the search term and keeps matches at full opacity', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onPersonClick={vi.fn()}
        search="suresh"
      />,
    );
    expect(screen.getByLabelText('Suresh Naik')).toHaveStyle({ opacity: 1 });
    expect(screen.getByLabelText('Vijay Kumar')).toHaveStyle({ opacity: 0.2 });
  });

  it('zooms toward the cursor on wheel, clamped to the 0.3x-3x range', () => {
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
    const svg = container.querySelector('svg.graph-canvas')!;
    const zoomLayer = container.querySelector('.graph-zoom-layer')!;
    expect(zoomLayer).toHaveAttribute('transform', 'translate(0,0) scale(1)');

    fireEvent.wheel(svg, { deltaY: -400, clientX: 100, clientY: 80 });

    const transform = zoomLayer.getAttribute('transform')!;
    const scale = Number(transform.match(/scale\(([\d.]+)\)/)![1]);
    expect(scale).toBeGreaterThan(1);
    expect(scale).toBeLessThanOrEqual(3);
  });

  it('pans the view when dragging the empty canvas background', () => {
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
    const svg = container.querySelector('svg.graph-canvas')!;
    const zoomLayer = container.querySelector('.graph-zoom-layer')!;

    fireEvent.pointerDown(svg, { clientX: 50, clientY: 50 });
    fireEvent.pointerMove(svg, { clientX: 90, clientY: 70 });
    fireEvent.pointerUp(svg);

    expect(zoomLayer).toHaveAttribute('transform', 'translate(40,20) scale(1)');
  });

  it('drags a node to a new position without moving other nodes', () => {
    render(
      <NetworkGraphCanvas
        nodes={nodes}
        edges={edges}
        communityByLabel={new Map()}
        pathEndpointIds={[]}
        pathMemberIds={[]}
        onPersonClick={vi.fn()}
      />,
    );
    const node = screen.getByLabelText('Suresh Naik');
    const before = { cx: node.getAttribute('cx'), cy: node.getAttribute('cy') };

    fireEvent.pointerDown(node, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(node, { clientX: 210, clientY: 160 });
    fireEvent.pointerUp(node);

    expect(node.getAttribute('cx')).not.toBe(before.cx);
    expect(node.getAttribute('cy')).not.toBe(before.cy);
  });
});
