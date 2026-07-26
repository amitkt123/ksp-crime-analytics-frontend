import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as commandCenterApiModule from '../../api/commandCenterApi';
import * as geoApiModule from '../../api/geoApi';
import { CrimeTrendsScreen } from './CrimeTrendsScreen';

vi.mock('maplibre-gl', () => {
  function MockMap(this: Record<string, unknown>) {
    this.on = vi.fn((event: string, cb: () => void) => { if (event === 'load') cb(); });
    this.addSource = vi.fn();
    this.addLayer = vi.fn();
    this.getSource = vi.fn();
    this.fitBounds = vi.fn();
    this.remove = vi.fn();
  }
  return { default: { Map: vi.fn(MockMap) } };
});

function queryResult<T>(data: T) {
  return { data, isLoading: false, isError: false, refetch: vi.fn() } as never;
}

describe('CrimeTrendsScreen', () => {
  it('renders the Header title and the Crime Trends tab content', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({ data: undefined, isLoading: false, isError: false } as never);
    vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(
      queryResult({
        kpi: { stateCaseCount: 1, stateCaseCountDeltaPct: 0, resolvedPct: 0, resolvedPctDeltaPts: 0, topCrimeSubHead: '', topCrimeSubHeadCount: 0 },
        stateCaseVolumeWeekly: [], crimesAgainstPropertyWeekly: [], arrestsWeekly: [],
        categoryMix: [{ crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 200 }],
      }),
    );
    vi.spyOn(geoApiModule, 'useHotspots').mockReturnValue(queryResult([]));
    vi.spyOn(geoApiModule, 'useDistrictBoundaries').mockReturnValue(queryResult({ type: 'FeatureCollection', features: [] }));

    render(
      <MemoryRouter>
        <CrimeTrendsScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Crime Trends' })).toBeInTheDocument();
    expect(screen.getByText('Crime Head Distribution')).toBeInTheDocument();
  });
});
