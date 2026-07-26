import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SidePanelChrome } from '../../design-system/SidePanelChrome';
import type { KpiResponse, CategorySliceResponse, SparklinePointResponse } from '../../api/commandCenterApi';
import { CategoryMixChart } from './CategoryMixChart';
import type { CommandCenterMetricKey, MetricScope } from './KpiPanel';

const SCOPE_WORD: Record<MetricScope, string> = { state: 'State', district: 'District' };

interface MetricDetailModalProps {
  metricKey: CommandCenterMetricKey | null;
  scope: MetricScope;
  kpi: KpiResponse;
  categoryMix: CategorySliceResponse[];
  caseVolumeWeekly: SparklinePointResponse[];
  arrestsWeekly: SparklinePointResponse[];
  onClose: () => void;
}

export function MetricDetailModal({
  metricKey,
  scope,
  kpi,
  categoryMix,
  caseVolumeWeekly,
  arrestsWeekly,
  onClose,
}: MetricDetailModalProps) {
  const open = metricKey != null;
  const scopeWord = SCOPE_WORD[scope];
  const metricLabel: Record<CommandCenterMetricKey, string> = {
    'case-count': `${scopeWord} case count`,
    'resolved-pct': 'Cases resolved',
    'top-crime-subhead': 'Top crime sub-head',
  };
  const label = (metricKey && metricLabel[metricKey]) || 'Metric detail';
  const trend = caseVolumeWeekly.map((point, index) => ({
    week: `W${point.isoWeek}`,
    caseVolume: point.count,
    arrests: arrestsWeekly[index]?.count ?? 0,
  }));

  return (
    <SidePanelChrome open={open} onClose={onClose} title={label} className="modal cc-mockup-type">
      {open && (
        <div className="flex flex-col gap-4">
          <MetricHeadline metricKey={metricKey} kpi={kpi} scopeWord={scopeWord} />

          <div className="rounded-xl border border-border bg-canvas p-4">
            <h3 className="mb-3 text-[13px] font-bold text-ink">{scopeWord} case volume vs. arrests, weekly</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="caseVolume" name="Case volume" stroke="var(--real)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="arrests" name="Arrests logged" stroke="var(--predicted)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <section>
            <h3 className="mb-2.5 flex items-center justify-between text-[13px] font-bold text-ink">
              Case category mix <span className="count mono text-[11px] font-medium text-muted">30-day window</span>
            </h3>
            <div className="rounded-xl border border-border bg-canvas p-4">
              <CategoryMixChart categoryMix={categoryMix} />
            </div>
          </section>
        </div>
      )}
    </SidePanelChrome>
  );
}

function MetricHeadline({
  metricKey,
  kpi,
  scopeWord,
}: {
  metricKey: CommandCenterMetricKey | null;
  kpi: KpiResponse;
  scopeWord: string;
}) {
  if (metricKey === 'resolved-pct') {
    return (
      <div className="rounded-xl border border-border bg-canvas p-4">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">Cases resolved</span>
        <div className="mono mt-1.5 text-2xl font-bold text-ink">
          {kpi.resolvedPct.toFixed(1)}
          <small className="text-xs font-medium text-muted">%</small>
        </div>
        <Delta value={kpi.resolvedPctDeltaPts} suffix=" pt vs. prior 30 days" />
      </div>
    );
  }

  if (metricKey === 'top-crime-subhead') {
    return (
      <div className="rounded-xl border border-border bg-canvas p-4">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">Top crime sub-head</span>
        <div className="mt-1.5 text-lg font-bold text-ink">{kpi.topCrimeSubHead}</div>
        <div className="mono mt-0.5 text-base font-bold text-ink">{kpi.topCrimeSubHeadCount.toLocaleString()}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <span className="text-xs font-semibold tracking-wider text-muted uppercase">{scopeWord} case count</span>
      <div className="mono mt-1.5 text-2xl font-bold text-ink">{kpi.stateCaseCount.toLocaleString()}</div>
      <Delta value={kpi.stateCaseCountDeltaPct} suffix="% vs. prior 30 days" />
    </div>
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
