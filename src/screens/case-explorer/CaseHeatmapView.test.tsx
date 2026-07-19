import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CaseSummaryResponse } from '../../api/caseApi';
import type { StationBoundaryFeatureCollection } from '../../api/geoApi';

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

import { CaseHeatmapView } from './CaseHeatmapView';

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

describe('CaseHeatmapView', () => {
  beforeEach(() => {
    FakeMap.instances = [];
    FakePopup.instances = [];
    mockNavigate.mockClear();
  });

  it('shows an empty-state message and skips fitBounds when no case has a location', () => {
    render(<CaseHeatmapView cases={[baseCase]} />);

    expect(screen.getByText('No case locations to show for these filters.')).toBeInTheDocument();
    expect(FakeMap.instances[0].lastFitBounds).toBeUndefined();
  });

  it('adds a case-points source and heatmap+circle layers from located cases', () => {
    const cases: CaseSummaryResponse[] = [
      { ...baseCase, caseId: 1, location: { lat: 12.9, lng: 77.5 } },
      { ...baseCase, caseId: 2, location: { lat: 13.0, lng: 77.6 } },
      { ...baseCase, caseId: 3 }, // no location -- excluded
    ];

    render(<CaseHeatmapView cases={cases} />);

    const map = FakeMap.instances[0];
    const source = map.getSource('case-points') as { data: { features: unknown[] } };
    expect(source.data.features).toHaveLength(2);
    expect(map.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'case-heatmap', type: 'heatmap' }),
        expect.objectContaining({ id: 'case-points-circle', type: 'circle' }),
      ]),
    );
  });

  it('fits bounds to the located cases on load', () => {
    const cases: CaseSummaryResponse[] = [
      { ...baseCase, caseId: 1, location: { lat: 12.9, lng: 77.5 } },
      { ...baseCase, caseId: 2, location: { lat: 13.0, lng: 77.6 } },
    ];

    render(<CaseHeatmapView cases={cases} />);

    expect(FakeMap.instances[0].lastFitBounds?.bounds).toEqual([[77.5, 12.9], [77.6, 13.0]]);
  });

  it('shows a popup with case number, status, and gravity on hover', () => {
    const cases: CaseSummaryResponse[] = [
      { ...baseCase, caseId: 1, location: { lat: 12.9, lng: 77.5 }, gravity: 'heinous' },
    ];

    render(<CaseHeatmapView cases={cases} />);

    const map = FakeMap.instances[0];
    map.handlers['mousemove:case-points-circle']({
      features: [{ properties: { caseId: 1, caseNumber: '276/2026', status: 'registered', gravity: 'heinous' } }],
      lngLat: { lng: 77.5, lat: 12.9 },
    });

    const popup = FakePopup.instances[0];
    expect(popup.html).toContain('276/2026');
    expect(popup.html).toContain('Registered');
    expect(popup.html).toContain('Heinous');
    expect(popup.addedToMap).toBe(map);
  });

  it('clears the popup and cursor on mouseleave', () => {
    const cases: CaseSummaryResponse[] = [
      { ...baseCase, caseId: 1, location: { lat: 12.9, lng: 77.5 } },
    ];

    render(<CaseHeatmapView cases={cases} />);

    const map = FakeMap.instances[0];
    map.handlers['mousemove:case-points-circle']({
      features: [{ properties: { caseId: 1, caseNumber: '276/2026', status: 'registered', gravity: null } }],
      lngLat: { lng: 77.5, lat: 12.9 },
    });
    map.handlers['mouseleave:case-points-circle']({});

    expect(map.getCanvas().style.cursor).toBe('');
    expect(FakePopup.instances[0].removed).toBe(true);
  });

  it('navigates to the case detail route on click', () => {
    const cases: CaseSummaryResponse[] = [
      { ...baseCase, caseId: 1, location: { lat: 12.9, lng: 77.5 } },
    ];

    render(<CaseHeatmapView cases={cases} />);

    const map = FakeMap.instances[0];
    map.handlers['click:case-points-circle']({
      features: [{ properties: { caseId: 1, caseNumber: '276/2026', status: 'registered', gravity: null } }],
    });

    expect(mockNavigate).toHaveBeenCalledWith('/case-explorer/1');
  });

  it('updates the source data and refits bounds when the cases prop changes', () => {
    const initial: CaseSummaryResponse[] = [
      { ...baseCase, caseId: 1, location: { lat: 12.9, lng: 77.5 } },
    ];
    const { rerender } = render(<CaseHeatmapView cases={initial} />);

    const updated: CaseSummaryResponse[] = [
      { ...baseCase, caseId: 1, location: { lat: 12.9, lng: 77.5 } },
      { ...baseCase, caseId: 2, location: { lat: 14.0, lng: 78.0 } },
    ];
    rerender(<CaseHeatmapView cases={updated} />);

    const map = FakeMap.instances[0];
    expect(FakeMap.instances).toHaveLength(1); // no remount
    const source = map.getSource('case-points') as { data: { features: unknown[] } };
    expect(source.data.features).toHaveLength(2);
    expect(map.lastFitBounds?.bounds).toEqual([[77.5, 12.9], [78.0, 14.0]]);
  });

  const stationBoundary: StationBoundaryFeatureCollection['features'][number] = {
    type: 'Feature',
    properties: { unitId: 176, unitName: 'Whitefield PS' },
    geometry: { type: 'Polygon', coordinates: [[[77.6, 12.9], [77.8, 12.9], [77.8, 13.1], [77.6, 13.1], [77.6, 12.9]]] },
  };

  it('adds a station-boundary source and fill+line layers when a boundary is given', () => {
    render(<CaseHeatmapView cases={[baseCase]} stationBoundary={stationBoundary} />);

    const map = FakeMap.instances[0];
    const source = map.getSource('station-boundary') as { data: { features: unknown[] } };
    expect(source.data.features).toEqual([stationBoundary]);
    expect(map.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'station-boundary-fill', type: 'fill' }),
        expect.objectContaining({ id: 'station-boundary-line', type: 'line' }),
      ]),
    );
  });

  it('fits bounds to the station boundary (not just the located cases) when a boundary is given', () => {
    const cases: CaseSummaryResponse[] = [{ ...baseCase, caseId: 1, location: { lat: 20.0, lng: 80.0 } }];

    render(<CaseHeatmapView cases={cases} stationBoundary={stationBoundary} />);

    expect(FakeMap.instances[0].lastFitBounds?.bounds).toEqual([[77.6, 12.9], [77.8, 13.1]]);
  });

  it('still adds the boundary layer even when no case has a location', () => {
    render(<CaseHeatmapView cases={[baseCase]} stationBoundary={stationBoundary} />);

    expect(screen.getByText('No case locations to show for these filters.')).toBeInTheDocument();
    const map = FakeMap.instances[0];
    expect(map.getSource('station-boundary')).toBeDefined();
  });

  it('does not refit bounds on filter changes once a station boundary is set', () => {
    const initial: CaseSummaryResponse[] = [{ ...baseCase, caseId: 1, location: { lat: 12.95, lng: 77.7 } }];
    const { rerender } = render(<CaseHeatmapView cases={initial} stationBoundary={stationBoundary} />);

    const map = FakeMap.instances[0];
    const boundsAfterLoad = map.lastFitBounds?.bounds;

    const updated: CaseSummaryResponse[] = [{ ...baseCase, caseId: 2, location: { lat: 12.96, lng: 77.71 } }];
    rerender(<CaseHeatmapView cases={updated} stationBoundary={stationBoundary} />);

    expect(map.lastFitBounds?.bounds).toEqual(boundsAfterLoad);
  });
});
