export interface RegressionPoint {
  x: number;
  y: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r: number;
}

export function linearRegression(points: RegressionPoint[]): RegressionResult | null {
  if (points.length < 2) return null;

  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) return null; // x has no spread -- slope is undefined, not just zero

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  // syy === 0 means y never varies -- there's no linear relationship to report, not a perfect one
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);

  return { slope, intercept, r };
}
