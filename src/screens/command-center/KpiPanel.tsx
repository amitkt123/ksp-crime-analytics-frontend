import type { ReactNode } from 'react';
import type { KpiResponse } from '../../api/commandCenterApi';

export type CommandCenterMetricKey = 'case-count' | 'resolved-pct' | 'top-crime-subhead';

interface KpiPanelProps {
  kpi: KpiResponse;
  scopeLabel?: string;
  onSelectMetric?: (metric: CommandCenterMetricKey) => void;
}

export function KpiPanel({ kpi, scopeLabel = 'State case count', onSelectMetric }: KpiPanelProps) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <Tile metric="case-count" onSelectMetric={onSelectMetric}>
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">{scopeLabel}</span>
        <div className="mono mt-1.5 text-2xl font-bold text-ink">{kpi.stateCaseCount.toLocaleString()}</div>
        <Delta value={kpi.stateCaseCountDeltaPct} suffix="% vs. prior 30 days" />
      </Tile>
      <Tile metric="resolved-pct" onSelectMetric={onSelectMetric}>
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">Cases resolved</span>
        <div className="mono mt-1.5 text-2xl font-bold text-ink">
          {kpi.resolvedPct.toFixed(1)}
          <small className="text-xs font-medium text-muted">%</small>
        </div>
        <Delta value={kpi.resolvedPctDeltaPts} suffix=" pt vs. prior 30 days" />
      </Tile>
    </section>
  );
}

function Tile({
  metric,
  onSelectMetric,
  children,
}: {
  metric: CommandCenterMetricKey;
  onSelectMetric?: (metric: CommandCenterMetricKey) => void;
  children: ReactNode;
}) {
  const className = 'rounded-xl border border-border bg-surface p-3.5';
  if (!onSelectMetric) {
    return <div className={className}>{children}</div>;
  }
  return (
    <button
      type="button"
      className={`${className} w-full cursor-pointer text-left transition-all hover:border-accent hover:shadow-md`}
      onClick={() => onSelectMetric(metric)}
    >
      {children}
    </button>
  );
}

function Delta({ value, suffix }: { value: number; suffix: string }) {
  const direction = value >= 0 ? 'up' : 'down';
  return (
    <div className={`mt-1.5 text-[11px] font-medium ${direction === 'up' ? 'text-danger' : 'text-accent'}`}>
      {direction === 'up' ? '▲' : '▼'} {Math.abs(value).toFixed(1)}
      {suffix}
    </div>
  );
}
