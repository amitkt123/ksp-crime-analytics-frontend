import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { useCommandCenterSummary } from '../../api/commandCenterApi';
import { useHotspots } from '../../api/geoApi';
import { canShowLiveHotspots } from '../../api/insightsApi';
import {
  CRIME_HEADS_DEMO,
  getCrimeHeadMonthlyTrend,
  getCohortHeatmap,
  getDistrictCrimeHeadMatrix,
  getIncidentHotspotsDemo,
} from '../../api/demoAnalyticsData';
import { CategoryMixChart } from '../command-center/CategoryMixChart';
import { InsightCard } from './InsightCard';
import { HeatmapGrid, type HeatmapCell } from './HeatmapGrid';

export function CrimeTrendsTab() {
  const { token, roles } = useAuth();
  const summaryQuery = useCommandCenterSummary(token);
  const liveHotspots = canShowLiveHotspots(roles);
  const hotspotsQuery = useHotspots(token, liveHotspots);

  const monthlyTrend = getCrimeHeadMonthlyTrend();
  const cohort = getCohortHeatmap();
  const matrix = getDistrictCrimeHeadMatrix();
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
    <div className="insight-grid">
      <InsightCard title="Crime Head Distribution" live>
        {summaryQuery.isLoading ? (
          <p>Loading…</p>
        ) : summaryQuery.isError ? (
          <p role="alert">Couldn't load crime head data.</p>
        ) : (
          <CategoryMixChart categoryMix={summaryQuery.data!.categoryMix} />
        )}
      </InsightCard>

      <InsightCard title="Crime Head Trend by Month" live={false} note="Stacked monthly volume across the top crime heads.">
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

      <InsightCard
        title="Cohort Analysis — Case Closure Velocity"
        live={false}
        note="% of each monthly cohort chargesheeted within N months of registration."
      >
        <HeatmapGrid rows={cohortRows} cols={cohortCols} cells={cohortCells} />
      </InsightCard>

      <InsightCard title="District × Crime Head Hotspot Matrix" live={false} note="Case counts per district per crime head.">
        <HeatmapGrid rows={matrixRows} cols={matrixCols} cells={matrixCells} />
      </InsightCard>

      <InsightCard
        title="Incident Location Hotspots"
        live={liveHotspots}
        note={
          liveHotspots
            ? 'District-level DBSCAN clusters, bubble size = case count.'
            : "Cluster hotspots aren't available for unit-scoped roles — showing representative data."
        }
      >
        {liveHotspots ? (
          hotspotsQuery.isLoading ? (
            <p>Loading…</p>
          ) : hotspotsQuery.isError ? (
            <p role="alert">Couldn't load hotspot clusters.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="centroidLon" name="Longitude" stroke="var(--muted)" fontSize={10} />
                <YAxis type="number" dataKey="centroidLat" name="Latitude" stroke="var(--muted)" fontSize={10} />
                <ZAxis type="number" dataKey="caseCount" range={[40, 300]} />
                <Tooltip cursor={{ stroke: 'var(--line)' }} />
                <Scatter data={hotspotsQuery.data ?? []} fill="var(--real)" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          )
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="lon" name="Longitude" stroke="var(--muted)" fontSize={10} />
              <YAxis type="number" dataKey="lat" name="Latitude" stroke="var(--muted)" fontSize={10} />
              <Tooltip cursor={{ stroke: 'var(--line)' }} />
              <Scatter data={demoHotspots} fill="var(--predicted)" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </InsightCard>
    </div>
  );
}
