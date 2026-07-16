import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as AuthContextModule from '../auth/AuthContext';
import { App } from './App';

describe('App', () => {
  it('redirects to the login screen when there is no token', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: null, roles: [], username: null, login: vi.fn(), logout: vi.fn(),
    });

    render(<App />);
    expect(screen.getByRole('heading', { name: /ksp crime analytics/i })).toBeInTheDocument();
  });

  it("renders the authenticated user's default screen at the root path", async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['ADMIN'], username: 'demo.admin', login: vi.fn(), logout: vi.fn(),
    });

    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Admin / Audit' })).toBeInTheDocument());
  });
});
