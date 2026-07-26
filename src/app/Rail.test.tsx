import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../auth/AuthContext';
import { Rail } from './Rail';

function mockRoles(roles: string[]) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt',
    roles,
    username: 'demo.user',
    login: vi.fn(),
    logout: vi.fn(),
  });
}

describe('Rail', () => {
  it('renders all screen links a District Supervisor can access, with the current one marked active', () => {
    mockRoles(['DISTRICT_SUPERVISOR']);

    render(
      <MemoryRouter initialEntries={['/command-center']}>
        <Rail />
      </MemoryRouter>,
    );

    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.getByText('Sociological & Predictive')).toBeInTheDocument();
    expect(screen.queryByText('Case Explorer')).not.toBeInTheDocument();
    expect(screen.queryByText('Network / Link Analysis')).not.toBeInTheDocument();
    expect(screen.queryByText('Crime Analytics')).not.toBeInTheDocument();

    const commandCenterLink = screen.getByRole('link', { name: 'Command Center' });
    expect(commandCenterLink).toHaveAttribute('aria-current', 'page');
  });

  it('shows only the routes an Investigator can access', () => {
    mockRoles(['INVESTIGATOR']);

    render(
      <MemoryRouter initialEntries={['/case-explorer']}>
        <Rail />
      </MemoryRouter>,
    );

    expect(screen.getByText('Case Explorer')).toBeInTheDocument();
    expect(screen.getByText('Network / Link Analysis')).toBeInTheDocument();
    expect(screen.queryByText('Command Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Sociological & Predictive')).not.toBeInTheDocument();
    expect(screen.queryByText('Crime Analytics')).not.toBeInTheDocument();
  });

  it('shows every route to a Super Admin', () => {
    mockRoles(['SUPER_ADMIN']);

    render(
      <MemoryRouter initialEntries={['/command-center']}>
        <Rail />
      </MemoryRouter>,
    );

    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.getByText('Case Explorer')).toBeInTheDocument();
    expect(screen.getByText('Network / Link Analysis')).toBeInTheDocument();
    expect(screen.getByText('Sociological & Predictive')).toBeInTheDocument();
    expect(screen.getByText('Crime Analytics')).toBeInTheDocument();
  });
});
