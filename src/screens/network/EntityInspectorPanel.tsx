import { SidePanelChrome } from '../../design-system/SidePanelChrome';
import type { GraphNodeResponse } from '../../api/networkApi';

interface EntityInspectorPanelProps {
  node: GraphNodeResponse | null;
  onClose: () => void;
  onReFocus: (node: GraphNodeResponse) => void;
}

export function EntityInspectorPanel({ node, onClose, onReFocus }: EntityInspectorPanelProps) {
  return (
    <SidePanelChrome open={node != null} onClose={onClose} title={node?.label ?? ''} className="entity-inspector">
      {node && node.type === 'CASE' && (
        <div className="evidence-meta-list">
          <div className="evidence-meta-row"><span className="k">Crime No.</span><span className="v">{node.crimeNo}</span></div>
          <div className="evidence-meta-row"><span className="k">Case No.</span><span className="v">{node.caseNo}</span></div>
          <div className="evidence-meta-row"><span className="k">Registered</span><span className="v">{node.crimeRegisteredDate ?? '—'}</span></div>
          <div className="evidence-meta-row"><span className="k">Gravity weight</span><span className="v">{node.gravityWeight ?? '—'}</span></div>
          {node.moKeywordTags && node.moKeywordTags.length > 0 && (
            <div className="evidence-meta-row">
              <span className="k">MO keywords</span>
              <span className="v">
                {node.moKeywordTags.map((tag) => (
                  <span key={tag} className="mo-tag">{tag}</span>
                ))}
              </span>
            </div>
          )}
          <button className="reset-focus-btn" onClick={() => onReFocus(node)}>
            View network around this case
          </button>
        </div>
      )}
      {node && node.type === 'LOCATION' && (
        <div className="evidence-meta-list">
          {/* Skipped when equal to the panel title (node.label) to avoid showing the same string twice. */}
          {node.locationKey && node.locationKey !== node.label && (
            <div className="evidence-meta-row"><span className="k">Location</span><span className="v">{node.locationKey}</span></div>
          )}
          <div className="evidence-meta-row">
            <span className="k">Coordinates</span>
            <span className="v">{node.latitude != null && node.longitude != null ? `${node.latitude}, ${node.longitude}` : '—'}</span>
          </div>
          <button className="reset-focus-btn" onClick={() => onReFocus(node)}>
            View network around this location
          </button>
        </div>
      )}
    </SidePanelChrome>
  );
}
