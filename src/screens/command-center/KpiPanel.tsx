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
    <section className="kpi-grid">
      <Tile metric="case-count" onSelectMetric={onSelectMetric}>
        <span className="eyebrow">{scopeLabel}</span>
        <div className="figure mono">{kpi.stateCaseCount.toLocaleString()}</div>
        <Delta value={kpi.stateCaseCountDeltaPct} suffix="% vs. prior 30 days" />
      </Tile>
      <Tile metric="resolved-pct" onSelectMetric={onSelectMetric}>
        <span className="eyebrow">Cases resolved</span>
        <div className="figure mono">
          {kpi.resolvedPct.toFixed(1)}
          <small>%</small>
        </div>
        <Delta value={kpi.resolvedPctDeltaPts} suffix=" pt vs. prior 30 days" />
      </Tile>
      <Tile metric="top-crime-subhead" wide onSelectMetric={onSelectMetric}>
        <div>
          <span className="eyebrow">Top crime sub-head</span>
          <div className="figure" style={{ fontSize: 15 }}>{kpi.topCrimeSubHead}</div>
        </div>
        <div className="figure mono" style={{ fontSize: 18 }}>{kpi.topCrimeSubHeadCount.toLocaleString()}</div>
      </Tile>
    </section>
  );
}

function Tile({
  metric,
  wide,
  onSelectMetric,
  children,
}: {
  metric: CommandCenterMetricKey;
  wide?: boolean;
  onSelectMetric?: (metric: CommandCenterMetricKey) => void;
  children: ReactNode;
}) {
  const className = `kpi-tile${wide ? ' wide' : ''}`;
  if (!onSelectMetric) {
    return <div className={className}>{children}</div>;
  }
  return (
    <button type="button" className={`${className} kpi-tile-btn`} onClick={() => onSelectMetric(metric)}>
      {children}
    </button>
  );
}

function Delta({ value, suffix }: { value: number; suffix: string }) {
  const direction = value >= 0 ? 'up' : 'down';
  return (
    <div className={`foot ${direction}`}>
      {direction === 'up' ? '▲' : '▼'} {Math.abs(value).toFixed(1)}{suffix}
    </div>
  );
}
