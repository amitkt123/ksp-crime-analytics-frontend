import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as commandCenterApiModule from '../../api/commandCenterApi';
import * as geoApiModule from '../../api/geoApi';
import * as caseApiModule from '../../api/caseApi';
import { OverviewTab } from './OverviewTab';

function queryResult<T>(data: T) {
  return { data, isLoading: false, isError: false, refetch: vi.fn() } as never;
}

const summary = {
  kpi: { stateCaseCount: 12480, stateCaseCountDeltaPct: 4.2, resolvedPct: 61.3, resolvedPctDeltaPts: 1.8, topCrimeSubHead: 'Theft', topCrimeSubHeadCount: 1000 },
  stateCaseVolumeWeekly: [], crimesAgainstPropertyWeekly: [], arrestsWeekly: [],
  categoryMix: [{ crimeHeadId: 1, crimeGroupName: 'Crimes Against Body', count: 200 }],
};
const districtSummaries = [
  { districtId: 1, districtName: 'Bengaluru Urban', caseCount: 1840 },
  { districtId: 2, districtName: 'Mysuru', caseCount: 687 },
];

function mockShared() {
  vi.spyOn(commandCenterApiModule, 'useCommandCenterSummary').mockReturnValue(queryResult(summary));
  vi.spyOn(geoApiModule, 'useDistrictSummaries').mockReturnValue(queryResult(districtSummaries));
}

describe('OverviewTab', () => {
  it('shows the live CaseList and no Demo badge on Recent FIRs for an INVESTIGATOR with a resolved unit', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['INVESTIGATOR'], username: 'demo.investigator', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(queryResult({ username: 'demo.investigator', firstName: 'Demo', rank: 'PI', unit: 'Whitefield PS', unitId: 176, districtId: 5, roles: ['INVESTIGATOR'] }));
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(queryResult([
      { caseId: 1, caseNumber: '2026001', unitId: 176, unitName: 'Whitefield PS', crimeSubHeadId: 1, crimeSubHeadName: 'Theft', status: 'registered', firDate: '2026-01-01' },
    ]));
    mockShared();

    render(
      <MemoryRouter>
        <OverviewTab />
      </MemoryRouter>,
    );

    const recentFirsCard = screen.getByText('Recent FIRs').closest('.insight-card')!;
    expect(recentFirsCard.querySelector('.chip.predicted')).toBeNull();
    expect(screen.getByText('2026001')).toBeInTheDocument();
  });

  it('falls back to the demo Recent FIRs table with a Demo badge for a POLICYMAKER', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['POLICYMAKER'], username: 'demo.policymaker', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(queryResult({ username: 'demo.policymaker', firstName: 'Demo', rank: null, unit: null, unitId: null, districtId: null, roles: ['POLICYMAKER'] }));
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(queryResult(undefined));
    mockShared();

    render(
      <MemoryRouter>
        <OverviewTab />
      </MemoryRouter>,
    );

    const recentFirsCard = screen.getByText('Recent FIRs').closest('.insight-card')!;
    expect(recentFirsCard.querySelector('.chip.predicted')).not.toBeNull();
    expect(screen.getByText(/isn't available state\/district-wide yet/)).toBeInTheDocument();
  });

  it('renders Top Districts sorted descending from live district summaries', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue(queryResult({ username: 'demo.analyst', firstName: 'Demo', rank: null, unit: null, unitId: null, districtId: null, roles: ['SCRB_ANALYST'] }));
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(queryResult(undefined));
    mockShared();

    render(
      <MemoryRouter>
        <OverviewTab />
      </MemoryRouter>,
    );

    const topDistrictsCard = screen.getByText('Top Districts by Case Volume').closest('.insight-card')!;
    const labels = Array.from(topDistrictsCard.querySelectorAll('.cat-bar-label')).map((el) => el.textContent);
    expect(labels.indexOf('Bengaluru Urban')).toBeLessThan(labels.indexOf('Mysuru'));
  });
});
