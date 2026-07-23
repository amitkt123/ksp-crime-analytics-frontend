export const ROLE_DEFAULT_ROUTE: Record<string, string> = {
  INVESTIGATOR: '/case-explorer',
  STATION_SUPERVISOR: '/case-explorer',
  DISTRICT_SUPERVISOR: '/command-center',
  SCRB_ANALYST: '/command-center',
  POLICYMAKER: '/command-center',
  ADMIN: '/admin',
  SUPER_ADMIN: '/command-center',
};

export function defaultRouteForRoles(roles: string[]): string {
  for (const role of roles) {
    const route = ROLE_DEFAULT_ROUTE[role];
    if (route) return route;
  }
  return '/command-center';
}

// Single source of truth for route access, shared by ProtectedRoute (enforcement) and Rail
// (what to show) so the two can never drift out of sync with each other.
export const ROUTE_ALLOWED_ROLES: Record<string, string[]> = {
  '/command-center': ['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER'],
  '/insights': [
    'INVESTIGATOR', 'STATION_SUPERVISOR', 'DISTRICT_SUPERVISOR',
    'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN', 'SUPER_ADMIN',
  ],
  '/case-explorer': ['INVESTIGATOR', 'STATION_SUPERVISOR'],
  '/network': ['SCRB_ANALYST'],
  '/sociological': ['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER'],
  '/admin': ['ADMIN'],
};

export function canAccessRoute(roles: string[], path: string): boolean {
  if (roles.includes('SUPER_ADMIN')) return true;
  const allowed = ROUTE_ALLOWED_ROLES[path];
  if (!allowed) return true;
  return roles.some((role) => allowed.includes(role));
}
