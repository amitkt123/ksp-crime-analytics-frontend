import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { useCommandCenterSummary } from '../../api/commandCenterApi';
import {
  useDistrictSummaries,
  useDistrictBoundaries,
  useStationSummaries,
  useDistrictDetail,
  useStationBoundaries,
  useDistrictTimeOfDay,
  useStationIncidents,
} from '../../api/geoApi';
import { useEmergingAlerts } from '../../api/alertsApi';
import { DistrictMap } from './DistrictMap';
import { StationDrilldownList } from './StationDrilldownList';
import { KpiPanel } from './KpiPanel';
import { SparklineStrip } from './SparklineStrip';
import { CategoryMixChart } from './CategoryMixChart';
import { AlertFeed } from './AlertFeed';
import { TimeOfDaySelector, type TimeOfDaySelection } from './TimeOfDaySelector';

export function CommandCenterScreen() {
  const { token, roles } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPolicymaker = roles.includes('POLICYMAKER');
  const selectedDistrictId = searchParams.get('district') ? Number(searchParams.get('district')) : null;
  const districtDrilldownId = isPolicymaker ? null : selectedDistrictId;
  const selectedStationId = searchParams.get('station') ? Number(searchParams.get('station')) : null;
  const stationDrilldownId = isPolicymaker ? null : selectedStationId;
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDaySelection>('all');

  const summaryQuery = useCommandCenterSummary(token);
  const districtSummariesQuery = useDistrictSummaries(token);
  const boundariesQuery = useDistrictBoundaries(token);
  const alertsQuery = useEmergingAlerts(token);
  const stationSummariesQuery = useStationSummaries(token, districtDrilldownId);
  const districtDetailQuery = useDistrictDetail(token, districtDrilldownId);
  const stationBoundariesQuery = useStationBoundaries(token, districtDrilldownId);
  const stationIncidentsQuery = useStationIncidents(token, stationDrilldownId);
  // Spatiotemporal hotspot layering is a progressive enhancement on top of the
  // district drill-down -- it deliberately isn't part of isLoading/isError below,
  // so a slow or failed time-of-day fetch never blocks the rest of the screen; the
  // selector just renders with no buckets until the data arrives.
  const timeOfDayQuery = useDistrictTimeOfDay(token);

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
      next.delete('station');
      return next;
    });
  }

  function selectStation(unitId: number) {
    if (isPolicymaker) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('station', String(unitId));
      return next;
    });
  }

  function clearStation() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('station');
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

  const timeOfDayBuckets = timeOfDayQuery.data?.buckets ?? [];
  const activeBucket = timeOfDay === 'all' ? null : timeOfDayBuckets.find((b) => b.bucket === timeOfDay);
  const caseCountOverride = activeBucket
    ? new Map(Object.entries(activeBucket.districtCaseCounts).map(([id, count]) => [Number(id), count]))
    : null;

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
              <h2>Karnataka — case density {activeBucket ? `· ${activeBucket.label}` : 'by district'}</h2>
            </div>
            <TimeOfDaySelector buckets={timeOfDayBuckets} value={timeOfDay} onChange={setTimeOfDay} />
          </div>
          <DistrictMap
            boundaries={boundaries}
            districtSummaries={districtSummaries}
            selectedDistrictId={districtDrilldownId}
            stationBoundaries={stationBoundariesQuery.data ?? null}
            stationSummaries={stationSummariesQuery.data ?? []}
            selectedStationId={stationDrilldownId}
            stationIncidents={stationIncidentsQuery.data ?? []}
            alerts={alerts}
            caseCountOverride={caseCountOverride}
            onDistrictSelect={selectDistrict}
            onBack={clearDistrict}
            onStationSelect={selectStation}
            onStationBack={clearStation}
          />
          <SparklineStrip
            stateCaseVolumeWeekly={summary.stateCaseVolumeWeekly}
            crimesAgainstPropertyWeekly={summary.crimesAgainstPropertyWeekly}
            arrestsWeekly={summary.arrestsWeekly}
          />
        </section>
        <aside className="pane side-pane" aria-label="State KPIs and emerging alerts">
          {selectedDistrictId && !isPolicymaker ? (
            <>
              {districtDetailQuery.isError ? (
                <p role="alert">
                  Couldn't load district details.{' '}
                  <button onClick={() => districtDetailQuery.refetch()}>Retry</button>
                </p>
              ) : districtDetailQuery.data ? (
                <>
                  <KpiPanel kpi={districtDetailQuery.data.kpi} scopeLabel="District case count" />
                  <section>
                    <h3>
                      Case category mix <span className="count">30-day window</span>
                    </h3>
                    <CategoryMixChart categoryMix={districtDetailQuery.data.categoryMix} />
                  </section>
                </>
              ) : (
                <p>Loading district details…</p>
              )}
              {stationSummariesQuery.data ? (
                <StationDrilldownList
                  districtName={selectedDistrictName}
                  stations={stationSummariesQuery.data}
                  selectedStationId={stationDrilldownId}
                  onBack={clearDistrict}
                  onStationSelect={selectStation}
                />
              ) : (
                <p>Loading stations…</p>
              )}
              {stationDrilldownId != null && stationIncidentsQuery.isError && (
                <p role="alert">
                  Couldn't load incident points.{' '}
                  <button onClick={() => stationIncidentsQuery.refetch()}>Retry</button>
                </p>
              )}
            </>
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
