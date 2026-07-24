import { describe, it, expect } from 'vitest';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';
import { collapseToPersonGraph, filterByNodeType, matchesSearch } from './networkGraphTransforms';

function node(id: string, type: GraphNodeResponse['type'], label = id): GraphNodeResponse {
  return { id, type, label, confidence: null };
}

function edge(id: string, sourceId: string, targetId: string, type: GraphEdgeResponse['type']): GraphEdgeResponse {
  return { id, sourceId, targetId, type, confidence: null };
}

describe('collapseToPersonGraph', () => {
  it('keeps only PERSON nodes and derives a weighted person-to-person edge per shared case/location', () => {
    const nodes = [node('1', 'PERSON'), node('2', 'PERSON'), node('3', 'PERSON'), node('case-1', 'CASE'), node('loc-1', 'LOCATION')];
    const edges = [
      edge('e1', '1', 'case-1', 'ACCUSED_IN'),
      edge('e2', '2', 'case-1', 'VICTIM_IN'),
      edge('e3', 'case-1', 'loc-1', 'OCCURRED_AT'),
      edge('e4', '3', 'loc-1', 'ACCUSED_IN'),
    ];

    const result = collapseToPersonGraph(nodes, edges);

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.every((n) => n.type === 'PERSON')).toBe(true);

    const key12 = result.edges.find((e) => [e.sourceId, e.targetId].sort().join('|') === '1|2');
    expect(key12?.weight).toBe(1);
    // 1 and 3 only co-occur via loc-1, and 1 isn't linked to loc-1 directly, so no edge expected
    const key13 = result.edges.find((e) => [e.sourceId, e.targetId].sort().join('|') === '1|3');
    expect(key13).toBeUndefined();
  });

  it('sums weight when two persons share more than one case', () => {
    const nodes = [node('1', 'PERSON'), node('2', 'PERSON'), node('case-1', 'CASE'), node('case-2', 'CASE')];
    const edges = [
      edge('e1', '1', 'case-1', 'ACCUSED_IN'),
      edge('e2', '2', 'case-1', 'VICTIM_IN'),
      edge('e3', '1', 'case-2', 'ACCUSED_IN'),
      edge('e4', '2', 'case-2', 'VICTIM_IN'),
    ];

    const result = collapseToPersonGraph(nodes, edges);
    const key12 = result.edges.find((e) => [e.sourceId, e.targetId].sort().join('|') === '1|2');
    expect(key12?.weight).toBe(2);
  });

  it('folds in direct person-to-person edges (CO_ACCUSED_WITH / SHARES_MO_WITH)', () => {
    const nodes = [node('1', 'PERSON'), node('2', 'PERSON')];
    const edges = [edge('e1', '1', '2', 'SHARES_MO_WITH')];

    const result = collapseToPersonGraph(nodes, edges);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].weight).toBe(1);
  });
});

describe('filterByNodeType', () => {
  const nodes = [node('1', 'PERSON'), node('case-1', 'CASE'), node('loc-1', 'LOCATION')];
  const edges = [edge('e1', '1', 'case-1', 'ACCUSED_IN'), edge('e2', 'case-1', 'loc-1', 'OCCURRED_AT')];

  it('drops CASE nodes and any edge touching them when showCase is false', () => {
    const result = filterByNodeType(nodes, edges, { showCase: false, showLocation: true });
    expect(result.nodes.map((n) => n.id)).toEqual(['1', 'loc-1']);
    expect(result.edges).toHaveLength(0);
  });

  it('drops LOCATION nodes when showLocation is false, keeping unaffected edges', () => {
    const result = filterByNodeType(nodes, edges, { showCase: true, showLocation: false });
    expect(result.nodes.map((n) => n.id)).toEqual(['1', 'case-1']);
    expect(result.edges).toEqual([edges[0]]);
  });

  it('keeps everything when both are true', () => {
    const result = filterByNodeType(nodes, edges, { showCase: true, showLocation: true });
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
  });
});

describe('matchesSearch', () => {
  it('matches case-insensitively as a substring', () => {
    expect(matchesSearch('Ramesh Kumar', 'ramesh')).toBe(true);
    expect(matchesSearch('Ramesh Kumar', 'KUMAR')).toBe(true);
    expect(matchesSearch('Ramesh Kumar', 'xyz')).toBe(false);
  });

  it('treats an empty/whitespace query as matching everything', () => {
    expect(matchesSearch('Ramesh Kumar', '')).toBe(true);
    expect(matchesSearch('Ramesh Kumar', '   ')).toBe(true);
  });
});
