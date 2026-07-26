import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { defaultRouteForRoles, hasRouteAccess } from '../auth/roleRouting';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { token, roles } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRouteAccess(roles, allowedRoles)) {
    return <Navigate to={defaultRouteForRoles(roles)} replace />;
  }
  return <>{children}</>;
}