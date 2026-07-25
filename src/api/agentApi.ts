import { useMutation, useQuery } from '@tanstack/react-query';
import type { CaseDetailResponse } from './caseApi';
import type { CaseAnomalyResponse, DistrictCorrelationResponse, PredictiveRiskForecastResponse } from './sociologicalApi';

const AGENT_SERVICE_BASE_URL = import.meta.env.VITE_AGENT_SERVICE_BASE_URL ?? 'http://localhost:8082';

export interface ExplainEvidence {
  claim: string;
  supportingRecordIds: string[];
  queryOrMethod: string;
  confidence: number;
  generatedAt: string;
  modelVersion: string;
}

export interface ExplainResponse {
  narrative: string;
  evidence: ExplainEvidence;
}

async function postExplain(body: Record<string, unknown>): Promise<ExplainResponse> {
  const response = await fetch(`${AGENT_SERVICE_BASE_URL}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Explain request failed with status ${response.status}`);
  return response.json() as Promise<ExplainResponse>;
}

export function explainCase(caseDetail: CaseDetailResponse): Promise<ExplainResponse> {
  return postExplain({
    requestType: 'EXPLAIN_CASE',
    caseMasterId: caseDetail.caseId,
    crimeNo: caseDetail.crimeNumber,
    caseNo: caseDetail.caseNumber,
    policeStationName: caseDetail.station ?? caseDetail.unitName,
    districtName: caseDetail.district,
    crimeMajorHeadName: undefined,
    crimeMinorHeadName: caseDetail.crimeSubHeadName,
    gravityOffenceName: caseDetail.gravity,
    caseStatusName: caseDetail.status,
    accusedCount: caseDetail.parties.filter((p) => p.role === 'accused').length,
    arrestCount: caseDetail.arrests?.length ?? 0,
    chargesheetCount: caseDetail.chargesheet ? 1 : 0,
  });
}

export function explainCorrelation(district: DistrictCorrelationResponse): Promise<ExplainResponse> {
  return postExplain({ requestType: 'EXPLAIN_CORRELATION', ...district });
}

export function explainRiskForecast(forecast: PredictiveRiskForecastResponse): Promise<ExplainResponse> {
  return postExplain({ requestType: 'EXPLAIN_RISK_FORECAST', ...forecast });
}

export function explainCaseAnomaly(anomaly: CaseAnomalyResponse): Promise<ExplainResponse> {
  return postExplain({ requestType: 'EXPLAIN_CASE_ANOMALY', ...anomaly });
}

export async function sendChatMessage(message: string): Promise<{ reply: string; model: string }> {
  const response = await fetch(`${AGENT_SERVICE_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error(`Chat request failed with status ${response.status}`);
  return response.json() as Promise<{ reply: string; model: string }>;
}

export function useExplainCase(caseDetail: CaseDetailResponse | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['explain-case', caseDetail?.caseId],
    queryFn: () => explainCase(caseDetail as CaseDetailResponse),
    enabled: enabled && caseDetail != null,
    staleTime: 5 * 60_000,
  });
}

export function useSendChatMessage() {
  return useMutation({ mutationFn: sendChatMessage });
}
