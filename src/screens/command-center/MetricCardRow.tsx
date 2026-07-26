import { Info } from 'lucide-react';
import type { KpiResponse, SparklinePointResponse } from '../../api/commandCenterApi';
import type { CommandCenterMetricKey, MetricScope } from './KpiPanel';

interface MetricCardRowProps {
  kpi: KpiResponse;
  arrestsWeekly: SparklinePointResponse[];
  stateCaseVolumeWeekly: SparklinePointResponse[];
  crimesAgainstPropertyWeekly?: SparklinePointResponse[];
  onSelectMetric: (metric: CommandCenterMetricKey, scope: MetricScope) => void;
}

// Top 5-card row (mockup's MetricCard.tsx had 4; crimesAgainstPropertyWeekly was added
// as a 5th card here). Only the first two carry a scalar delta from KpiResponse and
// stay clickable into MetricDetailScreen -- the other three are real weekly point
// series with no metric-detail route of their own, so they render a sparkline instead
// of a click target.
export function MetricCardRow({
  kpi,
  arrestsWeekly,
  stateCaseVolumeWeekly,
  crimesAgainstPropertyWeekly = [],
  onSelectMetric,
}: MetricCardRowProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        id="case-count"
        title="State case count"
        description="Total number of active cases across all districts."
        value={kpi.stateCaseCount.toLocaleString()}
        deltaValue={kpi.stateCaseCountDeltaPct}
        deltaSuffix="% vs. prior 30 days"
        onClick={() => onSelectMetric('case-count', 'state')}
      />
      <MetricCard
        id="resolved-pct"
        title="Cases resolved"
        description="Percentage of cases that have been marked as resolved."
        value={`${kpi.resolvedPct.toFixed(1)}%`}
        deltaValue={kpi.resolvedPctDeltaPts}
        deltaSuffix=" pt vs. prior 30 days"
        onClick={() => onSelectMetric('resolved-pct', 'state')}
      />
      <SparkMetricCard
        id="arrests-weekly"
        title="Arrests logged, weekly"
        description="Total number of arrests logged in the last 7 days."
        points={arrestsWeekly}
      />
      <SparkMetricCard
        id="case-volume-weekly"
        title="State case volume, weekly"
        description="Total number of cases opened in the last 7 days."
        points={stateCaseVolumeWeekly}
      />
      <SparkMetricCard
        id="crime-property-weekly"
        title="Crimes against property, weekly"
        description="Total number of crimes against property in the last 7 days."
        points={crimesAgainstPropertyWeekly}
      />
    </section>
  );
}

function MetricCard({
  id,
  title,
  description,
  value,
  deltaValue,
  deltaSuffix,
  onClick,
}: {
  id: string;
  title: string;
  description: string;
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
      title={description}
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

function SparkMetricCard({
  id,
  title,
  description,
  points,
}: {
  id: string;
  title: string;
  description: string;
  points: SparklinePointResponse[];
}) {
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
    <div
      id={`metric-card-${id}`}
      className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm"
      title={description}
    >
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