import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as AuthContextModule from './AuthContext';
import { LoginScreen } from './LoginScreen';

function renderLoginScreen() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/command-center" element={<div>Command Center Screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginScreen', () => {
  it('logs in and navigates to the role-appropriate screen on success', async () => {
    const login = vi.fn().mockResolvedValue({ token: 'jwt', roles: ['SCRB_ANALYST'] });
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: null, roles: [], username: null, login, logout: vi.fn(),
    });

    renderLoginScreen();
    await userEvent.type(screen.getByLabelText(/username/i), 'demo.analyst');
    await userEvent.type(screen.getByLabelText(/password/i), 'Demo@12345');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(login).toHaveBeenCalledWith('demo.analyst', 'Demo@12345');
    await waitFor(() => expect(screen.getByText('Command Center Screen')).toBeInTheDocument());
  });

  it('shows an error message and does not navigate on failed login', async () => {
    const login = vi.fn().mockRejectedValue(new Error('unauthorized'));
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: null, roles: [], username: null, login, logout: vi.fn(),
    });

    renderLoginScreen();
    await userEvent.type(screen.getByLabelText(/username/i), 'demo.analyst');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(screen.getByText(/incorrect username or password/i)).toBeInTheDocument());
    expect(screen.queryByText('Command Center Screen')).not.toBeInTheDocument();
  });
});
