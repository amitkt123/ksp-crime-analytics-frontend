import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface EmergingAlertResponse {
  unitId: number;
  unitName: string;
  crimeSubHeadId: number;
  crimeSubHeadName: string;
  currentWeekCount: number;
  baselineMean: number;
  zScore: number;
  explanation: string;
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
