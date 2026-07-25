import { Info } from 'lucide-react';
import type { KpiResponse, SparklinePointResponse } from '../../api/commandCenterApi';
import type { CommandCenterMetricKey } from './KpiPanel';

interface MetricCardRowProps {
  kpi: KpiResponse;
  arrestsWeekly: SparklinePointResponse[];
  stateCaseVolumeWeekly: SparklinePointResponse[];
  onSelectMetric: (metric: CommandCenterMetricKey) => void;
}

// Top 4-card row (mockup's MetricCard.tsx). Only the first two carry a scalar
// delta from KpiResponse and stay clickable into MetricDetailScreen -- the other
// two are real weekly point series (arrestsWeekly/stateCaseVolumeWeekly) with no
// metric-detail route of their own, so they render a sparkline instead of a click target.
export function MetricCardRow({ kpi, arrestsWeekly, stateCaseVolumeWeekly, onSelectMetric }: MetricCardRowProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        id="case-count"
        title="State case count"
        value={kpi.stateCaseCount.toLocaleString()}
        deltaValue={kpi.stateCaseCountDeltaPct}
        deltaSuffix="% vs. prior 30 days"
        onClick={() => onSelectMetric('case-count')}
      />
      <MetricCard
        id="resolved-pct"
        title="Cases resolved"
        value={`${kpi.resolvedPct.toFixed(1)}%`}
        deltaValue={kpi.resolvedPctDeltaPts}
        deltaSuffix=" pt vs. prior 30 days"
        onClick={() => onSelectMetric('resolved-pct')}
      />
      <SparkMetricCard id="arrests-weekly" title="Arrests logged, weekly" points={arrestsWeekly} />
      <SparkMetricCard id="case-volume-weekly" title="State case volume, weekly" points={stateCaseVolumeWeekly} />
    </section>
  );
}

function MetricCard({
  id,
  title,
  value,
  deltaValue,
  deltaSuffix,
  onClick,
}: {
  id: string;
  title: string;
  value: string;
  deltaValue: number;
  deltaSuffix: string;
  onClick: () => void;
}) {
  const direction = deltaValue >= 0 ? 'up' : 'down';
  return (
    <button
      type="button"
      id={`metric-card-${id}`}
      onClick={onClick}
      className="group flex cursor-pointer flex-col justify-between gap-2 rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition-all hover:border-accent hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">{title}</span>
        <Info className="h-4 w-4 text-muted" aria-hidden="true" />
      </div>
      <div>
        <div className="mono text-3xl font-extrabold tracking-tight text-ink" data-testid="metric-card-value">
          {value}
        </div>
        <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${direction === 'up' ? 'text-danger' : 'text-accent'}`}>
          <span>
            {direction === 'up' ? '▲' : '▼'} {Math.abs(deltaValue).toFixed(1)}
          </span>
          <span className="font-normal text-muted">{deltaSuffix}</span>
        </div>
      </div>
    </button>
  );
}

function SparkMetricCard({ id, title, points }: { id: string; title: string; points: SparklinePointResponse[] }) {
  const latest = points.at(-1);
  const previous = points.at(-2);
  const value = latest?.count ?? 0;
  const deltaPct = previous && previous.count > 0 ? ((value - previous.count) * 100) / previous.count : 0;
  const direction = deltaPct >= 0 ? 'up' : 'down';

  const values = points.map((p) => p.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100;
  const height = 40;
  const svgPoints = values
    .map((val, idx) => {
      const x = values.length > 1 ? (idx / (values.length - 1)) * width : width;
      const y = height - ((val - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div id={`metric-card-${id}`} className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">{title}</span>
        <Info className="h-4 w-4 text-muted" aria-hidden="true" />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="mono text-3xl font-extrabold tracking-tight text-ink" data-testid="metric-card-value">
            {value.toLocaleString()}
          </div>
          <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${direction === 'up' ? 'text-danger' : 'text-accent'}`}>
            {direction === 'up' ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
          </div>
        </div>
        {values.length > 0 && (
          <div className="h-11 w-24 flex-shrink-0">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
              <polyline
                fill="none"
                stroke={direction === 'up' ? 'var(--alert)' : 'var(--real)'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={svgPoints}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
