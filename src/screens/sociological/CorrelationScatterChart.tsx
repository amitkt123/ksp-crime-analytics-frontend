import { useState } from 'react';
import { linearRegression, type RegressionResult } from './linearRegression';
import { IndicatorScatterPlot, type IndicatorScatterPoint } from './IndicatorScatterPlot';
import { INDICATOR_OPTIONS, Y_LABEL, type IndicatorKey } from './indicators';
import type { DistrictCorrelationResponse } from '../../api/sociologicalApi';
import { InfoTip } from '../../design-system/InfoTip';
import { ChartLightbox } from '../insights/ChartLightbox';

interface IndicatorPanel {
  key: IndicatorKey;
  label: string;
  points: IndicatorScatterPoint[];
  regression: RegressionResult | null;
}

interface CorrelationScatterChartProps {
  districts: DistrictCorrelationResponse[];
  highlightedDistrictId?: number | null;
}

const INDICATOR_EXPLANATION: Record<IndicatorKey, string> = {
  literacyRate: 'Each dot is a district. Higher literacy rate (x-axis) generally correlates with a lower crime rate per 100k population (y-axis) — a downward-sloping trend line indicates that relationship.',
  unemploymentRate: 'Each dot is a district. Higher unemployment (x-axis) is often associated with higher crime rates per 100k population (y-axis) — an upward-sloping trend line indicates that relationship.',
  urbanizationRate: 'Each dot is a district. More urbanized districts (x-axis) often see different crime rates per 100k population (y-axis) than rural ones — the trend line direction shows which way.',
  perCapitaIncome: 'Each dot is a district. Per-capita income (x-axis) plotted against crime rate per 100k population (y-axis) — the trend line direction shows whether wealthier districts trend higher or lower.',
};

export function CorrelationScatterChart({ districts, highlightedDistrictId = null }: CorrelationScatterChartProps) {
  const [zoomedKey, setZoomedKey] = useState<IndicatorKey | null>(null);

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
  const zoomedPanel = sortedPanels.find((p) => p.key === zoomedKey) ?? null;

  return (
    <section>
      <h3>Socio-economic correlation</h3>
      <div className="correlation-stack">
        {sortedPanels.map((panel) => (
          <div key={panel.key} className="indicator-scatter-row">
            <div className="indicator-scatter-row-head">
              <InfoTip label={panel.label} text={INDICATOR_EXPLANATION[panel.key]} />
              <button type="button" className="insight-card-expand" aria-label={`Expand ${panel.label}`} onClick={() => setZoomedKey(panel.key)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <IndicatorScatterPlot
              label={panel.label}
              yLabel={Y_LABEL}
              points={panel.points}
              regression={panel.regression}
              isStrongest={panel.key === strongestKey}
              highlightedDistrictId={highlightedDistrictId}
            />
          </div>
        ))}
      </div>
      <ChartLightbox
        open={zoomedPanel !== null}
        title={zoomedPanel?.label ?? ''}
        columns={[zoomedPanel?.label ?? 'Value', Y_LABEL]}
        rows={(zoomedPanel?.points ?? []).map((p) => [`${p.districtName} (${p.x.toFixed(1)})`, p.y.toFixed(1)])}
        onClose={() => setZoomedKey(null)}
      >
        {zoomedPanel && (
          <IndicatorScatterPlot
            label={zoomedPanel.label}
            yLabel={Y_LABEL}
            points={zoomedPanel.points}
            regression={zoomedPanel.regression}
            isStrongest={zoomedPanel.key === strongestKey}
            highlightedDistrictId={highlightedDistrictId}
          />
        )}
      </ChartLightbox>
    </section>
  );
}
