import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  DistrictBoundaryFeatureCollection,
  DistrictSummaryResponse,
  StationBoundaryFeatureCollection,
  StationSummaryResponse,
} from '../../api/geoApi';
import { geometryBounds, featureCollectionBounds } from './geoBounds';

interface DistrictMapProps {
  boundaries: DistrictBoundaryFeatureCollection;
  districtSummaries: DistrictSummaryResponse[];
  selectedDistrictId: number | null;
  stationBoundaries?: StationBoundaryFeatureCollection | null;
  stationSummaries?: StationSummaryResponse[];
  onDistrictSelect: (districtId: number) => void;
  onBack: () => void;
}

const DEFAULT_OUTLINE_COLOR = ['case', ['boolean', ['feature-state', 'hover'], false], '#2a78d6', '#D8DEEA'];

// Dims (rather than filters out) every district but the selected one -- the state
// shape stays visible and its other districts stay clickable, so zooming into one
// district never loses the surrounding geographic context or the ability to jump
// straight to a neighboring district.
function applyDistrictSelection(
  map: InstanceType<typeof maplibregl.Map>,
  boundaries: DistrictBoundaryFeatureCollection,
  selectedDistrictId: number | null,
) {
  if (selectedDistrictId != null) {
    const feature = boundaries.features.find((f) => f.properties.districtId === selectedDistrictId);
    if (!feature) return;
    map.setPaintProperty('district-fill', 'fill-opacity', [
      'case',
      ['==', ['get', 'districtId'], selectedDistrictId],
      1,
      0.15,
    ]);
    map.setPaintProperty('district-fill', 'fill-outline-color', [
      'case',
      ['==', ['get', 'districtId'], selectedDistrictId],
      '#2a78d6',
      '#D8DEEA',
    ]);
    map.fitBounds(geometryBounds(feature.geometry), { padding: 40 });
  } else {
    map.setPaintProperty('district-fill', 'fill-opacity', 1);
    map.setPaintProperty('district-fill', 'fill-outline-color', DEFAULT_OUTLINE_COLOR);
    map.fitBounds(featureCollectionBounds(boundaries), { padding: 40 });
  }
}

// No basemap tiles, no external tile server/token -- just the real district boundary
// GeoJSON (already case-count-enriched here, district-id-enriched server-side by
// DistrictBoundaryService) rendered as a MapLibre vector fill layer. Matches the design
// spec's "why MapLibre over Mapbox" reasoning: the demo must not depend on an external
// service staying up during judging.
export function DistrictMap({
  boundaries,
  districtSummaries,
  selectedDistrictId,
  stationBoundaries = null,
  stationSummaries = [],
  onDistrictSelect,
  onBack,
}: DistrictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof maplibregl.Map> | null>(null);
  const loadedRef = useRef(false);
  const selectedDistrictIdRef = useRef(selectedDistrictId);
  const onDistrictSelectRef = useRef(onDistrictSelect);
  const popupRef = useRef<InstanceType<typeof maplibregl.Popup> | null>(null);
  const hoveredIdRef = useRef<number | null>(null);
  const hoveredStationIdRef = useRef<number | null>(null);
  // Kept in refs, not effect deps -- onDistrictSelect's identity changes on every
  // CommandCenterScreen render (it closes over react-router's setSearchParams, whose
  // identity changes with the URL), which would otherwise tear down and recreate the
  // whole map every time a district is selected, defeating the fitBounds animation below.
  onDistrictSelectRef.current = onDistrictSelect;
  selectedDistrictIdRef.current = selectedDistrictId;

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
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('districts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: enrichedFeatures },
        promoteId: 'districtId',
      });
      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'districts',
        paint: {
          'fill-color': ['interpolate', ['linear'], ['get', 'caseCount'], 0, '#b7d3f6', maxCount, '#104281'],
          // MapLibre's style validator rejects CSS var() -- must be a literal color.
          // '#D8DEEA' matches --line, '#2a78d6' matches --real, both light-theme
          // literals from tokens.css.
          'fill-outline-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#2a78d6', '#D8DEEA'],
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      popupRef.current = popup;

      map.on('mousemove', 'district-fill', (e) => {
        if (selectedDistrictIdRef.current != null) return;
        const feature = e.features?.[0];
        const districtId = feature?.properties?.districtId;
        if (typeof districtId !== 'number') return;

        if (hoveredIdRef.current !== districtId) {
          if (hoveredIdRef.current != null) map.removeFeatureState({ source: 'districts', id: hoveredIdRef.current });
          hoveredIdRef.current = districtId;
          map.setFeatureState({ source: 'districts', id: districtId }, { hover: true });
          map.getCanvas().style.cursor = 'pointer';
        }

        popup
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${feature!.properties!.district}</strong><br/>${feature!.properties!.caseCount} cases`)
          .addTo(map);
      });

      map.on('mouseleave', 'district-fill', () => {
        if (hoveredIdRef.current != null) map.removeFeatureState({ source: 'districts', id: hoveredIdRef.current });
        hoveredIdRef.current = null;
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      map.on('click', 'district-fill', (e) => {
        const districtId = e.features?.[0]?.properties?.districtId;
        if (typeof districtId === 'number') onDistrictSelectRef.current(districtId);
      });

      loadedRef.current = true;
      applyDistrictSelection(map, boundaries, selectedDistrictIdRef.current);
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, [boundaries, districtSummaries]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (selectedDistrictId != null) {
      // The breadcrumb overlay now shows the selected district's name/case count --
      // a leftover hover popup from the click that made the selection would duplicate it.
      popupRef.current?.remove();
      if (hoveredIdRef.current != null) {
        map.removeFeatureState({ source: 'districts', id: hoveredIdRef.current });
        hoveredIdRef.current = null;
        map.getCanvas().style.cursor = '';
      }
    }
    applyDistrictSelection(map, boundaries, selectedDistrictId);
  }, [selectedDistrictId, boundaries]);

  // A separate effect (not folded into the one above) because it reacts to different
  // inputs -- station data can load/change independently of the selection itself.
  // Re-runs whenever `boundaries` changes too, since that's what remounts the map
  // (see the main useEffect's dependency array) and the stations layer would otherwise
  // be lost on the new map instance.
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;

    if (map.getLayer('station-fill')) map.removeLayer('station-fill');
    if (map.getSource('stations')) map.removeSource('stations');

    if (!stationBoundaries) return;

    const caseCountByUnit = new Map(stationSummaries.map((s) => [s.unitId, s.caseCount]));
    const enrichedFeatures = stationBoundaries.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        caseCount: caseCountByUnit.get(feature.properties.unitId) ?? null,
      },
    }));
    const maxCount = Math.max(1, ...enrichedFeatures.map((f) => f.properties.caseCount ?? 0));

    map.addSource('stations', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: enrichedFeatures },
      promoteId: 'unitId',
    });
    map.addLayer({
      id: 'station-fill',
      type: 'fill',
      source: 'stations',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'caseCount'], null],
          '#D8DEEA',
          ['interpolate', ['linear'], ['get', 'caseCount'], 0, '#b7d3f6', maxCount, '#104281'],
        ],
        'fill-outline-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#2a78d6', '#ffffff'],
      },
    });

    map.on('mousemove', 'station-fill', (e) => {
      const feature = e.features?.[0];
      const unitId = feature?.properties?.unitId;
      if (typeof unitId !== 'number') return;

      if (hoveredStationIdRef.current !== unitId) {
        if (hoveredStationIdRef.current != null) {
          map.removeFeatureState({ source: 'stations', id: hoveredStationIdRef.current });
        }
        hoveredStationIdRef.current = unitId;
        map.setFeatureState({ source: 'stations', id: unitId }, { hover: true });
        map.getCanvas().style.cursor = 'pointer';
      }

      const caseCount = feature!.properties!.caseCount;
      const label = typeof caseCount === 'number' ? `${caseCount} cases` : 'No case data';
      popupRef.current
        ?.setLngLat(e.lngLat)
        .setHTML(`<strong>${feature!.properties!.unitName}</strong><br/>${label}`)
        .addTo(map);
    });

    map.on('mouseleave', 'station-fill', () => {
      if (hoveredStationIdRef.current != null) {
        map.removeFeatureState({ source: 'stations', id: hoveredStationIdRef.current });
      }
      hoveredStationIdRef.current = null;
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });
  }, [stationBoundaries, stationSummaries, boundaries]);

  const selectedDistrict =
    selectedDistrictId != null ? districtSummaries.find((d) => d.districtId === selectedDistrictId) : undefined;

  return (
    <div className="map-card">
      <div
        ref={containerRef}
        className="map-canvas"
        role="img"
        aria-label="Map of Karnataka's districts shaded by case count"
      />
      {selectedDistrict && (
        <div className="map-breadcrumb">
          <div className="breadcrumb">
            <button className="breadcrumb-back" onClick={onBack}>
              State
            </button>
            <span className="sep">›</span>
            <b>{selectedDistrict.districtName}</b>
            <span className="map-breadcrumb-count">{selectedDistrict.caseCount.toLocaleString()} cases</span>
          </div>
        </div>
      )}
    </div>
  );
}
