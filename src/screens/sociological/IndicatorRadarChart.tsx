import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RegressionResult } from './linearRegression';

export interface RadarAxisPoint {
  districtId: number;
  districtName: string;
  value: number; // indicator value normalized 0-100 across every district, for the radar radius
  rawValue: number; // the actual indicator value, for the tooltip
}

interface IndicatorRadarChartProps {
  label: string;
  yLabel: string;
  color: string;
  points: RadarAxisPoint[];
  regression: RegressionResult | null;
  isStrongest: boolean;
  highlightedDistrictId?: number | null;
  highlightedDistrictName?: string | null;
}

export function IndicatorRadarChart({
  label,
  yLabel,
  color,
  points,
  regression,
  isStrongest,
  highlightedDistrictId = null,
  highlightedDistrictName = null,
}: IndicatorRadarChartProps) {
  return (
    <div className="indicator-panel-card">
      <div className="indicator-panel-head">
        <span className="indicator-panel-label">{label}</span>
        <div className="indicator-panel-badges">
          {isStrongest && <span className="chip strongest">Strongest driver</span>}
          {regression ? (
            <span className="chip predicted mono" title={`Correlation with ${yLabel}, across all districts`}>
              r = {regression.r.toFixed(2)}
            </span>
          ) : (
            <span className="indicator-panel-empty-chip">Not enough data for a trend line.</span>
          )}
          {highlightedDistrictName && <span className="chip highlighted mono">{highlightedDistrictName}</span>}
        </div>
      </div>
      {points.length === 0 ? (
        <p className="indicator-panel-empty">No district data to plot.</p>
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <RadarChart data={points} outerRadius="70%">
            <PolarGrid stroke="var(--line)" />
            <PolarAngleAxis dataKey="districtName" tick={{ fontSize: 9.5, fill: 'var(--muted)' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as RadarAxisPoint;
                return (
                  <div
                    style={{
                      background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6,
                      padding: '6px 8px', boxShadow: 'var(--shadow)', fontSize: 11,
                    }}
                  >
                    <strong>{point.districtName}</strong>
                    <div>{label}: <span className="mono">{point.rawValue.toFixed(1)}</span></div>
                  </div>
                );
              }}
            />
            <Radar
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.32}
              dot={(dotProps: { cx?: number; cy?: number; payload: RadarAxisPoint }) => {
                const isHighlighted = dotProps.payload.districtId === highlightedDistrictId;
                return (
                  <circle
                    key={dotProps.payload.districtId}
                    cx={dotProps.cx}
                    cy={dotProps.cy}
                    r={isHighlighted ? 6 : 3}
                    fill={isHighlighted ? 'var(--alert)' : color}
                    stroke="var(--panel)"
                    strokeWidth={isHighlighted ? 2 : 1}
                  />
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
