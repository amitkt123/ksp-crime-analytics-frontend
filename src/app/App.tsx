import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { LoginScreen } from '../auth/LoginScreen';
import { ProtectedRoute } from './ProtectedRoute';
import { Rail } from './Rail';
import { Header } from './Header';
import { ScreenPlaceholder } from './ScreenPlaceholder';
import { CommandCenterScreen } from '../screens/command-center/CommandCenterScreen';
import { CaseExplorerScreen } from '../screens/case-explorer/CaseExplorerScreen';
import { CaseDetailScreen } from '../screens/case-explorer/CaseDetailScreen';
import { NetworkScreen } from '../screens/network/NetworkScreen';
import { SociologicalScreen } from '../screens/sociological/SociologicalScreen';
import { InsightsScreen } from '../screens/insights/InsightsScreen';

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
              <CommandCenterScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute
              allowedRoles={[
                'INVESTIGATOR', 'STATION_SUPERVISOR', 'DISTRICT_SUPERVISOR',
                'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN', 'SUPER_ADMIN',
              ]}
            >
              <InsightsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/case-explorer"
          element={
            <ProtectedRoute allowedRoles={['INVESTIGATOR', 'STATION_SUPERVISOR']}>
              <CaseExplorerScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/case-explorer/:caseId"
          element={
            <ProtectedRoute allowedRoles={['INVESTIGATOR', 'STATION_SUPERVISOR']}>
              <CaseDetailScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network"
          element={
            <ProtectedRoute allowedRoles={['SCRB_ANALYST']}>
              <NetworkScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sociological"
          element={
            <ProtectedRoute allowedRoles={['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER']}>
              <SociologicalScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <>
                <Header title="Admin / Audit" />
                <ScreenPlaceholder title="Admin / Audit" />
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
