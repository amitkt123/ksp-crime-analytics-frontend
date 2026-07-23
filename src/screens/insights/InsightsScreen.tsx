import { useSearchParams } from 'react-router-dom';
import { Header } from '../../app/Header';
import { OverviewTab } from './OverviewTab';
import { CrimeTrendsTab } from './CrimeTrendsTab';
import { DemographicsTab } from './DemographicsTab';
import { InvestigationNetworkTab } from './InvestigationNetworkTab';
import { JudicialUnitsTab } from './JudicialUnitsTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'crime-trends', label: 'Crime Trends' },
  { key: 'demographics', label: 'Demographics' },
  { key: 'investigation-network', label: 'Investigation Network' },
  { key: 'judicial-units', label: 'Judicial & Units' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((t) => t.key === value);
}

export function InsightsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: TabKey = isTabKey(requestedTab) ? requestedTab : 'overview';

  function selectTab(tab: TabKey) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  }

  return (
    <>
      <Header title="Insights" />
      <main className="main-single insights-main">
        <div className="view-tabs" role="tablist" aria-label="Insights pillar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`view-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => selectTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'crime-trends' && <CrimeTrendsTab />}
        {activeTab === 'demographics' && <DemographicsTab />}
        {activeTab === 'investigation-network' && <InvestigationNetworkTab />}
        {activeTab === 'judicial-units' && <JudicialUnitsTab />}
      </main>
    </>
  );
}
