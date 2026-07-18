import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export type CaseStatus = 'registered' | 'under_investigation' | 'closed';

export interface CaseSummaryResponse {
  caseId: number;
  caseNumber: string;
  unitId: number;
  unitName: string;
  crimeSubHeadId: number;
  crimeSubHeadName: string;
  status: CaseStatus;
  firDate: string;
}

export interface CasePartyResponse {
  role: 'victim' | 'accused';
  name: { masked: string; real: string };
  phone: { masked: string; real: string };
  address: { masked: string; real: string };
}

export interface CaseTimelineEntryResponse {
  status: CaseStatus;
  timestamp: string;
  note: string;
}

export interface CaseDetailResponse extends CaseSummaryResponse {
  narrative: string;
  parties: CasePartyResponse[];
  timeline: CaseTimelineEntryResponse[];
}

export interface CaseFilters {
  status?: CaseStatus;
  crimeSubHeadId?: number;
  q?: string;
}

const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  registered: 'Registered',
  under_investigation: 'Under Investigation',
  closed: 'Closed',
};

const CASE_STATUS_CHIP_CLASS: Record<CaseStatus, string> = {
  registered: 'status-neutral',
  under_investigation: 'status-warning',
  closed: 'status-good',
};

export function caseStatusLabel(status: CaseStatus): string {
  return CASE_STATUS_LABEL[status];
}

export function caseStatusChipClass(status: CaseStatus): string {
  return CASE_STATUS_CHIP_CLASS[status];
}

export function getCases(token: string | null, unitId: number, filters: CaseFilters): Promise<CaseSummaryResponse[]> {
  const params = new URLSearchParams({ unitId: String(unitId) });
  if (filters.status) params.set('status', filters.status);
  if (filters.crimeSubHeadId != null) params.set('crimeSubHeadId', String(filters.crimeSubHeadId));
  if (filters.q) params.set('q', filters.q);
  return apiFetch<CaseSummaryResponse[]>(`/api/cases?${params.toString()}`, {}, token);
}

export function getCaseDetail(token: string | null, caseId: number): Promise<CaseDetailResponse> {
  return apiFetch<CaseDetailResponse>(`/api/cases/${caseId}`, {}, token);
}

export function useCases(token: string | null, unitId: number | null, filters: CaseFilters) {
  return useQuery({
    queryKey: ['cases', unitId, filters],
    queryFn: () => getCases(token, unitId as number, filters),
    staleTime: 30_000,
    enabled: token != null && unitId != null,
  });
}

export function useCaseDetail(token: string | null, caseId: number | null) {
  return useQuery({
    queryKey: ['case-detail', caseId],
    queryFn: () => getCaseDetail(token, caseId as number),
    staleTime: 30_000,
    enabled: token != null && caseId != null,
  });
}
