import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as AuthContextModule from '../auth/AuthContext';
import { Header } from './Header';

describe('Header', () => {
  it('renders the title, the logged-in user, and any filter children', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });

    render(
      <Header title="Command Center">
        <span>Date range filter</span>
      </Header>,
    );

    expect(screen.getByRole('heading', { name: 'Command Center' })).toBeInTheDocument();
    expect(screen.getByText('demo.analyst')).toBeInTheDocument();
    expect(screen.getByText('SCRB_ANALYST')).toBeInTheDocument();
    expect(screen.getByText('Date range filter')).toBeInTheDocument();
  });
});
