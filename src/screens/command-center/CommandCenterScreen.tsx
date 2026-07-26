import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { useCommandCenterSummary, type KpiResponse } from '../../api/commandCenterApi';
import { useCases } from '../../api/caseApi';
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
import { KpiPanel, type CommandCenterMetricKey, type MetricScope } from './KpiPanel';
import { MetricCardRow } from './MetricCardRow';
import { MetricDetailModal } from './MetricDetailModal';
import { CategoryMixChart } from './CategoryMixChart';
import { AlertFeed } from './AlertFeed';
import { type TimeOfDaySelection } from './TimeOfDaySelector';
import { CaseList } from '../case-explorer/CaseList';
import { CasePreviewPanel } from './CasePreviewPanel';

export function CommandCenterScreen() {
  const { token, roles } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPolicymaker = roles.includes('POLICYMAKER');
  const selectedDistrictId = searchParams.get('district') ? Number(searchParams.get('district')) : null;
  const districtDrilldownId = isPolicymaker ? null : selectedDistrictId;
  const selectedStationId = searchParams.get('station') ? Number(searchParams.get('station')) : null;
  const stationDrilldownId = isPolicymaker ? null : selectedStationId;
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDaySelection>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<CommandCenterMetricKey | null>(null);
  const [selectedMetricScope, setSelectedMetricScope] = useState<MetricScope>('state');

  const summaryQuery = useCommandCenterSummary(token);
  const districtSummariesQuery = useDistrictSummaries(token);
  const boundariesQuery = useDistrictBoundaries(token);
  const alertsQuery = useEmergingAlerts(token);
  const stationSummariesQuery = useStationSummaries(token, districtDrilldownId);
  const districtDetailQuery = useDistrictDetail(token, districtDrilldownId);
  const stationBoundariesQuery = useStationBoundaries(token, districtDrilldownId);
  const stationIncidentsQuery = useStationIncidents(token, stationDrilldownId);
  const stationCasesQuery = useCases(token, stationDrilldownId, {});

  function selectMetric(metric: CommandCenterMetricKey, scope: MetricScope) {
    setSelectedMetric(metric);
    setSelectedMetricScope(scope);
  }
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
        <main className="main-single cc-mockup-type overflow-y-auto bg-canvas p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
            <div className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
            <div className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
            <div className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
          </div>
        </main>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header title="Command Center" />
        <main className="main-single cc-mockup-type overflow-y-auto bg-canvas p-4 sm:p-6 lg:p-8">
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
  // const selectedDistrictName = districtSummaries.find((d) => d.districtId === selectedDistrictId)?.districtName ?? '';

  const districtDetail = districtDetailQuery.data ?? null;
  const modalScope: MetricScope = selectedMetricScope === 'district' && districtDrilldownId != null && districtDetail ? 'district' : 'state';
  const modalKpi = modalScope === 'district' ? districtDetail!.kpi : summary.kpi;
  const modalCategoryMix = modalScope === 'district' ? districtDetail!.categoryMix : summary.categoryMix;
  const modalCaseVolumeWeekly = modalScope === 'district' ? districtDetail!.caseVolumeWeekly : summary.stateCaseVolumeWeekly;
  const modalArrestsWeekly = modalScope === 'district' ? districtDetail!.arrestsWeekly : summary.arrestsWeekly;

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
      <main className="main-single cc-mockup-type overflow-y-auto bg-canvas p-4 sm:p-6 lg:p-8">
        <MetricCardRow
          kpi={summary.kpi}
          arrestsWeekly={summary.arrestsWeekly}
          stateCaseVolumeWeekly={summary.stateCaseVolumeWeekly}
          crimesAgainstPropertyWeekly={summary.crimesAgainstPropertyWeekly}
          onSelectMetric={selectMetric}
        />

        <section className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3.5 lg:col-span-2" aria-label="Karnataka hotspot map">
            <DistrictMap
              boundaries={boundaries}
              districtSummaries={districtSummaries}
              selectedDistrictId={districtDrilldownId}
              stationBoundaries={stationBoundariesQuery.data ?? null}
              stationSummaries={stationSummariesQuery.data ?? []}
              selectedStationId={stationDrilldownId}
              stationIncidents={stationIncidentsQuery.data ?? []}
              districtKpi={districtDetailQuery.data?.kpi ?? null}
              alerts={alerts}
              caseCountOverride={caseCountOverride}
              onDistrictSelect={selectDistrict}
              onBack={clearDistrict}
              onStationSelect={selectStation}
              onStationBack={clearStation}
              timeOfDayBuckets={timeOfDayBuckets}
              timeOfDay={timeOfDay}
              onTimeOfDayChange={setTimeOfDay}
            />
          </div>

          <aside className="flex flex-col gap-4 lg:col-span-1" aria-label="State KPIs and emerging alerts">
            {selectedDistrictId && !isPolicymaker ? (
              <>
                {districtDetailQuery.isError ? (
                  <p role="alert">
                    Couldn't load district details.{' '}
                    <button onClick={() => districtDetailQuery.refetch()}>Retry</button>
                  </p>
                ) : districtDetailQuery.data ? (
                  <>
                    <KpiPanel kpi={districtDetailQuery.data.kpi} scopeLabel="District case count" onSelectMetric={selectMetric} />
                    <TopCrimeSubHeadCard kpi={districtDetailQuery.data.kpi} />
                    <section
                      className="flex flex-col gap-2.5"
                      title="Breakdown of cases by category over the last 30 days."
                    >
                      <h3 className="flex items-center justify-between text-[13px] font-bold text-ink">
                        Case category mix <span className="count mono text-[11px] font-medium text-muted">30-day window</span>
                      </h3>
                      <CategoryMixChart categoryMix={districtDetailQuery.data.categoryMix} />
                    </section>
                  </>
                ) : (
                  <p>Loading district details…</p>
                )}
                {/* {stationSummariesQuery.data ? (
                  <StationDrilldownList
                    districtName={selectedDistrictName}
                    stations={stationSummariesQuery.data}
                    selectedStationId={stationDrilldownId}
                    onBack={clearDistrict}
                    onStationSelect={selectStation}
                  />
                ) : (
                  <p>Loading stations…</p>
                )} */}
                {stationDrilldownId != null && stationIncidentsQuery.isError && (
                  <p role="alert">
                    Couldn't load incident points.{' '}
                    <button onClick={() => stationIncidentsQuery.refetch()}>Retry</button>
                  </p>
                )}
                {stationDrilldownId != null && (
                  <section className="flex flex-col gap-2.5">
                    <h3 className="flex items-center justify-between text-[13px] font-bold text-ink">
                      Station case list{' '}
                      <span className="count mono text-[11px] font-medium text-muted">
                        {stationCasesQuery.data?.length ?? 0} cases
                      </span>
                    </h3>
                    {stationCasesQuery.isError ? (
                      <p role="alert">
                        Couldn't load cases for this station.{' '}
                        <button onClick={() => stationCasesQuery.refetch()}>Retry</button>
                      </p>
                    ) : stationCasesQuery.data ? (
                      <CaseList cases={stationCasesQuery.data} onSelectCase={setSelectedCaseId} />
                    ) : (
                      <p>Loading cases…</p>
                    )}
                  </section>
                )}
              </>
            ) : (
              <>
                <TopCrimeSubHeadCard kpi={summary.kpi} />
                <section
                  className="flex flex-col gap-2.5"
                  title="Breakdown of cases by category over the last 30 days."
                >
                  <h3 className="flex items-center justify-between text-[13px] font-bold text-ink">
                    Case category mix <span className="count mono text-[11px] font-medium text-muted">30-day window</span>
                  </h3>
                  <CategoryMixChart categoryMix={summary.categoryMix} />
                </section>
              </>
            )}
            <AlertFeed alerts={alerts} />
          </aside>
        </section>
      </main>
      <CasePreviewPanel caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
      <MetricDetailModal
        metricKey={selectedMetric}
        scope={modalScope}
        kpi={modalKpi}
        categoryMix={modalCategoryMix}
        caseVolumeWeekly={modalCaseVolumeWeekly}
        arrestsWeekly={modalArrestsWeekly}
        onClose={() => setSelectedMetric(null)}
      />
    </>
  );
}

// Split out of KpiPanel's old wide tile into its own sidebar card (mockup's "TOP CRIME
// SUB-HEAD" card) -- not interactive, matching the mockup, which has no click handler here.
function TopCrimeSubHeadCard({ kpi }: { kpi: KpiResponse }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 shadow-sm"
      title="The sub-head of crime with the most cases in the last 30 days."
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">Top crime sub-head</span>
        <Info className="h-4 w-4 text-muted" aria-hidden="true" />
      </div>
      <div className="mb-1 text-lg font-bold text-ink">{kpi.topCrimeSubHead}</div>
      <div className="mono text-2xl font-extrabold tracking-tight text-ink">{kpi.topCrimeSubHeadCount.toLocaleString()}</div>
    </div>
  );
}