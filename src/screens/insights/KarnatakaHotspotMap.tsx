import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DistrictBoundaryFeatureCollection } from '../../api/geoApi';
import { featureCollectionBounds } from '../command-center/geoBounds';

export interface HotspotPoint {
  lat: number;
  lon: number;
  crimeHead: string;
  count: number;
}

interface KarnatakaHotspotMapProps {
  boundaries: DistrictBoundaryFeatureCollection;
  points: HotspotPoint[];
}

const CRIME_HEAD_COLORS = ['#123a63', '#d4a017', '#c0392b', '#1e8a5f', '#6c5ce7', '#e67e22'];

export function KarnatakaHotspotMap({ boundaries, points }: KarnatakaHotspotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [76.5, 15.3],
      zoom: 5.5,
    });

    map.on('load', () => {
      map.addSource('district-outline', { type: 'geojson', data: boundaries as never });
      map.addLayer({
        id: 'district-outline-fill',
        type: 'fill',
        source: 'district-outline',
        paint: { 'fill-color': '#eef1f6', 'fill-opacity': 1 },
      });
      map.addLayer({
        id: 'district-outline-line',
        type: 'line',
        source: 'district-outline',
        paint: { 'line-color': '#123a63', 'line-width': 1 },
      });

      const crimeHeads = [...new Set(points.map((p) => p.crimeHead))];
      const pointFeatures = {
        type: 'FeatureCollection' as const,
        features: points.map((p) => ({
          type: 'Feature' as const,
          properties: { crimeHead: p.crimeHead, count: p.count },
          geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
        })),
      };
      map.addSource('hotspot-points', { type: 'geojson', data: pointFeatures });
      map.addLayer({
        id: 'hotspot-circles',
        type: 'circle',
        source: 'hotspot-points',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 5, 4, 50, 16],
          'circle-color': [
            'match',
            ['get', 'crimeHead'],
            ...crimeHeads.flatMap((head, i) => [head, CRIME_HEAD_COLORS[i % CRIME_HEAD_COLORS.length]]),
            '#8493B0',
          ] as never,
          'circle-opacity': 0.65,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.fitBounds(featureCollectionBounds(boundaries as never), { padding: 30 });
    });

    return () => map.remove();
  }, [boundaries, points]);

  return <div ref={containerRef} className="hotspot-map-canvas" style={{ width: '100%', height: 320, borderRadius: 10, overflow: 'hidden' }} />;
}
