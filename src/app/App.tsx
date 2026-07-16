import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { LoginScreen } from '../auth/LoginScreen';
import { ProtectedRoute } from './ProtectedRoute';
import { Rail } from './Rail';
import { ScreenPlaceholder } from './ScreenPlaceholder';

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
            <ProtectedRoute allowedRoles={['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER']}>
              <ScreenPlaceholder title="Command Center" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/case-explorer"
          element={
            <ProtectedRoute allowedRoles={['INVESTIGATOR', 'STATION_SUPERVISOR']}>
              <ScreenPlaceholder title="Case Explorer" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network"
          element={
            <ProtectedRoute allowedRoles={['DISTRICT_SUPERVISOR', 'SCRB_ANALYST']}>
              <ScreenPlaceholder title="Network / Link Analysis" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sociological"
          element={
            <ProtectedRoute allowedRoles={['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER']}>
              <ScreenPlaceholder title="Sociological & Predictive" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ScreenPlaceholder title="Admin / Audit" />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
