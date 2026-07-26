import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { useMe } from '../../api/meApi';
import { useCases, type CaseFilters, type CaseStatus } from '../../api/caseApi';
import { useStationBoundaries } from '../../api/geoApi';
import { CaseList } from './CaseList';
import { CaseHeatmapView } from './CaseHeatmapView';
import { CRIME_TYPE_OPTIONS } from '../../constants/crimeTypes';
import { OverviewTab } from '../insights/OverviewTab';
import { CrimeTrendsTab } from '../insights/CrimeTrendsTab';
import { DemographicsTab } from '../insights/DemographicsTab';
import { InvestigationNetworkTab } from '../insights/InvestigationNetworkTab';
import { JudicialUnitsTab } from '../insights/JudicialUnitsTab';

type CaseExplorerView = 'list' | 'map' | 'overview' | 'crime-trends' | 'demographics' | 'investigation-network' | 'judicial-units';

const INSIGHTS_PILLS: { view: CaseExplorerView; label: string }[] = [
  { view: 'overview', label: 'Overview' },
  { view: 'crime-trends', label: 'Crime Trends' },
  { view: 'demographics', label: 'Demographics' },
  { view: 'investigation-network', label: 'Investigation Network' },
  { view: 'judicial-units', label: 'Judicial & Units' },
];

export function CaseExplorerScreen() {
  const { token } = useAuth();
  const meQuery = useMe(token);
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const [crimeSubHeadId, setCrimeSubHeadId] = useState<number | ''>('');
  const [q, setQ] = useState('');
  const [view, setView] = useState<CaseExplorerView>('list');
  const isCaseView = view === 'list' || view === 'map';

  const unitId = meQuery.data?.unitId ?? null;
  const districtId = meQuery.data?.districtId ?? null;
  const filters: CaseFilters = {
    status: status || undefined,
    crimeSubHeadId: crimeSubHeadId || undefined,
    q: q || undefined,
  };
  const casesQuery = useCases(token, unitId, filters);
  const stationBoundariesQuery = useStationBoundaries(token, districtId);
  const stationBoundary = stationBoundariesQuery.data?.features.find((f) => f.properties.unitId === unitId) ?? null;

  const isLoading = meQuery.isLoading || casesQuery.isLoading;
  const isError = meQuery.isError || casesQuery.isError;

  if (isLoading) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <div className="case-list">
            <div className="case-list-row skeleton" />
            <div className="case-list-row skeleton" />
            <div className="case-list-row skeleton" />
          </div>
        </main>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <p role="alert">Couldn't load cases — check your connection and try again.</p>
          <button
            onClick={() => {
              meQuery.refetch();
              casesQuery.refetch();
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
      <Header title="Case Explorer">
        {isCaseView && (
          <div className="case-filters">
            <select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus | '')} aria-label="Status">
              <option value="">All statuses</option>
              <option value="registered">Registered</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={crimeSubHeadId}
              onChange={(e) => setCrimeSubHeadId(e.target.value ? Number(e.target.value) : '')}
              aria-label="Crime type"
            >
              <option value="">All crime types</option>
              {CRIME_TYPE_OPTIONS.map((option) => (
                <option key={option.crimeSubHeadId} value={option.crimeSubHeadId}>
                  {option.crimeSubHeadName}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder="Search crime no., case number, or name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search cases"
            />
          </div>
        )}
      </Header>
      <main className="main-single explorer-pane">
        <div className="view-tabs" role="tablist" aria-label="Case view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={`view-tab${view === 'list' ? ' active' : ''}`}
            onClick={() => setView('list')}
          >
            List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'map'}
            className={`view-tab${view === 'map' ? ' active' : ''}`}
            onClick={() => setView('map')}
          >
            Map
          </button>
          {INSIGHTS_PILLS.map((pill) => (
            <button
              key={pill.view}
              type="button"
              role="tab"
              aria-selected={view === pill.view}
              className={`view-tab${view === pill.view ? ' active' : ''}`}
              onClick={() => setView(pill.view)}
            >
              {pill.label}
            </button>
          ))}
        </div>
        {view === 'list' && <CaseList cases={casesQuery.data ?? []} />}
        {view === 'map' && <CaseHeatmapView cases={casesQuery.data ?? []} stationBoundary={stationBoundary} />}
        {view === 'overview' && <OverviewTab />}
        {view === 'crime-trends' && <CrimeTrendsTab />}
        {view === 'demographics' && <DemographicsTab />}
        {view === 'investigation-network' && <InvestigationNetworkTab />}
        {view === 'judicial-units' && <JudicialUnitsTab />}
      </main>
    </>
  );
}
