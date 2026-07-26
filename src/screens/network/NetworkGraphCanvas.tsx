import { useMemo, useState, useEffect, useRef } from 'react';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';
import { edgeStyleFor } from './networkEdgeStyles';
import { computeForceLayout, applyPathLayout } from './networkLayout';

interface NetworkGraphCanvasProps {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  communityByLabel: Map<string, number>;
  pathEndpointIds: string[];
  pathMemberIds: string[];
  onNodeClick: (node: GraphNodeResponse) => void;
  selectedNodeId: string | null;
  onCanvasClick: () => void;
  resetViewKey: number;
}

export function NetworkGraphCanvas({
  nodes,
  edges,
  communityByLabel,
  pathEndpointIds,
  pathMemberIds,
  onNodeClick,
  selectedNodeId,
  onCanvasClick,
  resetViewKey,
}: NetworkGraphCanvasProps) {
  const basePositions = useMemo(() => computeForceLayout(nodes, edges), [nodes, edges]);
  const positions = useMemo(
    () => applyPathLayout(basePositions, pathEndpointIds, pathMemberIds),
    [basePositions, pathEndpointIds, pathMemberIds],
  );

  // pathMemberIds comes from the path API already ordered from -> to, so
  // consecutive pairs are exactly the hops of the shortest path -- used to
  // pick out which rendered edges belong to that chain.
  const pathEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (let i = 0; i < pathMemberIds.length - 1; i++) {
      keys.add(`${pathMemberIds[i]}::${pathMemberIds[i + 1]}`);
      keys.add(`${pathMemberIds[i + 1]}::${pathMemberIds[i]}`);
    }
    return keys;
  }, [pathMemberIds]);
  const dimNonPath = pathEndpointIds.length === 2 && pathMemberIds.length > 0;

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setTransform({ x: 0, y: 0, k: 1 });
  }, [resetViewKey]);

  // React attaches wheel listeners as passive by default, so event.preventDefault()
  // inside a JSX onWheel handler silently no-ops -- the browser's own ctrl/pinch
  // zoom then fires on top of this transform, zooming the whole page instead of
  // just the graph. A native, explicitly non-passive listener is the only way to
  // actually suppress that.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function nativeWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = svg!.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setTransform((t) => {
        const newScale = t.k * (1 - event.deltaY / 500);
        const newX = point.x - (point.x - t.x) * (newScale / t.k);
        const newY = point.y - (point.y - t.y) * (newScale / t.k);
        return { x: newX, y: newY, k: newScale };
      });
    }
    svg.addEventListener('wheel', nativeWheel, { passive: false });
    return () => svg.removeEventListener('wheel', nativeWheel);
  }, []);

  function handleMouseDown(event: React.MouseEvent) {
    if (event.target === svgRef.current) {
      onCanvasClick();
      setIsPanning(true);
      setPanStart({ x: event.clientX, y: event.clientY });
    }
  }

  function handleMouseMove(event: React.MouseEvent) {
    if (!isPanning) return;
    const dx = event.clientX - panStart.x;
    const dy = event.clientY - panStart.y;
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    setPanStart({ x: event.clientX, y: event.clientY });
  }

  function handleMouseUp() {
    setIsPanning(false);
  }

  return (
    <svg
      ref={svgRef}
      className="graph-canvas"
      viewBox="0 0 660 460"
      role="img"
      aria-label="Case network graph"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
        {edges.map((edge) => {
          const a = positions.get(edge.sourceId);
          const b = positions.get(edge.targetId);
          if (!a || !b) return null;
          const style = edgeStyleFor(edge.type);
          const tooltipParts = [style.label];
          if (edge.confidence != null) tooltipParts.push(`${Math.round(edge.confidence * 100)}%`);
          if (edge.sharedCaseLabel) tooltipParts.push(edge.sharedCaseLabel);
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const isPathEdge = pathEdgeKeys.has(`${edge.sourceId}::${edge.targetId}`);
          const isDimmed = dimNonPath && !isPathEdge;
          const edgeClass = `graph-edge${isPathEdge ? ' path-edge' : ''}${isDimmed ? ' dimmed' : ''}`;
          return (
            <g key={edge.id}>
              <line
                className={edgeClass}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={style.color}
                strokeDasharray={style.dash}
              >
                <title>{tooltipParts.join(' · ')}</title>
              </line>
              {!isDimmed && (
                <text
                  className="edge-label"
                  x={midX}
                  y={midY}
                  textAnchor="middle"
                  dy="-4"
                  fontSize={8 / transform.k}
                  fill={isPathEdge ? 'var(--predicted)' : 'var(--text)'}
                  fontWeight={isPathEdge ? 700 : 400}
                  style={{
                    paintOrder: 'stroke',
                    stroke: 'var(--canvas)',
                    strokeWidth: `${2 / transform.k}px`,
                    strokeLinecap: 'butt',
                    strokeLinejoin: 'miter',
                  }}
                >
                  {style.label}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const onPath = pathEndpointIds.includes(node.id) || pathMemberIds.includes(node.id);
          const dimClass = dimNonPath && !onPath ? ' dimmed' : '';
          const selectedClass = node.id === selectedNodeId ? ' selected' : '';

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
                  className={`graph-node${stateClass}${dimClass}${selectedClass}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={9}
                  fill={communityId != null ? colorForCommunity(communityId) : 'var(--muted-2)'}
                  tabIndex={0}
                  role="button"
                  aria-label={node.label}
                  onClick={() => onNodeClick(node)}
                />
                <text className={`node-label${dimClass}`} x={pos.x} y={pos.y - 13} textAnchor="middle" fontSize={12 / transform.k}>
                  {node.label}
                </text>
              </g>
            );
          }

          if (node.type === 'CASE') {
            return (
              <g key={node.id}>
                <rect
                  className={`graph-node graph-node-case${dimClass}${selectedClass}`}
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
                <text className={`node-label${dimClass}`} x={pos.x} y={pos.y - 13} textAnchor="middle" fontSize={12 / transform.k}>
                  {node.label}
                </text>
              </g>
            );
          }

          return (
            <g key={node.id}>
              <polygon
                className={`graph-node graph-node-location${dimClass}${selectedClass}`}
                points={`${pos.x},${pos.y - 8} ${pos.x + 8},${pos.y + 5.6} ${pos.x - 8},${pos.y + 5.6}`}
                tabIndex={0}
                role="button"
                aria-label={node.label}
                onClick={() => onNodeClick(node)}
              />
              <text className={`node-label${dimClass}`} x={pos.x} y={pos.y - 13} textAnchor="middle" fontSize={12 / transform.k}>
                {node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}