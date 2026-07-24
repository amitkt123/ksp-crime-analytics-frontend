import { useMemo, useState } from 'react';
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
import { CaseLoadTreemap } from './CaseLoadTreemap';

export function JudicialUnitsTab() {
  const courtPending = getCourtPendingDemo();
  const outcome = getFinalReportOutcomeDemo();
  const unitCaseLoad = getDistrictUnitCaseLoadDemo();
  const rankDistribution = getRankDistributionDemo();
  const unitPerformance = getUnitPerformanceDemo();

  const [treemapDistrictFilter, setTreemapDistrictFilter] = useState('');
  const districtOptions = useMemo(
    () => [...new Set(unitCaseLoad.map((r) => r.districtName))].sort((a, b) => a.localeCompare(b)),
    [unitCaseLoad],
  );
  const filteredUnitCaseLoad = treemapDistrictFilter
    ? unitCaseLoad.filter((r) => r.districtName === treemapDistrictFilter)
    : unitCaseLoad;

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
          <div className="filter-field" style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              aria-label="Filter by district"
              value={treemapDistrictFilter}
              onChange={(e) => setTreemapDistrictFilter(e.target.value)}
            >
              <option value="">All districts</option>
              {districtOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button type="button" className="reset-filters-btn" onClick={() => setTreemapDistrictFilter('')}>
              Reset
            </button>
          </div>
          <CaseLoadTreemap data={filteredUnitCaseLoad} height={520} />
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
                {filteredUnitCaseLoad.map((row) => (
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
