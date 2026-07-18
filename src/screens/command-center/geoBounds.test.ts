import { describe, it, expect } from 'vitest';
import { geometryBounds, featureCollectionBounds, featureCentroid } from './geoBounds';

describe('geometryBounds', () => {
  it('computes bounds for a Polygon', () => {
    const geometry = { type: 'Polygon', coordinates: [[[75, 12], [76, 12], [76, 13], [75, 13], [75, 12]]] };
    expect(geometryBounds(geometry)).toEqual([[75, 12], [76, 13]]);
  });

  it('computes bounds for a MultiPolygon', () => {
    const geometry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[74, 10], [74.5, 10], [74.5, 10.5], [74, 10.5], [74, 10]]],
        [[[76, 12], [77, 12], [77, 13], [76, 13], [76, 12]]],
      ],
    };
    expect(geometryBounds(geometry)).toEqual([[74, 10], [77, 13]]);
  });
});

describe('featureCentroid', () => {
  it('returns the midpoint of the geometry bounds', () => {
    const geometry = { type: 'Polygon', coordinates: [[[75, 12], [77, 12], [77, 14], [75, 14], [75, 12]]] };
    expect(featureCentroid(geometry)).toEqual([76, 13]);
  });
});

describe('featureCollectionBounds', () => {
  it('unions bounds across all features', () => {
    const featureCollection = {
      features: [
        { geometry: { type: 'Polygon', coordinates: [[[75, 12], [76, 12], [76, 13], [75, 13], [75, 12]]] } },
        { geometry: { type: 'Polygon', coordinates: [[[70, 8], [71, 8], [71, 9], [70, 9], [70, 8]]] } },
      ],
    };
    expect(featureCollectionBounds(featureCollection)).toEqual([[70, 8], [76, 13]]);
  });
});
