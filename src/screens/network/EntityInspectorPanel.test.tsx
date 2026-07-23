import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EntityInspectorPanel } from './EntityInspectorPanel';
import type { GraphNodeResponse } from '../../api/networkApi';

const caseNode: GraphNodeResponse = {
  id: '10', type: 'CASE', label: 'CR-100 / CASE-100', confidence: null,
  crimeNo: 'CR-100', caseNo: 'CASE-100', crimeRegisteredDate: '2026-06-01',
  gravityWeight: 1, moKeywordTags: ['knife', 'mask'],
  locationKey: null, latitude: null, longitude: null,
};

const locationNode: GraphNodeResponse = {
  id: '20', type: 'LOCATION', label: 'MG Road PS', confidence: null,
  crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null, moKeywordTags: null,
  locationKey: 'MG Road PS', latitude: 12.97, longitude: 77.59,
};

describe('EntityInspectorPanel', () => {
  it('renders nothing when node is null', () => {
    const { container } = render(<EntityInspectorPanel node={null} onClose={vi.fn()} onReFocus={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Case detail fields for a CASE node', () => {
    render(<EntityInspectorPanel node={caseNode} onClose={vi.fn()} onReFocus={vi.fn()} />);
    expect(screen.getByText('CR-100')).toBeInTheDocument();
    expect(screen.getByText('CASE-100')).toBeInTheDocument();
    expect(screen.getByText('knife')).toBeInTheDocument();
    expect(screen.getByText('mask')).toBeInTheDocument();
  });

  it('renders Location detail fields for a LOCATION node', () => {
    render(<EntityInspectorPanel node={locationNode} onClose={vi.fn()} onReFocus={vi.fn()} />);
    expect(screen.getByText('MG Road PS')).toBeInTheDocument();
    expect(screen.getByText(/12.97/)).toBeInTheDocument();
  });
});
