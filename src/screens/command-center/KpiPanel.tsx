import type { KpiResponse } from '../../api/commandCenterApi';

interface KpiPanelProps {
  kpi: KpiResponse;
}

export function KpiPanel({ kpi }: KpiPanelProps) {
  return (
    <section className="kpi-grid">
      <div className="kpi-tile">
        <span className="eyebrow">State case count</span>
        <div className="figure mono">{kpi.stateCaseCount.toLocaleString()}</div>
        <Delta value={kpi.stateCaseCountDeltaPct} suffix="% vs. prior 30 days" />
      </div>
      <div className="kpi-tile">
        <span className="eyebrow">Cases resolved</span>
        <div className="figure mono">
          {kpi.resolvedPct.toFixed(1)}
          <small>%</small>
        </div>
        <Delta value={kpi.resolvedPctDeltaPts} suffix=" pt vs. prior 30 days" />
      </div>
      <div className="kpi-tile wide">
        <div>
          <span className="eyebrow">Top crime sub-head</span>
          <div className="figure" style={{ fontSize: 15 }}>{kpi.topCrimeSubHead}</div>
        </div>
        <div className="figure mono" style={{ fontSize: 18 }}>{kpi.topCrimeSubHeadCount.toLocaleString()}</div>
      </div>
    </section>
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
