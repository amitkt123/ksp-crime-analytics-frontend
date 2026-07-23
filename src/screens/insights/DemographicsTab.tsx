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

function genderColor(label: string): string | undefined {
  return label === 'Female' ? '#e8608f' : undefined;
}

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
      <InsightCard title="Victim Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: victimGender.map((g) => [g.gender, g.count]) }}>
        <Donut slices={victimGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
      </InsightCard>
      <InsightCard title="Accused Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: accusedGender.map((g) => [g.gender, g.count]) }}>
        <Donut slices={accusedGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
      </InsightCard>
      <InsightCard title="Complainant Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: complainantGender.map((g) => [g.gender, g.count]) }}>
        <Donut slices={complainantGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
      </InsightCard>

      <InsightCard
        title="Age Distribution — Victims vs Accused"
        live={false}
        note="5-year age bands."
        expand={{ columns: ['Band', 'Victims', 'Accused'], rows: ageDistribution.map((a) => [a.band, a.victims, a.accused]) }}
      >
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

      <InsightCard title="Complainant Religion" live={false} expand={{ columns: ['Religion', 'Count'], rows: religion.map((r) => [r.label, r.count]) }}>
        <RankedBarList items={religion.map((r) => ({ label: r.label, value: r.count }))} />
      </InsightCard>
      <InsightCard title="Complainant Caste Category" live={false} expand={{ columns: ['Caste', 'Count'], rows: caste.map((c) => [c.label, c.count]) }}>
        <RankedBarList items={caste.map((c) => ({ label: c.label, value: c.count }))} />
      </InsightCard>
      <InsightCard title="Complainant Occupation" live={false} expand={{ columns: ['Occupation', 'Count'], rows: occupation.map((o) => [o.label, o.count]) }}>
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
