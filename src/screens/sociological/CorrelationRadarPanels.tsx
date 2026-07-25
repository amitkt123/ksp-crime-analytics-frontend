import { linearRegression, type RegressionResult } from './linearRegression';
import { IndicatorRadarChart, type RadarAxisPoint } from './IndicatorRadarChart';
import { INDICATOR_OPTIONS, Y_LABEL, type IndicatorKey } from './indicators';
import type { DistrictCorrelationResponse } from '../../api/sociologicalApi';

// Same fixed axis districts on every panel (the highest case-rate ones) so the four
// radar "signatures" are directly comparable to each other -- each panel picking its
// own top-N would instead show four unrelated district sets and nothing to compare.
const RADAR_AXIS_COUNT = 6;

interface IndicatorPanel {
  key: IndicatorKey;
  label: string;
  color: string;
  points: RadarAxisPoint[];
  regression: RegressionResult | null;
}

interface CorrelationRadarPanelsProps {
  districts: DistrictCorrelationResponse[];
  highlightedDistrictId?: number | null;
}

function caseRatePer100k(d: DistrictCorrelationResponse) {
  return d.population > 0 ? (d.caseCount / d.population) * 100000 : 0;
}

export function CorrelationRadarPanels({ districts, highlightedDistrictId = null }: CorrelationRadarPanelsProps) {
  if (districts.length === 0) {
    return (
      <section>
        <h3>Socio-economic correlation</h3>
        <p>No district data available.</p>
      </section>
    );
  }

  const axisDistricts = [...districts]
    .sort((a, b) => caseRatePer100k(b) - caseRatePer100k(a))
    .slice(0, RADAR_AXIS_COUNT);

  const highlightedDistrict =
    highlightedDistrictId == null ? null : (districts.find((d) => d.districtId === highlightedDistrictId) ?? null);

  const panels: IndicatorPanel[] = INDICATOR_OPTIONS.map((option) => {
    const values = districts.map((d) => d[option.key]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = maxValue - minValue;

    // spread === 0 means every district ties on this indicator -- there's no real
    // shape to show, so every axis sits at the same midpoint radius (a flat polygon)
    // rather than dividing by zero.
    const points: RadarAxisPoint[] = axisDistricts.map((d) => ({
      districtId: d.districtId,
      districtName: d.districtName,
      rawValue: d[option.key],
      value: spread > 0 ? ((d[option.key] - minValue) / spread) * 100 : 50,
    }));

    const regression = linearRegression(districts.map((d) => ({ x: d[option.key], y: caseRatePer100k(d) })));

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
          <IndicatorRadarChart
            key={panel.key}
            label={panel.label}
            yLabel={Y_LABEL}
            color={panel.color}
            points={panel.points}
            regression={panel.regression}
            isStrongest={panel.key === strongestKey}
            highlightedDistrictId={highlightedDistrictId}
            highlightedDistrictName={highlightedDistrict?.districtName ?? null}
          />
        ))}
      </div>
    </section>
  );
}
