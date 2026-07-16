import { describe, it, expect, vi } from 'vitest';
import * as client from './client';
import { getEmergingAlerts, type EmergingAlertResponse } from './alertsApi';

const sampleAlerts: EmergingAlertResponse[] = [
  {
    unitId: 102, unitName: 'Halasuru PS', crimeSubHeadId: 5, crimeSubHeadName: 'Theft',
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
