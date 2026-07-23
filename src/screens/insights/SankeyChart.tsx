import { useMemo } from 'react';
import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey';

export interface SankeyLinkInput {
  source: number;
  target: number;
  value: number;
}

interface SankeyChartProps {
  nodeLabels: string[];
  links: SankeyLinkInput[];
  width?: number;
  height?: number;
}

interface NodeDatum {
  name: string;
}

const NODE_COLORS = ['var(--real)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

export function SankeyChart({ nodeLabels, links, width = 640, height = 260 }: SankeyChartProps) {
  const { nodes, links: laidOutLinks } = useMemo(() => {
    const layout = sankey<NodeDatum, SankeyLinkInput>()
      .nodeWidth(14)
      .nodePadding(20)
      .extent([
        [1, 1],
        [width - 1, height - 1],
      ]);
    return layout({
      nodes: nodeLabels.map((name) => ({ name })),
      links: links.map((l) => ({ ...l })),
    });
  }, [nodeLabels, links, width, height]);

  const pathGenerator = sankeyLinkHorizontal<NodeDatum, SankeyLinkInput>();

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Case journey sankey diagram">
      <g>
        {laidOutLinks.map((link, i) => {
          const sourceIndex = typeof link.source === 'object' ? (link.source as SankeyNode<NodeDatum, SankeyLinkInput>).index! : link.source;
          return (
            <path
              key={i}
              d={pathGenerator(link as SankeyLink<NodeDatum, SankeyLinkInput>) ?? undefined}
              fill="none"
              stroke={NODE_COLORS[sourceIndex % NODE_COLORS.length]}
              strokeOpacity={0.35}
              strokeWidth={Math.max(1, link.width ?? 1)}
            />
          );
        })}
      </g>
      <g>
        {nodes.map((node, i) => (
          <g key={node.name}>
            <rect
              x={node.x0}
              y={node.y0}
              width={(node.x1 ?? 0) - (node.x0 ?? 0)}
              height={(node.y1 ?? 0) - (node.y0 ?? 0)}
              fill={NODE_COLORS[i % NODE_COLORS.length]}
            />
            <text x={(node.x1 ?? 0) + 6} y={((node.y0 ?? 0) + (node.y1 ?? 0)) / 2} dy="0.35em" fontSize={10.5} fill="var(--text)">
              {node.name} ({(node.value ?? 0).toLocaleString()})
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
