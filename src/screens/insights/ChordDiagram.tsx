import { useMemo, useState } from 'react';
import { chord, ribbon } from 'd3-chord';
import { arc as d3arc } from 'd3-shape';

interface ChordDiagramProps {
  labels: string[];
  matrix: number[][];
  size?: number;
}

const CHORD_COLORS = ['var(--real)', 'var(--predicted)', 'var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--muted-2)'];

export function ChordDiagram({ labels, matrix, size = 320 }: ChordDiagramProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Thinner ring than before (was a 14px-thick band) -- a finer ring reads closer to the
  // reference chord-diagram aesthetic and leaves more room for ribbon curvature.
  const outerRadius = size / 2 - 46;
  const innerRadius = outerRadius - 8;

  const chordLayout = useMemo(
    () => chord().padAngle(0.04).sortSubgroups((a, b) => b - a)(matrix),
    [matrix],
  );

  const arcGenerator = useMemo(
    () => d3arc<(typeof chordLayout.groups)[number]>().innerRadius(innerRadius).outerRadius(outerRadius),
    [innerRadius, outerRadius],
  );
  const ribbonGenerator = useMemo(() => ribbon<(typeof chordLayout)[number], never>().radius(innerRadius), [innerRadius]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="img" aria-label="Crime head to act chord diagram">
      <g transform={`translate(${size / 2},${size / 2})`}>
        {chordLayout.map((d, i) => {
          const isRelated = hoveredIndex === null || d.source.index === hoveredIndex || d.target.index === hoveredIndex;
          return (
            <path
              key={i}
              className={`chord-ribbon${isRelated && hoveredIndex !== null ? ' chord-ribbon-active' : ''}`}
              d={ribbonGenerator(d) ?? undefined}
              fill={CHORD_COLORS[d.source.index % CHORD_COLORS.length]}
              fillOpacity={isRelated ? 0.55 : 0.1}
              stroke="var(--panel)"
              strokeWidth={0.5}
              style={{ transition: 'fill-opacity 0.15s ease' }}
            />
          );
        })}
        {chordLayout.groups.map((group, i) => {
          const midAngle = (group.startAngle + group.endAngle) / 2;
          const isLeftHalf = midAngle > Math.PI;
          const isHovered = hoveredIndex === i;
          const isFaded = hoveredIndex !== null && !isHovered;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              <path
                className={`chord-arc${isHovered ? ' chord-arc-active' : ''}`}
                d={arcGenerator(group) ?? undefined}
                fill={CHORD_COLORS[i % CHORD_COLORS.length]}
                opacity={isFaded ? 0.3 : 1}
                style={{ transition: 'opacity 0.15s ease' }}
              />
              <text
                transform={`rotate(${(midAngle * 180) / Math.PI - 90}) translate(${outerRadius + 8}) ${isLeftHalf ? 'rotate(180)' : ''}`}
                textAnchor={isLeftHalf ? 'end' : 'start'}
                fontSize={9.5}
                fill="var(--text)"
                opacity={isFaded ? 0.35 : 1}
                style={{ transition: 'opacity 0.15s ease' }}
              >
                {labels[i]}
              </text>
              <text
                transform={`rotate(${(midAngle * 180) / Math.PI - 90}) translate(${outerRadius + 8}) ${isLeftHalf ? 'rotate(180)' : ''}`}
                dy="1.2em"
                textAnchor={isLeftHalf ? 'end' : 'start'}
                fontSize={9}
                fontWeight={isHovered ? 700 : 400}
                fill={isHovered ? 'var(--real)' : 'var(--muted)'}
                opacity={isFaded ? 0.35 : 1}
                className="mono"
                style={{ transition: 'opacity 0.15s ease' }}
              >
                {group.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
