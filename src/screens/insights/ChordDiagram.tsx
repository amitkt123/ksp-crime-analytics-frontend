import { useMemo } from 'react';
import { chord, ribbon } from 'd3-chord';
import { arc as d3arc } from 'd3-shape';

interface ChordDiagramProps {
  labels: string[];
  matrix: number[][];
  size?: number;
}

const CHORD_COLORS = ['var(--real)', 'var(--predicted)', 'var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--muted-2)'];

export function ChordDiagram({ labels, matrix, size = 320 }: ChordDiagramProps) {
  const outerRadius = size / 2 - 44;
  const innerRadius = outerRadius - 14;

  const chordLayout = useMemo(
    () => chord().padAngle(0.04).sortSubgroups((a, b) => b - a)(matrix),
    [matrix],
  );

  const arcGenerator = useMemo(
    () => d3arc<never, (typeof chordLayout.groups)[number]>().innerRadius(innerRadius).outerRadius(outerRadius),
    [innerRadius, outerRadius],
  );
  const ribbonGenerator = useMemo(() => ribbon<never, (typeof chordLayout)[number]>().radius(innerRadius), [innerRadius]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="img" aria-label="Crime head to act chord diagram">
      <g transform={`translate(${size / 2},${size / 2})`}>
        {chordLayout.map((d, i) => (
          <path
            key={i}
            className="chord-ribbon"
            d={ribbonGenerator(d) ?? undefined}
            fill={CHORD_COLORS[d.source.index % CHORD_COLORS.length]}
            fillOpacity={0.55}
            stroke="var(--panel)"
            strokeWidth={0.5}
          />
        ))}
        {chordLayout.groups.map((group, i) => {
          const midAngle = (group.startAngle + group.endAngle) / 2;
          return (
            <g key={i}>
              <path className="chord-arc" d={arcGenerator(group) ?? undefined} fill={CHORD_COLORS[i % CHORD_COLORS.length]} />
              <text
                transform={`rotate(${(midAngle * 180) / Math.PI - 90}) translate(${outerRadius + 8})`}
                textAnchor={midAngle > Math.PI ? 'end' : 'start'}
                fontSize={9.5}
                fill="var(--text)"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
