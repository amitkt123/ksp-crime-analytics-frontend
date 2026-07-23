import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssociationSummary } from './AssociationSummary';
import type { GraphNodeResponse, GraphEdgeResponse } from '../../api/networkApi';

const person = (id: string, label: string): GraphNodeResponse => ({
  id, type: 'PERSON', label, confidence: 0.9,
  crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null, moKeywordTags: null,
  locationKey: null, latitude: null, longitude: null,
});

describe('AssociationSummary', () => {
  it('groups edges touching the selected person by edge type with count and average confidence', () => {
    const alpha = person('1', 'Alpha');
    const beta = person('2', 'Beta');
    const gamma = person('3', 'Gamma');
    const edges: GraphEdgeResponse[] = [
      { id: 'e1', sourceId: '1', targetId: '2', type: 'CO_ACCUSED_WITH', confidence: null, sharedCaseLabel: 'CASE-1' },
      { id: 'e2', sourceId: '1', targetId: '3', type: 'SHARES_MO_WITH', confidence: 0.6, sharedCaseLabel: 'CASE-2 / CASE-3' },
      { id: 'e3', sourceId: '3', targetId: '1', type: 'SHARES_MO_WITH', confidence: 0.8, sharedCaseLabel: 'CASE-4 / CASE-5' },
    ];
    render(
      <AssociationSummary
        personNode={alpha}
        edges={edges}
        nodes={[alpha, beta, gamma]}
        communityByLabel={new Map()}
        onReFocusPerson={vi.fn()}
      />,
    );

    expect(screen.getByText(/Co-accused with/)).toBeInTheDocument();
    expect(screen.getByText(/Shares MO with/)).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('renders nothing when personNode is null', () => {
    const { container } = render(
      <AssociationSummary personNode={null} edges={[]} nodes={[]} communityByLabel={new Map()} onReFocusPerson={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
