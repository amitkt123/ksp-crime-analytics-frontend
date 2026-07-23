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
    expect(screen.getByRole('heading', { name: /crime analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /karnataka state police/i })).toBeInTheDocument();
  });

  it("renders the authenticated user's default screen at the root path", async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['ADMIN'], username: 'demo.admin', login: vi.fn(), logout: vi.fn(),
    });

    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Admin / Audit' })).toBeInTheDocument());
  });

  it('an SCRB_ANALYST can reach /network', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    window.history.pushState({}, '', '/network');

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Network / Link Analysis' })).toBeInTheDocument());
  });

  it('a DISTRICT_SUPERVISOR is redirected away from /network (real backend rejects them with 403)', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['DISTRICT_SUPERVISOR'], username: 'demo.district-supervisor', login: vi.fn(), logout: vi.fn(),
    });
    window.history.pushState({}, '', '/network');

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Command Center'));
  });

  it('a DISTRICT_SUPERVISOR can reach /sociological', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['DISTRICT_SUPERVISOR'], username: 'demo.district-supervisor', login: vi.fn(), logout: vi.fn(),
    });
    window.history.pushState({}, '', '/sociological');

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Sociological & Predictive' })).toBeInTheDocument(),
    );
  });

  it('an INVESTIGATOR hitting /insights is redirected to /overview (no role restriction on this route)', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['INVESTIGATOR'], username: 'demo.investigator', login: vi.fn(), logout: vi.fn(),
    });
    window.history.pushState({}, '', '/insights');

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument());
  });

  it('a POLICYMAKER hitting /insights is also redirected to /overview', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['POLICYMAKER'], username: 'demo.policymaker', login: vi.fn(), logout: vi.fn(),
    });
    window.history.pushState({}, '', '/insights');

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument());
  });

  it('an unauthenticated user hitting /insights is redirected to login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: null, roles: [], username: null, login: vi.fn(), logout: vi.fn(),
    });
    window.history.pushState({}, '', '/insights');

    render(<App />);

    expect(screen.getByRole('heading', { name: /crime analytics/i })).toBeInTheDocument();
  });
});
