import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { DistrictBoundaryFeatureCollection, DistrictSummaryResponse } from '../../api/geoApi';

interface FakeMapEvent {
  features?: Array<{ properties: Record<string, unknown> }>;
  lngLat?: { lng: number; lat: number };
}

const { FakeMap, FakePopup } = vi.hoisted(() => {
  class FakeMap {
    static instances: FakeMap[] = [];
    sources: Record<string, unknown> = {};
    layers: unknown[] = [];
    handlers: Record<string, (e: FakeMapEvent) => void> = {};
    options: unknown;
    canvas: { style: Record<string, string> } = { style: {} };
    featureStates = new Map<number, Record<string, unknown>>();
    lastFilter: unknown;
    lastFitBounds: { bounds: unknown; options: unknown } | undefined;

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

    getCanvas() {
      return this.canvas;
    }

    setFilter(_layerId: string, filter: unknown) {
      this.lastFilter = filter;
    }

    fitBounds(bounds: unknown, options: unknown) {
      this.lastFitBounds = { bounds, options };
    }

    setFeatureState(target: { id: number }, state: Record<string, unknown>) {
      this.featureStates.set(target.id, { ...this.featureStates.get(target.id), ...state });
    }

    removeFeatureState(target: { id: number }) {
      this.featureStates.delete(target.id);
    }

    remove() {}
  }

  class FakePopup {
    static instances: FakePopup[] = [];
    lngLat: unknown;
    html = '';
    addedToMap: unknown = null;
    removed = false;

    constructor() {
      FakePopup.instances.push(this);
    }

    setLngLat(lngLat: unknown) {
      this.lngLat = lngLat;
      return this;
    }

    setHTML(html: string) {
      this.html = html;
      return this;
    }

    addTo(map: unknown) {
      this.addedToMap = map;
      return this;
    }

    remove() {
      this.removed = true;
    }
  }

  return { FakeMap, FakePopup };
});

vi.mock('maplibre-gl', () => ({ default: { Map: FakeMap, Popup: FakePopup } }));

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

const geometryBengaluru = { type: 'Polygon', coordinates: [[[77, 12], [78, 12], [78, 13], [77, 13], [77, 12]]] };
const geometryMysuru = { type: 'Polygon', coordinates: [[[76, 11], [76.5, 11], [76.5, 11.5], [76, 11.5], [76, 11]]] };
const boundariesWithGeometry: DistrictBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { districtId: 1, district: 'Bengaluru Urban' }, geometry: geometryBengaluru },
    { type: 'Feature', properties: { districtId: 3, district: 'Mysuru' }, geometry: geometryMysuru },
  ],
};

describe('DistrictMap', () => {
  beforeEach(() => {
    FakeMap.instances = [];
    FakePopup.instances = [];
  });

  it('adds a districts source with case counts merged into each feature, and a choropleth fill layer', () => {
    render(
      <DistrictMap
        boundaries={boundaries}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
      />,
    );

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
    render(
      <DistrictMap
        boundaries={boundaries}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={onDistrictSelect}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['click:district-fill']({ features: [{ properties: { districtId: 3 } }] });

    expect(onDistrictSelect).toHaveBeenCalledWith(3);
  });

  it('highlights the hovered district and shows a tooltip with its name and case count', () => {
    render(
      <DistrictMap
        boundaries={boundaries}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:district-fill']({
      features: [{ properties: { districtId: 3, district: 'Mysuru', caseCount: 120 } }],
      lngLat: { lng: 76.6, lat: 12.3 },
    });

    expect(map.featureStates.get(3)).toEqual({ hover: true });
    expect(map.getCanvas().style.cursor).toBe('pointer');
    const popup = FakePopup.instances[0];
    expect(popup.html).toContain('Mysuru');
    expect(popup.html).toContain('120');
    expect(popup.addedToMap).toBe(map);
  });

  it('clears the highlight and tooltip on mouseleave', () => {
    render(
      <DistrictMap
        boundaries={boundaries}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:district-fill']({
      features: [{ properties: { districtId: 3, district: 'Mysuru', caseCount: 120 } }],
      lngLat: { lng: 76.6, lat: 12.3 },
    });
    map.handlers['mouseleave:district-fill']({});

    expect(map.featureStates.has(3)).toBe(false);
    expect(map.getCanvas().style.cursor).toBe('');
    expect(FakePopup.instances[0].removed).toBe(true);
  });

  it('does not highlight on hover while a district is already selected', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        onDistrictSelect={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:district-fill']({
      features: [{ properties: { districtId: 1, district: 'Bengaluru Urban', caseCount: 500 } }],
      lngLat: { lng: 77.5, lat: 12.5 },
    });

    expect(map.featureStates.size).toBe(0);
  });

  it('filters to and fits bounds on the selected district', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        onDistrictSelect={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    expect(map.lastFilter).toEqual(['==', ['get', 'districtId'], 3]);
    expect(map.lastFitBounds?.bounds).toEqual([[76, 11], [76.5, 11.5]]);
  });

  it('resets the filter and fits the full extent when selection clears', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        onDistrictSelect={vi.fn()}
      />,
    );

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    expect(map.lastFilter).toBeNull();
    expect(map.lastFitBounds?.bounds).toEqual([[76, 11], [78, 13]]);
  });
});
