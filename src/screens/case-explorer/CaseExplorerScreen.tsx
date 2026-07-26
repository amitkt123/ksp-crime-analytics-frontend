import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { useMe } from '../../api/meApi';
import { useCases, type CaseFilters, type CaseStatus } from '../../api/caseApi';
import { CaseList } from './CaseList';
import { CaseExplorerMap } from './CaseExplorerMap';
import { CRIME_TYPE_OPTIONS } from '../../constants/crimeTypes';

type CaseExplorerView = 'list' | 'map';

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
      <main className="main-single explorer-pane overflow-y-auto">
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
        </div>
        {view === 'list' && <CaseList cases={casesQuery.data ?? []} />}
        {view === 'map' && (
          <CaseExplorerMap token={token} filters={filters} defaultDistrictId={districtId} defaultUnitId={unitId} />
        )}
      </main>
    </>
  );
}
