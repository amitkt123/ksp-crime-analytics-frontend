import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as sociologicalApiModule from '../../api/sociologicalApi';
import * as geoApiModule from '../../api/geoApi';
import * as agentApiModule from '../../api/agentApi';
import type { ChoroplethMode } from './IndicatorChoroplethMap';
import type { IndicatorKey } from './indicators';
import { SociologicalScreen } from './SociologicalScreen';

vi.mock('./IndicatorChoroplethMap', () => ({
  IndicatorChoroplethMap: ({
    mode,
    onModeChange,
    indicator,
    onDistrictSelect,
    selectedDistrictId,
  }: {
    mode: ChoroplethMode;
    onModeChange: (mode: ChoroplethMode) => void;
    indicator: IndicatorKey;
    onDistrictSelect: (id: number | null) => void;
    selectedDistrictId: number | null;
  }) => (
    <div>
      <p>Choropleth mode: {mode}</p>
      <p>Choropleth indicator: {indicator}</p>
      <p>Choropleth selection: {selectedDistrictId ?? 'none'}</p>
      <button onClick={() => onDistrictSelect(5)}>Select Bengaluru Urban on map</button>
      <button onClick={() => onModeChange('risk')}>Switch to risk mode</button>
    </div>
  ),
}));

const boundaries: geoApiModule.DistrictBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: { districtId: 5, district: 'Bengaluru Urban' }, geometry: {} }],
};
const correlation: sociologicalApiModule.DistrictCorrelationResponse[] = [
  {
    districtId: 5, districtName: 'Bengaluru Urban', caseCount: 1840, population: 9700000,
    literacyRate: 87.7, unemploymentRate: 4.1, urbanizationRate: 91.0, perCapitaIncome: 341000,
  },
];
const risk: sociologicalApiModule.PredictiveRiskForecastResponse[] = [
  {
    unitId: 12, unitName: 'Halasuru PS', districtId: 5, crimeSubHeadId: 101,
    crimeSubHeadName: 'Theft of Motor Vehicle', predictedCount: 14.2,
    backtestActualCount: 12, backtestPredictedCount: 13.1, backtestAbsoluteError: 1.1,
  },
];
const anomalies: sociologicalApiModule.CaseAnomalyResponse[] = [
  {
    caseMasterId: 9001, crimeNo: '101/2026/5/12', registrationDelayDays: 19,
    baselineMeanDelayDays: 4.2, zScore: 3.9,
    explanation: 'Registration delay of 19 days is 3.9 standard deviations above the baseline mean of 4.2 days',
  },
];

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

function mockAllQueriesSuccess() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(
    mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
  );
  vi.spyOn(sociologicalApiModule, 'useDistrictCorrelation').mockReturnValue(mockSuccess(correlation));
  vi.spyOn(sociologicalApiModule, 'usePredictiveRisk').mockReturnValue(mockSuccess(risk));
  vi.spyOn(sociologicalApiModule, 'useCaseAnomalies').mockReturnValue(mockSuccess(anomalies));
  vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(boundaries));
  vi.spyOn(agentApiModule, 'useExplainCorrelation').mockReturnValue(
    mockSuccess(undefined as unknown as agentApiModule.AgentExplainResponse),
  );
  vi.spyOn(agentApiModule, 'useExplainRiskForecast').mockReturnValue(
    mockSuccess(undefined as unknown as agentApiModule.AgentExplainResponse),
  );
  vi.spyOn(agentApiModule, 'useExplainCaseAnomaly').mockReturnValue(
    mockSuccess(undefined as unknown as agentApiModule.AgentExplainResponse),
  );
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/sociological']}>
      <Routes>
        <Route path="/sociological" element={<SociologicalScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SociologicalScreen', () => {
  it('renders all three panes plus the choropleth map once every query resolves', async () => {
    mockAllQueriesSuccess();

    renderScreen();

    expect(await screen.findByText('Socio-economic correlation')).toBeInTheDocument();
    expect(screen.getByText('Halasuru PS')).toBeInTheDocument();
    expect(screen.getByText('101/2026/5/12')).toBeInTheDocument();
    expect(screen.getByText('Choropleth mode: indicator')).toBeInTheDocument();
  });

  it('shows an error message and retry when a query fails', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(sociologicalApiModule, 'useDistrictCorrelation').mockReturnValue({
      data: undefined, isLoading: false, isError: true, isSuccess: false, refetch: vi.fn(),
    } as unknown as UseQueryResult<sociologicalApiModule.DistrictCorrelationResponse[], Error>);
    vi.spyOn(sociologicalApiModule, 'usePredictiveRisk').mockReturnValue(mockSuccess(risk));
    vi.spyOn(sociologicalApiModule, 'useCaseAnomalies').mockReturnValue(mockSuccess(anomalies));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(boundaries));

    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load sociological data");
  });

  it('shows an error when the boundaries query fails, even if the other three succeed', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(sociologicalApiModule, 'useDistrictCorrelation').mockReturnValue(mockSuccess(correlation));
    vi.spyOn(sociologicalApiModule, 'usePredictiveRisk').mockReturnValue(mockSuccess(risk));
    vi.spyOn(sociologicalApiModule, 'useCaseAnomalies').mockReturnValue(mockSuccess(anomalies));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue({
      data: undefined, isLoading: false, isError: true, isSuccess: false, refetch: vi.fn(),
    } as unknown as UseQueryResult<geoApiModule.DistrictBoundaryFeatureCollection, Error>);

    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load sociological data");
  });

  it('clicking a district on the map highlights it across the correlation scatter panels', async () => {
    mockAllQueriesSuccess();
    renderScreen();

    await screen.findByText('Socio-economic correlation');
    expect(screen.getByText('Choropleth selection: none')).toBeInTheDocument();
    expect(screen.queryByText('Bengaluru Urban')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Select Bengaluru Urban on map'));

    expect(screen.getByText('Choropleth selection: 5')).toBeInTheDocument();
    expect(screen.getAllByText('Bengaluru Urban').length).toBeGreaterThan(0);
  });

  it('switching the choropleth mode updates the mode passed to the map', async () => {
    mockAllQueriesSuccess();
    renderScreen();

    await screen.findByText('Socio-economic correlation');
    await userEvent.click(screen.getByText('Switch to risk mode'));

    expect(screen.getByText('Choropleth mode: risk')).toBeInTheDocument();
  });
});
