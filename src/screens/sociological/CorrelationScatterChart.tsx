import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { EvidencePanel } from '../../design-system/EvidencePanel';
import { useExplainCorrelation, toEvidenceData } from '../../api/agentApi';
import { linearRegression, type RegressionResult } from './linearRegression';
import { IndicatorScatterPlot, type IndicatorScatterPoint } from './IndicatorScatterPlot';
import { INDICATOR_OPTIONS, Y_LABEL, type IndicatorKey } from './indicators';
import type { DistrictCorrelationResponse } from '../../api/sociologicalApi';

interface IndicatorPanel {
  key: IndicatorKey;
  label: string;
  points: IndicatorScatterPoint[];
  regression: RegressionResult | null;
}

interface CorrelationScatterChartProps {
  districts: DistrictCorrelationResponse[];
  highlightedDistrictId?: number | null;
  year: number;
}

export function CorrelationScatterChart({ districts, highlightedDistrictId = null, year }: CorrelationScatterChartProps) {
  const { token } = useAuth();
  const [selected, setSelected] = useState<DistrictCorrelationResponse | null>(null);
  const explainQuery = useExplainCorrelation(token, selected?.districtId ?? null, year, selected != null);
  const evidenceData = selected && explainQuery.data
    ? toEvidenceData(explainQuery.data, `Year ${year}`, [selected.districtName])
    : null;

  const panels: IndicatorPanel[] = INDICATOR_OPTIONS.map((option) => {
    // Raw caseCount is population-confounded (Bengaluru Urban has more cases than
    // Kodagu mostly because it has more people) -- rate per 100k is the metric that
    // actually answers the challenge's "why behind the where".
    const points: IndicatorScatterPoint[] = districts.map((d) => ({
      districtId: d.districtId,
      districtName: d.districtName,
      x: d[option.key],
      y: d.population > 0 ? (d.caseCount / d.population) * 100000 : 0,
    }));
    const regression = linearRegression(points.map((p) => ({ x: p.x, y: p.y })));
    return { ...option, points, regression };
  });

  // Sort by |r| descending so the strongest driver leads visually; panels with no
  // regression (zero x-variance) sink to the end rather than breaking the sort.
  const sortedPanels = [...panels].sort((a, b) => {
    const ar = a.regression ? Math.abs(a.regression.r) : -1;
    const br = b.regression ? Math.abs(b.regression.r) : -1;
    return br - ar;
  });
  const strongestKey = sortedPanels[0]?.regression ? sortedPanels[0].key : null;

  return (
    <section>
      <h3>Socio-economic correlation</h3>
      <div className="correlation-grid">
        {sortedPanels.map((panel) => (
          <IndicatorScatterPlot
            key={panel.key}
            label={panel.label}
            yLabel={Y_LABEL}
            points={panel.points}
            regression={panel.regression}
            isStrongest={panel.key === strongestKey}
            highlightedDistrictId={highlightedDistrictId}
            onPointClick={(districtId) => {
              const district = districts.find((d) => d.districtId === districtId);
              if (district) setSelected(district);
            }}
          />
        ))}
      </div>
      <EvidencePanel data={evidenceData} onClose={() => setSelected(null)} />
    </section>
  );
}
