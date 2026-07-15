import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as authApi from './authApi';
import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const { token, roles, username, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="token">{token ?? 'none'}</div>
      <div data-testid="roles">{roles.join(',')}</div>
      <div data-testid="username">{username ?? 'none'}</div>
      <button onClick={() => login('demo.analyst', 'Demo@12345')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts with no token and updates state after a successful login', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ token: 'jwt-token', roles: ['SCRB_ANALYST'] });
    render(<AuthProvider><TestConsumer /></AuthProvider>);

    expect(screen.getByTestId('token')).toHaveTextContent('none');

    await userEvent.click(screen.getByText('Login'));

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('jwt-token'));
    expect(screen.getByTestId('roles')).toHaveTextContent('SCRB_ANALYST');
    expect(screen.getByTestId('username')).toHaveTextContent('demo.analyst');
    expect(sessionStorage.getItem('ksp-auth')).toContain('jwt-token');
  });

  it('clears state and storage on logout', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ token: 'jwt-token', roles: ['ADMIN'] });
    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await userEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('jwt-token'));

    await userEvent.click(screen.getByText('Logout'));

    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(sessionStorage.getItem('ksp-auth')).toBeNull();
  });
});
