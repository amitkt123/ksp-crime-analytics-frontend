import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../auth/AuthContext';
import { Rail } from './Rail';

function mockAuth(roles: string[]) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles, username: 'demo', login: vi.fn(), logout: vi.fn(),
  });
}

const ALL_LABELS = [
  'Command Center', 'Overview', 'Crime Trends', 'Demographics', 'Investigation Network',
  'Judicial & Units', 'Case Explorer', 'Network / Link Analysis', 'Sociological & Predictive', 'Admin / Audit',
];

describe('Rail', () => {
  it('renders all 10 screen links with the current one marked active, for a SUPER_ADMIN', () => {
    mockAuth(['SUPER_ADMIN']);
    render(
      <MemoryRouter initialEntries={['/case-explorer']}>
        <Rail />
      </MemoryRouter>,
    );

    ALL_LABELS.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    const caseExplorerLink = screen.getByRole('link', { name: 'Case Explorer' });
    expect(caseExplorerLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders every visible nav item with both an icon and visible label text', () => {
    mockAuth(['SUPER_ADMIN']);
    render(
      <MemoryRouter>
        <Rail />
      </MemoryRouter>,
    );
    ALL_LABELS.forEach((label) => {
      const link = screen.getByText(label).closest('a')!;
      expect(link).toBeInTheDocument();
      expect(link.querySelector('svg')).not.toBeNull();
    });
  });

  it('only shows links an INVESTIGATOR can actually open (the 5 insights pages + Case Explorer)', () => {
    mockAuth(['INVESTIGATOR']);
    render(
      <MemoryRouter>
        <Rail />
      </MemoryRouter>,
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Crime Trends')).toBeInTheDocument();
    expect(screen.getByText('Demographics')).toBeInTheDocument();
    expect(screen.getByText('Investigation Network')).toBeInTheDocument();
    expect(screen.getByText('Judicial & Units')).toBeInTheDocument();
    expect(screen.getByText('Case Explorer')).toBeInTheDocument();
    expect(screen.queryByText('Command Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Network / Link Analysis')).not.toBeInTheDocument();
    expect(screen.queryByText('Sociological & Predictive')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin / Audit')).not.toBeInTheDocument();
  });

  it('only shows Admin / Audit (plus the 5 insights pages) for an ADMIN', () => {
    mockAuth(['ADMIN']);
    render(
      <MemoryRouter>
        <Rail />
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin / Audit')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.queryByText('Command Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Case Explorer')).not.toBeInTheDocument();
    expect(screen.queryByText('Network / Link Analysis')).not.toBeInTheDocument();
  });
});
