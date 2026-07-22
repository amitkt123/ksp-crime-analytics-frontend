import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DistrictBoundaryFeatureCollection } from '../../api/geoApi';
import type { DistrictCorrelationResponse } from '../../api/sociologicalApi';

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

    setPaintProperty(_layerId: string, name: string, value: unknown) {
      this.paintProperties[name] = value;
    }

    setFeatureState(target: { id: number }, state: Record<string, unknown>) {
      this.featureStates.set(target.id, { ...this.featureStates.get(target.id), ...state });
    }

    removeFeatureState(target: { id: number }) {
      this.featureStates.delete(target.id);
    }

    getSource(id: string) {
      return this.sources[id];
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

import { IndicatorChoroplethMap, computeChoroplethScale } from './IndicatorChoroplethMap';

const boundaries: DistrictBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { districtId: 1, district: 'District A' }, geometry: {} },
    { type: 'Feature', properties: { districtId: 2, district: 'District B' }, geometry: {} },
  ],
};

const districts: DistrictCorrelationResponse[] = [
  { districtId: 1, districtName: 'District A', caseCount: 100, population: 1_000_000, literacyRate: 60, unemploymentRate: 4, urbanizationRate: 30, perCapitaIncome: 100_000 },
  { districtId: 2, districtName: 'District B', caseCount: 200, population: 1_000_000, literacyRate: 90, unemploymentRate: 6, urbanizationRate: 50, perCapitaIncome: 200_000 },
];

const riskByDistrict = new Map<number, number>([
  [1, 12],
  [2, 30],
]);

describe('computeChoroplethScale', () => {
  it('maps indicator values per district in indicator mode', () => {
    const scale = computeChoroplethScale('indicator', 'literacyRate', districts, riskByDistrict);
    expect(scale.valueByDistrict.get(1)).toBe(60);
    expect(scale.valueByDistrict.get(2)).toBe(90);
    expect(scale.minValue).toBe(60);
    expect(scale.maxValue).toBe(90);
  });

  it('uses the risk map directly in risk mode', () => {
    const scale = computeChoroplethScale('risk', 'literacyRate', districts, riskByDistrict);
    expect(scale.valueByDistrict).toBe(riskByDistrict);
    expect(scale.minValue).toBe(12);
    expect(scale.maxValue).toBe(30);
  });

  it('uses distinct color ramps per mode', () => {
    const indicatorScale = computeChoroplethScale('indicator', 'literacyRate', districts, riskByDistrict);
    const riskScale = computeChoroplethScale('risk', 'literacyRate', districts, riskByDistrict);
    expect(indicatorScale.minColor).not.toBe(riskScale.minColor);
    expect(indicatorScale.maxColor).not.toBe(riskScale.maxColor);
  });

  it('bumps maxValue when every district shares the same value, to avoid a degenerate scale', () => {
    const flatDistricts: DistrictCorrelationResponse[] = districts.map((d) => ({ ...d, literacyRate: 75 }));
    const scale = computeChoroplethScale('indicator', 'literacyRate', flatDistricts, riskByDistrict);
    expect(scale.minValue).toBe(75);
    expect(scale.maxValue).toBeGreaterThan(scale.minValue);
  });

  it('falls back to 0/0 when there is no data', () => {
    const scale = computeChoroplethScale('risk', 'literacyRate', [], new Map());
    expect(scale.minValue).toBe(0);
    expect(scale.maxValue).toBeGreaterThan(0);
  });
});

describe('IndicatorChoroplethMap', () => {
  beforeEach(() => {
    FakeMap.instances = [];
    FakePopup.instances = [];
  });

  function renderMap(overrides: Partial<React.ComponentProps<typeof IndicatorChoroplethMap>> = {}) {
    return render(
      <IndicatorChoroplethMap
        boundaries={boundaries}
        mode="indicator"
        onModeChange={vi.fn()}
        indicator="literacyRate"
        onIndicatorChange={vi.fn()}
        districts={districts}
        riskByDistrict={riskByDistrict}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
        {...overrides}
      />,
    );
  }

  it('adds a districts source with the indicator value merged into each feature', () => {
    renderMap();

    const map = FakeMap.instances[0];
    const source = map.sources['districts'] as { data: DistrictBoundaryFeatureCollection };
    const properties = source.data.features.map((f) => f.properties);
    expect(properties).toEqual([
      { districtId: 1, district: 'District A', value: 60 },
      { districtId: 2, district: 'District B', value: 90 },
    ]);
    expect(map.layers).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'district-fill', type: 'fill' })]),
    );
  });

  it('calls onDistrictSelect with the clicked district id', () => {
    const onDistrictSelect = vi.fn();
    renderMap({ onDistrictSelect });

    const map = FakeMap.instances[0];
    map.handlers['click:district-fill']({ features: [{ properties: { districtId: 2 } }] });

    expect(onDistrictSelect).toHaveBeenCalledWith(2);
  });

  it('toggles selection off when clicking the already-selected district', () => {
    const onDistrictSelect = vi.fn();
    renderMap({ onDistrictSelect, selectedDistrictId: 2 });

    const map = FakeMap.instances[0];
    map.handlers['click:district-fill']({ features: [{ properties: { districtId: 2 } }] });

    expect(onDistrictSelect).toHaveBeenCalledWith(null);
  });

  it('shows a hover tooltip with the district name and value', () => {
    renderMap();

    const map = FakeMap.instances[0];
    map.handlers['mousemove:district-fill']({
      features: [{ properties: { districtId: 2, district: 'District B', value: 90 } }],
      lngLat: { lng: 76, lat: 15 },
    });

    expect(FakePopup.instances[0].html).toContain('District B');
    expect(FakePopup.instances[0].html).toContain('90');
  });

  it('renders the mode toggle and calls onModeChange when switching to risk', async () => {
    const onModeChange = vi.fn();
    renderMap({ onModeChange });

    const riskButton = screen.getByRole('button', { name: /predicted risk/i });
    riskButton.click();

    expect(onModeChange).toHaveBeenCalledWith('risk');
  });

  it('shows the indicator select only in indicator mode', () => {
    const { rerender } = renderMap({ mode: 'indicator' });
    expect(screen.getByLabelText('Map indicator')).toBeInTheDocument();

    rerender(
      <IndicatorChoroplethMap
        boundaries={boundaries}
        mode="risk"
        onModeChange={vi.fn()}
        indicator="literacyRate"
        onIndicatorChange={vi.fn()}
        districts={districts}
        riskByDistrict={riskByDistrict}
        selectedDistrictId={null}
        onDistrictSelect={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Map indicator')).not.toBeInTheDocument();
  });

  it('shows a legend with the min and max values', () => {
    renderMap();

    expect(screen.getByText('60.0')).toBeInTheDocument();
    expect(screen.getByText('90.0')).toBeInTheDocument();
  });
});
