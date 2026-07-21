import type { PredictiveRiskForecastResponse } from '../../api/sociologicalApi';

interface RiskForecastChartProps {
  forecasts: PredictiveRiskForecastResponse[];
}

const TOP_N = 10;

export function RiskForecastChart({ forecasts }: RiskForecastChartProps) {
  const ranked = [...forecasts].sort((a, b) => b.predictedCount - a.predictedCount).slice(0, TOP_N);
  // Unlike CategoryMixChart's sum-based width (parts of one whole), each bar here
  // is an independent per-station forecast, so the top-ranked station anchors 100%.
  const max = ranked.reduce((m, f) => Math.max(m, f.predictedCount), 0);

  if (ranked.length === 0) {
    return <p>No predictive risk forecasts for this crime type.</p>;
  }

  return (
    <section>
      <h3>
        Predictive risk <span className="count">highest-forecast stations, next period</span>
      </h3>
      <div className="cat-bars">
        {ranked.map((f) => (
          <div key={`${f.unitId}-${f.crimeSubHeadId}`} className="cat-bar-row">
            <span className="cat-bar-label">{f.unitName}</span>
            <div className="cat-bar-track">
              <div
                className="cat-bar-fill"
                style={{ width: `${max === 0 ? 0 : (f.predictedCount / max) * 100}%`, background: 'var(--predicted)' }}
              />
            </div>
            <span className="cat-bar-count mono">{f.predictedCount.toFixed(1)}</span>
            <span
              className="chip mono"
              title={`Backtest: predicted ${f.backtestPredictedCount.toFixed(1)} vs actual ${f.backtestActualCount}`}
            >
              ±{f.backtestAbsoluteError.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
