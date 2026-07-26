import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as caseApiModule from '../../api/caseApi';
import * as geoApiModule from '../../api/geoApi';
import type { CaseSummaryResponse } from '../../api/caseApi';
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const { FakeMap, FakePopup } = vi.hoisted(() => {
  class FakeMap {
    static instances: FakeMap[] = [];
    sources: Record<string, { data: unknown; setData: (data: unknown) => void }> = {};
    layers: Array<{ id: string; type: string }> = [];
    handlers: Record<string, (e: FakeMapEvent) => void> = {};
    canvas: { style: Record<string, string> } = { style: {} };
    lastFitBounds: { bounds: unknown; options: unknown } | undefined;
    paintProperties: Record<string, unknown> = {};

    constructor(_options: unknown) {
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

    addSource(id: string, source: { data: unknown }) {
      const record = { data: source.data, setData: (data: unknown) => { record.data = data; } };
      this.sources[id] = record;
    }

    addLayer(layer: { id: string; type: string }) {
      this.layers.push(layer);
    }

    getSource(id: string) {
      return this.sources[id];
    }

    getLayer(id: string) {
      return this.layers.find((l) => l.id === id);
    }

    removeLayer(id: string) {
      this.layers = this.layers.filter((l) => l.id !== id);
    }

    removeSource(id: string) {
      delete this.sources[id];
    }

    setPaintProperty(layerId: string, prop: string, value: unknown) {
      this.paintProperties[`${layerId}.${prop}`] = value;
    }

    setFeatureState() {}
    removeFeatureState() {}

    getCanvas() {
      return this.canvas;
    }

    fitBounds(bounds: unknown, options: unknown) {
      this.lastFitBounds = { bounds, options };
    }

    remove() {}
  }

  class FakePopup {
    static instances: FakePopup[] = [];
    html = '';
    addedToMap: unknown = null;
    removed = false;

    constructor() {
      FakePopup.instances.push(this);
    }

    setLngLat() {
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

import { CaseExplorerMap } from './CaseExplorerMap';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<T, Error>;
}

function mockDisabled<T>() {
  return { data: undefined, isLoading: false, isError: false, isSuccess: false, refetch: vi.fn() } as unknown as UseQueryResult<T, Error>;
}

const baseCase: CaseSummaryResponse = {
  caseId: 176000,
  caseNumber: '276/2026',
  unitId: 176,
  unitName: 'Whitefield PS',
  crimeSubHeadId: 103,
  crimeSubHeadName: 'Chain Snatching',
  status: 'registered',
  firDate: '2026-05-26',
};

const districtBoundaries: DistrictBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { districtId: 5, district: 'Bengaluru Urban' },
      geometry: { type: 'Polygon', coordinates: [[[77.4, 12.8], [77.8, 12.8], [77.8, 13.1], [77.4, 13.1], [77.4, 12.8]]] },
    },
  ],
};

const districtSummaries: DistrictSummaryResponse[] = [{ districtId: 5, districtName: 'Bengaluru Urban', caseCount: 42 }];

const stationBoundaries: StationBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { unitId: 176, unitName: 'Whitefield PS' },
      geometry: { type: 'Polygon', coordinates: [[[77.6, 12.9], [77.8, 12.9], [77.8, 13.1], [77.6, 13.1], [77.6, 12.9]]] },
    },
  ],
};

const stationSummaries: StationSummaryResponse[] = [{ unitId: 176, unitName: 'Whitefield PS', caseCount: 12 }];

function mockGeoApi() {
  vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(districtBoundaries));
  vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(mockSuccess(districtSummaries));
  // Mirrors the real hooks' enabled:districtId!=null gating, so tests genuinely exercise
  // the drilldown (station data only appears once a district is selected).
  vi.spyOn(geoApiModule, 'useStationBoundaries').mockImplementation((_token, districtId) =>
    districtId != null ? mockSuccess(stationBoundaries) : mockDisabled<StationBoundaryFeatureCollection>(),
  );
  vi.spyOn(geoApiModule, 'useStationSummaries').mockImplementation((_token, districtId) =>
    districtId != null ? mockSuccess(stationSummaries) : mockDisabled<StationSummaryResponse[]>(),
  );
}

function renderMap(props: Partial<Parameters<typeof CaseExplorerMap>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CaseExplorerMap token="jwt" filters={{}} defaultDistrictId={null} defaultUnitId={null} {...props} />
    </MemoryRouter>,
  );
}

describe('CaseExplorerMap', () => {
  beforeEach(() => {
    FakeMap.instances = [];
    FakePopup.instances = [];
    mockNavigate.mockClear();
    mockGeoApi();
  });

  it('shows a loading message while district data is loading', () => {
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue({ isLoading: true, isError: false } as unknown as UseQueryResult<DistrictBoundaryFeatureCollection, Error>);
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess([]));

    renderMap();

    expect(screen.getByText('Loading map…')).toBeInTheDocument();
  });

  it('shows an error message with a retry button when district data fails to load', () => {
    const refetch = vi.fn();
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue({ isLoading: false, isError: true, refetch } as unknown as UseQueryResult<DistrictBoundaryFeatureCollection, Error>);
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess([]));

    renderMap();

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the map");
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it('renders a state-wide district choropleth with case-count labels by default', () => {
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess([]));

    renderMap();

    const map = FakeMap.instances[0];
    const source = map.getSource('districts') as { data: { features: Array<{ properties: { caseCount: number } }> } };
    expect(source.data.features[0].properties.caseCount).toBe(42);
    expect(map.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'district-fill', type: 'fill' }),
        expect.objectContaining({ id: 'district-labels', type: 'symbol' }),
      ]),
    );
  });

  it('drills into a district on click, showing the breadcrumb and station choropleth', async () => {
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess([]));

    renderMap();

    const map = FakeMap.instances[0];
    map.handlers['click:district-fill']({ features: [{ properties: { districtId: 5 } }] });

    expect(await screen.findByText('Bengaluru Urban')).toBeInTheDocument();
    expect(screen.getByText('42 cases')).toBeInTheDocument();
    const stationSource = map.getSource('stations') as { data: { features: Array<{ properties: { caseCount: number } }> } };
    expect(stationSource.data.features[0].properties.caseCount).toBe(12);
  });

  it('drills into a station on click, rendering the case heatmap and switching the legend to density', async () => {
    const cases: CaseSummaryResponse[] = [
      { ...baseCase, location: { lat: 12.9, lng: 77.7 } },
    ];
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess(cases));

    renderMap({ defaultDistrictId: 5 });

    const map = FakeMap.instances[0];
    map.handlers['click:station-fill']({ features: [{ properties: { unitId: 176 } }] });

    expect(await screen.findByText('Whitefield PS')).toBeInTheDocument();
    const pointSource = map.getSource('case-points') as { data: { features: unknown[] } };
    expect(pointSource.data.features).toHaveLength(1);
    expect(map.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'case-heatmap', type: 'heatmap' }),
        expect.objectContaining({ id: 'case-points-circle', type: 'circle' }),
      ]),
    );
  });

  it('shows a case popup with crime type, status, and date on hover, and navigates on click', () => {
    const cases: CaseSummaryResponse[] = [
      { ...baseCase, location: { lat: 12.9, lng: 77.7 }, gravity: 'heinous' },
    ];
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess(cases));

    renderMap({ defaultDistrictId: 5, defaultUnitId: 176 });

    const map = FakeMap.instances[0];
    map.handlers['mousemove:case-points-circle']({
      features: [{ properties: { caseId: 176000, caseNumber: '276/2026', crimeSubHeadName: 'Chain Snatching', firDate: '2026-05-26', status: 'registered', gravity: 'heinous' } }],
      lngLat: { lng: 77.7, lat: 12.9 },
    });

    const popup = FakePopup.instances[0];
    expect(popup.html).toContain('276/2026');
    expect(popup.html).toContain('Chain Snatching');
    expect(popup.html).toContain('Heinous');

    map.handlers['click:case-points-circle']({ features: [{ properties: { caseId: 176000 } }] });
    expect(mockNavigate).toHaveBeenCalledWith('/case-explorer/176000');
  });

  it('shows an empty-state message when a station has no located cases', () => {
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess([baseCase]));

    renderMap({ defaultDistrictId: 5, defaultUnitId: 176 });

    expect(screen.getByText('No case locations to show for these filters.')).toBeInTheDocument();
  });

  it('navigates back to the state-wide view from the breadcrumb', async () => {
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess([]));

    renderMap({ defaultDistrictId: 5, defaultUnitId: 176 });
    expect(screen.getByText('Whitefield PS')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'State' }));

    expect(screen.queryByText('Whitefield PS')).not.toBeInTheDocument();
  });
});
