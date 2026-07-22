import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DistrictBoundaryFeatureCollection } from '../../api/geoApi';
import type { DistrictCorrelationResponse } from '../../api/sociologicalApi';
import { INDICATOR_OPTIONS, type IndicatorKey } from './indicators';

export type ChoroplethMode = 'indicator' | 'risk';

export interface ChoroplethScale {
  valueByDistrict: Map<number, number>;
  minValue: number;
  maxValue: number;
  minColor: string;
  maxColor: string;
  legendLabel: string;
}

// Indicator ramp matches DistrictMap.tsx's existing case-density blue exactly (same
// literals, MapLibre's style validator rejects var()). Risk ramp anchors its dark
// stop on --predicted's literal light-theme hex, so "risk" reads visually consistent
// with the predicted-forecast color used everywhere else on this screen.
const INDICATOR_RAMP: [string, string] = ['#b7d3f6', '#104281'];
const RISK_RAMP: [string, string] = ['#E4D6F7', '#7C4DCC'];

export function computeChoroplethScale(
  mode: ChoroplethMode,
  indicator: IndicatorKey,
  districts: DistrictCorrelationResponse[],
  riskByDistrict: Map<number, number>,
): ChoroplethScale {
  if (mode === 'risk') {
    const values = Array.from(riskByDistrict.values());
    const minValue = values.length ? Math.min(...values) : 0;
    const rawMax = values.length ? Math.max(...values) : 0;
    return {
      valueByDistrict: riskByDistrict,
      minValue,
      // MapLibre's interpolate expression requires strictly increasing stops --
      // bump the top stop when every district ties (or there's no data at all).
      maxValue: rawMax > minValue ? rawMax : minValue + 1,
      minColor: RISK_RAMP[0],
      maxColor: RISK_RAMP[1],
      legendLabel: 'Predicted risk (summed)',
    };
  }

  const indicatorLabel = INDICATOR_OPTIONS.find((o) => o.key === indicator)?.label ?? indicator;
  const valueByDistrict = new Map(districts.map((d) => [d.districtId, d[indicator]]));
  const values = Array.from(valueByDistrict.values());
  const minValue = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 0;
  return {
    valueByDistrict,
    minValue,
    maxValue: rawMax > minValue ? rawMax : minValue + 1,
    minColor: INDICATOR_RAMP[0],
    maxColor: INDICATOR_RAMP[1],
    legendLabel: indicatorLabel,
  };
}

function enrichFeatures(boundaries: DistrictBoundaryFeatureCollection, scale: ChoroplethScale) {
  return boundaries.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      value: scale.valueByDistrict.get(feature.properties.districtId) ?? scale.minValue,
    },
  }));
}

function fillColorExpression(scale: ChoroplethScale) {
  return ['interpolate', ['linear'], ['get', 'value'], scale.minValue, scale.minColor, scale.maxValue, scale.maxColor];
}

const DEFAULT_OUTLINE_COLOR = ['case', ['boolean', ['feature-state', 'hover'], false], '#2a78d6', '#D8DEEA'];
// Matches --alert's literal light-theme hex -- same accent used for the
// "highlighted district" marker on IndicatorScatterPlot, so the map outline and the
// scatter highlight read as the same selection across the whole screen.
const SELECTED_OUTLINE_COLOR = '#D6323B';

function applySelectionOutline(map: InstanceType<typeof maplibregl.Map>, selectedDistrictId: number | null) {
  if (selectedDistrictId != null) {
    map.setPaintProperty('district-fill', 'fill-outline-color', [
      'case',
      ['==', ['get', 'districtId'], selectedDistrictId],
      SELECTED_OUTLINE_COLOR,
      '#D8DEEA',
    ]);
  } else {
    map.setPaintProperty('district-fill', 'fill-outline-color', DEFAULT_OUTLINE_COLOR);
  }
}

function applyChoroplethScale(
  map: InstanceType<typeof maplibregl.Map>,
  boundaries: DistrictBoundaryFeatureCollection,
  scale: ChoroplethScale,
) {
  const source = map.getSource('districts') as { setData: (data: unknown) => void } | undefined;
  source?.setData({ type: 'FeatureCollection', features: enrichFeatures(boundaries, scale) });
  map.setPaintProperty('district-fill', 'fill-color', fillColorExpression(scale));
}

interface IndicatorChoroplethMapProps {
  boundaries: DistrictBoundaryFeatureCollection;
  mode: ChoroplethMode;
  onModeChange: (mode: ChoroplethMode) => void;
  indicator: IndicatorKey;
  onIndicatorChange: (indicator: IndicatorKey) => void;
  districts: DistrictCorrelationResponse[];
  riskByDistrict: Map<number, number>;
  selectedDistrictId: number | null;
  onDistrictSelect: (districtId: number | null) => void;
}

// No station drill-down, no alert markers, no time-of-day override -- unlike
// DistrictMap.tsx (Command Center's choropleth), this map is read-only aside from
// click-to-toggle-select: shade + hover + select, nothing else, since there is no
// station-level correlation/risk data to drill into.
export function IndicatorChoroplethMap({
  boundaries,
  mode,
  onModeChange,
  indicator,
  onIndicatorChange,
  districts,
  riskByDistrict,
  selectedDistrictId,
  onDistrictSelect,
}: IndicatorChoroplethMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof maplibregl.Map> | null>(null);
  const loadedRef = useRef(false);
  const popupRef = useRef<InstanceType<typeof maplibregl.Popup> | null>(null);
  const hoveredIdRef = useRef<number | null>(null);
  const selectedDistrictIdRef = useRef(selectedDistrictId);
  const onDistrictSelectRef = useRef(onDistrictSelect);

  selectedDistrictIdRef.current = selectedDistrictId;
  onDistrictSelectRef.current = onDistrictSelect;

  const scale = computeChoroplethScale(mode, indicator, districts, riskByDistrict);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

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
      map.addSource('districts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: enrichFeatures(boundaries, scaleRef.current) },
        promoteId: 'districtId',
      });
      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'districts',
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'value'],
            scaleRef.current.minValue, scaleRef.current.minColor,
            scaleRef.current.maxValue, scaleRef.current.maxColor,
          ],
          'fill-outline-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#2a78d6', '#D8DEEA'],
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      popupRef.current = popup;

      map.on('mousemove', 'district-fill', (e) => {
        const feature = e.features?.[0];
        const districtId = feature?.properties?.districtId;
        if (typeof districtId !== 'number') return;

        if (hoveredIdRef.current !== districtId) {
          if (hoveredIdRef.current != null) map.removeFeatureState({ source: 'districts', id: hoveredIdRef.current });
          hoveredIdRef.current = districtId;
          map.setFeatureState({ source: 'districts', id: districtId }, { hover: true });
          map.getCanvas().style.cursor = 'pointer';
        }

        const value = feature!.properties!.value as number;
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${feature!.properties!.district}</strong><br/>${value.toFixed(1)}`)
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
        if (typeof districtId !== 'number') return;
        onDistrictSelectRef.current(districtId === selectedDistrictIdRef.current ? null : districtId);
      });

      loadedRef.current = true;
      applySelectionOutline(map, selectedDistrictIdRef.current);
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, [boundaries]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    applyChoroplethScale(mapRef.current, boundaries, scale);
  }, [boundaries, scale]);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    applySelectionOutline(mapRef.current, selectedDistrictId);
  }, [selectedDistrictId]);

  return (
    <div className="choropleth-card">
      <div className="pane-head">
        <div className="tod-selector" role="group" aria-label="Choropleth mode">
          <button
            type="button"
            className={`tod-option${mode === 'indicator' ? ' active' : ''}`}
            aria-pressed={mode === 'indicator'}
            onClick={() => onModeChange('indicator')}
          >
            Socio-economic indicator
          </button>
          <button
            type="button"
            className={`tod-option${mode === 'risk' ? ' active' : ''}`}
            aria-pressed={mode === 'risk'}
            onClick={() => onModeChange('risk')}
          >
            Predicted risk
          </button>
        </div>
        {mode === 'indicator' && (
          <select
            aria-label="Map indicator"
            value={indicator}
            onChange={(e) => onIndicatorChange(e.target.value as IndicatorKey)}
          >
            {INDICATOR_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div
        ref={containerRef}
        className="choropleth-canvas"
        role="img"
        aria-label={`Map of Karnataka's districts shaded by ${scale.legendLabel}`}
      />
      <div className="choropleth-legend">
        <span className="mono">{scale.minValue.toFixed(1)}</span>
        <span
          className="choropleth-legend-ramp"
          style={{ background: `linear-gradient(90deg, ${scale.minColor}, ${scale.maxColor})` }}
        />
        <span className="mono">{scale.maxValue.toFixed(1)}</span>
        <span className="choropleth-legend-label">{scale.legendLabel}</span>
      </div>
    </div>
  );
}
