import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { useCommandCenterSummary } from '../../api/commandCenterApi';
import { useDistrictSummaries, useDistrictBoundaries, useStationSummaries } from '../../api/geoApi';
import { useEmergingAlerts } from '../../api/alertsApi';
import { DistrictMap } from './DistrictMap';
import { StationDrilldownList } from './StationDrilldownList';
import { KpiPanel } from './KpiPanel';
import { SparklineStrip } from './SparklineStrip';
import { CategoryMixChart } from './CategoryMixChart';
import { AlertFeed } from './AlertFeed';

export function CommandCenterScreen() {
  const { token, roles } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPolicymaker = roles.includes('POLICYMAKER');
  const selectedDistrictId = searchParams.get('district') ? Number(searchParams.get('district')) : null;

  const summaryQuery = useCommandCenterSummary(token);
  const districtSummariesQuery = useDistrictSummaries(token);
  const boundariesQuery = useDistrictBoundaries(token);
  const alertsQuery = useEmergingAlerts(token);
  const stationSummariesQuery = useStationSummaries(token, isPolicymaker ? null : selectedDistrictId);

  function selectDistrict(districtId: number) {
    if (isPolicymaker) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('district', String(districtId));
      return next;
    });
  }

  function clearDistrict() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('district');
      return next;
    });
  }

  const isLoading =
    summaryQuery.isLoading || districtSummariesQuery.isLoading || boundariesQuery.isLoading || alertsQuery.isLoading;
  const isError =
    summaryQuery.isError || districtSummariesQuery.isError || boundariesQuery.isError || alertsQuery.isError;

  if (isLoading) {
    return (
      <>
        <Header title="Command Center" />
        <main className="main">
          <div className="kpi-grid">
            <div className="kpi-tile" />
            <div className="kpi-tile" />
            <div className="kpi-tile wide" />
          </div>
        </main>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header title="Command Center" />
        <main className="main">
          <p role="alert">Couldn't load Command Center data — check your connection and try again.</p>
          <button
            onClick={() => {
              summaryQuery.refetch();
              districtSummariesQuery.refetch();
              boundariesQuery.refetch();
              alertsQuery.refetch();
            }}
          >
            Retry
          </button>
        </main>
      </>
    );
  }

  const summary = summaryQuery.data!;
  const districtSummaries = districtSummariesQuery.data!;
  const boundaries = boundariesQuery.data!;
  const alerts = alertsQuery.data!;
  const selectedDistrictName = districtSummaries.find((d) => d.districtId === selectedDistrictId)?.districtName ?? '';

  return (
    <>
      <Header title="Command Center">
        <select
          aria-label="District"
          value={selectedDistrictId ?? ''}
          disabled={isPolicymaker}
          onChange={(e) => (e.target.value ? selectDistrict(Number(e.target.value)) : clearDistrict())}
        >
          <option value="">State-wide</option>
          {districtSummaries.map((d) => (
            <option key={d.districtId} value={d.districtId}>
              {d.districtName}
            </option>
          ))}
        </select>
      </Header>
      <main className="main">
        <section className="pane map-pane" aria-label="Karnataka hotspot map">
          <div className="pane-head">
            <div>
              <h2>Karnataka — case density by district</h2>
              <div className="breadcrumb">
                <b>{selectedDistrictName || 'State'}</b>
              </div>
            </div>
          </div>
          <DistrictMap boundaries={boundaries} districtSummaries={districtSummaries} onDistrictSelect={selectDistrict} />
          <SparklineStrip
            stateCaseVolumeWeekly={summary.stateCaseVolumeWeekly}
            crimesAgainstPropertyWeekly={summary.crimesAgainstPropertyWeekly}
            arrestsWeekly={summary.arrestsWeekly}
          />
        </section>
        <aside className="pane side-pane" aria-label="State KPIs and emerging alerts">
          {selectedDistrictId && !isPolicymaker ? (
            stationSummariesQuery.data ? (
              <StationDrilldownList
                districtName={selectedDistrictName}
                stations={stationSummariesQuery.data}
                onBack={clearDistrict}
              />
            ) : (
              <p>Loading stations…</p>
            )
          ) : (
            <>
              <KpiPanel kpi={summary.kpi} />
              <section>
                <h3>
                  Case category mix <span className="count">30-day window</span>
                </h3>
                <CategoryMixChart categoryMix={summary.categoryMix} />
              </section>
            </>
          )}
          <AlertFeed alerts={alerts} />
        </aside>
      </main>
    </>
  );
}
