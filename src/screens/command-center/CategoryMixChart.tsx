import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySliceResponse } from '../../api/commandCenterApi';

// Reordered palette to ensure high-count serious crimes don't land on the first (often green) slot.
const COLOR_SLOTS = [2, 3, 4, 5, 1, 6, 7, 8, 9, 10];
const RADIAN = Math.PI / 180;

const CustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent, crimeGroupName, fill } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  // Start of the line, just outside the slice
  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  // Midpoint of the line
  const mx = cx + (outerRadius + 15) * cos;
  const my = cy + (outerRadius + 15) * sin;
  // Endpoint of the line, where text starts
  const ex = mx + (cos >= 0 ? 1 : -1) * 18;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  // Don't render labels for very small slices to avoid clutter
  if (percent < 0.01) {
    return null;
  }

  return (
    <g>
      {/* The line from slice to text */}
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      {/* A small circle at the start of the line */}
      <circle cx={sx} cy={sy} r={2} fill={fill} stroke="none" />
      {/* Category name */}
      <text x={ex + (cos >= 0 ? 1 : -1) * 4} y={ey} textAnchor={textAnchor} fill="var(--ink)" fontSize={12} fontWeight="bold">
        {crimeGroupName}
      </text>
      {/* Percentage */}
      <text x={ex + (cos >= 0 ? 1 : -1) * 4} y={ey} dy={14} textAnchor={textAnchor} fill="var(--muted)" fontSize={11}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

interface CategoryMixChartProps {
  categoryMix: CategorySliceResponse[];
}

export function CategoryMixChart({ categoryMix }: CategoryMixChartProps) {
  const sorted = [...categoryMix].sort((a, b) => b.count - a.count);

  return (
    <div className="relative my-2 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={sorted}
            dataKey="count"
            nameKey="crimeGroupName"
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={66}
            paddingAngle={3}
            labelLine={false}
            label={<CustomizedLabel />}
          >
            {sorted.map((slice, index) => (
              <Cell
                key={slice.crimeHeadId}
                fill={`var(--cat-${COLOR_SLOTS[index % COLOR_SLOTS.length]})`}
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
  );
}