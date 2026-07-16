import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { SparklinePointResponse } from '../../api/commandCenterApi';

interface SparklineStripProps {
  stateCaseVolumeWeekly: SparklinePointResponse[];
  crimesAgainstPropertyWeekly: SparklinePointResponse[];
  arrestsWeekly: SparklinePointResponse[];
}

export function SparklineStrip({
  stateCaseVolumeWeekly,
  crimesAgainstPropertyWeekly,
  arrestsWeekly,
}: SparklineStripProps) {
  return (
    <div className="spark-strip">
      <SparkCard label="State case volume, weekly" points={stateCaseVolumeWeekly} />
      <SparkCard label="Crimes against property, weekly" points={crimesAgainstPropertyWeekly} />
      <SparkCard label="Arrests logged, weekly" points={arrestsWeekly} />
    </div>
  );
}

function SparkCard({ label, points }: { label: string; points: SparklinePointResponse[] }) {
  const latest = points.at(-1);
  const previous = points.at(-2);
  const value = latest?.count ?? 0;
  const deltaPct = previous && previous.count > 0 ? ((value - previous.count) * 100) / previous.count : 0;
  const direction = deltaPct >= 0 ? 'up' : 'down';

  return (
    <div className="spark-card">
      <div className="label">{label}</div>
      <div className="value-row">
        <span className="value mono">{value.toLocaleString()}</span>
        <span className={`delta ${direction} mono`}>
          {direction === 'up' ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={points}>
          <Line type="monotone" dataKey="count" stroke="var(--real)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
