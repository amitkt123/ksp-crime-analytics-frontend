import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DistrictBoundaryFeatureCollection, DistrictSummaryResponse } from '../../api/geoApi';

interface DistrictMapProps {
  boundaries: DistrictBoundaryFeatureCollection;
  districtSummaries: DistrictSummaryResponse[];
  onDistrictSelect: (districtId: number) => void;
}

// No basemap tiles, no external tile server/token -- just the real district boundary
// GeoJSON (already case-count-enriched here, district-id-enriched server-side by
// DistrictBoundaryService) rendered as a MapLibre vector fill layer. Matches the design
// spec's "why MapLibre over Mapbox" reasoning: the demo must not depend on an external
// service staying up during judging.
export function DistrictMap({ boundaries, districtSummaries, onDistrictSelect }: DistrictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const caseCountByDistrict = new Map(districtSummaries.map((d) => [d.districtId, d.caseCount]));
    const maxCount = Math.max(1, ...districtSummaries.map((d) => d.caseCount));

    const enrichedFeatures = boundaries.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        caseCount: caseCountByDistrict.get(feature.properties.districtId) ?? 0,
      },
    }));

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [76.5, 15.3],
      zoom: 5.5,
    });

    map.on('load', () => {
      map.addSource('districts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: enrichedFeatures },
      });
      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'districts',
        paint: {
          'fill-color': ['interpolate', ['linear'], ['get', 'caseCount'], 0, '#b7d3f6', maxCount, '#104281'],
          // MapLibre's style validator rejects CSS var() -- must be a literal color.
          // Matches --line's light-theme value in tokens.css.
          'fill-outline-color': '#D8DEEA',
        },
      });
      map.on('click', 'district-fill', (e) => {
        const districtId = e.features?.[0]?.properties?.districtId;
        if (typeof districtId === 'number') onDistrictSelect(districtId);
      });
    });

    return () => map.remove();
  }, [boundaries, districtSummaries, onDistrictSelect]);

  return (
    <div
      ref={containerRef}
      className="map-card"
      role="img"
      aria-label="Map of Karnataka's districts shaded by case count"
    />
  );
}
