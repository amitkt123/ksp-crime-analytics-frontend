import { describe, it, expect } from 'vitest';
import { computeForceLayout, applyPathLayout } from './networkLayout';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const NULL_DETAIL_FIELDS = {
  crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null, moKeywordTags: null,
  locationKey: null, latitude: null, longitude: null,
} as const;

const nodes: GraphNodeResponse[] = [
  { id: '1', type: 'PERSON', label: 'Suresh Naik', confidence: 0.8, ...NULL_DETAIL_FIELDS },
  { id: '2', type: 'PERSON', label: 'Vijay Kumar', confidence: 0.7, ...NULL_DETAIL_FIELDS },
  { id: 'case-1', type: 'CASE', label: '276/2026', confidence: null, ...NULL_DETAIL_FIELDS },
];
const edges: GraphEdgeResponse[] = [
  { id: 'e1', sourceId: '1', targetId: 'case-1', type: 'ACCUSED_IN', confidence: null, sharedCaseLabel: null },
  { id: 'e2', sourceId: '2', targetId: 'case-1', type: 'VICTIM_IN', confidence: null, sharedCaseLabel: null },
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
    const edgesWithDangling: GraphEdgeResponse[] = [...edges, { id: 'e3', sourceId: '1', targetId: 'ghost', type: 'ACCUSED_IN', confidence: null, sharedCaseLabel: null }];
    expect(() => computeForceLayout(nodes, edgesWithDangling)).not.toThrow();
  });
});

describe('applyPathLayout', () => {
  const basePositions = new Map([
    ['1', { x: 300, y: 100 }],
    ['2', { x: 310, y: 105 }],
    ['3', { x: 50, y: 50 }],
    ['unrelated', { x: 200, y: 400 }],
  ]);

  it('leaves positions untouched when fewer than two endpoints are selected', () => {
    expect(applyPathLayout(basePositions, [], [])).toBe(basePositions);
    expect(applyPathLayout(basePositions, ['1'], [])).toBe(basePositions);
  });

  it('pins the first endpoint to the left edge and the second to the right edge', () => {
    const result = applyPathLayout(basePositions, ['1', '2'], ['1', '3', '2']);
    expect(result.get('1')!.x).toBeLessThan(result.get('3')!.x);
    expect(result.get('3')!.x).toBeLessThan(result.get('2')!.x);
    expect(result.get('1')!.y).toBe(result.get('2')!.y);
    expect(result.get('3')!.y).toBe(result.get('1')!.y);
  });

  it('reverses the chain to match endpoint order when the path API returned it back-to-front', () => {
    const result = applyPathLayout(basePositions, ['2', '1'], ['1', '2']);
    expect(result.get('2')!.x).toBeLessThan(result.get('1')!.x);
  });

  it('leaves nodes outside the path chain at their force-layout position', () => {
    const result = applyPathLayout(basePositions, ['1', '2'], ['1', '2']);
    expect(result.get('unrelated')).toEqual(basePositions.get('unrelated'));
  });
});
