import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

export interface WeightedPersonEdge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

// Decluttered default view: drop Case/Location nodes and replace every
// person's link to a shared Case/Location (or a direct CO_ACCUSED_WITH /
// SHARES_MO_WITH edge) with a single weighted person-to-person edge, weight =
// number of distinct groupings that connect the pair.
export function collapseToPersonGraph(
  nodes: GraphNodeResponse[],
  edges: GraphEdgeResponse[],
): { nodes: GraphNodeResponse[]; edges: WeightedPersonEdge[] } {
  const persons = nodes.filter((n) => n.type === 'PERSON');
  const personIds = new Set(persons.map((n) => n.id));

  const groupMembers = new Map<string, Set<string>>();
  edges.forEach((e) => {
    const sourceIsPerson = personIds.has(e.sourceId);
    const targetIsPerson = personIds.has(e.targetId);
    if (sourceIsPerson === targetIsPerson) return;
    const groupId = sourceIsPerson ? e.targetId : e.sourceId;
    const personId = sourceIsPerson ? e.sourceId : e.targetId;
    const set = groupMembers.get(groupId) ?? new Set<string>();
    set.add(personId);
    groupMembers.set(groupId, set);
  });

  const weightByPair = new Map<string, number>();
  function addWeight(a: string, b: string) {
    const key = pairKey(a, b);
    weightByPair.set(key, (weightByPair.get(key) ?? 0) + 1);
  }

  groupMembers.forEach((members) => {
    const list = Array.from(members);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) addWeight(list[i], list[j]);
    }
  });

  edges.forEach((e) => {
    if (personIds.has(e.sourceId) && personIds.has(e.targetId)) addWeight(e.sourceId, e.targetId);
  });

  const collapsedEdges: WeightedPersonEdge[] = Array.from(weightByPair.entries()).map(([key, weight]) => {
    const [sourceId, targetId] = key.split('|');
    return { id: `w-${key}`, sourceId, targetId, weight };
  });

  return { nodes: persons, edges: collapsedEdges };
}

export function filterByNodeType(
  nodes: GraphNodeResponse[],
  edges: GraphEdgeResponse[],
  options: { showCase: boolean; showLocation: boolean },
): { nodes: GraphNodeResponse[]; edges: GraphEdgeResponse[] } {
  const keptNodes = nodes.filter((n) => {
    if (n.type === 'CASE') return options.showCase;
    if (n.type === 'LOCATION') return options.showLocation;
    return true;
  });
  const keptIds = new Set(keptNodes.map((n) => n.id));
  const keptEdges = edges.filter((e) => keptIds.has(e.sourceId) && keptIds.has(e.targetId));
  return { nodes: keptNodes, edges: keptEdges };
}

export function matchesSearch(label: string, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return label.toLowerCase().includes(q);
}
