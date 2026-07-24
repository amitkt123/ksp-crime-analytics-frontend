import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export type CaseStatus = 'registered' | 'under_investigation' | 'closed';

export type CaseGravity = 'heinous' | 'serious' | 'minor';

export interface CaseSummaryResponse {
  caseId: number;
  caseNumber: string;
  unitId: number;
  unitName: string;
  crimeSubHeadId: number;
  crimeSubHeadName: string;
  status: CaseStatus;
  firDate: string;
  // Optional: not yet returned by the backend for every deployment. Render a
  // fallback when absent instead of assuming presence. See
  // docs/superpowers/specs/2026-07-18-case-explorer-extensions-design.md.
  crimeNumber?: string;
  station?: string;
  district?: string;
  gravity?: CaseGravity;
  location?: { lat: number; lng: number };
}

export type CasePartyRole = 'complainant' | 'victim' | 'accused';

export interface CasePartyResponse {
  role: CasePartyRole;
  name: { masked: string; real: string };
  phone: { masked: string; real: string };
  address: { masked: string; real: string };
}

export interface CaseTimelineEntryResponse {
  status: CaseStatus;
  timestamp: string;
  note: string;
}

export interface CaseArrestResponse {
  arrestDate: string;
  custodyStatus: string;
}

export interface CaseChargesheetResponse {
  filedDate: string;
  sectionsApplied: string;
  court: string;
}

export interface CaseDetailResponse extends CaseSummaryResponse {
  narrative: string;
  parties: CasePartyResponse[];
  timeline: CaseTimelineEntryResponse[];
  // Optional: see docs/superpowers/specs/2026-07-18-case-explorer-extensions-design.md.
  arrests?: CaseArrestResponse[];
  chargesheet?: CaseChargesheetResponse;
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

const CASE_GRAVITY_LABEL: Record<CaseGravity, string> = {
  heinous: 'Heinous',
  serious: 'Serious',
  minor: 'Minor',
};

export function gravityLabel(gravity: CaseGravity): string {
  return CASE_GRAVITY_LABEL[gravity];
}

export function gravityDotClass(gravity: CaseGravity): string {
  return `gravity-${gravity}`;
}

const CASE_PARTY_ROLE_LABEL: Record<CasePartyRole, string> = {
  complainant: 'Complainant',
  victim: 'Victim',
  accused: 'Accused',
};

export function partyRoleLabel(role: CasePartyRole): string {
  return CASE_PARTY_ROLE_LABEL[role];
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

