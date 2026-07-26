import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  caseStatusLabel,
  gravityLabel,
  useCases,
  type CaseFilters,
  type CaseGravity,
  type CaseStatus,
  type CaseSummaryResponse,
} from '../../api/caseApi';
import {
  useDistrictBoundaries,
  useDistrictSummaries,
  useStationBoundaries,
  useStationSummaries,
  type DistrictBoundaryFeatureCollection,
  type DistrictSummaryResponse,
  type StationSummaryResponse,
} from '../../api/geoApi';
import { geometryBounds, featureCollectionBounds, featureCentroid } from '../command-center/geoBounds';

interface CaseExplorerMapProps {
  token: string | null;
  filters: CaseFilters;
  defaultDistrictId: number | null;
  defaultUnitId: number | null;
}

type LocatedCase = CaseSummaryResponse & { location: { lat: number; lng: number } };

interface CasePointProperties {
  caseId: number;
  caseNumber: string;
  crimeSubHeadName: string;
  firDate: string;
  status: CaseStatus;
  gravity: CaseGravity | null;
}

// Same 5-stop amber-to-red ramp as the heatmap-color paint below, kept in one
// place so the on-map density and the bottom legend can never drift apart.
const HEATMAP_GRADIENT_CSS =
  'linear-gradient(to right, #ffffb2, #fecc5c, #fd8d3c, #f03b20, #bd0026)';
const CASE_COUNT_GRADIENT_CSS = 'linear-gradient(to right, #b7d3f6, #104281)';
const DEFAULT_OUTLINE_COLOR = ['case', ['boolean', ['feature-state', 'hover'], false], '#2a78d6', '#D8DEEA'];

function locatedCases(cases: CaseSummaryResponse[]): LocatedCase[] {
  return cases.filter((c): c is LocatedCase => c.location != null);
}

function toCaseFeatureCollection(points: LocatedCase[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((c) => ({
      type: 'Feature' as const,
      properties: {
        caseId: c.caseId,
        caseNumber: c.caseNumber,
        crimeSubHeadName: c.crimeSubHeadName,
        firDate: c.firDate,
        status: c.status,
        gravity: c.gravity ?? null,
      } satisfies CasePointProperties,
      geometry: { type: 'Point' as const, coordinates: [c.location.lng, c.location.lat] },
    })),
  };
}

function casePopupHtml(properties: CasePointProperties): string {
  const gravityLine = properties.gravity ? `<br/>${gravityLabel(properties.gravity)}` : '';
  return `<strong>${properties.caseNumber}</strong><br/>${properties.crimeSubHeadName}<br/>${caseStatusLabel(properties.status)} · ${properties.firDate}${gravityLine}`;
}

function districtCaseCountMap(districtSummaries: DistrictSummaryResponse[]): Map<number, number> {
  return new Map(districtSummaries.map((d) => [d.districtId, d.caseCount]));
}

function stationCaseCountMap(stationSummaries: StationSummaryResponse[]): Map<number, number> {
  return new Map(stationSummaries.map((s) => [s.unitId, s.caseCount]));
}

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

interface CaseExplorerMapLoadedProps {
  token: string | null;
  filters: CaseFilters;
  boundaries: DistrictBoundaryFeatureCollection;
  districtSummaries: DistrictSummaryResponse[];
  defaultDistrictId: number | null;
  defaultUnitId: number | null;
}

function CaseExplorerMapLoaded({
  token,
  filters,
  boundaries,
  districtSummaries,
  defaultDistrictId,
  defaultUnitId,
}: CaseExplorerMapLoadedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof maplibregl.Map> | null>(null);
  const loadedRef = useRef(false);
  const popupRef = useRef<InstanceType<typeof maplibregl.Popup> | null>(null);
  const hoveredDistrictIdRef = useRef<number | null>(null);
  const hoveredStationIdRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(defaultDistrictId);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(defaultUnitId);
  const selectedDistrictIdRef = useRef(selectedDistrictId);
  selectedDistrictIdRef.current = selectedDistrictId;

  const stationBoundariesQuery = useStationBoundaries(token, selectedDistrictId);
  const stationSummariesQuery = useStationSummaries(token, selectedDistrictId);
  const stationCasesQuery = useCases(token, selectedUnitId, filters);

  const located = useMemo(() => locatedCases(stationCasesQuery.data ?? []), [stationCasesQuery.data]);

  function selectDistrict(districtId: number) {
    setSelectedDistrictId(districtId);
    setSelectedUnitId(null);
  }

  function backToState() {
    setSelectedDistrictId(null);
    setSelectedUnitId(null);
  }

  function backToDistrict() {
    setSelectedUnitId(null);
  }

  // Mounts once -- every value read inside 'load' comes from a ref, so district/station/case
  // selection (which changes often as the investigator drills around) updates via the effects
  // below instead of tearing down and recreating the WebGL context each time.
  useEffect(() => {
    if (!containerRef.current) return;

    const caseCountByDistrict = districtCaseCountMap(districtSummaries);
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

        if (hoveredDistrictIdRef.current !== districtId) {
          if (hoveredDistrictIdRef.current != null) {
            map.removeFeatureState({ source: 'districts', id: hoveredDistrictIdRef.current });
          }
          hoveredDistrictIdRef.current = districtId;
          map.setFeatureState({ source: 'districts', id: districtId }, { hover: true });
          map.getCanvas().style.cursor = 'pointer';
        }

        popup
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${feature!.properties!.district}</strong><br/>${feature!.properties!.caseCount} cases`)
          .addTo(map);
      });

      map.on('mouseleave', 'district-fill', () => {
        if (hoveredDistrictIdRef.current != null) map.removeFeatureState({ source: 'districts', id: hoveredDistrictIdRef.current });
        hoveredDistrictIdRef.current = null;
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      map.on('click', 'district-fill', (e) => {
        const districtId = e.features?.[0]?.properties?.districtId;
        if (typeof districtId === 'number') selectDistrict(districtId);
      });

      loadedRef.current = true;
      applyDistrictSelection(map, boundaries, selectedDistrictIdRef.current);
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundaries, districtSummaries]);

  // District selection: dim/highlight + fitBounds.
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (selectedDistrictId != null) {
      popupRef.current?.remove();
      if (hoveredDistrictIdRef.current != null) {
        map.removeFeatureState({ source: 'districts', id: hoveredDistrictIdRef.current });
        hoveredDistrictIdRef.current = null;
        map.getCanvas().style.cursor = '';
      }
    }
    applyDistrictSelection(map, boundaries, selectedDistrictId);
  }, [selectedDistrictId, boundaries]);

  // District case counts stay in sync with the latest summaries (state-wide totals don't
  // depend on the investigator's own filters -- they mirror the same aggregates as Command Center).
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const caseCountByDistrict = districtCaseCountMap(districtSummaries);
    const maxCount = Math.max(1, ...Array.from(caseCountByDistrict.values()));
    const enrichedFeatures = boundaries.features.map((feature) => ({
      ...feature,
      properties: { ...feature.properties, caseCount: caseCountByDistrict.get(feature.properties.districtId) ?? 0 },
    }));
    const source = map.getSource('districts') as { setData: (data: unknown) => void } | undefined;
    source?.setData({ type: 'FeatureCollection', features: enrichedFeatures });
    map.setPaintProperty('district-fill', 'fill-color', [
      'interpolate', ['linear'], ['get', 'caseCount'], 0, '#b7d3f6', maxCount, '#104281',
    ]);
  }, [boundaries, districtSummaries]);

  // Station choropleth: added/removed as the district drilldown changes.
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;

    if (map.getLayer('station-fill')) map.removeLayer('station-fill');
    if (map.getSource('stations')) map.removeSource('stations');

    const stationBoundaries = stationBoundariesQuery.data;
    const stationSummaries = stationSummariesQuery.data ?? [];
    if (!stationBoundaries) return;

    const caseCountByUnit = stationCaseCountMap(stationSummaries);
    const enrichedFeatures = stationBoundaries.features.map((feature) => ({
      ...feature,
      properties: { ...feature.properties, caseCount: caseCountByUnit.get(feature.properties.unitId) ?? null },
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
        if (hoveredStationIdRef.current != null) map.removeFeatureState({ source: 'stations', id: hoveredStationIdRef.current });
        hoveredStationIdRef.current = unitId;
        map.setFeatureState({ source: 'stations', id: unitId }, { hover: true });
        map.getCanvas().style.cursor = 'pointer';
      }

      const caseCount = feature!.properties!.caseCount;
      const label = typeof caseCount === 'number' ? `${caseCount} cases` : 'No case data';
      popupRef.current?.setLngLat(e.lngLat).setHTML(`<strong>${feature!.properties!.unitName}</strong><br/>${label}`).addTo(map);
    });

    map.on('mouseleave', 'station-fill', () => {
      if (hoveredStationIdRef.current != null) map.removeFeatureState({ source: 'stations', id: hoveredStationIdRef.current });
      hoveredStationIdRef.current = null;
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });

    map.on('click', 'station-fill', (e) => {
      const unitId = e.features?.[0]?.properties?.unitId;
      if (typeof unitId === 'number') setSelectedUnitId(unitId);
    });
  }, [stationBoundariesQuery.data, stationSummariesQuery.data]);

  // Station selection: dim non-selected stations + fitBounds to the selected one.
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (!map.getLayer('station-fill')) return;

    if (selectedUnitId == null) {
      map.setPaintProperty('station-fill', 'fill-opacity', 1);
      return;
    }
    map.setPaintProperty('station-fill', 'fill-opacity', ['case', ['==', ['get', 'unitId'], selectedUnitId], 1, 0.15]);
    const feature = stationBoundariesQuery.data?.features.find((f) => f.properties.unitId === selectedUnitId);
    if (feature) map.fitBounds(geometryBounds(feature.geometry), { padding: 40 });
  }, [selectedUnitId, stationBoundariesQuery.data]);

  // District name + case-count labels, state-wide only (hidden once a district is picked,
  // same as the station labels take over the detail).
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('district-labels')) map.removeLayer('district-labels');
    if (map.getSource('district-labels')) map.removeSource('district-labels');
    if (selectedDistrictId !== null) return;

    const caseCountByDistrict = districtCaseCountMap(districtSummaries);
    const features = boundaries.features.map((feature) => ({
      type: 'Feature' as const,
      properties: {
        label: `${feature.properties.district}\n${(caseCountByDistrict.get(feature.properties.districtId) ?? 0).toLocaleString()} cases`,
      },
      geometry: { type: 'Point' as const, coordinates: featureCentroid(feature.geometry) },
    }));

    map.addSource('district-labels', { type: 'geojson', data: { type: 'FeatureCollection', features } });
    map.addLayer({
      id: 'district-labels',
      type: 'symbol',
      source: 'district-labels',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-line-height': 1.2,
      },
      paint: { 'text-color': '#000000', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 },
    });
  }, [boundaries, districtSummaries, selectedDistrictId]);

  // Station name + case-count labels, once a district is selected.
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer('station-labels')) map.removeLayer('station-labels');
    if (map.getSource('station-labels')) map.removeSource('station-labels');

    const stationBoundaries = stationBoundariesQuery.data;
    const stationSummaries = stationSummariesQuery.data ?? [];
    if (!stationBoundaries || selectedDistrictId === null) return;

    const caseCountByUnit = stationCaseCountMap(stationSummaries);
    const features = stationBoundaries.features.map((feature) => ({
      type: 'Feature' as const,
      properties: {
        label: `${feature.properties.unitName}\n${(caseCountByUnit.get(feature.properties.unitId) ?? 0).toLocaleString()} cases`,
      },
      geometry: { type: 'Point' as const, coordinates: featureCentroid(feature.geometry) },
    }));

    map.addSource('station-labels', { type: 'geojson', data: { type: 'FeatureCollection', features } });
    map.addLayer({
      id: 'station-labels',
      type: 'symbol',
      source: 'station-labels',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-line-height': 1.2,
      },
      paint: { 'text-color': '#000000', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 },
    });
  }, [stationBoundariesQuery.data, stationSummariesQuery.data, selectedDistrictId]);

  // Case heatmap + clickable points, only once a station is selected. Reuses the same
  // color ramp as the bottom-of-map density legend below.
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const map = mapRef.current;

    if (selectedUnitId == null) {
      if (map.getLayer('case-points-circle')) map.removeLayer('case-points-circle');
      if (map.getLayer('case-heatmap')) map.removeLayer('case-heatmap');
      if (map.getSource('case-points')) map.removeSource('case-points');
      return;
    }

    const data = toCaseFeatureCollection(located);
    const existingSource = map.getSource('case-points') as { setData: (data: unknown) => void } | undefined;
    if (existingSource) {
      existingSource.setData(data);
      return;
    }

    map.addSource('case-points', { type: 'geojson', data });
    map.addLayer({
      id: 'case-heatmap',
      type: 'heatmap',
      source: 'case-points',
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 4],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 16, 50],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 16, 1, 18, 0],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
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

    map.on('mousemove', 'case-points-circle', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = 'pointer';
      popupRef.current?.setLngLat(e.lngLat!).setHTML(casePopupHtml(feature.properties as unknown as CasePointProperties)).addTo(map);
    });

    map.on('mouseleave', 'case-points-circle', () => {
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });

    map.on('click', 'case-points-circle', (e) => {
      const caseId = e.features?.[0]?.properties?.caseId;
      if (typeof caseId === 'number') navigateRef.current(`/case-explorer/${caseId}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitId, located]);

  const districtName = boundaries.features.find((f) => f.properties.districtId === selectedDistrictId)?.properties.district;
  const stationName = stationBoundariesQuery.data?.features.find((f) => f.properties.unitId === selectedUnitId)?.properties.unitName;
  const districtCaseCount = selectedDistrictId != null ? districtCaseCountMap(districtSummaries).get(selectedDistrictId) : undefined;
  const legendMaxCaseCount =
    selectedDistrictId == null
      ? Math.max(1, ...Array.from(districtCaseCountMap(districtSummaries).values()))
      : Math.max(1, ...Array.from(stationCaseCountMap(stationSummariesQuery.data ?? []).values()));

  return (
    <div className="map-card">
      <div ref={containerRef} className="map-canvas" role="img" aria-label="Map of case locations across Karnataka's districts and police stations" />

      {selectedDistrictId != null && (
        <div className="map-breadcrumb rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
          <div className="breadcrumb flex items-center gap-1.5 text-xs text-muted">
            <button type="button" className="breadcrumb-back cursor-pointer text-accent hover:underline" onClick={backToState}>
              State
            </button>
            <span className="sep">›</span>
            {selectedUnitId != null ? (
              <>
                <button type="button" className="breadcrumb-back cursor-pointer text-accent hover:underline" onClick={backToDistrict}>
                  {districtName}
                </button>
                <span className="sep">›</span>
                <b className="font-semibold text-ink">{stationName}</b>
                <span className="map-breadcrumb-count mono text-muted">
                  {located.length.toLocaleString()} of {stationCasesQuery.data?.length.toLocaleString() ?? '—'} cases mapped
                </span>
              </>
            ) : (
              <>
                <b className="font-semibold text-ink">{districtName}</b>
                <span className="map-breadcrumb-count mono text-muted">{(districtCaseCount ?? 0).toLocaleString()} cases</span>
              </>
            )}
          </div>
        </div>
      )}

      {selectedUnitId != null && stationCasesQuery.isError && (
        <div className="absolute top-16 left-3 z-10 w-72 rounded-lg border border-border bg-surface p-3 text-sm shadow-md">
          <p role="alert">Couldn't load cases for this station.</p>
          <button type="button" className="cursor-pointer text-accent hover:underline" onClick={() => stationCasesQuery.refetch()}>
            Retry
          </button>
        </div>
      )}

      {selectedUnitId != null && stationCasesQuery.isSuccess && located.length === 0 && (
        <div className="map-empty-overlay">
          <p>No case locations to show for these filters.</p>
        </div>
      )}

      <div
        className="absolute bottom-4 right-4 z-10 rounded-md border border-border bg-surface/90 p-2 shadow-sm backdrop-blur-xs"
        title={selectedUnitId != null ? 'Heatmap density of mapped case locations at this station' : `Shaded 0 – ${legendMaxCaseCount.toLocaleString()} cases`}
      >
        <div
          className="mb-1 h-2.5 w-36 rounded-full"
          style={{ background: selectedUnitId != null ? HEATMAP_GRADIENT_CSS : CASE_COUNT_GRADIENT_CSS }}
        />
        <div className="flex w-36 justify-between px-0.5 text-[11px] font-medium text-muted">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

export function CaseExplorerMap({ token, filters, defaultDistrictId, defaultUnitId }: CaseExplorerMapProps) {
  const districtBoundariesQuery = useDistrictBoundaries(token);
  const districtSummariesQuery = useDistrictSummaries(token);

  if (districtBoundariesQuery.isLoading || districtSummariesQuery.isLoading) {
    return (
      <div className="map-card">
        <div className="map-empty-overlay">
          <p>Loading map…</p>
        </div>
      </div>
    );
  }

  if (districtBoundariesQuery.isError || districtSummariesQuery.isError) {
    return (
      <div className="map-card">
        <div className="map-empty-overlay">
          <p role="alert">Couldn't load the map — check your connection and try again.</p>
          <button
            type="button"
            className="cursor-pointer text-accent hover:underline"
            onClick={() => {
              districtBoundariesQuery.refetch();
              districtSummariesQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <CaseExplorerMapLoaded
      token={token}
      filters={filters}
      boundaries={districtBoundariesQuery.data!}
      districtSummaries={districtSummariesQuery.data!}
      defaultDistrictId={defaultDistrictId}
      defaultUnitId={defaultUnitId}
    />
  );
}
