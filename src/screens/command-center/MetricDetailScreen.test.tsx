import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as commandCenterApiModule from '../../api/commandCenterApi';
import * as meApiModule from '../../api/meApi';
import { MetricDetailScreen } from './MetricDetailScreen';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

const summary: commandCenterApiModule.CommandCenterSummaryResponse = {
  kpi: {
    stateCaseCount: 58214, stateCaseCountDeltaPct: 4.2, resolvedPct: 41.6,
    resolvedPctDeltaPts: 1.1, topCrimeSubHead: 'Theft — motor vehicle', topCrimeSubHeadCount: 3410,
  },
  stateCaseVolumeWeekly: [
    { isoYear: 2026, isoWeek: 1, count: 1842 },
    { isoYear: 2026, isoWeek: 2, count: 1901 },
  ],
  crimesAgainstPropertyWeekly: [
    { isoYear: 2026, isoWeek: 1, count: 612 },
    { isoYear: 2026, isoWeek: 2, count: 640 },
  ],
  arrestsWeekly: [
    { isoYear: 2026, isoWeek: 1, count: 397 },
    { isoYear: 2026, isoWeek: 2, count: 410 },
  ],
  categoryMix: [{ crimeHeadId: 2, crimeGroupName: 'Crimes Against Property', count: 612 }],
};

function renderScreen(metricKey: string) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(
    mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
  );
  return render(
    <MemoryRouter initialEntries={[`/command-center/metric/${metricKey}`]}>
      <Routes>
        <Route path="/command-center" element={<p>Command Center screen</p>} />
        <Route path="/command-center/metric/:metricKey" element={<MetricDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MetricDetailScreen', () => {
  it('shows the state case count headline, trend chart, and category mix', async () => {
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));

    renderScreen('case-count');

    expect(await screen.findByText('58,214')).toBeInTheDocument();
    expect(screen.getByText(/4\.2% vs\. prior 30 days/)).toBeInTheDocument();
    expect(screen.getAllByText('Crimes Against Property').length).toBeGreaterThan(0);
  });

  it('shows the resolved % headline for that metric key', async () => {
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));

    renderScreen('resolved-pct');

    expect(await screen.findByText('41.6')).toBeInTheDocument();
    expect(screen.getByText(/1\.1 pt vs\. prior 30 days/)).toBeInTheDocument();
  });

  it('shows the top crime sub-head headline for that metric key', async () => {
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));

    renderScreen('top-crime-subhead');

    expect(await screen.findByText('Theft — motor vehicle')).toBeInTheDocument();
    expect(screen.getByText('3,410')).toBeInTheDocument();
  });

  it('navigates back to Command Center via the breadcrumb', async () => {
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(mockSuccess(summary));

    renderScreen('case-count');

    await userEvent.click(await screen.findByRole('link', { name: 'Command Center' }));
    expect(await screen.findByText('Command Center screen')).toBeInTheDocument();
  });

  it('shows a retry control on error', async () => {
    const refetch = vi.fn();
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch,
    } as unknown as UseQueryResult<commandCenterApiModule.CommandCenterSummaryResponse, Error>);

    renderScreen('case-count');

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this metric");
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
