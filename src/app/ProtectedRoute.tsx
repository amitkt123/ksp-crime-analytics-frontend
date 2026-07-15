import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { defaultRouteForRoles } from '../auth/roleRouting';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { token, roles } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  const isAllowed = roles.some((role) => allowedRoles.includes(role));
  if (!isAllowed) {
    return <Navigate to={defaultRouteForRoles(roles)} replace />;
  }
  return <>{children}</>;
}
