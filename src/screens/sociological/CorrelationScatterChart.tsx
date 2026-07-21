import { useState } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { DistrictCorrelationResponse } from '../../api/sociologicalApi';

type IndicatorKey = 'literacyRate' | 'unemploymentRate' | 'urbanizationRate' | 'perCapitaIncome';

const INDICATOR_OPTIONS: Array<{ key: IndicatorKey; label: string }> = [
  { key: 'literacyRate', label: 'Literacy rate' },
  { key: 'unemploymentRate', label: 'Unemployment rate' },
  { key: 'urbanizationRate', label: 'Urbanization rate' },
  { key: 'perCapitaIncome', label: 'Per-capita income' },
];

interface ScatterPoint {
  districtName: string;
  indicatorValue: number;
  caseRatePer100k: number;
}

interface CorrelationScatterChartProps {
  districts: DistrictCorrelationResponse[];
}

export function CorrelationScatterChart({ districts }: CorrelationScatterChartProps) {
  const [indicator, setIndicator] = useState<IndicatorKey>('literacyRate');

  // Raw caseCount is population-confounded (Bengaluru Urban has more cases than
  // Kodagu mostly because it has more people) -- rate per 100k is the metric that
  // actually answers the challenge's "why behind the where".
  const points: ScatterPoint[] = districts.map((d) => ({
    districtName: d.districtName,
    indicatorValue: d[indicator],
    caseRatePer100k: d.population > 0 ? (d.caseCount / d.population) * 100000 : 0,
  }));

  const indicatorLabel = INDICATOR_OPTIONS.find((o) => o.key === indicator)?.label ?? indicator;

  return (
    <section>
      <div className="pane-head">
        <h3>Socio-economic correlation</h3>
        <select
          aria-label="Correlation indicator"
          value={indicator}
          onChange={(e) => setIndicator(e.target.value as IndicatorKey)}
        >
          {INDICATOR_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="indicatorValue" name={indicatorLabel} stroke="var(--muted)" fontSize={11} />
          <YAxis type="number" dataKey="caseRatePer100k" name="Cases per 100k population" stroke="var(--muted)" fontSize={11} />
          <Tooltip
            cursor={{ stroke: 'var(--line)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as ScatterPoint;
              return (
                <div
                  style={{
                    background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6,
                    padding: '8px 10px', boxShadow: 'var(--shadow)', fontSize: 12,
                  }}
                >
                  <strong>{point.districtName}</strong>
                  <div>{indicatorLabel}: <span className="mono">{point.indicatorValue.toFixed(1)}</span></div>
                  <div>Cases / 100k: <span className="mono">{point.caseRatePer100k.toFixed(1)}</span></div>
                </div>
              );
            }}
          />
          <Scatter data={points} fill="var(--real)" />
        </ScatterChart>
      </ResponsiveContainer>
    </section>
  );
}
