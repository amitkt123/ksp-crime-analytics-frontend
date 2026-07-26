import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  DistrictBoundaryFeatureCollection,
  DistrictSummaryResponse,
  StationBoundaryFeatureCollection,
  StationSummaryResponse,
  StationIncidentPointResponse,
  TimeOfDayBucket,
} from '../../api/geoApi';
import { alertSeverity, type AlertSeverity, type EmergingAlertResponse } from '../../api/alertsApi';
import type { KpiResponse } from '../../api/commandCenterApi';
import { TimeOfDaySelector, type TimeOfDaySelection } from './TimeOfDaySelector';
import { geometryBounds, featureCollectionBounds, featureCentroid } from './geoBounds';

interface DistrictMapProps {
  boundaries: DistrictBoundaryFeatureCollection;
  districtSummaries: DistrictSummaryResponse[];
  selectedDistrictId: number | null;
  stationBoundaries?: StationBoundaryFeatureCollection | null;
  stationSummaries?: StationSummaryResponse[];
  selectedStationId?: number | null;
  stationIncidents?: StationIncidentPointResponse[];
  districtKpi?: KpiResponse | null;
  onStationSelect: (unitId: number) => void;
  onStationBack: () => void;
  alerts?: EmergingAlertResponse[];
  caseCountOverride?: Map<number, number> | null;
  onDistrictSelect: (districtId: number) => void;
  onBack: () => void;
  timeOfDayBuckets: TimeOfDayBucket[];
  timeOfDay: TimeOfDaySelection;
  onTimeOfDayChange: (value: TimeOfDaySelection) => void;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { moderate: 0, high: 1, critical: 2 };

function maxSeverityByKey(alerts: EmergingAlertResponse[], keyOf: (alert: EmergingAlertResponse) => number) {
  const map = new Map<number, AlertSeverity>();
  for (const alert of alerts) {
    const key = keyOf(alert);
    const severity = alertSeverity(alert.zScore);
    const existing = map.get(key);
    if (!existing || SEVERITY_RANK[severity] > SEVERITY_RANK[existing]) map.set(key, severity);
  }
  return map;
}

function createAlertMarkerElement(severity: AlertSeverity): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'map-alert-marker';
  const dot = document.createElement('span');
  dot.className = `alert-pulse-dot severity-${severity}`;
  dot.setAttribute('aria-hidden', 'true');
  el.appendChild(dot);
  return el;
}

function syncAlertMarkers(
  map: InstanceType<typeof maplibregl.Map>,
  boundaries: DistrictBoundaryFeatureCollection,
  districtAlertSeverity: Map<number, AlertSeverity>,
  stationBoundaries: StationBoundaryFeatureCollection | null,
  stationAlertSeverity: Map<number, AlertSeverity>,
  markersRef: { current: InstanceType<typeof maplibregl.Marker>[] },
) {
  for (const marker of markersRef.current) marker.remove();
  markersRef.current = [];

  for (const feature of boundaries.features) {
    const severity = districtAlertSeverity.get(feature.properties.districtId);
    if (!severity) continue;
    const marker = new maplibregl.Marker({ element: createAlertMarkerElement(severity) })
      .setLngLat(featureCentroid(feature.geometry))
      .addTo(map);
    markersRef.current.push(marker);
  }

  if (stationBoundaries) {
    for (const feature of stationBoundaries.features) {
      const severity = stationAlertSeverity.get(feature.properties.unitId);
      if (!severity) continue;
      const marker = new maplibregl.Marker({ element: createAlertMarkerElement(severity) })
        .setLngLat(featureCentroid(feature.geometry))
        .addTo(map);
      markersRef.current.push(marker);
    }
  }
}

function districtCaseCountMap(
  districtSummaries: DistrictSummaryResponse[],
  caseCountOverride: Map<number, number> | null | undefined,
): Map<number, number> {
  if (caseCountOverride) return caseCountOverride;
  return new Map(districtSummaries.map((d) => [d.districtId, d.caseCount]));
}

function applyDistrictCaseCounts(
  map: InstanceType<typeof maplibregl.Map>,
  boundaries: DistrictBoundaryFeatureCollection,
  caseCountByDistrict: Map<number, number>,
) {
  const maxCount = Math.max(1, ...Array.from(caseCountByDistrict.values()));
  const enrichedFeatures = boundaries.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      caseCount: caseCountByDistrict.get(feature.properties.districtId) ?? 0,
    },
  }));
  const source = map.getSource('districts') as { setData: (data: unknown) => void } | undefined;
  source?.setData({ type: 'FeatureCollection', features: enrichedFeatures });
  map.setPaintProperty('district-fill', 'fill-color', [
    'interpolate',
    ['linear'],
    ['get', 'caseCount'],
    0,
    '#b7d3f6',
    maxCount,
    '#104281',
  ]);
}

const DEFAULT_OUTLINE_COLOR = ['case', ['boolean', ['feature-state', 'hover'], false], '#2a78d6', '#D8DEEA'];

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

function applyStationSelection(
  map: InstanceType<typeof maplibregl.Map>,
  stationBoundaries: StationBoundaryFeatureCollection | null,
  selectedStationId: number | null,
  stationIncidents: StationIncidentPointResponse[],
) {
  if (!map.getLayer('station-fill')) return;

  if (selectedStationId == null) {
    map.setPaintProperty('station-fill', 'fill-opacity', 1);
    if (map.getLayer('heatmap-incidents-layer')) map.removeLayer('heatmap-incidents-layer');
    if (map.getSource('heatmap-incidents')) map.removeSource('heatmap-incidents');
    return;
  }

  map.setPaintProperty('station-fill', 'fill-opacity', [
    'case',
    ['==', ['get', 'unitId'], selectedStationId],
    1,
    0.15,
  ]);

  const feature = stationBoundaries?.features.find((f) => f.properties.unitId === selectedStationId);
  if (feature) map.fitBounds(geometryBounds(feature.geometry), { padding: 40 });

  const points = {
    type: 'FeatureCollection' as const,
    features: stationIncidents.map((p) => ({
      type: 'Feature' as const,
      properties: { caseMasterId: p.caseMasterId, crimeNo: p.crimeNo },
      geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
    })),
  };

  const existingSource = map.getSource('heatmap-incidents') as { setData: (data: unknown) => void } | undefined;
  if (existingSource) {
    existingSource.setData(points);
    return;
  }
  map.addSource('heatmap-incidents', { type: 'geojson', data: points });
  map.addLayer({
    id: 'heatmap-incidents-layer',
    type: 'heatmap',
    source: 'heatmap-incidents',
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': 1,
      'heatmap-radius': 24,
      'heatmap-opacity': 0.85,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(255,255,178,0)',
        0.2, 'rgba(255,237,160,0.6)',
        0.4, 'rgba(254,178,76,0.7)',
        0.6, 'rgba(253,141,60,0.8)',
        0.8, 'rgba(240,59,32,0.9)',
        1, 'rgba(189,0,38,1)',
      ],
    },
  });
}

export function DistrictMap({
  boundaries,
  districtSummaries,
  selectedDistrictId,
  stationBoundaries = null,
  stationSummaries = [],
  selectedStationId = null,
  stationIncidents = [],
  districtKpi = null,
  alerts = [],
  caseCountOverride = null,
  onDistrictSelect,
  onBack,
  onStationSelect,
  onStationBack,
  timeOfDayBuckets,
  timeOfDay,
  onTimeOfDayChange,
}: DistrictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof maplibregl.Map> | null>(null);
  const loadedRef = useRef(false);
  const selectedDistrictIdRef = useRef(selectedDistrictId);
  const onDistrictSelectRef = useRef(onDistrictSelect);
  const onStationSelectRef = useRef(onStationSelect);
  const popupRef = useRef<InstanceType<typeof maplibregl.Popup> | null>(null);
  const hoveredIdRef = useRef<number | null>(null);
  const hoveredStationIdRef = useRef<number | null>(null);
  const alertMarkersRef = useRef<InstanceType<typeof maplibregl.Marker>[]>([]);
  const caseCountOverrideRef = useRef(caseCountOverride);

  const districtAlertSeverity = useMemo(() => maxSeverityByKey(alerts, (a) => a.districtId), [alerts]);
  const stationAlertSeverity = useMemo(() => maxSeverityByKey(alerts, (a) => a.unitId), [alerts]);
  const districtAlertSeverityRef = useRef(districtAlertSeverity);
  const stationAlertSeverityRef = useRef(stationAlertSeverity);
  onDistrictSelectRef.current = onDistrictSelect;
  onStationSelectRef.current = onStationSelect;
  selectedDistrictIdRef.current = selectedDistrictId;
  caseCountOverrideRef.current = caseCountOverride;
  districtAlertSeverityRef.current = districtAlertSeverity;
  stationAlertSeverityRef.current = stationAlertSeverity;

  useEffect(() => {
    if (!containerRef.current) return;

    const caseCountByDistrict = districtCaseCountMap(districtSummaries, caseCountOverrideRef.current);
    const maxCount = Math.max(1, ...Array.from(caseCountByDistrict.values()));

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
      syncAlertMarkers(
        map,
        boundaries,
        districtAlertSeverityRef.current,
        null,
        stationAlertSeverityRef.current,
        alertMarkersRef,
      );
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      for (const marker of alertMarkersRef.current) marker.remove();
      alertMarkersRef.current = [];
      map.remove();
    };
  }, [boundaries, districtSummaries]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (selectedDistrictId != null) {
      popupRef.current?.remove();
      if (hoveredIdRef.current != null) {
        map.removeFeatureState({ source: 'districts', id: hoveredIdRef.current });
        hoveredIdRef.current = null;
        map.getCanvas().style.cursor = '';
      }
    }
    applyDistrictSelection(map, boundaries, selectedDistrictId);
  }, [selectedDistrictId, boundaries]);

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

    map.on('click', 'station-fill', (e) => {
      const unitId = e.features?.[0]?.properties?.unitId;
      if (typeof unitId === 'number') onStationSelectRef.current(unitId);
    });
  }, [stationBoundaries, stationSummaries, boundaries]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('station-labels')) map.removeLayer('station-labels');
    if (!stationBoundaries || !stationSummaries.length) return;

    const features = stationSummaries.map((station) => {
      const boundary = stationBoundaries.features.find((f) => f.properties.unitId === station.unitId);
      if (!boundary) return null;
      const centroid = featureCentroid(boundary.geometry);
      return {
        type: 'Feature',
        properties: {
          unitName: station.unitName,
        },
        geometry: {
          type: 'Point',
          coordinates: centroid,
        },
      };
    }).filter(Boolean);

    const source = map.getSource('station-labels') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    } else {
      map.addSource('station-labels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
    }

    map.addLayer({
      id: 'station-labels',
      type: 'symbol',
      source: 'station-labels',
      layout: {
        'text-field': ['get', 'unitName'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1,
      },
    });
  }, [stationBoundaries, stationSummaries]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('district-labels')) map.removeLayer('district-labels');
    if (map.getSource('district-labels')) map.removeSource('district-labels');

    if (selectedDistrictId !== null) return;
    if (!boundaries) return;

    const features = boundaries.features.map((feature) => {
      const centroid = featureCentroid(feature.geometry);
      return {
        type: 'Feature',
        properties: {
          districtName: feature.properties.district,
        },
        geometry: {
          type: 'Point',
          coordinates: centroid,
        },
      };
    });

    map.addSource('district-labels', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    map.addLayer({
      id: 'district-labels',
      type: 'symbol',
      source: 'district-labels',
      layout: {
        'text-field': ['get', 'districtName'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1,
      },
    });
  }, [boundaries, selectedDistrictId]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    applyStationSelection(mapRef.current, stationBoundaries, selectedStationId, stationIncidents);
  }, [stationBoundaries, selectedStationId, stationIncidents]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    syncAlertMarkers(
      mapRef.current,
      boundaries,
      districtAlertSeverity,
      stationBoundaries,
      stationAlertSeverity,
      alertMarkersRef,
    );
  }, [boundaries, districtAlertSeverity, stationBoundaries, stationAlertSeverity]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    applyDistrictCaseCounts(mapRef.current, boundaries, districtCaseCountMap(districtSummaries, caseCountOverride));
  }, [boundaries, districtSummaries, caseCountOverride]);

  const selectedDistrict =
    selectedDistrictId != null ? districtSummaries.find((d) => d.districtId === selectedDistrictId) : undefined;
  const selectedStation =
    selectedStationId != null ? stationSummaries.find((s) => s.unitId === selectedStationId) : undefined;

  const legendMaxCaseCount = Math.max(
    1,
    ...Array.from(districtCaseCountMap(districtSummaries, caseCountOverride).values()),
  );

  return (
    <div className="map-card h-[480px] flex-none">
      <div
        ref={containerRef}
        className="map-canvas"
        role="img"
        aria-label="Map of Karnataka's districts shaded by case count"
      />
      <div className="absolute top-3 left-3 z-10">
        <TimeOfDaySelector buckets={timeOfDayBuckets} value={timeOfDay} onChange={onTimeOfDayChange} />
      </div>
      {selectedDistrict && (
        <div className="map-breadcrumb rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
          <div className="breadcrumb flex items-center gap-1.5 text-xs text-muted">
            <button type="button" className="breadcrumb-back cursor-pointer text-accent hover:underline" onClick={onBack}>
              State
            </button>
            <span className="sep">›</span>
            {selectedStation ? (
              <>
                <button
                  type="button"
                  className="breadcrumb-back cursor-pointer text-accent hover:underline"
                  onClick={onStationBack}
                >
                  {selectedDistrict.districtName}
                </button>
                <span className="sep">›</span>
                <b className="font-semibold text-ink">{selectedStation.unitName}</b>
                <span className="map-breadcrumb-count mono text-muted">
                  {stationIncidents.length.toLocaleString()} incidents
                </span>
              </>
            ) : (
              <>
                <b className="font-semibold text-ink">{selectedDistrict.districtName}</b>
                <span className="map-breadcrumb-count mono text-muted">
                  {selectedDistrict.caseCount.toLocaleString()} cases
                </span>
              </>
            )}
          </div>
        </div>
      )}
      {selectedDistrict && !selectedStation && (
        <div className="absolute top-16 left-3 z-10 w-64 rounded-xl border border-border bg-surface p-4 shadow-md">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-ink">District details</h3>
            <button
              type="button"
              aria-label="Close district details"
              onClick={onBack}
              className="cursor-pointer text-muted hover:text-ink"
            >
              ×
            </button>
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Total active cases</dt>
              <dd className="mono font-semibold text-ink">{selectedDistrict.caseCount.toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Cases resolved</dt>
              <dd className="mono font-semibold text-ink">
                {districtKpi ? `${districtKpi.resolvedPct.toFixed(1)}%` : '—'}
              </dd>
            </div>
          </dl>
        </div>
      )}
      <div
        className="absolute bottom-4 right-4 z-10 rounded-md border border-border bg-surface/90 p-2 shadow-sm backdrop-blur-xs"
        title={`Shaded 0 – ${legendMaxCaseCount.toLocaleString()} cases`}
      >
        <div className="mb-1 h-2.5 w-36 rounded-full" style={{ background: 'linear-gradient(to right, #b7d3f6, #104281)' }} />
        <div className="flex w-36 justify-between px-0.5 text-[11px] font-medium text-muted">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}