import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface DistrictCorrelationResponse {
  districtId: number;
  districtName: string;
  caseCount: number;
  population: number;
  literacyRate: number;
  unemploymentRate: number;
  urbanizationRate: number;
  perCapitaIncome: number;
}

export interface PredictiveRiskForecastResponse {
  unitId: number;
  unitName: string;
  districtId: number;
  crimeSubHeadId: number;
  crimeSubHeadName: string;
  predictedCount: number;
  backtestActualCount: number;
  backtestPredictedCount: number;
  backtestAbsoluteError: number;
}

export interface CaseAnomalyResponse {
  caseMasterId: number;
  crimeNo: string;
  registrationDelayDays: number;
  baselineMeanDelayDays: number;
  zScore: number;
  explanation: string;
}

export function getDistrictCorrelation(token: string | null, year?: number): Promise<DistrictCorrelationResponse[]> {
  const query = new URLSearchParams();
  if (year != null) query.set('year', String(year));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<DistrictCorrelationResponse[]>(`/api/sociological/correlation${suffix}`, {}, token);
}

export function useDistrictCorrelation(token: string | null, year?: number) {
  return useQuery({
    queryKey: ['sociological-correlation', year],
    queryFn: () => getDistrictCorrelation(token, year),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}

export function getPredictiveRisk(token: string | null, crimeSubHeadId?: number): Promise<PredictiveRiskForecastResponse[]> {
  const query = new URLSearchParams();
  if (crimeSubHeadId != null) query.set('crimeSubHeadId', String(crimeSubHeadId));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<PredictiveRiskForecastResponse[]>(`/api/sociological/predictive-risk${suffix}`, {}, token);
}

export function usePredictiveRisk(token: string | null, crimeSubHeadId?: number) {
  return useQuery({
    queryKey: ['sociological-predictive-risk', crimeSubHeadId],
    queryFn: () => getPredictiveRisk(token, crimeSubHeadId),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}

export function getCaseAnomalies(token: string | null, crimeSubHeadId?: number): Promise<CaseAnomalyResponse[]> {
  const query = new URLSearchParams();
  if (crimeSubHeadId != null) query.set('crimeSubHeadId', String(crimeSubHeadId));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<CaseAnomalyResponse[]>(`/api/sociological/case-anomalies${suffix}`, {}, token);
}

export function useCaseAnomalies(token: string | null, crimeSubHeadId?: number) {
  return useQuery({
    queryKey: ['sociological-case-anomalies', crimeSubHeadId],
    queryFn: () => getCaseAnomalies(token, crimeSubHeadId),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}
