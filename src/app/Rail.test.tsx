import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Rail } from './Rail';

describe('Rail', () => {
  it('renders all 6 screen links with the current one marked active', () => {
    render(
      <MemoryRouter initialEntries={['/case-explorer']}>
        <Rail />
      </MemoryRouter>,
    );

    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Case Explorer')).toBeInTheDocument();
    expect(screen.getByText('Network / Link Analysis')).toBeInTheDocument();
    expect(screen.getByText('Sociological & Predictive')).toBeInTheDocument();
    expect(screen.getByText('Admin / Audit')).toBeInTheDocument();

    const caseExplorerLink = screen.getByRole('link', { name: 'Case Explorer' });
    expect(caseExplorerLink).toHaveAttribute('aria-current', 'page');
  });
});
