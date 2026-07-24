import { describe, it, expect } from 'vitest';
import { computeForceLayout } from './networkLayout';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const nodes: GraphNodeResponse[] = [
  { id: '1', type: 'PERSON', label: 'Suresh Naik', confidence: 0.8 },
  { id: '2', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.7 },
  { id: 'case-1', type: 'CASE', label: '276/2026', confidence: null },
];
const edges: GraphEdgeResponse[] = [
  { id: 'e1', sourceId: '1', targetId: 'case-1', type: 'ACCUSED_IN', confidence: null },
  { id: 'e2', sourceId: '2', targetId: 'case-1', type: 'VICTIM_IN', confidence: null },
];

describe('computeForceLayout', () => {
  it('returns a position for every node', () => {
    const positions = computeForceLayout(nodes, edges);
    expect(positions.size).toBe(3);
    nodes.forEach((n) => expect(positions.has(n.id)).toBe(true));
  });

  it('keeps every position within the 660x460 canvas bounds', () => {
    const positions = computeForceLayout(nodes, edges);
    positions.forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(660);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(460);
    });
  });

  it('is deterministic -- the same nodes/edges always produce the same layout', () => {
    const a = computeForceLayout(nodes, edges);
    const b = computeForceLayout(nodes, edges);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it('ignores an edge referencing a node not in the node list', () => {
    const edgesWithDangling: GraphEdgeResponse[] = [...edges, { id: 'e3', sourceId: '1', targetId: 'ghost', type: 'ACCUSED_IN', confidence: null }];
    expect(() => computeForceLayout(nodes, edgesWithDangling)).not.toThrow();
  });

  it('seeds a node from previousPositions instead of a fresh random position when provided', () => {
    const singleNode: GraphNodeResponse[] = [{ id: '1', type: 'PERSON', label: 'Solo', confidence: null }];
    const previous = new Map([['1', { x: 123, y: 77 }]]);
    const positions = computeForceLayout(singleNode, [], previous);
    // No other nodes to repel it and no edges to pull it -- it should stay put.
    expect(positions.get('1')).toEqual({ x: 123, y: 77 });
  });
});
