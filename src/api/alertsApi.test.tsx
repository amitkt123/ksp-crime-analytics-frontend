import { describe, it, expect, vi } from 'vitest';
import * as client from './client';
import { alertSeverity, getEmergingAlerts, type EmergingAlertResponse } from './alertsApi';

const sampleAlerts: EmergingAlertResponse[] = [
  {
    unitId: 102, unitName: 'Halasuru PS', districtId: 5, crimeSubHeadId: 5, crimeSubHeadName: 'Theft',
    currentWeekCount: 20, baselineMean: 4.2, zScore: 3.8,
    explanation: 'Current count 20 is 3.8 standard deviations above the trailing baseline mean 4.2',
  },
];

describe('getEmergingAlerts', () => {
  it('fetches /api/alerts/emerging with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleAlerts);
    const result = await getEmergingAlerts('test-token');
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/alerts/emerging', {}, 'test-token');
    expect(result).toEqual(sampleAlerts);
  });
});

describe('alertSeverity', () => {
  it('classifies z >= 3.5 as critical', () => {
    expect(alertSeverity(3.8)).toBe('critical');
    expect(alertSeverity(3.5)).toBe('critical');
  });

  it('classifies 2.5 <= z < 3.5 as high', () => {
    expect(alertSeverity(3.1)).toBe('high');
    expect(alertSeverity(2.5)).toBe('high');
  });

  it('classifies z < 2.5 as moderate', () => {
    expect(alertSeverity(2.4)).toBe('moderate');
    expect(alertSeverity(0)).toBe('moderate');
  });
});
