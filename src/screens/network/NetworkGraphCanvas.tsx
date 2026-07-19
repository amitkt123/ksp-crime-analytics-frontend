import { useMemo } from 'react';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';
import { personIdOfNode } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';
import { computeForceLayout } from './networkLayout';

interface NetworkGraphCanvasProps {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  communityByLabel: Map<string, number>;
  pathEndpointIds: string[];
  pathMemberIds: string[];
  onPersonClick: (personId: number) => void;
}

const PERSON_TO_PERSON_EDGE_TYPES = new Set(['CO_ACCUSED_WITH', 'SHARES_MO_WITH']);

export function NetworkGraphCanvas({ nodes, edges, communityByLabel, pathEndpointIds, pathMemberIds, onPersonClick }: NetworkGraphCanvasProps) {
  const positions = useMemo(() => computeForceLayout(nodes, edges), [nodes, edges]);

  return (
    <svg className="graph-canvas" viewBox="0 0 660 460" role="img" aria-label="Case network graph">
      {edges.map((edge) => {
        const a = positions.get(edge.sourceId);
        const b = positions.get(edge.targetId);
        if (!a || !b) return null;
        return (
          <line
            key={edge.id}
            className={`graph-edge${PERSON_TO_PERSON_EDGE_TYPES.has(edge.type) ? ' mo-shared' : ''}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
          />
        );
      })}
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        if (node.type === 'PERSON') {
          const communityId = communityByLabel.get(node.label);
          const stateClass = pathEndpointIds.includes(node.id)
            ? ' path-endpoint'
            : pathMemberIds.includes(node.id)
              ? ' path-highlight'
              : '';
          return (
            <g key={node.id}>
              <circle
                className={`graph-node${stateClass}`}
                cx={pos.x}
                cy={pos.y}
                r={9}
                fill={communityId != null ? colorForCommunity(communityId) : 'var(--muted-2)'}
                tabIndex={0}
                role="button"
                aria-label={node.label}
                onClick={() => onPersonClick(personIdOfNode(node))}
              />
              <text className="node-label" x={pos.x} y={pos.y - 13} textAnchor="middle">
                {node.label.split(' ')[0]}
              </text>
            </g>
          );
        }

        if (node.type === 'CASE') {
          return (
            <rect
              key={node.id}
              className="graph-node graph-node-case"
              x={pos.x - 5}
              y={pos.y - 5}
              width={10}
              height={10}
              transform={`rotate(45 ${pos.x} ${pos.y})`}
            />
          );
        }

        return (
          <polygon
            key={node.id}
            className="graph-node graph-node-location"
            points={`${pos.x},${pos.y - 8} ${pos.x + 8},${pos.y + 5.6} ${pos.x - 8},${pos.y + 5.6}`}
          />
        );
      })}
    </svg>
  );
}
