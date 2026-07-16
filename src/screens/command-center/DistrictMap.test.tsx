import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { DistrictBoundaryFeatureCollection, DistrictSummaryResponse } from '../../api/geoApi';

interface FakeMapEvent {
  features?: Array<{ properties: Record<string, unknown> }>;
}

// vi.mock factories are hoisted above all other top-level statements (including
// class declarations physically earlier in the file), so FakeMap must be defined
// inside vi.hoisted() to avoid a temporal-dead-zone ReferenceError when the
// factory below references it.
const { FakeMap } = vi.hoisted(() => {
  class FakeMap {
    static instances: FakeMap[] = [];
    sources: Record<string, unknown> = {};
    layers: unknown[] = [];
    handlers: Record<string, (e: FakeMapEvent) => void> = {};
    options: unknown;

    constructor(options: unknown) {
      this.options = options;
      FakeMap.instances.push(this);
    }

    on(event: string, layerIdOrHandler: string | ((e: FakeMapEvent) => void), maybeHandler?: (e: FakeMapEvent) => void) {
      if (typeof layerIdOrHandler === 'function') {
        this.handlers[event] = layerIdOrHandler;
        if (event === 'load') layerIdOrHandler({});
      } else {
        this.handlers[`${event}:${layerIdOrHandler}`] = maybeHandler!;
      }
    }

    addSource(id: string, source: unknown) {
      this.sources[id] = source;
    }

    addLayer(layer: unknown) {
      this.layers.push(layer);
    }

    remove() {}
  }
  return { FakeMap };
});

// The real maplibre-gl default export is a namespace object whose `.Map` property
// is the constructor (verified against the installed maplibre-gl package) -- not
// the constructor itself -- so the mock mirrors that shape to match how
// DistrictMap.tsx actually calls `new maplibregl.Map(...)`.
vi.mock('maplibre-gl', () => ({ default: { Map: FakeMap } }));

import { DistrictMap } from './DistrictMap';

const boundaries: DistrictBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { districtId: 1, district: 'Bengaluru Urban' }, geometry: {} },
    { type: 'Feature', properties: { districtId: 3, district: 'Mysuru' }, geometry: {} },
  ],
};
const districtSummaries: DistrictSummaryResponse[] = [
  { districtId: 1, districtName: 'Bengaluru Urban', caseCount: 500 },
  { districtId: 3, districtName: 'Mysuru', caseCount: 120 },
];

describe('DistrictMap', () => {
  beforeEach(() => {
    FakeMap.instances = [];
  });

  it('adds a districts source with case counts merged into each feature, and a choropleth fill layer', () => {
    render(<DistrictMap boundaries={boundaries} districtSummaries={districtSummaries} onDistrictSelect={vi.fn()} />);

    const map = FakeMap.instances[0];
    const source = map.sources['districts'] as { data: DistrictBoundaryFeatureCollection };
    const properties = source.data.features.map((f) => f.properties);
    expect(properties).toEqual([
      { districtId: 1, district: 'Bengaluru Urban', caseCount: 500 },
      { districtId: 3, district: 'Mysuru', caseCount: 120 },
    ]);
    expect(map.layers).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'district-fill', type: 'fill' })]),
    );
  });

  it('calls onDistrictSelect with the clicked district id', () => {
    const onDistrictSelect = vi.fn();
    render(<DistrictMap boundaries={boundaries} districtSummaries={districtSummaries} onDistrictSelect={onDistrictSelect} />);

    const map = FakeMap.instances[0];
    map.handlers['click:district-fill']({ features: [{ properties: { districtId: 3 } }] });

    expect(onDistrictSelect).toHaveBeenCalledWith(3);
  });
});
