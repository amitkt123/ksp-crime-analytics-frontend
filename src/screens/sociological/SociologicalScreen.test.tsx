import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as sociologicalApiModule from '../../api/sociologicalApi';
import { SociologicalScreen } from './SociologicalScreen';

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
  it('renders all three panes once every query resolves', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(sociologicalApiModule, 'useDistrictCorrelation').mockReturnValue(mockSuccess(correlation));
    vi.spyOn(sociologicalApiModule, 'usePredictiveRisk').mockReturnValue(mockSuccess(risk));
    vi.spyOn(sociologicalApiModule, 'useCaseAnomalies').mockReturnValue(mockSuccess(anomalies));

    renderScreen();

    expect(await screen.findByText('Socio-economic correlation')).toBeInTheDocument();
    expect(screen.getByText('Halasuru PS')).toBeInTheDocument();
    expect(screen.getByText('101/2026/5/12')).toBeInTheDocument();
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

    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load sociological data");
  });
});
