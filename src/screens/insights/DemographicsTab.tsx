import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  getVictimGenderDemo,
  getAccusedGenderDemo,
  getComplainantGenderDemo,
  getAgeDistributionDemo,
  getReligionDemo,
  getCasteDemo,
  getOccupationDemo,
  getVictimGenderByCrimeHeadDemo,
} from '../../api/demoAnalyticsData';
import { InsightCard } from './InsightCard';
import { Donut } from './Donut';
import { RankedBarList } from './RankedBarList';

export function DemographicsTab() {
  const victimGender = getVictimGenderDemo();
  const accusedGender = getAccusedGenderDemo();
  const complainantGender = getComplainantGenderDemo();
  const ageDistribution = getAgeDistributionDemo();
  const religion = getReligionDemo();
  const caste = getCasteDemo();
  const occupation = getOccupationDemo();
  const crossTab = getVictimGenderByCrimeHeadDemo();

  return (
    <div className="insight-grid">
      <InsightCard title="Victim Gender" live={false}>
        <Donut slices={victimGender.map((g) => ({ label: g.gender, value: g.count }))} />
      </InsightCard>
      <InsightCard title="Accused Gender" live={false}>
        <Donut slices={accusedGender.map((g) => ({ label: g.gender, value: g.count }))} />
      </InsightCard>
      <InsightCard title="Complainant Gender" live={false}>
        <Donut slices={complainantGender.map((g) => ({ label: g.gender, value: g.count }))} />
      </InsightCard>

      <InsightCard title="Age Distribution — Victims vs Accused" live={false} note="5-year age bands.">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ageDistribution}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="band" stroke="var(--muted)" fontSize={9} />
            <YAxis stroke="var(--muted)" fontSize={10} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="victims" name="Victims" fill="var(--cat-3)" />
            <Bar dataKey="accused" name="Accused" fill="var(--real)" />
          </BarChart>
        </ResponsiveContainer>
      </InsightCard>

      <InsightCard title="Complainant Religion" live={false}>
        <RankedBarList items={religion.map((r) => ({ label: r.label, value: r.count }))} />
      </InsightCard>
      <InsightCard title="Complainant Caste Category" live={false}>
        <RankedBarList items={caste.map((c) => ({ label: c.label, value: c.count }))} />
      </InsightCard>
      <InsightCard title="Complainant Occupation" live={false}>
        <RankedBarList items={occupation.map((o) => ({ label: o.label, value: o.count }))} />
      </InsightCard>

      <InsightCard title="Victim Gender × Crime Head Cross-tab" live={false}>
        <div className="case-table-wrap">
          <table className="case-table">
            <thead>
              <tr>
                <th>Crime head</th>
                <th>Male</th>
                <th>Female</th>
                <th>Third gender</th>
              </tr>
            </thead>
            <tbody>
              {crossTab.map((row) => (
                <tr key={row.crimeHead}>
                  <td>{row.crimeHead}</td>
                  <td className="mono">{row.malePct}%</td>
                  <td className="mono">{row.femalePct}%</td>
                  <td className="mono">{row.thirdGenderPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InsightCard>
    </div>
  );
}
