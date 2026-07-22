import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { RegressionResult } from './linearRegression';

export interface IndicatorScatterPoint {
  districtId: number;
  districtName: string;
  x: number;
  y: number;
}

interface IndicatorScatterPlotProps {
  label: string;
  yLabel: string;
  points: IndicatorScatterPoint[];
  regression: RegressionResult | null;
  isStrongest: boolean;
  highlightedDistrictId?: number | null;
}

export function splitHighlightedPoint<T extends { districtId: number }>(
  points: T[],
  highlightedDistrictId: number | null | undefined,
): { base: T[]; highlighted: T | null } {
  if (highlightedDistrictId == null) return { base: points, highlighted: null };
  const highlighted = points.find((p) => p.districtId === highlightedDistrictId) ?? null;
  if (!highlighted) return { base: points, highlighted: null };
  return { base: points.filter((p) => p.districtId !== highlightedDistrictId), highlighted };
}

export function IndicatorScatterPlot({
  label,
  yLabel,
  points,
  regression,
  isStrongest,
  highlightedDistrictId = null,
}: IndicatorScatterPlotProps) {
  const xValues = points.map((p) => p.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const { base: basePoints, highlighted: highlightedPoint } = splitHighlightedPoint(points, highlightedDistrictId);

  return (
    <div className="indicator-scatter">
      <div className="indicator-scatter-head">
        <span className="indicator-scatter-label">{label}</span>
        <div className="indicator-scatter-badges">
          {isStrongest && <span className="chip strongest">Strongest driver</span>}
          {regression ? (
            <span className="chip predicted mono">r = {regression.r.toFixed(2)}</span>
          ) : null}
          {highlightedPoint && <span className="chip highlighted mono">{highlightedPoint.districtName}</span>}
        </div>
      </div>
      {!regression ? (
        <p className="indicator-scatter-empty">Not enough data for a trend line.</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={label} stroke="var(--muted)" fontSize={10} tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey="y" name={yLabel} stroke="var(--muted)" fontSize={10} tick={{ fontSize: 10 }} />
            <Tooltip
              cursor={{ stroke: 'var(--line)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as IndicatorScatterPoint;
                return (
                  <div
                    style={{
                      background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6,
                      padding: '6px 8px', boxShadow: 'var(--shadow)', fontSize: 11,
                    }}
                  >
                    <strong>{point.districtName}</strong>
                    <div>{label}: <span className="mono">{point.x.toFixed(1)}</span></div>
                    <div>{yLabel}: <span className="mono">{point.y.toFixed(1)}</span></div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              segment={[
                { x: minX, y: regression.slope * minX + regression.intercept },
                { x: maxX, y: regression.slope * maxX + regression.intercept },
              ]}
              stroke="var(--predicted)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
            <Scatter data={basePoints} fill="var(--real)" />
            {highlightedPoint && (
              <Scatter
                data={[highlightedPoint]}
                shape={(props: { cx?: number; cy?: number }) => (
                  <circle cx={props.cx} cy={props.cy} r={7} fill="var(--alert)" stroke="var(--panel)" strokeWidth={2} />
                )}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
