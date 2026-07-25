import type { StationSummaryResponse } from '../../api/geoApi';

interface StationDrilldownListProps {
  districtName: string;
  stations: StationSummaryResponse[];
  selectedStationId?: number | null;
  onBack: () => void;
  onStationSelect: (unitId: number) => void;
}

export function StationDrilldownList({
  districtName,
  stations,
  selectedStationId = null,
  onBack,
  onStationSelect,
}: StationDrilldownListProps) {
  const sorted = [...stations].sort((a, b) => b.caseCount - a.caseCount);

  return (
    <section className="station-drilldown flex flex-col gap-2.5">
      <div className="breadcrumb flex items-center gap-1.5 text-xs text-muted">
        <button type="button" className="breadcrumb-back cursor-pointer text-accent hover:underline" onClick={onBack}>
          State
        </button>
        <span className="sep text-muted">›</span>
        <b className="font-semibold text-ink">{districtName}</b>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No stations with cases in this district.</p>
      ) : (
        <ul className="station-list m-0 flex list-none flex-col gap-1.5 p-0">
          {sorted.map((station) => (
            <li key={station.unitId}>
              <button
                type="button"
                className={`station-list-row flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  station.unitId === selectedStationId
                    ? 'selected border-accent bg-surface'
                    : 'border-border bg-canvas hover:border-accent'
                }`}
                aria-current={station.unitId === selectedStationId ? 'true' : undefined}
                onClick={() => onStationSelect(station.unitId)}
              >
                <span className="text-ink">{station.unitName}</span>
                <span className="mono text-muted">{station.caseCount.toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
