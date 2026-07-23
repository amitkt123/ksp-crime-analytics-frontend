import { describe, it, expect } from 'vitest';
import {
  canShowLiveRecentFirs,
  canShowLiveHotspots,
  canShowLiveRepeatOffenderData,
  deriveRepeatVsFirstTime,
} from './insightsApi';
import type { RepeatOffenderResponse } from './networkApi';

describe('canShowLiveRecentFirs', () => {
  it('is true only for INVESTIGATOR/STATION_SUPERVISOR with a resolved unitId', () => {
    expect(canShowLiveRecentFirs(['INVESTIGATOR'], 12)).toBe(true);
    expect(canShowLiveRecentFirs(['STATION_SUPERVISOR'], 12)).toBe(true);
    expect(canShowLiveRecentFirs(['INVESTIGATOR'], null)).toBe(false);
    expect(canShowLiveRecentFirs(['DISTRICT_SUPERVISOR'], 12)).toBe(false);
    expect(canShowLiveRecentFirs(['SCRB_ANALYST'], 12)).toBe(false);
  });
});

describe('canShowLiveHotspots', () => {
  it('is false for the two UNIT/OWN_OR_UNIT-scoped roles, true for the rest', () => {
    expect(canShowLiveHotspots(['INVESTIGATOR'])).toBe(false);
    expect(canShowLiveHotspots(['STATION_SUPERVISOR'])).toBe(false);
    expect(canShowLiveHotspots(['DISTRICT_SUPERVISOR'])).toBe(true);
    expect(canShowLiveHotspots(['SCRB_ANALYST'])).toBe(true);
    expect(canShowLiveHotspots(['POLICYMAKER'])).toBe(true);
    expect(canShowLiveHotspots(['ADMIN'])).toBe(true);
    expect(canShowLiveHotspots(['SUPER_ADMIN'])).toBe(true);
  });
});

describe('canShowLiveRepeatOffenderData', () => {
  it('is true only for SCRB_ANALYST or SUPER_ADMIN', () => {
    expect(canShowLiveRepeatOffenderData(['SCRB_ANALYST'])).toBe(true);
    expect(canShowLiveRepeatOffenderData(['SUPER_ADMIN'])).toBe(true);
    expect(canShowLiveRepeatOffenderData(['DISTRICT_SUPERVISOR'])).toBe(false);
    expect(canShowLiveRepeatOffenderData(['POLICYMAKER'])).toBe(false);
    expect(canShowLiveRepeatOffenderData(['INVESTIGATOR'])).toBe(false);
  });
});

describe('deriveRepeatVsFirstTime', () => {
  it('splits offenders into first-time (caseCount===1) and repeat (caseCount>=2)', () => {
    const offenders: RepeatOffenderResponse[] = [
      { personId: 1, displayName: 'A', caseCount: 1, gravityWeight: 1, confidenceScore: 0.9 },
      { personId: 2, displayName: 'B', caseCount: 1, gravityWeight: 1, confidenceScore: 0.9 },
      { personId: 3, displayName: 'C', caseCount: 3, gravityWeight: 1, confidenceScore: 0.9 },
    ];
    expect(deriveRepeatVsFirstTime(offenders)).toEqual({ firstTime: 2, repeat: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(deriveRepeatVsFirstTime([])).toEqual({ firstTime: 0, repeat: 0 });
  });
});
