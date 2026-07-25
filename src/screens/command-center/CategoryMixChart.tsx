import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySliceResponse } from '../../api/commandCenterApi';

// Fixed crime_head_id -> categorical palette slot (tokens.css's --cat-1..--cat-5), chosen so
// "Crimes Against Women" (seeded id 3) never lands on the green slot (--cat-1) -- per
// docs/superpowers/specs/2026-07-15-frontend-project-design.md's categorical palette rule.
// IDs are the real seeded values from R__seed_reference_data.sql, not derived at runtime.
const CRIME_HEAD_SLOT: Record<number, number> = {
  1: 1, // Crimes Against Body
  3: 2, // Crimes Against Women
  4: 3, // Economic Offences
  2: 4, // Crimes Against Property
  5: 5, // Cyber Crimes
};

interface CategoryMixChartProps {
  categoryMix: CategorySliceResponse[];
}

export function CategoryMixChart({ categoryMix }: CategoryMixChartProps) {
  const sorted = [...categoryMix].sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="relative my-2 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sorted} dataKey="count" nameKey="crimeGroupName" cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3}>
              {sorted.map((slice) => (
                <Cell
                  key={slice.crimeHeadId}
                  fill={`var(--cat-${CRIME_HEAD_SLOT[slice.crimeHeadId] ?? 5})`}
                  stroke="var(--panel)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(val) => [typeof val === 'number' ? val.toLocaleString() : String(val ?? ''), 'Cases']}
              contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="cat-legend flex flex-col gap-1.5 border-t border-border pt-2 text-xs">
        {sorted.map((slice) => (
          <div key={slice.crimeHeadId} className="cat-legend-item flex items-center justify-between text-ink">
            <span className="flex items-center gap-2">
              <span
                className="cat-swatch h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: `var(--cat-${CRIME_HEAD_SLOT[slice.crimeHeadId] ?? 5})` }}
              />
              {slice.crimeGroupName}
            </span>
            <span className="mono font-semibold">{slice.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
