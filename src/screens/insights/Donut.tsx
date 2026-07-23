export interface DonutSlice {
  label: string;
  value: number;
}

interface DonutProps {
  slices: DonutSlice[];
}

const SLOT_COLORS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--muted-2)'];
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Donut({ slices }: DonutProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 160 160" width={160} height={160} role="img" aria-label="Donut chart">
        <g transform="translate(80,80) rotate(-90)">
          {slices.map((slice, i) => {
            const fraction = total === 0 ? 0 : slice.value / total;
            const dash = fraction * CIRCUMFERENCE;
            const gap = CIRCUMFERENCE - dash;
            const offset = -cumulative * CIRCUMFERENCE;
            cumulative += fraction;
            return (
              <circle
                key={slice.label}
                r={RADIUS}
                fill="none"
                stroke={SLOT_COLORS[i % SLOT_COLORS.length]}
                strokeWidth={24}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" className="donut-total mono">
          {total.toLocaleString()}
        </text>
        <text x="80" y="94" textAnchor="middle" className="donut-total-label">
          total
        </text>
      </svg>
      <div className="cat-legend">
        {slices.map((slice, i) => (
          <span key={slice.label} className="cat-legend-item">
            <span className="cat-swatch" style={{ background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
            {slice.label} ({total === 0 ? 0 : Math.round((slice.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
