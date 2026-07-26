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
  // Case/Location node ids that justify a path hop (from the focus=path
  // subgraph) -- highlighted and exempted from dimming alongside
  // pathMemberIds, but not repositioned by applyPathLayout's straight-line
  // chain since they aren't part of the ordered Person-to-Person path.
  pathContextIds?: string[];
  // Real edge ids belonging to the path subgraph (direct hops plus the
  // edges into each justifying Case/Location) -- which edge to highlight is
  // read directly off the backend's answer instead of re-derived from
  // consecutive pathMemberIds pairs, so it stays correct even when a hop is
  // only connected via a shared case rather than a direct edge.
  pathEdgeIds?: string[];
  onNodeClick: (node: GraphNodeResponse) => void;
  selectedNodeId: string | null;
  rootNodeId?: string | null;
  onCanvasClick: () => void;
  resetViewKey: number;
}

// How far the pointer has to move (in screen px) before a pointerdown on a
// node is treated as a drag instead of a click.
const DRAG_THRESHOLD = 3;

interface DragState {
  nodeId: string;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
  moved: boolean;
}

export function NetworkGraphCanvas({
  nodes,
  edges,
  communityByLabel,
  pathEndpointIds,
  pathMemberIds,
  pathContextIds = [],
  pathEdgeIds = [],
  onNodeClick,
  selectedNodeId,
  rootNodeId = null,
  onCanvasClick,
  resetViewKey,
}: NetworkGraphCanvasProps) {
  const basePositions = useMemo(() => computeForceLayout(nodes, edges), [nodes, edges]);
  const positions = useMemo(
    () => applyPathLayout(basePositions, pathEndpointIds, pathMemberIds),
    [basePositions, pathEndpointIds, pathMemberIds],
  );

  // User-dragged offsets layered on top of the computed layout. Cleared
  // whenever the underlying node/edge set changes (new focus/search) so a
  // drag from a previous graph never leaks into the next one.
  const [dragOffsets, setDragOffsets] = useState<Map<string, { x: number; y: number }>>(new Map());
  const dragStateRef = useRef<DragState | null>(null);
  useEffect(() => {
    setDragOffsets(new Map());
  }, [nodes, edges]);

  function positionFor(id: string) {
    const base = positions.get(id);
    if (!base) return null;
    const offset = dragOffsets.get(id);
    return offset ? { x: base.x + offset.x, y: base.y + offset.y } : base;
  }

  const pathEdgeIdSet = useMemo(() => new Set(pathEdgeIds), [pathEdgeIds]);
  const dimNonPath = pathEndpointIds.length === 2 && (pathMemberIds.length > 0 || pathContextIds.length > 0);

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

  function handleNodePointerDown(event: React.PointerEvent, node: GraphNodeResponse) {
    event.stopPropagation();
    const offset = dragOffsets.get(node.id) ?? { x: 0, y: 0 };
    dragStateRef.current = {
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture isn't implemented in every test/browser environment;
      // dragging still works as long as the pointer stays over the node.
    }
  }

  function handleNodePointerMove(event: React.PointerEvent) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dxClient = event.clientX - drag.startClientX;
    const dyClient = event.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dxClient, dyClient) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const dx = dxClient / transform.k;
    const dy = dyClient / transform.k;
    setDragOffsets((prev) => {
      const next = new Map(prev);
      next.set(drag.nodeId, { x: drag.startOffsetX + dx, y: drag.startOffsetY + dy });
      return next;
    });
  }

  function handleNodePointerUp(event: React.PointerEvent, node: GraphNodeResponse) {
    const drag = dragStateRef.current;
    dragStateRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // See handleNodePointerDown.
    }
    if (!drag || !drag.moved) {
      onNodeClick(node);
    }
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
          const a = positionFor(edge.sourceId);
          const b = positionFor(edge.targetId);
          if (!a || !b) return null;
          const style = edgeStyleFor(edge.type);
          const tooltipParts = [style.label];
          if (edge.confidence != null) tooltipParts.push(`${Math.round(edge.confidence * 100)}%`);
          if (edge.sharedCaseLabel) tooltipParts.push(edge.sharedCaseLabel);
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const isPathEdge = pathEdgeIdSet.has(edge.id);
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
          const pos = positionFor(node.id);
          if (!pos) return null;
          const isEndpoint = pathEndpointIds.includes(node.id);
          const isPathMember = pathMemberIds.includes(node.id) || pathContextIds.includes(node.id);
          const onPath = isEndpoint || isPathMember;
          const dimClass = dimNonPath && !onPath ? ' dimmed' : '';
          const stateClass = isEndpoint ? ' path-endpoint' : isPathMember ? ' path-highlight' : '';
          const selectedClass = node.id === selectedNodeId ? ' selected' : '';
          const isRoot = node.id === rootNodeId;
          const rootClass = isRoot ? ' graph-node-root' : '';
          const dragProps = {
            onPointerDown: (event: React.PointerEvent) => handleNodePointerDown(event, node),
            onPointerMove: handleNodePointerMove,
            onPointerUp: (event: React.PointerEvent) => handleNodePointerUp(event, node),
            onPointerCancel: (event: React.PointerEvent) => handleNodePointerUp(event, node),
          };

          if (node.type === 'PERSON') {
            const communityId = communityByLabel.get(node.label);
            return (
              <g key={node.id}>
                <circle
                  className={`graph-node${stateClass}${dimClass}${selectedClass}${rootClass}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={isRoot ? 13 : 9}
                  fill={communityId != null ? colorForCommunity(communityId) : 'var(--muted-2)'}
                  tabIndex={0}
                  role="button"
                  aria-label={node.label}
                  {...dragProps}
                />
                <text className={`node-label${dimClass}`} x={pos.x} y={pos.y - (isRoot ? 17 : 13)} textAnchor="middle" fontSize={12 / transform.k} fontWeight={isRoot ? 700 : 400}>
                  {node.label}
                </text>
              </g>
            );
          }

          if (node.type === 'CASE') {
            const size = isRoot ? 7 : 5;
            return (
              <g key={node.id}>
                <rect
                  className={`graph-node graph-node-case${stateClass}${dimClass}${selectedClass}${rootClass}`}
                  x={pos.x - size}
                  y={pos.y - size}
                  width={size * 2}
                  height={size * 2}
                  transform={`rotate(45 ${pos.x} ${pos.y})`}
                  tabIndex={0}
                  role="button"
                  aria-label={node.label}
                  {...dragProps}
                />
                <text className={`node-label${dimClass}`} x={pos.x} y={pos.y - (isRoot ? 17 : 13)} textAnchor="middle" fontSize={12 / transform.k} fontWeight={isRoot ? 700 : 400}>
                  {node.label}
                </text>
              </g>
            );
          }

          const halfWidth = isRoot ? 11 : 8;
          const halfHeight = halfWidth * 0.7;
          return (
            <g key={node.id}>
              <polygon
                className={`graph-node graph-node-location${stateClass}${dimClass}${selectedClass}${rootClass}`}
                points={`${pos.x},${pos.y - halfWidth} ${pos.x + halfWidth},${pos.y + halfHeight} ${pos.x - halfWidth},${pos.y + halfHeight}`}
                tabIndex={0}
                role="button"
                aria-label={node.label}
                {...dragProps}
              />
              <text className={`node-label${dimClass}`} x={pos.x} y={pos.y - (isRoot ? 17 : 13)} textAnchor="middle" fontSize={12 / transform.k} fontWeight={isRoot ? 700 : 400}>
                {node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}