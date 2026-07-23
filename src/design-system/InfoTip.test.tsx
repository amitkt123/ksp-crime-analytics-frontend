import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTip } from './InfoTip';

describe('InfoTip', () => {
  it('shows the explanation text when the info button is clicked, and hides it again on a second click', () => {
    render(<InfoTip label="Literacy rate" text="Higher literacy rates generally correlate with lower crime rates." />);
    expect(screen.queryByText(/Higher literacy rates/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('How to read Literacy rate'));
    expect(screen.getByText(/Higher literacy rates/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('How to read Literacy rate'));
    expect(screen.queryByText(/Higher literacy rates/)).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<InfoTip label="Literacy rate" text="Explanation text." />);
    fireEvent.click(screen.getByLabelText('How to read Literacy rate'));
    expect(screen.getByText('Explanation text.')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Explanation text.')).not.toBeInTheDocument();
  });
});
