import { useState } from 'react';
import { Header } from '../../app/Header';
import { OverviewTab } from './OverviewTab';
import { CrimeTrendsTab } from './CrimeTrendsTab';
import { DemographicsTab } from './DemographicsTab';
import { InvestigationNetworkTab } from './InvestigationNetworkTab';
import { JudicialUnitsTab } from './JudicialUnitsTab';

type CrimeAnalyticsView = 'overview' | 'crime-trends' | 'demographics' | 'investigation-network' | 'judicial-units';

const INSIGHTS_PILLS: { view: CrimeAnalyticsView; label: string }[] = [
  { view: 'overview', label: 'Overview' },
  { view: 'crime-trends', label: 'Crime Trends' },
  { view: 'demographics', label: 'Demographics' },
  { view: 'investigation-network', label: 'Investigation Network' },
  { view: 'judicial-units', label: 'Judicial & Units' },
];

export function CrimeAnalyticsScreen() {
  const [view, setView] = useState<CrimeAnalyticsView>('overview');

  return (
    <>
      <Header title="Crime Analytics" />
      <main className="main-single insights-main">
        <div className="view-tabs" role="tablist" aria-label="Crime analytics view">
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
        {view === 'overview' && <OverviewTab />}
        {view === 'crime-trends' && <CrimeTrendsTab />}
        {view === 'demographics' && <DemographicsTab />}
        {view === 'investigation-network' && <InvestigationNetworkTab />}
        {view === 'judicial-units' && <JudicialUnitsTab />}
      </main>
    </>
  );
}