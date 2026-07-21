import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { CRIME_TYPE_OPTIONS } from '../../constants/crimeTypes';
import { useDistrictCorrelation, usePredictiveRisk, useCaseAnomalies } from '../../api/sociologicalApi';
import { CorrelationScatterChart } from './CorrelationScatterChart';
import { RiskForecastChart } from './RiskForecastChart';
import { AnomalyList } from './AnomalyList';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3, CURRENT_YEAR - 4];

export function SociologicalScreen() {
  const { token } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [crimeSubHeadId, setCrimeSubHeadId] = useState<number | ''>('');

  const resolvedCrimeSubHeadId = crimeSubHeadId === '' ? undefined : crimeSubHeadId;
  const correlationQuery = useDistrictCorrelation(token, year);
  const riskQuery = usePredictiveRisk(token, resolvedCrimeSubHeadId);
  const anomaliesQuery = useCaseAnomalies(token, resolvedCrimeSubHeadId);

  const isLoading = correlationQuery.isLoading || riskQuery.isLoading || anomaliesQuery.isLoading;
  const isError = correlationQuery.isError || riskQuery.isError || anomaliesQuery.isError;

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
            }}
          >
            Retry
          </button>
        </main>
      </>
    );
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
          <CorrelationScatterChart districts={correlationQuery.data!} />
        </section>
        <aside className="pane side-pane" aria-label="Predictive risk and case anomalies">
          <RiskForecastChart forecasts={riskQuery.data!} />
          <AnomalyList anomalies={anomaliesQuery.data!} />
        </aside>
      </main>
    </>
  );
}
