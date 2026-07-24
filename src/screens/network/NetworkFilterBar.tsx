import type { CommunityResponse, NetworkPathResponse } from '../../api/networkApi';

export interface PersonOption {
  id: number;
  label: string;
}

interface NetworkFilterBarProps {
  fullDetail: boolean;
  onToggleFullDetail: () => void;
  showCase: boolean;
  onToggleShowCase: () => void;
  showLocation: boolean;
  onToggleShowLocation: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  communities: CommunityResponse[];
  selectedCommunityId: number | 'all';
  onCommunityChange: (value: number | 'all') => void;
  personOptions: PersonOption[];
  pathFrom: number | '';
  pathTo: number | '';
  onPathFromChange: (value: number | '') => void;
  onPathToChange: (value: number | '') => void;
  pathResult: NetworkPathResponse | null | undefined;
  isPathLoading: boolean;
  isPathError: boolean;
  onReset: () => void;
}

export function NetworkFilterBar({
  fullDetail,
  onToggleFullDetail,
  showCase,
  onToggleShowCase,
  showLocation,
  onToggleShowLocation,
  search,
  onSearchChange,
  communities,
  selectedCommunityId,
  onCommunityChange,
  personOptions,
  pathFrom,
  pathTo,
  onPathFromChange,
  onPathToChange,
  pathResult,
  isPathLoading,
  isPathError,
  onReset,
}: NetworkFilterBarProps) {
  const hasBothEndpoints = pathFrom !== '' && pathTo !== '';

  return (
    <div className="network-filter-bar">
      <div className="field">
        <label className="field-label">View</label>
        <label className="checkbox-field">
          <input type="checkbox" checked={fullDetail} onChange={onToggleFullDetail} />
          Full detail (cases &amp; locations)
        </label>
      </div>

      {fullDetail && (
        <div className="field">
          <label className="field-label">Show</label>
          <div className="checkbox-group">
            <label className="checkbox-field">
              <input type="checkbox" checked={showCase} onChange={onToggleShowCase} /> Cases
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={showLocation} onChange={onToggleShowLocation} /> Locations
            </label>
          </div>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="network-search">
          Search
        </label>
        <input
          id="network-search"
          type="text"
          placeholder="Find a person…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="network-community">
          Community
        </label>
        <select
          id="network-community"
          value={selectedCommunityId}
          onChange={(e) => onCommunityChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">All communities</option>
          {communities.map((c) => (
            <option key={c.communityId} value={c.communityId}>
              Community {c.communityId} · {c.size}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="network-path-from">
          Path from
        </label>
        <select
          id="network-path-from"
          value={pathFrom}
          onChange={(e) => onPathFromChange(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">Select…</option>
          {personOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="network-path-to">
          Path to
        </label>
        <select
          id="network-path-to"
          value={pathTo}
          onChange={(e) => onPathToChange(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">Select…</option>
          {personOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {hasBothEndpoints && (
        <div className="path-result-pill">
          {isPathLoading && <span>Finding path…</span>}
          {!isPathLoading && isPathError && <span>Could not find a path.</span>}
          {!isPathLoading && !isPathError && pathResult === null && <span>No path found within 6 hops.</span>}
          {!isPathLoading && !isPathError && pathResult && (
            <>
              <span className="hops mono">
                {pathResult.hopCount} hop{pathResult.hopCount === 1 ? '' : 's'}
              </span>
              {' via '}
              {pathResult.displayNames.join(' → ')}
            </>
          )}
        </div>
      )}

      <button type="button" className="reset-filters-btn" onClick={onReset}>
        Reset filters
      </button>
    </div>
  );
}
