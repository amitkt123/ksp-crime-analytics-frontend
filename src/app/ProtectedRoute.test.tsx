import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as AuthContextModule from '../auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/command-center" element={<div>Command Center Screen</div>} />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <div>Admin Screen</div>
          </ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no token', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: null, roles: [], username: null, login: vi.fn(), logout: vi.fn(),
    });

    renderAt('/admin');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it("redirects to the caller's own default route when the role is not allowed", () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });

    renderAt('/admin');
    expect(screen.getByText('Command Center Screen')).toBeInTheDocument();
  });

  it('renders the children when the role is allowed', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['ADMIN'], username: 'demo.admin', login: vi.fn(), logout: vi.fn(),
    });

    renderAt('/admin');
    expect(screen.getByText('Admin Screen')).toBeInTheDocument();
  });
});
