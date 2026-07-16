import type { StationSummaryResponse } from '../../api/geoApi';

interface StationDrilldownListProps {
  districtName: string;
  stations: StationSummaryResponse[];
  onBack: () => void;
}

export function StationDrilldownList({ districtName, stations, onBack }: StationDrilldownListProps) {
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
            <li key={station.unitId} className="station-list-row">
              <span>{station.unitName}</span>
              <span className="mono">{station.caseCount.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
