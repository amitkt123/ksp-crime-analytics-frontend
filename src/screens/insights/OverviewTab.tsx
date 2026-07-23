import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { useMe } from '../../api/meApi';
import { useDistrictSummaries } from '../../api/geoApi';
import { useCases, type CaseSummaryResponse } from '../../api/caseApi';
import { canShowLiveRecentFirs } from '../../api/insightsApi';
import {
  getOverviewTrend,
  getCaseJourneyStages,
  getCaseJourneySankeyDemo,
  getCaseCategoryMixDemo,
  getGravityMixDemo,
  getRecentFirsDemo,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';
import { SankeyChart } from './SankeyChart';
import { CaseList } from '../case-explorer/CaseList';

export function OverviewTab() {
  const { token, roles } = useAuth();
  const meQuery = useMe(token);
  const districtSummariesQuery = useDistrictSummaries(token);

  const unitId = meQuery.data?.unitId ?? null;
  const liveRecentFirs = canShowLiveRecentFirs(roles, unitId);
  const recentFirsQuery = useCases(token, liveRecentFirs ? unitId : null, {});

  const trend = getOverviewTrend();
  const journey = getCaseJourneyStages();
  const journeySankey = getCaseJourneySankeyDemo();
  const categoryMixDemo = getCaseCategoryMixDemo();
  const gravityDemo = getGravityMixDemo();
  const demoRecentFirs = getRecentFirsDemo();

  const topDistricts = [...(districtSummariesQuery.data ?? [])]
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, 10)
    .map((d) => ({ label: d.districtName, value: d.caseCount }));

  return (
    <div className="insight-grid">
      <InsightCard title="Registrations vs Chargesheeted" live={false} note="Monthly, last 12 months.">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" stroke="var(--muted)" fontSize={10} />
            <YAxis stroke="var(--muted)" fontSize={10} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            <Line type="monotone" dataKey="registered" stroke="var(--real)" strokeWidth={2} dot={false} name="Registered" />
            <Line type="monotone" dataKey="chargesheeted" stroke="var(--predicted)" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Chargesheeted" />
          </LineChart>
        </ResponsiveContainer>
      </InsightCard>

      <InsightCard title="Case Journey" live={false} note="Registration through final outcome.">
        <SankeyChart nodeLabels={journeySankey.nodeLabels} links={journeySankey.links} />
      </InsightCard>

      <InsightCard title="Case Category Mix" live={false} note="FIR / UDR / Zero FIR / PAR / NCR.">
        <Donut slices={categoryMixDemo.map((c) => ({ label: c.category, value: c.count }))} />
      </InsightCard>

      <InsightCard title="Gravity of Offence" live={false}>
        <Donut slices={gravityDemo.map((g) => ({ label: g.gravity, value: g.count }))} />
      </InsightCard>

      <InsightCard title="Top Districts by Case Volume" live>
        {districtSummariesQuery.isLoading ? (
          <p>Loading…</p>
        ) : districtSummariesQuery.isError ? (
          <p role="alert">Couldn't load district data.</p>
        ) : (
          <RankedBarList items={topDistricts} />
        )}
      </InsightCard>

      <InsightCard
        title="Recent FIRs"
        live={liveRecentFirs}
        note={liveRecentFirs ? undefined : "Recent FIRs isn't available state/district-wide yet — showing representative data."}
      >
        {liveRecentFirs ? (
          recentFirsQuery.isLoading ? <p>Loading…</p> : <CaseList cases={recentFirsQuery.data ?? []} />
        ) : (
          <DemoRecentFirsTable cases={demoRecentFirs} />
        )}
      </InsightCard>
    </div>
  );
}

function DemoRecentFirsTable({ cases }: { cases: CaseSummaryResponse[] }) {
  return (
    <div className="case-table-wrap">
      <table className="case-table">
        <thead>
          <tr>
            <th>Crime no.</th>
            <th>Case no.</th>
            <th>Registered</th>
            <th>Station</th>
            <th>District</th>
            <th>Crime head</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.caseId}>
              <td className="mono crime-no">{c.crimeNumber}</td>
              <td className="mono">{c.caseNumber}</td>
              <td className="mono">{c.firDate}</td>
              <td>{c.station}</td>
              <td>{c.district}</td>
              <td>{c.crimeSubHeadName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
