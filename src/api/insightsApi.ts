// Pure role-gating and derived-data helpers for the /insights screen. No fetch calls of its own
// -- screens call the existing hooks (useCases, useHotspots, useRepeatOffenders) directly and use
// these functions only to decide whether it's safe to enable the live one for the current role,
// per the corrections documented in docs/superpowers/plans/2026-07-23-insights-analytics-dashboard.md.

import type { RepeatOffenderResponse } from './networkApi';

// caseApi.getCases requires a single unitId and has no multi-unit/state-wide equivalent, so
// Recent FIRs can only be live for the two unit-scoped roles once /api/me has resolved a unitId.
export function canShowLiveRecentFirs(roles: string[], unitId: number | null): boolean {
  return unitId != null && (roles.includes('INVESTIGATOR') || roles.includes('STATION_SUPERVISOR'));
}

// GeoAnalyticsQueryService.hotspots() 403s UNIT/OWN_OR_UNIT scope callers.
const HOTSPOT_DENIED_ROLES = new Set(['INVESTIGATOR', 'STATION_SUPERVISOR']);

export function canShowLiveHotspots(roles: string[]): boolean {
  return !roles.some((role) => HOTSPOT_DENIED_ROLES.has(role));
}

// NetworkQueryService.requireFullNetworkAccess() requires STATE scope + rawCaseAccess=true --
// only SCRB_ANALYST and the SUPER_ADMIN demo bypass satisfy that.
export function canShowLiveRepeatOffenderData(roles: string[]): boolean {
  return roles.includes('SCRB_ANALYST') || roles.includes('SUPER_ADMIN');
}

export function deriveRepeatVsFirstTime(offenders: RepeatOffenderResponse[]): { firstTime: number; repeat: number } {
  let firstTime = 0;
  let repeat = 0;
  offenders.forEach((o) => {
    if (o.caseCount >= 2) repeat += 1;
    else firstTime += 1;
  });
  return { firstTime, repeat };
}
