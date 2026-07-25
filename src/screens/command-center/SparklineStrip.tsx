import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { SparklinePointResponse } from '../../api/commandCenterApi';

interface SparklineStripProps {
  crimesAgainstPropertyWeekly: SparklinePointResponse[];
}

// The mockup has no 5th top-metric-card slot for this series (see the design spec's
// "Data -- no fabrication" section), so it's kept as a single restyled spark-card under
// the map rather than dropped -- an intentional addition beyond the mockup to avoid
// deleting real functionality.
export function SparklineStrip({ crimesAgainstPropertyWeekly }: SparklineStripProps) {
  const latest = crimesAgainstPropertyWeekly.at(-1);
  const previous = crimesAgainstPropertyWeekly.at(-2);
  const value = latest?.count ?? 0;
  const deltaPct = previous && previous.count > 0 ? ((value - previous.count) * 100) / previous.count : 0;
  const direction = deltaPct >= 0 ? 'up' : 'down';

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 shadow-sm">
      <div className="text-xs text-muted">Crimes against property, weekly</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="mono text-xl font-bold text-ink">{value.toLocaleString()}</span>
        <span className={`mono flex items-center gap-0.5 text-[11px] font-medium ${direction === 'up' ? 'text-danger' : 'text-accent'}`}>
          {direction === 'up' ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={crimesAgainstPropertyWeekly}>
          <Line type="monotone" dataKey="count" stroke="var(--real)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
