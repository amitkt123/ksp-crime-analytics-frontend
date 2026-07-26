import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const CANVAS_W = 660;
const CANVAS_H = 460;
const ITERATIONS = 220;

// Deterministic hash of a node id into a PRNG seed -- stands in for build_network.py's
// Math.random() initial placement, which this codebase's mock/layout code never uses:
// same node set always lays out identically.
function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 2147483647;
  }
  return hash <= 0 ? hash + 2147483646 : hash;
}

// Park-Miller minimal standard LCG.
function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
}

const PERSON_TO_PERSON_EDGE_TYPES = new Set(['CO_ACCUSED_WITH', 'SHARES_MO_WITH']);

export function computeForceLayout(nodes: GraphNodeResponse[], edges: GraphEdgeResponse[]): Map<string, { x: number; y: number }> {
  const layoutNodes: LayoutNode[] = nodes.map((n) => {
    const rand = seededRandom(hashId(n.id));
    return { id: n.id, x: rand() * 600 + 40, y: rand() * 380 + 40, vx: 0, vy: 0, fx: 0, fy: 0 };
  });
  const byId = new Map(layoutNodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    layoutNodes.forEach((n) => {
      n.fx = 0;
      n.fy = 0;
    });

    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const a = layoutNodes[i];
        const b = layoutNodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy || 0.01;
        const d = Math.sqrt(d2);
        const rep = 2200 / d2;
        const fx = (dx / d) * rep;
        const fy = (dy / d) * rep;
        a.fx += fx;
        a.fy += fy;
        b.fx -= fx;
        b.fy -= fy;
      }
    }

    edges.forEach((e) => {
      const a = byId.get(e.sourceId);
      const b = byId.get(e.targetId);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target = PERSON_TO_PERSON_EDGE_TYPES.has(e.type) ? 110 : 80;
      const f = (d - target) * 0.02;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      a.fx += fx;
      a.fy += fy;
      b.fx -= fx;
      b.fy -= fy;
    });

    layoutNodes.forEach((n) => {
      n.vx = (n.vx + n.fx) * 0.75;
      n.vy = (n.vy + n.fy) * 0.75;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(30, Math.min(CANVAS_W - 30, n.x));
      n.y = Math.max(30, Math.min(CANVAS_H - 30, n.y));
    });
  }

  const positions = new Map<string, { x: number; y: number }>();
  layoutNodes.forEach((n) => positions.set(n.id, { x: n.x, y: n.y }));
  return positions;
}

const PATH_MARGIN_X = 70;
const PATH_Y = CANVAS_H / 2;

// Overrides the force layout for an active path: the first endpoint pins to
// the left edge, the second to the right, and the resolved chain in between
// (pathMemberIds, already ordered from-to by the path API) spaces out evenly
// on the line between them so the shortest path reads left-to-right at a
// glance. Nodes outside the chain keep their force-layout position.
export function applyPathLayout(
  positions: Map<string, { x: number; y: number }>,
  pathEndpointIds: string[],
  pathMemberIds: string[],
): Map<string, { x: number; y: number }> {
  if (pathEndpointIds.length !== 2) return positions;

  const chain = pathMemberIds.length >= 2 ? pathMemberIds : pathEndpointIds;
  const ordered = chain[0] === pathEndpointIds[0] ? chain : [...chain].reverse();

  const next = new Map(positions);
  const usableWidth = CANVAS_W - PATH_MARGIN_X * 2;
  ordered.forEach((id, i) => {
    const x = ordered.length === 1 ? CANVAS_W / 2 : PATH_MARGIN_X + (usableWidth * i) / (ordered.length - 1);
    next.set(id, { x, y: PATH_Y });
  });
  return next;
}
