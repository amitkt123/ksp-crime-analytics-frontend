import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { useRepeatOffenders } from '../../api/networkApi';
import { canShowLiveRepeatOffenderData, deriveRepeatVsFirstTime } from '../../api/insightsApi';
import {
  getRepeatOffendersDemo,
  getFirstTimeVsRepeatDemo,
  getCrimeHeadActLinkageDemo,
  getCrimeHeadActMatrixDemo,
  getArrestsVsSurrendersDemo,
  getIoLeaderboardDemo,
  type RepeatOffenderDemoRow,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';
import { ChordDiagram } from './ChordDiagram';
import { PersonRevealModal, type PersonRevealData } from './PersonRevealModal';

function ClickableOffenderList({ offenders, onSelect }: { offenders: RepeatOffenderDemoRow[]; onSelect: (o: RepeatOffenderDemoRow) => void }) {
  const sorted = [...offenders].sort((a, b) => b.caseCount - a.caseCount);
  const max = sorted[0]?.caseCount ?? 0;
  return (
    <div className="cat-bars">
      {sorted.map((o) => (
        <button
          key={o.displayName}
          type="button"
          className="cat-bar-row"
          style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', padding: 0 }}
          onClick={() => onSelect(o)}
        >
          <span className="cat-bar-label">{o.displayName}</span>
          <div className="cat-bar-track">
            <div className="cat-bar-fill" style={{ width: `${max === 0 ? 0 : (o.caseCount / max) * 100}%`, background: 'var(--real)' }} />
          </div>
          <span className="cat-bar-count mono">{o.caseCount}</span>
        </button>
      ))}
    </div>
  );
}

export function InvestigationNetworkTab() {
  const { token, roles } = useAuth();
  const liveRepeatOffenders = canShowLiveRepeatOffenderData(roles);
  const topOffendersQuery = useRepeatOffenders(token, 2, 10);
  const sampleOffendersQuery = useRepeatOffenders(token, 1, 500);
  const [revealedPerson, setRevealedPerson] = useState<PersonRevealData | null>(null);

  const linkage = getCrimeHeadActLinkageDemo();
  const linkageMatrix = getCrimeHeadActMatrixDemo();
  const arrestsVsSurrenders = getArrestsVsSurrendersDemo();
  const ioLeaderboard = getIoLeaderboardDemo();
  const demoRepeatOffenders = getRepeatOffendersDemo();
  const demoFirstTimeVsRepeat = getFirstTimeVsRepeatDemo();

  const liveFirstTimeVsRepeat = sampleOffendersQuery.data ? deriveRepeatVsFirstTime(sampleOffendersQuery.data) : null;

  return (
    <>
      <div className="insight-grid">
        <InsightCard
          title="Crime Head ↔ Act Linkage"
          live={false}
          note="Flow weight = number of act-section associations linking a crime head to a legal act."
          expand={{ columns: ['Linkage', 'Cases'], rows: linkage.map((l) => [l.label, l.count]) }}
        >
          <ChordDiagram labels={linkageMatrix.labels} matrix={linkageMatrix.matrix} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Arrests vs Surrenders by Month"
          live={false}
          expand={{ columns: ['Month', 'Arrests', 'Surrenders'], rows: arrestsVsSurrenders.map((a) => [a.monthLabel, a.arrests, a.surrenders]) }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={arrestsVsSurrenders}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" stroke="var(--muted)" fontSize={10} />
              <YAxis stroke="var(--muted)" fontSize={10} />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="arrests" name="Arrests" stroke="var(--real)" fill="var(--real)" fillOpacity={0.5} />
              <Area type="monotone" dataKey="surrenders" name="Surrenders" stroke="var(--predicted)" fill="var(--predicted)" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </InsightCard>
      </div>

      <div className="insight-grid-2" style={{ marginTop: 16 }}>
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
            <ClickableOffenderList
              offenders={demoRepeatOffenders}
              onSelect={(o) =>
                setRevealedPerson({
                  realName: o.realName,
                  details: [
                    { label: 'Age', value: String(o.age) },
                    { label: 'Gender', value: o.gender },
                    { label: 'Top crime head', value: o.topCrimeHead },
                    { label: 'Case count', value: String(o.caseCount) },
                  ],
                })
              }
            />
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
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard title="Investigating Officer Leaderboard" live={false}>
          <div className="case-table-wrap">
            <table className="case-table">
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Rank</th>
                  <th>Unit</th>
                  <th>District</th>
                  <th>Cases Handled</th>
                  <th>Arrests</th>
                  <th>Chargesheet Rate</th>
                  <th>Avg Days to CS</th>
                </tr>
              </thead>
              <tbody>
                {ioLeaderboard.map((row) => (
                  <tr key={row.displayName + row.unit}>
                    <td>
                      <button
                        type="button"
                        style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--real)' }}
                        onClick={() =>
                          setRevealedPerson({
                            realName: row.realName,
                            details: [
                              { label: 'Rank', value: row.rank },
                              { label: 'Unit', value: row.unit },
                              { label: 'District', value: row.district },
                              { label: 'Cases handled', value: String(row.casesHandled) },
                            ],
                          })
                        }
                      >
                        {row.displayName}
                      </button>
                    </td>
                    <td>{row.rank}</td>
                    <td>{row.unit}</td>
                    <td>{row.district}</td>
                    <td className="mono">{row.casesHandled}</td>
                    <td className="mono">{row.arrests}</td>
                    <td className="mono">{row.chargesheetRatePct}%</td>
                    <td className="mono">{row.avgDaysToChargesheet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>
      </div>

      <PersonRevealModal person={revealedPerson} onClose={() => setRevealedPerson(null)} />
    </>
  );
}
