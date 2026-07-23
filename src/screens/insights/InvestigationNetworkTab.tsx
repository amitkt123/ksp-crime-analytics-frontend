import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { useRepeatOffenders } from '../../api/networkApi';
import { canShowLiveRepeatOffenderData, deriveRepeatVsFirstTime } from '../../api/insightsApi';
import {
  getRepeatOffendersDemo,
  getFirstTimeVsRepeatDemo,
  getCrimeHeadActLinkageDemo,
  getArrestsVsSurrendersDemo,
  getIoLeaderboardDemo,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';

export function InvestigationNetworkTab() {
  const { token, roles } = useAuth();
  const liveRepeatOffenders = canShowLiveRepeatOffenderData(roles);
  const topOffendersQuery = useRepeatOffenders(token, 2, 10);
  const sampleOffendersQuery = useRepeatOffenders(token, 1, 500);

  const linkage = getCrimeHeadActLinkageDemo();
  const arrestsVsSurrenders = getArrestsVsSurrendersDemo();
  const ioLeaderboard = getIoLeaderboardDemo();
  const demoRepeatOffenders = getRepeatOffendersDemo();
  const demoFirstTimeVsRepeat = getFirstTimeVsRepeatDemo();

  const liveFirstTimeVsRepeat = sampleOffendersQuery.data ? deriveRepeatVsFirstTime(sampleOffendersQuery.data) : null;

  return (
    <div className="insight-grid">
      <InsightCard title="Crime Head ↔ Act Linkage" live={false} note="Rendered as ranked linkage bars, not a chord diagram.">
        <RankedBarList items={linkage.map((l) => ({ label: l.label, value: l.count }))} />
      </InsightCard>

      <InsightCard title="Arrests vs Surrenders by Month" live={false}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={arrestsVsSurrenders}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" stroke="var(--muted)" fontSize={10} />
            <YAxis stroke="var(--muted)" fontSize={10} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="arrests" name="Arrests" fill="var(--real)" />
            <Bar dataKey="surrenders" name="Surrenders" fill="var(--predicted)" />
          </BarChart>
        </ResponsiveContainer>
      </InsightCard>

      <InsightCard
        title="Top Repeat Offenders"
        live={liveRepeatOffenders}
        note={liveRepeatOffenders ? undefined : "Repeat-offender data isn't available for this role — showing representative data."}
      >
        {liveRepeatOffenders ? (
          topOffendersQuery.isLoading ? (
            <p>Loading…</p>
          ) : topOffendersQuery.isError ? (
            <p role="alert">Couldn't load repeat-offender data.</p>
          ) : (
            <RankedBarList items={(topOffendersQuery.data ?? []).map((o) => ({ label: o.displayName, value: o.caseCount }))} />
          )
        ) : (
          <RankedBarList items={demoRepeatOffenders.map((o) => ({ label: o.displayName, value: o.caseCount }))} />
        )}
      </InsightCard>

      <InsightCard title="Accused: First-time vs Repeat" live={liveRepeatOffenders}>
        {liveRepeatOffenders ? (
          sampleOffendersQuery.isLoading ? (
            <p>Loading…</p>
          ) : sampleOffendersQuery.isError ? (
            <p role="alert">Couldn't load offender data.</p>
          ) : (
            <Donut
              slices={[
                { label: 'First-time', value: liveFirstTimeVsRepeat?.firstTime ?? 0 },
                { label: 'Repeat', value: liveFirstTimeVsRepeat?.repeat ?? 0 },
              ]}
            />
          )
        ) : (
          <Donut
            slices={[
              { label: 'First-time', value: demoFirstTimeVsRepeat.firstTime },
              { label: 'Repeat', value: demoFirstTimeVsRepeat.repeat },
            ]}
          />
        )}
      </InsightCard>

      <InsightCard title="Investigating Officer Leaderboard" live={false}>
        <div className="case-table-wrap">
          <table className="case-table">
            <thead>
              <tr>
                <th>Officer</th>
                <th>Unit</th>
                <th>Cases</th>
                <th>Chargesheet rate</th>
                <th>Avg. days</th>
              </tr>
            </thead>
            <tbody>
              {ioLeaderboard.map((row) => (
                <tr key={row.officer + row.unit}>
                  <td>{row.officer}</td>
                  <td>{row.unit}</td>
                  <td className="mono">{row.casesHandled}</td>
                  <td className="mono">{row.chargesheetRatePct}%</td>
                  <td className="mono">{row.avgDaysToChargesheet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InsightCard>
    </div>
  );
}
