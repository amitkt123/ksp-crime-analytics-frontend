import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  caseStatusLabel,
  gravityLabel,
  type CaseGravity,
  type CaseStatus,
  type CaseSummaryResponse,
} from '../../api/caseApi';
import type { StationBoundaryFeatureCollection } from '../../api/geoApi';
import { geometryBounds } from '../command-center/geoBounds';

type StationBoundaryFeature = StationBoundaryFeatureCollection['features'][number];

interface CaseHeatmapViewProps {
  cases: CaseSummaryResponse[];
  stationBoundary?: StationBoundaryFeature | null;
}

type LocatedCase = CaseSummaryResponse & { location: { lat: number; lng: number } };

interface CasePointProperties {
  caseId: number;
  caseNumber: string;
  status: CaseStatus;
  gravity: CaseGravity | null;
}

function locatedCases(cases: CaseSummaryResponse[]): LocatedCase[] {
  return cases.filter((c): c is LocatedCase => c.location != null);
}

// [[minLng, minLat], [maxLng, maxLat]] -- only call with a non-empty array (Math.min/max
// of an empty array is Infinity/-Infinity, an invalid bounds box for fitBounds).
function pointsBounds(points: LocatedCase[]): [[number, number], [number, number]] {
  const lngs = points.map((c) => c.location.lng);
  const lats = points.map((c) => c.location.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function toFeatureCollection(points: LocatedCase[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((c) => ({
      type: 'Feature' as const,
      properties: {
        caseId: c.caseId,
        caseNumber: c.caseNumber,
        status: c.status,
        gravity: c.gravity ?? null,
      } satisfies CasePointProperties,
      geometry: { type: 'Point' as const, coordinates: [c.location.lng, c.location.lat] },
    })),
  };
}

function popupHtml(properties: CasePointProperties): string {
  const gravityLine = properties.gravity ? `<br/>${gravityLabel(properties.gravity)}` : '';
  return `<strong>${properties.caseNumber}</strong><br/>${caseStatusLabel(properties.status)}${gravityLine}`;
}

function toBoundaryFeatureCollection(boundary: StationBoundaryFeature | null | undefined) {
  return { type: 'FeatureCollection' as const, features: boundary ? [boundary] : [] };
}

// No basemap tiles, matching DistrictMap.tsx's demo-must-not-depend-on-an-external-service
// constraint -- just the boundary/heatmap/circle layers over a blank style.
export function CaseHeatmapView({ cases, stationBoundary = null }: CaseHeatmapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof maplibregl.Map> | null>(null);
  const loadedRef = useRef(false);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const located = useMemo(() => locatedCases(cases), [cases]);
  const locatedRef = useRef(located);
  locatedRef.current = located;

  const stationBoundaryRef = useRef(stationBoundary);
  stationBoundaryRef.current = stationBoundary;

  // Mounts once -- every value read inside 'load' comes from a ref, so filter changes
  // (which fire often, e.g. per keystroke) update via setData/fitBounds in the effects
  // below instead of tearing down and recreating the WebGL context each time.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [76.5, 15.3],
      zoom: 5.5,
    });
    mapRef.current = map;

    map.on('load', () => {
      // Boundary layers added first so they render underneath the heatmap/circle layers.
      map.addSource('station-boundary', { type: 'geojson', data: toBoundaryFeatureCollection(stationBoundaryRef.current) });
      map.addLayer({
        id: 'station-boundary-fill',
        type: 'fill',
        source: 'station-boundary',
        paint: { 'fill-color': '#2a78d6', 'fill-opacity': 0.08 },
      });
      map.addLayer({
        id: 'station-boundary-line',
        type: 'line',
        source: 'station-boundary',
        paint: { 'line-color': '#2a78d6', 'line-width': 2 },
      });

      map.addSource('case-points', { type: 'geojson', data: toFeatureCollection(locatedRef.current) });

      map.addLayer({
        id: 'case-heatmap',
        type: 'heatmap',
        source: 'case-points',
        paint: {
          'heatmap-weight': 1,
          // Zoom domain tuned for a single station's jurisdiction (a few km across), not a
          // country-wide dataset -- fitBounds on a station boundary typically lands around
          // z11-14, so the heatmap must stay fully opaque through that range and only give
          // way to individual points once zoomed in to street level.
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 4],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 16, 50],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 16, 1, 18, 0],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(255,255,178,0)',
            0.2, '#ffffb2',
            0.4, '#fecc5c',
            0.6, '#fd8d3c',
            0.8, '#f03b20',
            1, '#bd0026',
          ],
        },
      });

      map.addLayer({
        id: 'case-points-circle',
        type: 'circle',
        source: 'case-points',
        paint: {
          'circle-radius': 5,
          'circle-color': '#bd0026',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 16, 0, 18, 1],
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });

      map.on('mousemove', 'case-points-circle', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        map.getCanvas().style.cursor = 'pointer';
        popup
          .setLngLat(e.lngLat!)
          .setHTML(popupHtml(feature.properties as unknown as CasePointProperties))
          .addTo(map);
      });

      map.on('mouseleave', 'case-points-circle', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      map.on('click', 'case-points-circle', (e) => {
        const caseId = e.features?.[0]?.properties?.caseId;
        if (typeof caseId === 'number') navigateRef.current(`/case-explorer/${caseId}`);
      });

      loadedRef.current = true;
      // The jurisdiction boundary gives a stable frame; prefer it over fitting to
      // whatever subset of cases the current filter happens to include.
      if (stationBoundaryRef.current) {
        map.fitBounds(geometryBounds(stationBoundaryRef.current.geometry), { padding: 40 });
      } else if (locatedRef.current.length > 0) {
        map.fitBounds(pointsBounds(locatedRef.current), { padding: 40 });
      }
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const source = mapRef.current.getSource('case-points') as { setData: (data: unknown) => void } | undefined;
    source?.setData(toFeatureCollection(located));
    if (!stationBoundary && located.length > 0) {
      mapRef.current.fitBounds(pointsBounds(located), { padding: 40 });
    }
  }, [located, stationBoundary]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const source = mapRef.current.getSource('station-boundary') as { setData: (data: unknown) => void } | undefined;
    source?.setData(toBoundaryFeatureCollection(stationBoundary));
    if (stationBoundary) mapRef.current.fitBounds(geometryBounds(stationBoundary.geometry), { padding: 40 });
  }, [stationBoundary]);

  return (
    <div className="map-card">
      <div ref={containerRef} className="map-canvas" role="img" aria-label="Heatmap of case locations" />
      {located.length === 0 && (
        <div className="map-empty-overlay">
          <p>No case locations to show for these filters.</p>
        </div>
      )}
    </div>
  );
}
