export const ROLE_DEFAULT_ROUTE: Record<string, string> = {
  INVESTIGATOR: '/case-explorer',
  STATION_SUPERVISOR: '/case-explorer',
  DISTRICT_SUPERVISOR: '/command-center',
  SCRB_ANALYST: '/command-center',
  POLICYMAKER: '/command-center',
  ADMIN: '/command-center',
  SUPER_ADMIN: '/command-center',
};

export function defaultRouteForRoles(roles: string[]): string {
  for (const role of roles) {
    const route = ROLE_DEFAULT_ROUTE[role];
    if (route) return route;
  }
  return '/command-center';
}

export const ROUTE_ALLOWED_ROLES: Record<string, string[]> = {
  '/command-center': ['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN'],
  '/case-explorer': ['INVESTIGATOR', 'STATION_SUPERVISOR'],
  '/network': ['SCRB_ANALYST', 'INVESTIGATOR', 'STATION_SUPERVISOR'],
  '/sociological': ['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER'],
  '/crime-analytics': ['SCRB_ANALYST', 'POLICYMAKER', 'ADMIN'],
};

export function hasRouteAccess(roles: string[], allowedRoles: string[]): boolean {
  return roles.some((role) => role.toUpperCase() === 'SUPER_ADMIN') || roles.some((role) => allowedRoles.includes(role));
}
