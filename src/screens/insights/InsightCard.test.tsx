import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
