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
    <section className="station-drilldown">
      <div className="breadcrumb">
        <button className="breadcrumb-back" onClick={onBack}>State</button>
        <span className="sep">›</span>
        <b>{districtName}</b>
      </div>
      {sorted.length === 0 ? (
        <p>No stations with cases in this district.</p>
      ) : (
        <ul className="station-list">
          {sorted.map((station) => (
            <li key={station.unitId}>
              <button
                type="button"
                className={`station-list-row${station.unitId === selectedStationId ? ' selected' : ''}`}
                aria-current={station.unitId === selectedStationId ? 'true' : undefined}
                onClick={() => onStationSelect(station.unitId)}
              >
                <span>{station.unitName}</span>
                <span className="mono">{station.caseCount.toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
