import { useEffect, useRef } from 'react';
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

interface CaseHeatmapViewProps {
  cases: CaseSummaryResponse[];
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

// No basemap tiles, matching DistrictMap.tsx's demo-must-not-depend-on-an-external-service
// constraint -- just the heatmap+circle layers over a blank style, fit to the case points.
export function CaseHeatmapView({ cases }: CaseHeatmapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof maplibregl.Map> | null>(null);
  const loadedRef = useRef(false);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const located = locatedCases(cases);
  const locatedRef = useRef(located);
  locatedRef.current = located;

  // Mounts once -- every value read inside 'load' comes from a ref, so filter changes
  // (which fire often, e.g. per keystroke) update via setData/fitBounds in the effect
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
      map.addSource('case-points', { type: 'geojson', data: toFeatureCollection(locatedRef.current) });

      map.addLayer({
        id: 'case-heatmap',
        type: 'heatmap',
        source: 'case-points',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 12, 3],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 12, 30],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 10, 1, 13, 0],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(42,120,214,0)',
            0.2, '#b7d3f6',
            0.4, '#6fa8e0',
            0.6, '#2a78d6',
            0.8, '#104281',
            1, '#5c1a1a',
          ],
        },
      });

      map.addLayer({
        id: 'case-points-circle',
        type: 'circle',
        source: 'case-points',
        paint: {
          'circle-radius': 5,
          'circle-color': '#104281',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 13, 1],
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
      if (locatedRef.current.length > 0) map.fitBounds(pointsBounds(locatedRef.current), { padding: 40 });
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
    if (located.length > 0) mapRef.current.fitBounds(pointsBounds(located), { padding: 40 });
  }, [cases]);

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
