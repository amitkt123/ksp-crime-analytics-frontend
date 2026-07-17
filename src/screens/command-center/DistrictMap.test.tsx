import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  DistrictBoundaryFeatureCollection,
  DistrictSummaryResponse,
  StationBoundaryFeatureCollection,
  StationSummaryResponse,
} from '../../api/geoApi';

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
    paintProperties: Record<string, unknown> = {};

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

    setPaintProperty(_layerId: string, name: string, value: unknown) {
      this.paintProperties[name] = value;
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

    getLayer(id: string) {
      return (this.layers as Array<{ id: string }>).find((l) => l.id === id);
    }

    getSource(id: string) {
      return this.sources[id];
    }

    removeLayer(id: string) {
      this.layers = (this.layers as Array<{ id: string }>).filter((l) => l.id !== id);
    }

    removeSource(id: string) {
      delete this.sources[id];
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

const stationBoundaries: StationBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { unitId: 301, unitName: 'Mysuru City PS' }, geometry: {} },
    { type: 'Feature', properties: { unitId: 302, unitName: 'Mysuru Rural PS' }, geometry: {} },
  ],
};
const stationSummaries: StationSummaryResponse[] = [
  { unitId: 301, unitName: 'Mysuru City PS', caseCount: 80 },
  { unitId: 302, unitName: 'Mysuru Rural PS', caseCount: 40 },
];

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
        onBack={vi.fn()}
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
        onBack={vi.fn()}
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
        onBack={vi.fn()}
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
        onBack={vi.fn()}
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
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:district-fill']({
      features: [{ properties: { districtId: 1, district: 'Bengaluru Urban', caseCount: 500 } }],
      lngLat: { lng: 77.5, lat: 12.5 },
    });

    expect(map.featureStates.size).toBe(0);
  });

  it('dims every district but the selected one and fits bounds on it, without filtering the rest out', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    expect(map.paintProperties['fill-opacity']).toEqual(['case', ['==', ['get', 'districtId'], 3], 1, 0.15]);
    expect(map.paintProperties['fill-outline-color']).toEqual([
      'case',
      ['==', ['get', 'districtId'], 3],
      '#2a78d6',
      '#D8DEEA',
    ]);
    expect(map.lastFitBounds?.bounds).toEqual([[76, 11], [76.5, 11.5]]);
    expect(map.lastFilter).toBeUndefined();
  });

  it('resets opacity/outline and fits the full extent when selection clears', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    expect(map.paintProperties['fill-opacity']).toBe(1);
    expect(map.paintProperties['fill-outline-color']).toEqual([
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#2a78d6',
      '#D8DEEA',
    ]);
    expect(map.lastFitBounds?.bounds).toEqual([[76, 11], [78, 13]]);
  });

  it('shows a breadcrumb with the selected district name and case count, absent when nothing is selected', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByText('Mysuru')).not.toBeInTheDocument();

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Mysuru')).toBeInTheDocument();
    expect(screen.getByText('120 cases')).toBeInTheDocument();
  });

  it('calls onBack when the breadcrumb "State" link is clicked', async () => {
    const onBack = vi.fn();
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        onDistrictSelect={vi.fn()}
        onBack={onBack}
      />,
    );

    await userEvent.click(screen.getByText('State'));

    expect(onBack).toHaveBeenCalled();
  });

  it('adds a stations source scoped to the district with case counts joined by unitId', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    const source = map.getSource('stations') as { data: StationBoundaryFeatureCollection };
    const properties = source.data.features.map((f) => f.properties);
    expect(properties).toEqual([
      { unitId: 301, unitName: 'Mysuru City PS', caseCount: 80 },
      { unitId: 302, unitName: 'Mysuru Rural PS', caseCount: 40 },
    ]);
    expect(map.getLayer('station-fill')).toBeDefined();
  });

  it('marks a station with no matching case-count row as unmatched (null caseCount)', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={[stationSummaries[0]]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    const source = map.getSource('stations') as { data: StationBoundaryFeatureCollection };
    const unmatched = source.data.features.find((f) => f.properties.unitId === 302);
    expect((unmatched?.properties as { caseCount: number | null }).caseCount).toBeNull();
  });

  it('removes the stations layer and source when station boundaries are cleared', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        stationBoundaries={null}
        stationSummaries={[]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    expect(map.getLayer('station-fill')).toBeUndefined();
    expect(map.getSource('stations')).toBeUndefined();
  });

  it('highlights the hovered station and shows a tooltip with its name and case count', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:station-fill']({
      features: [{ properties: { unitId: 302, unitName: 'Mysuru Rural PS', caseCount: 40 } }],
      lngLat: { lng: 76.6, lat: 12.3 },
    });

    expect(map.featureStates.get(302)).toEqual({ hover: true });
    expect(map.getCanvas().style.cursor).toBe('pointer');
    const popup = FakePopup.instances[0];
    expect(popup.html).toContain('Mysuru Rural PS');
    expect(popup.html).toContain('40 cases');
  });

  it('shows "No case data" for a hovered station with no matching case-count row', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={[]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:station-fill']({
      features: [{ properties: { unitId: 301, unitName: 'Mysuru City PS', caseCount: null } }],
      lngLat: { lng: 76.6, lat: 12.3 },
    });

    const popup = FakePopup.instances[0];
    expect(popup.html).toContain('No case data');
  });

  it('clears the station highlight and tooltip on mouseleave', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['mousemove:station-fill']({
      features: [{ properties: { unitId: 302, unitName: 'Mysuru Rural PS', caseCount: 40 } }],
      lngLat: { lng: 76.6, lat: 12.3 },
    });
    map.handlers['mouseleave:station-fill']({});

    expect(map.featureStates.has(302)).toBe(false);
    expect(map.getCanvas().style.cursor).toBe('');
    expect(FakePopup.instances[0].removed).toBe(true);
  });
});
