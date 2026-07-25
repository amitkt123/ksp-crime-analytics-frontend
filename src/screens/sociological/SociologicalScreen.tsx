import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { CRIME_TYPE_OPTIONS } from '../../constants/crimeTypes';
import { useDistrictCorrelation, usePredictiveRisk, useCaseAnomalies } from '../../api/sociologicalApi';
import { useDistrictBoundaries } from '../../api/geoApi';
import { CorrelationRadarPanels } from './CorrelationRadarPanels';
import { RiskForecastChart } from './RiskForecastChart';
import { AnomalyList } from './AnomalyList';
import { IndicatorChoroplethMap, type ChoroplethMode } from './IndicatorChoroplethMap';
import type { IndicatorKey } from './indicators';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3, CURRENT_YEAR - 4];

export function SociologicalScreen() {
  const { token } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [crimeSubHeadId, setCrimeSubHeadId] = useState<number | ''>('');
  const [mapMode, setMapMode] = useState<ChoroplethMode>('indicator');
  const [mapIndicator, setMapIndicator] = useState<IndicatorKey>('literacyRate');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);

  const resolvedCrimeSubHeadId = crimeSubHeadId === '' ? undefined : crimeSubHeadId;
  const correlationQuery = useDistrictCorrelation(token, year);
  const riskQuery = usePredictiveRisk(token, resolvedCrimeSubHeadId);
  const anomaliesQuery = useCaseAnomalies(token, resolvedCrimeSubHeadId);
  const boundariesQuery = useDistrictBoundaries(token);

  const isLoading = correlationQuery.isLoading || riskQuery.isLoading || anomaliesQuery.isLoading || boundariesQuery.isLoading;
  const isError = correlationQuery.isError || riskQuery.isError || anomaliesQuery.isError || boundariesQuery.isError;

  if (isLoading) {
    return (
      <>
        <Header title="Sociological & Predictive" />
        <main className="main">
          <div className="kpi-grid">
            <div className="kpi-tile wide" />
            <div className="kpi-tile wide" />
          </div>
        </main>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header title="Sociological & Predictive" />
        <main className="main">
          <p role="alert">Couldn't load sociological data — check your connection and try again.</p>
          <button
            onClick={() => {
              correlationQuery.refetch();
              riskQuery.refetch();
              anomaliesQuery.refetch();
              boundariesQuery.refetch();
            }}
          >
            Retry
          </button>
        </main>
      </>
    );
  }

  // Sums every matching station's forecast into its district -- the full result set,
  // not RiskForecastChart's own top-10 slice, so the map reflects every station.
  const riskByDistrict = new Map<number, number>();
  for (const forecast of riskQuery.data!) {
    riskByDistrict.set(forecast.districtId, (riskByDistrict.get(forecast.districtId) ?? 0) + forecast.predictedCount);
  }

  return (
    <>
      <Header title="Sociological & Predictive">
        <select
          aria-label="Crime type"
          value={crimeSubHeadId}
          onChange={(e) => setCrimeSubHeadId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">All crime types</option>
          {CRIME_TYPE_OPTIONS.map((option) => (
            <option key={option.crimeSubHeadId} value={option.crimeSubHeadId}>
              {option.crimeSubHeadName}
            </option>
          ))}
        </select>
        <select aria-label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </Header>
      <main className="main">
        <section className="pane map-pane" aria-label="Socio-economic correlation">
          <IndicatorChoroplethMap
            boundaries={boundariesQuery.data!}
            mode={mapMode}
            onModeChange={setMapMode}
            indicator={mapIndicator}
            onIndicatorChange={setMapIndicator}
            districts={correlationQuery.data!}
            riskByDistrict={riskByDistrict}
            selectedDistrictId={selectedDistrictId}
            onDistrictSelect={setSelectedDistrictId}
          />
          <CorrelationRadarPanels districts={correlationQuery.data!} highlightedDistrictId={selectedDistrictId} />
        </section>
        <aside className="pane side-pane" aria-label="Predictive risk and case anomalies">
          <RiskForecastChart forecasts={riskQuery.data!} />
          <AnomalyList anomalies={anomaliesQuery.data!} />
        </aside>
      </main>
    </>
  );
}
