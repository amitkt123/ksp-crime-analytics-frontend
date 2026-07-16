import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PiiField } from './PiiField';

describe('PiiField', () => {
  it('shows the masked value by default with a Reveal button', () => {
    render(<PiiField masked="V. *********" real="Venkatesh R. Gowda" />);
    expect(screen.getByText('V. *********')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal' })).toBeInTheDocument();
  });

  it('shows the real value after clicking Reveal, and re-masks on a second click', async () => {
    render(<PiiField masked="V. *********" real="Venkatesh R. Gowda" />);

    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(screen.getByText('Venkatesh R. Gowda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.getByText('V. *********')).toBeInTheDocument();
  });
});
