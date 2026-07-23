import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartLightbox } from './ChartLightbox';

describe('ChartLightbox', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ChartLightbox open={false} title="Gravity of Offence" columns={['Gravity', 'Count']} rows={[['Heinous', 100]]} onClose={vi.fn()}>
        <p>chart</p>
      </ChartLightbox>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the chart, a data table, and closes on button click', () => {
    const onClose = vi.fn();
    render(
      <ChartLightbox open title="Gravity of Offence" columns={['Gravity', 'Count']} rows={[['Heinous', 100], ['Non-Heinous', 400]]} onClose={onClose}>
        <p>chart content</p>
      </ChartLightbox>,
    );
    expect(screen.getByText('chart content')).toBeInTheDocument();
    expect(screen.getByText('Heinous')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close expanded chart'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <ChartLightbox open title="Gravity of Offence" columns={['Gravity', 'Count']} rows={[]} onClose={onClose}>
        <p>chart</p>
      </ChartLightbox>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('applies the side-by-side layout class when layout="side"', () => {
    const { container } = render(
      <ChartLightbox open title="Chord" columns={['A', 'B']} rows={[]} onClose={vi.fn()} layout="side">
        <p>chart</p>
      </ChartLightbox>,
    );
    expect(container.querySelector('.chart-lightbox')).toHaveClass('layout-side');
  });

  it('defaults to the stacked layout when layout is omitted', () => {
    const { container } = render(
      <ChartLightbox open title="Chart" columns={['A']} rows={[]} onClose={vi.fn()}>
        <p>chart</p>
      </ChartLightbox>,
    );
    expect(container.querySelector('.chart-lightbox')).not.toHaveClass('layout-side');
  });
});
