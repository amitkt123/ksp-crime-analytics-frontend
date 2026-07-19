import type { NetworkPathResponse } from '../../api/networkApi';

interface PathFindingBarProps {
  pathMode: boolean;
  onToggle: () => void;
  pathEndpoints: number[];
  pathResult: NetworkPathResponse | null | undefined;
  isPathLoading: boolean;
  isPathError: boolean;
}

export function PathFindingBar({ pathMode, onToggle, pathEndpoints, pathResult, isPathLoading, isPathError }: PathFindingBarProps) {
  return (
    <div className="path-toggle-bar">
      <span className="label">Path-finding mode</span>
      <button
        className={`mini-toggle${pathMode ? ' on' : ''}`}
        aria-label="Toggle path-finding mode"
        aria-pressed={pathMode}
        onClick={onToggle}
      >
        <span className="knob" />
      </button>
      <span className="hint">{pathMode ? 'Click two people' : 'Off'}</span>
      {pathEndpoints.length === 2 && (
        <span className="path-result show">
          {' · '}
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
        </span>
      )}
    </div>
  );
}
