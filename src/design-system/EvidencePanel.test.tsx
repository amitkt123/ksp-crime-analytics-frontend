import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvidencePanel, type EvidenceData } from './EvidencePanel';

const sampleData: EvidenceData = {
  claim: 'Weekly theft count is significantly above baseline.',
  confidence: 0.81,
  confidenceLabel: 'Deviation confidence',
  method: 'Trend & Anomaly Engine · z-score',
  baseline: '12-week trailing mean',
  generatedAt: '2026-07-15 10:02 IST',
  records: ['FIR-2026-KA-04471', 'FIR-2026-KA-04483'],
};

describe('EvidencePanel', () => {
  it('renders nothing when data is null', () => {
    const { container } = render(<EvidencePanel data={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the claim, confidence, metadata, and records when data is provided', () => {
    render(<EvidencePanel data={sampleData} onClose={vi.fn()} />);

    expect(screen.getByText(sampleData.claim)).toBeInTheDocument();
    expect(screen.getByText('81%')).toBeInTheDocument();
    expect(screen.getByText(sampleData.method)).toBeInTheDocument();
    expect(screen.getByText('FIR-2026-KA-04471')).toBeInTheDocument();
    expect(screen.getByText('FIR-2026-KA-04483')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<EvidencePanel data={sampleData} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /close evidence panel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<EvidencePanel data={sampleData} onClose={onClose} />);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
