import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  DistrictBoundaryFeatureCollection,
  DistrictSummaryResponse,
  StationBoundaryFeatureCollection,
  StationSummaryResponse,
  StationIncidentPointResponse,
} from '../../api/geoApi';
import type { EmergingAlertResponse } from '../../api/alertsApi';

interface FakeMapEvent {
  features?: Array<{ properties: Record<string, unknown> }>;
  lngLat?: { lng: number; lat: number };
}

const { FakeMap, FakePopup, FakeMarker } = vi.hoisted(() => {
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
      const record = source as Record<string, unknown>;
      record.setData = (data: unknown) => {
        record.data = data;
      };
      this.sources[id] = record;
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

  class FakeMarker {
    static instances: FakeMarker[] = [];
    element: HTMLElement;
    lngLat: unknown;
    addedToMap: unknown = null;
    removed = false;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      FakeMarker.instances.push(this);
    }

    setLngLat(lngLat: unknown) {
      this.lngLat = lngLat;
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

  return { FakeMap, FakePopup, FakeMarker };
});

vi.mock('maplibre-gl', () => ({ default: { Map: FakeMap, Popup: FakePopup, Marker: FakeMarker } }));

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

const stationGeometryCity = { type: 'Polygon', coordinates: [[[76, 11], [76.2, 11], [76.2, 11.2], [76, 11.2], [76, 11]]] };
const stationGeometryRural = { type: 'Polygon', coordinates: [[[76.3, 11.3], [76.5, 11.3], [76.5, 11.5], [76.3, 11.5], [76.3, 11.3]]] };
const stationBoundariesWithGeometry: StationBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { unitId: 301, unitName: 'Mysuru City PS' }, geometry: stationGeometryCity },
    { type: 'Feature', properties: { unitId: 302, unitName: 'Mysuru Rural PS' }, geometry: stationGeometryRural },
  ],
};

const stationIncidents: StationIncidentPointResponse[] = [
  { caseMasterId: 1, crimeNo: 'GEO-1/2026', latitude: 11.4, longitude: 76.4 },
  { caseMasterId: 2, crimeNo: 'GEO-2/2026', latitude: 11.41, longitude: 76.41 },
];

function makeAlert(overrides: Partial<EmergingAlertResponse>): EmergingAlertResponse {
  return {
    unitId: 301,
    unitName: 'Mysuru City PS',
    districtId: 3,
    crimeSubHeadId: 12,
    crimeSubHeadName: 'Chain Snatching',
    currentWeekCount: 14,
    baselineMean: 5.2,
    zScore: 3.8,
    explanation: 'test alert',
    ...overrides,
  };
}

describe('DistrictMap', () => {
  beforeEach(() => {
    FakeMap.instances = [];
    FakePopup.instances = [];
    FakeMarker.instances = [];
  });

  it('adds a districts source with case counts merged into each feature, and a choropleth fill layer', () => {
    render(
      <DistrictMap
        boundaries={boundaries}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Mysuru')).toBeInTheDocument();
    expect(screen.getByText('120 cases')).toBeInTheDocument();
  });

  it('shows a floating district details card with case count and resolved %, hidden when nothing is selected', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(screen.queryByText('District details')).not.toBeInTheDocument();

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        districtKpi={{
          stateCaseCount: 120, stateCaseCountDeltaPct: 0, resolvedPct: 55,
          resolvedPctDeltaPts: 0, topCrimeSubHead: 'Chain Snatching', topCrimeSubHeadCount: 10,
        }}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(screen.getByText('District details')).toBeInTheDocument();
    expect(screen.getByText('Total active cases')).toBeInTheDocument();
    expect(screen.getByText('55.0%')).toBeInTheDocument();
  });

  it('calls onBack when the district details card is closed', async () => {
    const onBack = vi.fn();
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        onDistrictSelect={vi.fn()}
        onBack={onBack}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close district details' }));

    expect(onBack).toHaveBeenCalled();
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
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

  it('adds a pulsing red-zone marker at the centroid of a district with an active alert', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        alerts={[makeAlert({ districtId: 3, zScore: 3.8 })]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    const activeMarkers = FakeMarker.instances.filter((m) => !m.removed);
    expect(activeMarkers).toHaveLength(1);
    const marker = activeMarkers[0];
    expect(marker.lngLat).toEqual([76.25, 11.25]);
    expect(marker.element.querySelector('.alert-pulse-dot.severity-critical')).toBeTruthy();
    expect(marker.addedToMap).toBe(FakeMap.instances[0]);
  });

  it('does not add a marker for a district with no active alert', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        alerts={[]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(FakeMarker.instances.filter((m) => !m.removed)).toHaveLength(0);
  });

  it('adds a pulsing marker on the station polygon once drilled in, for a station with an active alert', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        alerts={[makeAlert({ unitId: 302, districtId: 3, zScore: 2.7 })]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    // Two active markers: the alert's district (3, Mysuru) still pulses on the
    // (dimmed but visible) state map, plus the drilled-in station itself.
    const activeMarkers = FakeMarker.instances.filter((m) => !m.removed);
    expect(activeMarkers).toHaveLength(2);
    const stationMarker = activeMarkers.find(
      (m) => Array.isArray(m.lngLat) && (m.lngLat as number[])[0] === 76.4,
    );
    expect(stationMarker?.lngLat).toEqual([76.4, 11.4]);
    expect(stationMarker?.element.querySelector('.alert-pulse-dot.severity-high')).toBeTruthy();
  });

  it('re-syncs markers when alerts change without remounting the map', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        alerts={[makeAlert({ districtId: 3, zScore: 3.8 })]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(FakeMap.instances).toHaveLength(1);
    const firstMarker = FakeMarker.instances[0];

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        alerts={[makeAlert({ districtId: 1, zScore: 3.8 })]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(FakeMap.instances).toHaveLength(1);
    expect(firstMarker.removed).toBe(true);
    const activeMarkers = FakeMarker.instances.filter((m) => !m.removed);
    expect(activeMarkers).toHaveLength(1);
    expect(activeMarkers[0].lngLat).toEqual([77.5, 12.5]);
  });

  it('shades the choropleth by total case count when no time-of-day override is given', () => {
    render(
      <DistrictMap
        boundaries={boundaries}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    const source = map.getSource('districts') as { data: DistrictBoundaryFeatureCollection };
    const properties = source.data.features.map((f) => f.properties);
    expect(properties).toEqual([
      { districtId: 1, district: 'Bengaluru Urban', caseCount: 500 },
      { districtId: 3, district: 'Mysuru', caseCount: 120 },
    ]);
  });

  it('re-shades the choropleth by the override map, in place, without remounting the map', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundaries}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(FakeMap.instances).toHaveLength(1);

    rerender(
      <DistrictMap
        boundaries={boundaries}
        districtSummaries={districtSummaries}
        selectedDistrictId={null}
        caseCountOverride={new Map([[1, 40], [3, 200]])}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(FakeMap.instances).toHaveLength(1);
    const map = FakeMap.instances[0];
    const source = map.getSource('districts') as { data: DistrictBoundaryFeatureCollection };
    const properties = source.data.features.map((f) => f.properties);
    expect(properties).toEqual([
      { districtId: 1, district: 'Bengaluru Urban', caseCount: 40 },
      { districtId: 3, district: 'Mysuru', caseCount: 200 },
    ]);
    expect(map.paintProperties['fill-color']).toEqual([
      'interpolate',
      ['linear'],
      ['get', 'caseCount'],
      0,
      '#b7d3f6',
      200,
      '#104281',
    ]);
  });

  it('adds a heatmap source/layer for the selected station\'s incident points, and dims its siblings', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={302}
        stationIncidents={stationIncidents}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    const source = map.getSource('heatmap-incidents') as { data: { features: unknown[] } };
    expect(source.data.features).toHaveLength(2);
    expect(map.getLayer('heatmap-incidents-layer')).toEqual(expect.objectContaining({ type: 'heatmap' }));
    expect(map.paintProperties['fill-opacity']).toEqual(['case', ['==', ['get', 'unitId'], 302], 1, 0.15]);
    expect(map.lastFitBounds?.bounds).toEqual([[76.3, 11.3], [76.5, 11.5]]);
  });

  it('removes the heatmap layer/source and resets station opacity when the station selection clears', () => {
    const { rerender } = render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={302}
        stationIncidents={stationIncidents}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    rerender(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={null}
        stationIncidents={[]}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    expect(map.getLayer('heatmap-incidents-layer')).toBeUndefined();
    expect(map.getSource('heatmap-incidents')).toBeUndefined();
    expect(map.paintProperties['fill-opacity']).toBe(1);
  });

  it('calls onStationSelect with the clicked station unitId', () => {
    const onStationSelect = vi.fn();
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundaries}
        stationSummaries={stationSummaries}
        selectedStationId={null}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={onStationSelect}
        onStationBack={vi.fn()}
      />,
    );

    const map = FakeMap.instances[0];
    map.handlers['click:station-fill']({ features: [{ properties: { unitId: 302 } }] });

    expect(onStationSelect).toHaveBeenCalledWith(302);
  });

  it('shows a three-level breadcrumb with the incident count when a station is selected', () => {
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={302}
        stationIncidents={stationIncidents}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Mysuru Rural PS')).toBeInTheDocument();
    expect(screen.getByText('2 incidents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mysuru' })).toBeInTheDocument();
  });

  it('calls onStationBack when the district breadcrumb segment is clicked while a station is selected', async () => {
    const onStationBack = vi.fn();
    render(
      <DistrictMap
        boundaries={boundariesWithGeometry}
        districtSummaries={districtSummaries}
        selectedDistrictId={3}
        stationBoundaries={stationBoundariesWithGeometry}
        stationSummaries={stationSummaries}
        selectedStationId={302}
        stationIncidents={stationIncidents}
        onDistrictSelect={vi.fn()}
        onBack={vi.fn()}
        onStationSelect={vi.fn()}
        onStationBack={onStationBack}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mysuru' }));

    expect(onStationBack).toHaveBeenCalled();
  });
});
