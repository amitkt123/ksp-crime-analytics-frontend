import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { LoginScreen } from '../auth/LoginScreen';
import { ProtectedRoute } from './ProtectedRoute';
import { Rail } from './Rail';
import { CommandCenterScreen } from '../screens/command-center/CommandCenterScreen';
import { CaseExplorerScreen } from '../screens/case-explorer/CaseExplorerScreen';
import { CaseDetailScreen } from '../screens/case-explorer/CaseDetailScreen';
import { NetworkScreen } from '../screens/network/NetworkScreen';
import { SociologicalScreen } from '../screens/sociological/SociologicalScreen';
import { CrimeAnalyticsScreen } from '../screens/insights/CrimeAnalyticsScreen';
import { ROUTE_ALLOWED_ROLES } from '../auth/roleRouting';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/*" element={<AuthenticatedShell />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedShell() {
  return (
    <div className="shell">
      <Rail />
      <Routes>
        <Route path="/" element={<Navigate to="/command-center" replace />} />
        <Route
          path="/command-center"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/command-center']}>
              <CommandCenterScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/case-explorer"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/case-explorer']}>
              <CaseExplorerScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/case-explorer/:caseId"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/case-explorer']}>
              <CaseDetailScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/network']}>
              <NetworkScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sociological"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/sociological']}>
              <SociologicalScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crime-analytics"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/crime-analytics']}>
              <CrimeAnalyticsScreen />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
