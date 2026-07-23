import { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { useCommandCenterSummary } from '../../api/commandCenterApi';
import { useHotspots, useDistrictBoundaries } from '../../api/geoApi';
import { canShowLiveHotspots } from '../../api/insightsApi';
import {
  CRIME_HEADS_DEMO,
  getCrimeHeadMonthlyTrend,
  getCohortHeatmap,
  getDistrictCrimeHeadMatrix,
  getAllDistrictNamesDemo,
  getIncidentHotspotsDemo,
} from '../../api/demoAnalyticsData';
import { CategoryMixChart } from '../command-center/CategoryMixChart';
import { InsightCard } from './InsightCard';
import { HeatmapGrid, type HeatmapCell } from './HeatmapGrid';
import { KarnatakaHotspotMap } from './KarnatakaHotspotMap';

export function CrimeTrendsTab() {
  const { token, roles } = useAuth();
  const summaryQuery = useCommandCenterSummary(token);
  const liveHotspots = canShowLiveHotspots(roles);
  const hotspotsQuery = useHotspots(token, liveHotspots);
  const boundariesQuery = useDistrictBoundaries(token);
  const [matrixDistrictFilter, setMatrixDistrictFilter] = useState('');

  const monthlyTrend = getCrimeHeadMonthlyTrend();
  const cohort = getCohortHeatmap();
  const matrix = getDistrictCrimeHeadMatrix(matrixDistrictFilter || undefined);
  const allDistrictNames = getAllDistrictNamesDemo();
  const demoHotspots = getIncidentHotspotsDemo();

  const cohortCells: HeatmapCell[] = cohort.map((c) => ({
    row: c.cohortLabel, col: c.lagLabel, intensity: c.pct, display: `${Math.round(c.pct * 100)}%`,
  }));
  const cohortRows = [...new Set(cohort.map((c) => c.cohortLabel))];
  const cohortCols = [...new Set(cohort.map((c) => c.lagLabel))];

  const maxMatrixCount = Math.max(...matrix.map((m) => m.count), 1);
  const matrixCells: HeatmapCell[] = matrix.map((m) => ({
    row: m.districtName, col: m.crimeHead, intensity: m.count / maxMatrixCount, display: m.count.toLocaleString(),
  }));
  const matrixRows = [...new Set(matrix.map((m) => m.districtName))];
  const matrixCols = [...new Set(matrix.map((m) => m.crimeHead))];

  return (
    <>
      <div className="insight-grid-2">
        <InsightCard title="Crime Head Distribution" live>
          {summaryQuery.isLoading ? (
            <p>Loading…</p>
          ) : summaryQuery.isError ? (
            <p role="alert">Couldn't load crime head data.</p>
          ) : (
            <CategoryMixChart categoryMix={summaryQuery.data!.categoryMix} />
          )}
        </InsightCard>

        <InsightCard
          title="Crime Head Trend by Month"
          live={false}
          note="Stacked monthly volume across the top crime heads."
          expand={{
            columns: ['Month', ...CRIME_HEADS_DEMO],
            rows: monthlyTrend.map((p) => [p.monthLabel, ...CRIME_HEADS_DEMO.map((h) => p[h] as number)]),
          }}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" stroke="var(--muted)" fontSize={10} />
              <YAxis stroke="var(--muted)" fontSize={10} />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
              {CRIME_HEADS_DEMO.map((head, i) => (
                <Area
                  key={head}
                  type="monotone"
                  dataKey={head}
                  stackId="1"
                  stroke={`var(--cat-${(i % 5) + 1})`}
                  fill={`var(--cat-${(i % 5) + 1})`}
                  fillOpacity={0.65}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Cohort Analysis — Case Closure Velocity"
          live={false}
          note="% of each monthly cohort chargesheeted within N months of registration."
          expand={{ columns: ['Cohort', 'Lag', '% Chargesheeted'], rows: cohort.map((c) => [c.cohortLabel, c.lagLabel, `${Math.round(c.pct * 100)}%`]) }}
        >
          <HeatmapGrid rows={cohortRows} cols={cohortCols} cells={cohortCells} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="District × Crime Head Hotspot Matrix"
          live={false}
          note="Case counts per district per crime head, across all 30 Karnataka districts."
          expand={{ columns: ['District', 'Crime Head', 'Count'], rows: matrix.map((m) => [m.districtName, m.crimeHead, m.count]) }}
        >
          <div className="filter-field" style={{ marginBottom: 10 }}>
            <select aria-label="Filter by district" value={matrixDistrictFilter} onChange={(e) => setMatrixDistrictFilter(e.target.value)}>
              <option value="">All districts</option>
              {allDistrictNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <HeatmapGrid rows={matrixRows} cols={matrixCols} cells={matrixCells} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Incident Location Hotspots"
          live={liveHotspots}
          note={
            liveHotspots
              ? 'District-level DBSCAN clusters, bubble size = case count.'
              : "Cluster hotspots aren't available for unit-scoped roles — showing representative data."
          }
        >
          {boundariesQuery.isLoading ? (
            <p>Loading…</p>
          ) : boundariesQuery.isError ? (
            <p role="alert">Couldn't load district boundaries.</p>
          ) : liveHotspots ? (
            hotspotsQuery.isLoading ? (
              <p>Loading…</p>
            ) : hotspotsQuery.isError ? (
              <p role="alert">Couldn't load hotspot clusters.</p>
            ) : (
              <KarnatakaHotspotMap
                boundaries={boundariesQuery.data!}
                points={(hotspotsQuery.data ?? []).map((h) => ({ lat: h.centroidLat, lon: h.centroidLon, crimeHead: 'Cluster', count: h.caseCount }))}
              />
            )
          ) : (
            <KarnatakaHotspotMap boundaries={boundariesQuery.data!} points={demoHotspots} />
          )}
        </InsightCard>
      </div>
    </>
  );
}
