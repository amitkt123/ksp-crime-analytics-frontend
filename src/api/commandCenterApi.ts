import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface KpiResponse {
  stateCaseCount: number;
  stateCaseCountDeltaPct: number;
  resolvedPct: number;
  resolvedPctDeltaPts: number;
  topCrimeSubHead: string;
  topCrimeSubHeadCount: number;
}

export interface SparklinePointResponse {
  isoYear: number;
  isoWeek: number;
  count: number;
}

export interface CategorySliceResponse {
  crimeHeadId: number;
  crimeGroupName: string;
  count: number;
}

export interface CommandCenterSummaryResponse {
  kpi: KpiResponse;
  stateCaseVolumeWeekly: SparklinePointResponse[];
  crimesAgainstPropertyWeekly: SparklinePointResponse[];
  arrestsWeekly: SparklinePointResponse[];
  categoryMix: CategorySliceResponse[];
}

export function getCommandCenterSummary(token: string | null): Promise<CommandCenterSummaryResponse> {
  return apiFetch<CommandCenterSummaryResponse>('/api/command-center/summary', {}, token);
}

export function useCommandCenterSummary(token: string | null) {
  return useQuery({
    queryKey: ['command-center-summary'],
    queryFn: () => getCommandCenterSummary(token),
    staleTime: 60_000,
    enabled: token != null,
  });
}
