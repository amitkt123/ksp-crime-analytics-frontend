import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreenPlaceholder } from './ScreenPlaceholder';

describe('ScreenPlaceholder', () => {
  it('renders the given title and a not-yet-implemented message', () => {
    render(<ScreenPlaceholder title="Command Center" />);
    expect(screen.getByRole('heading', { name: 'Command Center' })).toBeInTheDocument();
    expect(screen.getByText(/implemented in a later plan/i)).toBeInTheDocument();
  });
});
