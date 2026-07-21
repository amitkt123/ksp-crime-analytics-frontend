import { describe, it, expect } from 'vitest';
import { linearRegression } from './linearRegression';

describe('linearRegression', () => {
  it('returns null for fewer than 2 points', () => {
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([{ x: 1, y: 1 }])).toBeNull();
  });

  it('returns null when all points share the same x (zero variance in x)', () => {
    const points = [
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ];
    expect(linearRegression(points)).toBeNull();
  });

  it('finds r = 1 for a perfectly positive linear relationship', () => {
    const points = [
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
      { x: 4, y: 9 },
    ];
    const result = linearRegression(points);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(2, 6);
    expect(result!.intercept).toBeCloseTo(1, 6);
    expect(result!.r).toBeCloseTo(1, 6);
  });

  it('finds r = -1 for a perfectly negative linear relationship', () => {
    const points = [
      { x: 1, y: 10 },
      { x: 2, y: 8 },
      { x: 3, y: 6 },
      { x: 4, y: 4 },
    ];
    const result = linearRegression(points);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(-2, 6);
    expect(result!.r).toBeCloseTo(-1, 6);
  });

  it('returns r = 0 and slope = 0 when all points share the same y (zero variance in y)', () => {
    const points = [
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
    ];
    const result = linearRegression(points);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(0, 6);
    expect(result!.r).toBe(0);
  });

  it('computes slope, intercept, and r for a general scattered case', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 3 },
    ];
    const result = linearRegression(points);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(0.6, 6);
    expect(result!.intercept).toBeCloseTo(0.5, 6);
    expect(result!.r).toBeCloseTo(0.94868, 4);
  });
});
