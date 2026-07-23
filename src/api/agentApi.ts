import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface EvidenceObjectDto {
  claim: string;
  supportingRecordIds: string[];
  queryOrMethod: string;
  confidence: number;
  generatedAt: string;
  modelVersion: string;
}

export interface AgentExplainResponse {
  narrative: string | null;
  evidence: EvidenceObjectDto | null;
  agentAvailable: boolean;
}

export function getExplainTrendAlert(token: string | null, unitId: number, crimeSubHeadId: number): Promise<AgentExplainResponse> {
  return apiFetch<AgentExplainResponse>(
    `/api/agent/explain/trend-alert?unitId=${unitId}&crimeSubHeadId=${crimeSubHeadId}`, {}, token);
}

export function useExplainTrendAlert(token: string | null, unitId: number | null, crimeSubHeadId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['agent-explain-trend-alert', unitId, crimeSubHeadId],
    queryFn: () => getExplainTrendAlert(token, unitId as number, crimeSubHeadId as number),
    staleTime: 30_000,
    enabled: token != null && unitId != null && crimeSubHeadId != null && enabled,
  });
}

export function getExplainOffender(token: string | null, personId: number): Promise<AgentExplainResponse> {
  return apiFetch<AgentExplainResponse>(`/api/agent/explain/offender/${personId}`, {}, token);
}

export function useExplainOffender(token: string | null, personId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['agent-explain-offender', personId],
    queryFn: () => getExplainOffender(token, personId as number),
    staleTime: 30_000,
    enabled: token != null && personId != null && enabled,
  });
}

export function getExplainCorrelation(token: string | null, districtId: number, year: number): Promise<AgentExplainResponse> {
  return apiFetch<AgentExplainResponse>(
    `/api/agent/explain/correlation?districtId=${districtId}&year=${year}`, {}, token);
}

export function useExplainCorrelation(token: string | null, districtId: number | null, year: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['agent-explain-correlation', districtId, year],
    queryFn: () => getExplainCorrelation(token, districtId as number, year as number),
    staleTime: 30_000,
    enabled: token != null && districtId != null && year != null && enabled,
  });
}

export function getExplainRiskForecast(token: string | null, unitId: number, crimeSubHeadId: number): Promise<AgentExplainResponse> {
  return apiFetch<AgentExplainResponse>(
    `/api/agent/explain/risk-forecast?unitId=${unitId}&crimeSubHeadId=${crimeSubHeadId}`, {}, token);
}

export function useExplainRiskForecast(token: string | null, unitId: number | null, crimeSubHeadId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['agent-explain-risk-forecast', unitId, crimeSubHeadId],
    queryFn: () => getExplainRiskForecast(token, unitId as number, crimeSubHeadId as number),
    staleTime: 30_000,
    enabled: token != null && unitId != null && crimeSubHeadId != null && enabled,
  });
}

export function getExplainCaseAnomaly(token: string | null, caseMasterId: number, crimeSubHeadId: number): Promise<AgentExplainResponse> {
  return apiFetch<AgentExplainResponse>(
    `/api/agent/explain/case-anomaly/${caseMasterId}?crimeSubHeadId=${crimeSubHeadId}`, {}, token);
}

export function useExplainCaseAnomaly(token: string | null, caseMasterId: number | null, crimeSubHeadId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['agent-explain-case-anomaly', caseMasterId, crimeSubHeadId],
    queryFn: () => getExplainCaseAnomaly(token, caseMasterId as number, crimeSubHeadId as number),
    staleTime: 30_000,
    enabled: token != null && caseMasterId != null && crimeSubHeadId != null && enabled,
  });
}

export function toEvidenceData(response: AgentExplainResponse, baseline: string, records?: string[]) {
  if (!response.agentAvailable || !response.evidence || !response.narrative) return null;
  return {
    claim: response.narrative,
    confidence: response.evidence.confidence,
    confidenceLabel: response.evidence.confidence >= 0.8 ? 'High confidence' : response.evidence.confidence >= 0.5 ? 'Moderate confidence' : 'Low confidence',
    method: response.evidence.queryOrMethod,
    baseline,
    generatedAt: new Date(response.evidence.generatedAt).toLocaleString(),
    records: records ?? response.evidence.supportingRecordIds,
  };
}
