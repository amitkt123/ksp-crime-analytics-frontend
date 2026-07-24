import { useMemo, useRef, useState } from 'react';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';
import { personIdOfNode } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';
import { computeForceLayout } from './networkLayout';
import { matchesSearch } from './networkGraphTransforms';

interface NetworkGraphCanvasProps {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  communityByLabel: Map<string, number>;
  pathEndpointIds: string[];
  pathMemberIds: string[];
  onPersonClick: (personId: number) => void;
  search?: string;
}

const PERSON_TO_PERSON_EDGE_TYPES = new Set(['CO_ACCUSED_WITH', 'SHARES_MO_WITH']);
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const VIEWBOX_W = 660;
const VIEWBOX_H = 460;

interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

export function NetworkGraphCanvas({
  nodes,
  edges,
  communityByLabel,
  pathEndpointIds,
  pathMemberIds,
  onPersonClick,
  search = '',
}: NetworkGraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const positionCacheRef = useRef(new Map<string, { x: number; y: number }>());
  const panStateRef = useRef<{ startClientX: number; startClientY: number; startViewX: number; startViewY: number } | null>(null);
  const dragStateRef = useRef<string | null>(null);

  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [, forceRerender] = useState(0);

  const layoutPositions = useMemo(() => {
    const computed = computeForceLayout(nodes, edges, positionCacheRef.current);
    computed.forEach((pos, id) => positionCacheRef.current.set(id, pos));
    return computed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  function positionFor(id: string) {
    return positionCacheRef.current.get(id) ?? layoutPositions.get(id);
  }

  function viewboxUnitsPerClientPixel() {
    const rect = svgRef.current?.getBoundingClientRect();
    const scaleX = rect && rect.width ? VIEWBOX_W / rect.width : 1;
    const scaleY = rect && rect.height ? VIEWBOX_H / rect.height : 1;
    return { scaleX, scaleY, rect };
  }

  function toViewboxPoint(clientX: number, clientY: number) {
    const { scaleX, scaleY, rect } = viewboxUnitsPerClientPixel();
    return { x: (clientX - (rect?.left ?? 0)) * scaleX, y: (clientY - (rect?.top ?? 0)) * scaleY };
  }

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const { x: vbX, y: vbY } = toViewboxPoint(e.clientX, e.clientY);
    const factor = Math.exp(-e.deltaY * 0.0015);
    setView((prev) => {
      const nextK = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.k * factor));
      return {
        k: nextK,
        x: vbX - (vbX - prev.x) * (nextK / prev.k),
        y: vbY - (vbY - prev.y) * (nextK / prev.k),
      };
    });
  }

  function handleSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.target !== e.currentTarget) return;
    panStateRef.current = { startClientX: e.clientX, startClientY: e.clientY, startViewX: view.x, startViewY: view.y };
  }

  function handleSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (dragStateRef.current) {
      const { x, y } = toLocalGraphPoint(e.clientX, e.clientY);
      positionCacheRef.current.set(dragStateRef.current, { x, y });
      forceRerender((v) => v + 1);
      return;
    }
    if (panStateRef.current) {
      const { scaleX, scaleY } = viewboxUnitsPerClientPixel();
      const { startClientX, startClientY, startViewX, startViewY } = panStateRef.current;
      setView((prev) => ({
        ...prev,
        x: startViewX + (e.clientX - startClientX) * scaleX,
        y: startViewY + (e.clientY - startClientY) * scaleY,
      }));
    }
  }

  function handleSvgPointerUp() {
    panStateRef.current = null;
    dragStateRef.current = null;
  }

  function toLocalGraphPoint(clientX: number, clientY: number) {
    const { x: vbX, y: vbY } = toViewboxPoint(clientX, clientY);
    return { x: (vbX - view.x) / view.k, y: (vbY - view.y) / view.k };
  }

  function handleNodePointerDown(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation();
    dragStateRef.current = nodeId;
  }

  return (
    <svg
      ref={svgRef}
      className="graph-canvas"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      role="img"
      aria-label="Case network graph"
      onWheel={handleWheel}
      onPointerDown={handleSvgPointerDown}
      onPointerMove={handleSvgPointerMove}
      onPointerUp={handleSvgPointerUp}
      onPointerLeave={handleSvgPointerUp}
    >
      <g className="graph-zoom-layer" transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
        {edges.map((edge) => {
          const a = positionFor(edge.sourceId);
          const b = positionFor(edge.targetId);
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
          const pos = positionFor(node.id);
          if (!pos) return null;

          if (node.type === 'PERSON') {
            const communityId = communityByLabel.get(node.label);
            const stateClass = pathEndpointIds.includes(node.id)
              ? ' path-endpoint'
              : pathMemberIds.includes(node.id)
                ? ' path-highlight'
                : '';
            const opacity = matchesSearch(node.label, search) ? 1 : 0.2;
            return (
              <g key={node.id}>
                <circle
                  className={`graph-node${stateClass}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={9}
                  fill={communityId != null ? colorForCommunity(communityId) : 'var(--muted-2)'}
                  style={{ opacity }}
                  tabIndex={0}
                  role="button"
                  aria-label={node.label}
                  onClick={() => onPersonClick(personIdOfNode(node))}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                />
                <text className="node-label" x={pos.x} y={pos.y - 13} textAnchor="middle" style={{ opacity }}>
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
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              />
            );
          }

          return (
            <polygon
              key={node.id}
              className="graph-node graph-node-location"
              points={`${pos.x},${pos.y - 8} ${pos.x + 8},${pos.y + 5.6} ${pos.x - 8},${pos.y + 5.6}`}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
            />
          );
        })}
      </g>
    </svg>
  );
}
