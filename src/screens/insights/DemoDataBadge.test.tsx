import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemoDataBadge } from './DemoDataBadge';

describe('DemoDataBadge', () => {
  it('renders a "Demo data" chip', () => {
    render(<DemoDataBadge />);
    expect(screen.getByText('Demo data')).toBeInTheDocument();
  });
});
