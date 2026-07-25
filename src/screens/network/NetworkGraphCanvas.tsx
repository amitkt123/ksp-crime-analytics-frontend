import { useMemo } from 'react';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';
import { edgeStyleFor } from './networkEdgeStyles';
import { computeForceLayout } from './networkLayout';

interface NetworkGraphCanvasProps {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  communityByLabel: Map<string, number>;
  pathEndpointIds: string[];
  pathMemberIds: string[];
  onNodeClick: (node: GraphNodeResponse) => void;
}

export function NetworkGraphCanvas({ nodes, edges, communityByLabel, pathEndpointIds, pathMemberIds, onNodeClick }: NetworkGraphCanvasProps) {
  const positions = useMemo(() => computeForceLayout(nodes, edges), [nodes, edges]);

  return (
    <svg className="graph-canvas" viewBox="0 0 660 460" role="img" aria-label="Case network graph">
      {edges.map((edge) => {
        const a = positions.get(edge.sourceId);
        const b = positions.get(edge.targetId);
        if (!a || !b) return null;
        const style = edgeStyleFor(edge.type);
        const tooltipParts = [style.label];
        if (edge.confidence != null) tooltipParts.push(`${Math.round(edge.confidence * 100)}%`);
        if (edge.sharedCaseLabel) tooltipParts.push(edge.sharedCaseLabel);
        return (
          <line
            key={edge.id}
            className="graph-edge"
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={style.color}
            strokeDasharray={style.dash}
          >
            <title>{tooltipParts.join(' · ')}</title>
          </line>
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
                onClick={() => onNodeClick(node)}
              />
              <text className="node-label" x={pos.x} y={pos.y - 13} textAnchor="middle">
                {node.label}
              </text>
            </g>
          );
        }

        if (node.type === 'CASE') {
          return (
            <g key={node.id}>
              <rect
                className="graph-node graph-node-case"
                x={pos.x - 5}
                y={pos.y - 5}
                width={10}
                height={10}
                transform={`rotate(45 ${pos.x} ${pos.y})`}
                tabIndex={0}
                role="button"
                aria-label={node.label}
                onClick={() => onNodeClick(node)}
              />
              <text className="node-label" x={pos.x} y={pos.y - 13} textAnchor="middle">
                {node.label}
              </text>
            </g>
          );
        }

        return (
          <g key={node.id}>
            <polygon
              className="graph-node graph-node-location"
              points={`${pos.x},${pos.y - 8} ${pos.x + 8},${pos.y + 5.6} ${pos.x - 8},${pos.y + 5.6}`}
              tabIndex={0}
              role="button"
              aria-label={node.label}
              onClick={() => onNodeClick(node)}
            />
            <text className="node-label" x={pos.x} y={pos.y - 13} textAnchor="middle">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
