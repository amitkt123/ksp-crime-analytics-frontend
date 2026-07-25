import { Link } from 'react-router-dom';
import { SidePanelChrome } from '../../design-system/SidePanelChrome';
import { caseIdOfNode, locationIdOfNode, type GraphEdgeResponse, type GraphNodeResponse } from '../../api/networkApi';

interface LocationDetailPanelProps {
  node: GraphNodeResponse | null;
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  onClose: () => void;
  onFocus: (locationId: number) => void;
}

interface ConnectedEntities {
  caseCount: number;
  personCount: number;
  caseNodes: GraphNodeResponse[];
}

function connectedEntitiesFor(node: GraphNodeResponse, nodes: GraphNodeResponse[], edges: GraphEdgeResponse[]): ConnectedEntities {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const connected = edges
    .filter((edge) => edge.sourceId === node.id || edge.targetId === node.id)
    .map((edge) => nodesById.get(edge.sourceId === node.id ? edge.targetId : edge.sourceId))
    .filter((n): n is GraphNodeResponse => n != null);

  const caseNodes = connected.filter((n) => n.type === 'CASE');
  const personCount = connected.filter((n) => n.type === 'PERSON').length;

  return { caseCount: caseNodes.length, personCount, caseNodes };
}

export function LocationDetailPanel({ node, nodes, edges, onClose, onFocus }: LocationDetailPanelProps) {
  const entities = node ? connectedEntitiesFor(node, nodes, edges) : null;

  return (
    <SidePanelChrome open={node != null} onClose={onClose} title={node?.label ?? ''} className="location-detail-panel">
      {node && entities && (
        <>
          <div className="evidence-meta-list">
            <div className="evidence-meta-row">
              <span className="k">Coordinates</span>
              <span className="v mono">
                {node.latitude != null && node.longitude != null ? `${node.latitude}, ${node.longitude}` : '—'}
              </span>
            </div>
          </div>

          {entities.caseCount === 0 && entities.personCount === 0 ? (
            <p>No connections in the current view.</p>
          ) : (
            <>
              <div className="evidence-meta-list">
                <div className="evidence-meta-row"><span className="k">Connected cases</span><span className="v mono">{entities.caseCount}</span></div>
                <div className="evidence-meta-row"><span className="k">Connected people</span><span className="v mono">{entities.personCount}</span></div>
              </div>
              {entities.caseNodes.length > 0 && (
                <section>
                  <h3>Connected cases</h3>
                  <div className="evidence-records">
                    {entities.caseNodes.map((caseNode) => (
                      <div className="evidence-record" key={caseNode.id}>
                        <Link to={`/case-explorer/${caseIdOfNode(caseNode)}`}>{caseNode.label}</Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          <div className="panel-actions">
            <button type="button" className="panel-action-btn" onClick={() => onFocus(locationIdOfNode(node))}>
              Focus on Location
            </button>
          </div>
        </>
      )}
    </SidePanelChrome>
  );
}
