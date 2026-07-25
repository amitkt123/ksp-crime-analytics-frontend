import { useMemo } from 'react';
import type { GraphNodeResponse, GraphEdgeResponse, GraphEdgeType } from '../../api/networkApi';
import { edgeStyleFor } from './networkEdgeStyles';

interface AssociationSummaryProps {
  personNode: GraphNodeResponse | null;
  edges: GraphEdgeResponse[];
  nodes: GraphNodeResponse[];
  communityByLabel: Map<string, number>;
  onReFocusPerson: (personId: number) => void;
}

interface AssociationGroup {
  type: GraphEdgeType;
  count: number;
  averageConfidence: number | null;
  connectedNodes: GraphNodeResponse[];
}

export function AssociationSummary({ personNode, edges, nodes, communityByLabel, onReFocusPerson }: AssociationSummaryProps) {
  const groups = useMemo(() => {
    if (!personNode) return [];
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const byType = new Map<GraphEdgeType, { confidences: number[]; otherIds: Set<string> }>();
    edges.forEach((edge) => {
      if (edge.sourceId !== personNode.id && edge.targetId !== personNode.id) return;
      const otherId = edge.sourceId === personNode.id ? edge.targetId : edge.sourceId;
      const bucket = byType.get(edge.type) ?? { confidences: [], otherIds: new Set() };
      if (edge.confidence != null) bucket.confidences.push(edge.confidence);
      bucket.otherIds.add(otherId);
      byType.set(edge.type, bucket);
    });
    const result: AssociationGroup[] = [];
    byType.forEach((bucket, type) => {
      const connectedNodes = Array.from(bucket.otherIds)
        .map((id) => nodesById.get(id))
        .filter((n): n is GraphNodeResponse => n != null);
      result.push({
        type,
        count: connectedNodes.length,
        averageConfidence: bucket.confidences.length > 0
          ? bucket.confidences.reduce((sum, c) => sum + c, 0) / bucket.confidences.length
          : null,
        connectedNodes,
      });
    });
    return result;
  }, [personNode, edges, nodes]);

  if (!personNode) return null;

  const communityId = communityByLabel.get(personNode.label);

  return (
    <section className="association-summary">
      <h4>Associations</h4>
      {communityId != null && <p className="association-community">Member of community {communityId}</p>}
      {groups.map((group) => {
        const style = edgeStyleFor(group.type);
        return (
          <div className="association-group" key={group.type}>
            <h5>
              {style.label} · {group.count}
              {group.averageConfidence != null && ` · avg ${Math.round(group.averageConfidence * 100)}%`}
            </h5>
            <div className="association-members">
              {group.connectedNodes.map((n) => (
                <button
                  key={n.id}
                  className="association-member"
                  onClick={() => n.type === 'PERSON' && onReFocusPerson(Number(n.id))}
                  disabled={n.type !== 'PERSON'}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
