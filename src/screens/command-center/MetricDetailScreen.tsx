import { Link, useParams } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { useCommandCenterSummary } from '../../api/commandCenterApi';
import { CategoryMixChart } from './CategoryMixChart';
import type { CommandCenterMetricKey } from './KpiPanel';

const METRIC_LABEL: Record<CommandCenterMetricKey, string> = {
  'case-count': 'State case count',
  'resolved-pct': 'Cases resolved',
  'top-crime-subhead': 'Top crime sub-head',
};

export function MetricDetailScreen() {
  const { token } = useAuth();
  const { metricKey } = useParams<{ metricKey: CommandCenterMetricKey }>();
  const summaryQuery = useCommandCenterSummary(token);

  if (summaryQuery.isLoading) {
    return (
      <>
        <Header title="Command Center" />
        <main className="main-single">
          <p>Loading metric…</p>
        </main>
      </>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <>
        <Header title="Command Center" />
        <main className="main-single">
          <p role="alert">Couldn't load this metric — check your connection and try again.</p>
          <button onClick={() => summaryQuery.refetch()}>Retry</button>
        </main>
      </>
    );
  }

  const summary = summaryQuery.data;
  const label = (metricKey && METRIC_LABEL[metricKey]) || 'Metric detail';
  const trend = summary.stateCaseVolumeWeekly.map((point, index) => ({
    week: `W${point.isoWeek}`,
    caseVolume: point.count,
    arrests: summary.arrestsWeekly[index]?.count ?? 0,
  }));

  return (
    <>
      <Header title="Command Center" />
      <main className="main-single metric-detail">
        <div className="breadcrumb">
          <Link className="breadcrumb-back" to="/command-center">Command Center</Link>
          <span className="sep">›</span>
          <b>{label}</b>
        </div>

        <MetricHeadline metricKey={metricKey} summary={summary} />

        <div className="metric-trend-card">
          <h3>State case volume vs. arrests, weekly</h3>
          <ResponsiveContainer width="100%" height={280}>
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
          <h3>
            Case category mix <span className="count">30-day window</span>
          </h3>
          <CategoryMixChart categoryMix={summary.categoryMix} />
        </section>
      </main>
    </>
  );
}

function MetricHeadline({
  metricKey,
  summary,
}: {
  metricKey: CommandCenterMetricKey | undefined;
  summary: { kpi: { stateCaseCount: number; stateCaseCountDeltaPct: number; resolvedPct: number; resolvedPctDeltaPts: number; topCrimeSubHead: string; topCrimeSubHeadCount: number } };
}) {
  const { kpi } = summary;

  if (metricKey === 'resolved-pct') {
    return (
      <div className="kpi-tile metric-headline">
        <span className="eyebrow">Cases resolved</span>
        <div className="figure mono">
          {kpi.resolvedPct.toFixed(1)}
          <small>%</small>
        </div>
        <Delta value={kpi.resolvedPctDeltaPts} suffix=" pt vs. prior 30 days" />
      </div>
    );
  }

  if (metricKey === 'top-crime-subhead') {
    return (
      <div className="kpi-tile metric-headline">
        <span className="eyebrow">Top crime sub-head</span>
        <div className="figure" style={{ fontSize: 20 }}>{kpi.topCrimeSubHead}</div>
        <div className="figure mono" style={{ fontSize: 16 }}>{kpi.topCrimeSubHeadCount.toLocaleString()}</div>
      </div>
    );
  }

  return (
    <div className="kpi-tile metric-headline">
      <span className="eyebrow">State case count</span>
      <div className="figure mono">{kpi.stateCaseCount.toLocaleString()}</div>
      <Delta value={kpi.stateCaseCountDeltaPct} suffix="% vs. prior 30 days" />
    </div>
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
