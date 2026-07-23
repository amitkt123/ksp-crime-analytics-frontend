import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import {
  getCourtPendingDemo,
  getFinalReportOutcomeDemo,
  getDistrictUnitCaseLoadDemo,
  getRankDistributionDemo,
  getUnitPerformanceDemo,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';

export function JudicialUnitsTab() {
  const courtPending = getCourtPendingDemo();
  const outcome = getFinalReportOutcomeDemo();
  const unitCaseLoad = getDistrictUnitCaseLoadDemo();
  const rankDistribution = getRankDistributionDemo();
  const unitPerformance = getUnitPerformanceDemo();

  const treemapData = Object.entries(
    unitCaseLoad.reduce<Record<string, { districtName: string; unitName: string; caseCount: number }[]>>((acc, row) => {
      (acc[row.districtName] ??= []).push(row);
      return acc;
    }, {}),
  ).map(([districtName, units]) => ({
    name: districtName,
    children: units.map((u) => ({ name: u.unitName, size: u.caseCount })),
  }));

  return (
    <>
      <div className="insight-grid-2">
        <InsightCard
          title="Court-wise Pending Cases"
          live={false}
          note="Top 12 courts by pending load."
          expand={{ columns: ['Court', 'Pending'], rows: courtPending.map((c) => [c.court, c.pending]) }}
        >
          <RankedBarList items={courtPending.map((c) => ({ label: c.court, value: c.pending }))} />
        </InsightCard>

        <InsightCard title="Final Report Outcome" live={false} expand={{ columns: ['Outcome', 'Count'], rows: outcome.map((o) => [o.outcome, o.count]) }}>
          <Donut slices={outcome.map((o) => ({ label: o.outcome, value: o.count }))} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard title="District → Unit Case Load" live={false} note="Area = FIRs registered per unit, across all 30 Karnataka districts.">
          <ResponsiveContainer width="100%" height={200}>
            <Treemap data={treemapData} dataKey="size" stroke="var(--panel)" fill="var(--real)">
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            </Treemap>
          </ResponsiveContainer>
          {/* Recharts' Treemap only renders cell labels above a pixel-size threshold, so the
              breakdown is repeated here as plain text -- reliable regardless of rendered cell size. */}
          <div className="case-table-wrap">
            <table className="case-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th>Unit</th>
                  <th>Cases</th>
                </tr>
              </thead>
              <tbody>
                {unitCaseLoad.map((row) => (
                  <tr key={row.districtName + row.unitName}>
                    <td>{row.districtName}</td>
                    <td>{row.unitName}</td>
                    <td className="mono">{row.caseCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>
      </div>

      <div className="insight-grid-2" style={{ marginTop: 16 }}>
        <InsightCard
          title="Employee Rank Distribution"
          live={false}
          expand={{ columns: ['Rank', 'Headcount'], rows: rankDistribution.map((r) => [r.rank, r.headcount]) }}
        >
          <RankedBarList items={rankDistribution.map((r) => ({ label: r.rank, value: r.headcount }))} />
        </InsightCard>

        <InsightCard title="Unit Performance" live={false} note="Case count, pending share & average resolution time per unit.">
          <div className="case-table-wrap">
            <table className="case-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Cases</th>
                  <th>Pending share</th>
                  <th>Avg. resolution</th>
                </tr>
              </thead>
              <tbody>
                {unitPerformance.map((row) => (
                  <tr key={row.unitName}>
                    <td>{row.unitName}</td>
                    <td className="mono">{row.caseCount}</td>
                    <td className="mono">{row.pendingSharePct}%</td>
                    <td className="mono">{row.avgResolutionDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>
      </div>
    </>
  );
}
