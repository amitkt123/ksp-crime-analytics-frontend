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

  it('draws the confidence ring proportional to the confidence value', () => {
    render(<EvidencePanel data={sampleData} onClose={vi.fn()} />);

    const ring = document.querySelector('circle.confidence-arc');
    expect(ring).not.toBeNull();
    // sampleData.confidence is 0.81; circumference = 2*PI*24 ≈ 150.8,
    // dasharray's "filled" length should be ~81% of that (rounded to 1 decimal, so a
    // small floating-point tolerance is needed).
    const dasharray = ring!.getAttribute('stroke-dasharray');
    const [filled] = dasharray!.split(' ').map(Number);
    expect(filled).toBeCloseTo(2 * Math.PI * 24 * 0.81, 0);
  });
});
