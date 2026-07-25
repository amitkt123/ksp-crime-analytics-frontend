import type { GraphEdgeType } from '../../api/networkApi';

export const ALL_EDGE_TYPES: GraphEdgeType[] = [
  'ACCUSED_IN', 'ARRESTED_BY', 'CO_ACCUSED_WITH', 'OCCURRED_AT', 'SHARES_MO_WITH', 'VICTIM_IN',
];

interface EdgeStyle {
  label: string;
  color: string;
  dash?: string;
}

// Direct-fact edges (asserted straight from source records) render solid;
// the two computed/inferred edge types get distinct dash patterns so they
// read as "derived" at a glance, matching the canvas's existing
// mo-shared-vs-not visual distinction but now covering all six types with a
// legend key (CommunityLegend's new "Relationship types" section).
const STYLES: Record<GraphEdgeType, EdgeStyle> = {
  ACCUSED_IN: { label: 'Accused in', color: 'var(--line)' },
  VICTIM_IN: { label: 'Victim in', color: 'var(--line)' },
  ARRESTED_BY: { label: 'Arrested by', color: 'var(--line)' },
  OCCURRED_AT: { label: 'Occurred at', color: 'var(--muted-2)' },
  CO_ACCUSED_WITH: { label: 'Co-accused with', color: 'var(--cat-2)', dash: '2,2' },
  SHARES_MO_WITH: { label: 'Shares MO with', color: 'var(--cat-4)', dash: '6,3' },
};

export function edgeStyleFor(type: GraphEdgeType): EdgeStyle {
  return STYLES[type];
}
