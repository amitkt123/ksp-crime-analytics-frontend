import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { LoginScreen } from '../auth/LoginScreen';
import { ROUTE_ALLOWED_ROLES } from '../auth/roleRouting';
import { ProtectedRoute } from './ProtectedRoute';
import { TopNavPills } from './TopNavPills';
import { Header } from './Header';
import { ScreenPlaceholder } from './ScreenPlaceholder';
import { CommandCenterScreen } from '../screens/command-center/CommandCenterScreen';
import { CaseExplorerScreen } from '../screens/case-explorer/CaseExplorerScreen';
import { CaseDetailScreen } from '../screens/case-explorer/CaseDetailScreen';
import { NetworkScreen } from '../screens/network/NetworkScreen';
import { SociologicalScreen } from '../screens/sociological/SociologicalScreen';
import { OverviewScreen } from '../screens/insights/OverviewScreen';
import { CrimeTrendsScreen } from '../screens/insights/CrimeTrendsScreen';
import { DemographicsScreen } from '../screens/insights/DemographicsScreen';
import { InvestigationNetworkScreen } from '../screens/insights/InvestigationNetworkScreen';
import { JudicialUnitsScreen } from '../screens/insights/JudicialUnitsScreen';

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
      <TopNavPills />
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
        <Route path="/insights" element={<Navigate to="/overview" replace />} />
        <Route
          path="/overview"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/overview']}>
              <OverviewScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crime-trends"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/crime-trends']}>
              <CrimeTrendsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/demographics"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/demographics']}>
              <DemographicsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investigation-network"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/investigation-network']}>
              <InvestigationNetworkScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/judicial-units"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/judicial-units']}>
              <JudicialUnitsScreen />
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
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/admin']}>
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
