import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../auth/AuthContext';
import { TopNavPills } from './TopNavPills';

function mockAuth(roles: string[]) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles, username: 'demo', login: vi.fn(), logout: vi.fn(),
  });
}

const ALL_LABELS = [
  'Command Center', 'Overview', 'Crime Trends', 'Demographics', 'Investigation Network',
  'Judicial & Units', 'Case Explorer', 'Network / Link Analysis', 'Sociological & Predictive', 'Admin / Audit',
];

describe('TopNavPills', () => {
  it('renders all 10 pills with the current one marked active, for a SUPER_ADMIN', () => {
    mockAuth(['SUPER_ADMIN']);
    render(
      <MemoryRouter initialEntries={['/case-explorer']}>
        <TopNavPills />
      </MemoryRouter>,
    );
    ALL_LABELS.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Case Explorer' })).toHaveAttribute('aria-current', 'page');
  });

  it('only shows pills an INVESTIGATOR can actually open', () => {
    mockAuth(['INVESTIGATOR']);
    render(
      <MemoryRouter>
        <TopNavPills />
      </MemoryRouter>,
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Case Explorer')).toBeInTheDocument();
    expect(screen.queryByText('Command Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin / Audit')).not.toBeInTheDocument();
  });
});
