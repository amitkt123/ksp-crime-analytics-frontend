import type { PredictiveRiskForecastResponse } from '../../api/sociologicalApi';

interface RiskForecastChartProps {
  forecasts: PredictiveRiskForecastResponse[];
}

const TOP_N = 10;

export function RiskForecastChart({ forecasts }: RiskForecastChartProps) {
  const ranked = [...forecasts].sort((a, b) => b.predictedCount - a.predictedCount).slice(0, TOP_N);

  if (ranked.length === 0) {
    return <p>No predictive risk forecasts for this crime type.</p>;
  }

  // Both bars share one scale (across predicted AND backtest-actual, all rows) so a
  // bar's length is comparable both within a row and against every other row.
  const max = ranked.reduce((m, f) => Math.max(m, f.predictedCount, f.backtestActualCount), 0);

  return (
    <section>
      <h3>
        Predictive risk <span className="count">highest-forecast stations, next period</span>
      </h3>
      <div className="cat-legend">
        <span className="cat-legend-item">
          <span className="cat-swatch" style={{ background: 'var(--predicted)' }} />
          Predicted
        </span>
        <span className="cat-legend-item">
          <span className="cat-swatch" style={{ background: 'var(--real)' }} />
          Backtest actual
        </span>
      </div>
      <div className="cat-bars">
        {ranked.map((f) => (
          <div
            key={`${f.unitId}-${f.crimeSubHeadId}`}
            className="cat-bar-row risk-bar-row"
            title={`Backtest: predicted ${f.backtestPredictedCount.toFixed(1)} vs actual ${f.backtestActualCount}`}
          >
            <span className="cat-bar-label">{f.unitName}</span>
            <div className="risk-bar-group">
              <div className="risk-bar-line">
                <div className="cat-bar-track">
                  <div
                    className="cat-bar-fill"
                    style={{ width: `${max === 0 ? 0 : (f.predictedCount / max) * 100}%`, background: 'var(--predicted)' }}
                  />
                </div>
                <span className="cat-bar-count mono">{f.predictedCount.toFixed(1)}</span>
              </div>
              <div className="risk-bar-line">
                <div className="cat-bar-track">
                  <div
                    className="cat-bar-fill"
                    style={{ width: `${max === 0 ? 0 : (f.backtestActualCount / max) * 100}%`, background: 'var(--real)' }}
                  />
                </div>
                <span className="cat-bar-count mono">{f.backtestActualCount.toFixed(1)}</span>
              </div>
            </div>
            <span className="chip mono">±{f.backtestAbsoluteError.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
