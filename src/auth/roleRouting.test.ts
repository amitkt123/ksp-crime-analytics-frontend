import { describe, it, expect } from 'vitest';
import { defaultRouteForRoles } from './roleRouting';

describe('defaultRouteForRoles', () => {
  it('routes Investigator and Station Supervisor to Case Explorer', () => {
    expect(defaultRouteForRoles(['INVESTIGATOR'])).toBe('/case-explorer');
    expect(defaultRouteForRoles(['STATION_SUPERVISOR'])).toBe('/case-explorer');
    expect(defaultRouteForRoles(['SUPER_ADMIN'])).toBe('/case-explorer');
    expect(defaultRouteForRoles(['SCRB_ANALYST'])).toBe('/case-explorer');
  });

  it('routes District Supervisor, SCRB Analyst, and Policymaker to Command Center', () => {
    expect(defaultRouteForRoles(['DISTRICT_SUPERVISOR'])).toBe('/command-center');
    expect(defaultRouteForRoles(['SCRB_ANALYST'])).toBe('/command-center');
    expect(defaultRouteForRoles(['POLICYMAKER'])).toBe('/command-center');
    expect(defaultRouteForRoles(['SUPER_ADMIN'])).toBe('/command-center');
  });

  it('routes Admin to Command Center', () => {
    expect(defaultRouteForRoles(['ADMIN'])).toBe('/command-center');
  });

  it('routes Super Admin to Command Center', () => {
    expect(defaultRouteForRoles(['SUPER_ADMIN'])).toBe('/command-center');
    expect(defaultRouteForRoles(['STATION_SUPERVISOR'])).toBe('/case-explorer');
  });

  it('falls back to Command Center for an unrecognized or empty role list', () => {
    expect(defaultRouteForRoles([])).toBe('/command-center');
    expect(defaultRouteForRoles(['SOMETHING_UNKNOWN'])).toBe('/command-center');
  });
});
