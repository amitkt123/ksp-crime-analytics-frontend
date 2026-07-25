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
