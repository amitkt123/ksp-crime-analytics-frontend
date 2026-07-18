import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface EmergingAlertResponse {
  unitId: number;
  unitName: string;
  districtId: number;
  crimeSubHeadId: number;
  crimeSubHeadName: string;
  currentWeekCount: number;
  baselineMean: number;
  zScore: number;
  explanation: string;
}

export type AlertSeverity = 'critical' | 'high' | 'moderate';

// Thresholds mirror the Trend & Anomaly Engine's own bands (documented in
// EvidencePanel's "Deviation confidence" ring, which caps at zScore 5) so the
// red-zone pulsing on the feed and the map agree with the confidence ring.
export function alertSeverity(zScore: number): AlertSeverity {
  if (zScore >= 3.5) return 'critical';
  if (zScore >= 2.5) return 'high';
  return 'moderate';
}

export function getEmergingAlerts(token: string | null): Promise<EmergingAlertResponse[]> {
  return apiFetch<EmergingAlertResponse[]>('/api/alerts/emerging', {}, token);
}

export function useEmergingAlerts(token: string | null) {
  return useQuery({
    queryKey: ['emerging-alerts'],
    queryFn: () => getEmergingAlerts(token),
    staleTime: 60_000,
    enabled: token != null,
  });
}
