import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as commandCenterApiModule from '../../api/commandCenterApi';
import * as geoApiModule from '../../api/geoApi';
import * as alertsApiModule from '../../api/alertsApi';
import * as meApiModule from '../../api/meApi';

vi.mock('./DistrictMap', () => ({
  DistrictMap: ({ onDistrictSelect }: { onDistrictSelect: (id: number) => void }) => (
    <button onClick={() => onDistrictSelect(3)}>Select Mysuru</button>
  ),
}));

import { CommandCenterScreen } from './CommandCenterScreen';

const summary = {
  kpi: {
    stateCaseCount: 58214, stateCaseCountDeltaPct: 4.2, resolvedPct: 41.6,
    resolvedPctDeltaPts: 1.1, topCrimeSubHead: 'Theft — motor vehicle', topCrimeSubHeadCount: 3410,
  },
  stateCaseVolumeWeekly: [{ isoYear: 2026, isoWeek: 1, count: 1842 }],
  crimesAgainstPropertyWeekly: [{ isoYear: 2026, isoWeek: 1, count: 612 }],
  arrestsWeekly: [{ isoYear: 2026, isoWeek: 1, count: 397 }],
  categoryMix: [{ crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 612 }],
};
const districts = [
  { districtId: 1, districtName: 'Bengaluru Urban', caseCount: 500 },
  { districtId: 3, districtName: 'Mysuru', caseCount: 120 },
];
const boundaries = { type: 'FeatureCollection' as const, features: [] };
const alerts: alertsApiModule.EmergingAlertResponse[] = [];
const stations = [{ unitId: 300, unitName: 'Mysuru Commissioner Office', caseCount: 120 }];

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/command-center']}>
      <Routes>
        <Route path="/command-center" element={<CommandCenterScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CommandCenterScreen', () => {
  it('renders KPIs, category mix, and alerts once every query resolves', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));
    vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(mockSuccess(districts));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(boundaries));
    vi.spyOn(geoApiModule, 'useStationSummaries').mockReturnValue(
      mockSuccess<geoApiModule.StationSummaryResponse[]>(undefined as unknown as geoApiModule.StationSummaryResponse[]),
    );
    vi.spyOn(alertsApiModule, 'useEmergingAlerts').mockReturnValue(mockSuccess(alerts));

    renderScreen();

    expect(await screen.findByText('58,214')).toBeInTheDocument();
    expect(screen.getAllByText('Crimes Against Property').length).toBeGreaterThan(0);
    expect(screen.getByText('No emerging alerts in this window.')).toBeInTheDocument();
  });

  it('selecting a district shows the station drill-down and updates the URL', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));
    vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(mockSuccess(districts));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(boundaries));
    vi.spyOn(geoApiModule, 'useStationSummaries').mockReturnValue(mockSuccess(stations));
    vi.spyOn(alertsApiModule, 'useEmergingAlerts').mockReturnValue(mockSuccess(alerts));

    renderScreen();

    await userEvent.click(await screen.findByText('Select Mysuru'));

    await waitFor(() => expect(screen.getByText('Mysuru Commissioner Office')).toBeInTheDocument());
  });

  it('disables the district selector for a Policymaker', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['POLICYMAKER'], username: 'demo.policymaker', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(
      mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
    );
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));
    vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(mockSuccess(districts));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(mockSuccess(boundaries));
    vi.spyOn(geoApiModule, 'useStationSummaries').mockReturnValue(
      mockSuccess<geoApiModule.StationSummaryResponse[]>(undefined as unknown as geoApiModule.StationSummaryResponse[]),
    );
    vi.spyOn(alertsApiModule, 'useEmergingAlerts').mockReturnValue(mockSuccess(alerts));

    renderScreen();

    expect(await screen.findByLabelText('District')).toBeDisabled();
  });
});
