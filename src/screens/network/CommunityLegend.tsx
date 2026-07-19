import type { CommunityResponse } from '../../api/networkApi';
import { colorForCommunity } from './networkColors';

interface CommunityLegendProps {
  communities: CommunityResponse[];
  onSelect: (communityId: number) => void;
}

export function CommunityLegend({ communities, onSelect }: CommunityLegendProps) {
  return (
    <div className="legend-panel">
      <div>
        <h4>Node type</h4>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: 'var(--muted-2)' }} />
          Person
        </div>
        <div className="legend-row">
          <span className="legend-shape" aria-hidden="true">
            ◆
          </span>
          Case
        </div>
        <div className="legend-row">
          <span className="legend-shape" aria-hidden="true">
            ▲
          </span>
          Location
        </div>
      </div>
      <div>
        <h4>Detected communities</h4>
        {communities.map((c) => (
          <button key={c.communityId} className="legend-row legend-row-button" onClick={() => onSelect(c.communityId)}>
            <span className="legend-dot" style={{ background: colorForCommunity(c.communityId) }} />
            Community {c.communityId} · {c.size}
          </button>
        ))}
      </div>
    </div>
  );
}
