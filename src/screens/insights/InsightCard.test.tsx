import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { InsightCard } from './InsightCard';

describe('InsightCard', () => {
  it('renders the title and children, with no Demo data badge when live', () => {
    render(<InsightCard title="Top Districts" live><p>chart</p></InsightCard>);
    expect(screen.getByText('Top Districts')).toBeInTheDocument();
    expect(screen.getByText('chart')).toBeInTheDocument();
    expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
  });

  it('renders the Demo data badge and an optional note when not live', () => {
    render(
      <InsightCard title="Gravity of Offence" live={false} note="Representative data.">
        <p>chart</p>
      </InsightCard>,
    );
    expect(screen.getByText('Demo data')).toBeInTheDocument();
    expect(screen.getByText('Representative data.')).toBeInTheDocument();
  });

  it('shows an expand button that opens a lightbox with the chart and a data table, when `expand` is provided', () => {
    render(
      <InsightCard title="Gravity of Offence" live={false} expand={{ columns: ['Gravity', 'Count'], rows: [['Heinous', 100]] }}>
        <p>chart body</p>
      </InsightCard>,
    );
    expect(screen.queryByLabelText('Expand Gravity of Offence')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Expand Gravity of Offence'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('chart body')).toBeInTheDocument();
    expect(within(dialog).getByText('Heinous')).toBeInTheDocument();
  });

  it('shows no expand button when `expand` is omitted', () => {
    render(
      <InsightCard title="Top Districts" live>
        <p>chart</p>
      </InsightCard>,
    );
    expect(screen.queryByLabelText('Expand Top Districts')).not.toBeInTheDocument();
  });
});
