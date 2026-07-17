import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { KpiResponse, CategorySliceResponse } from './commandCenterApi';

export interface DistrictSummaryResponse {
  districtId: number;
  districtName: string;
  caseCount: number;
}

export interface StationSummaryResponse {
  unitId: number;
  unitName: string;
  caseCount: number;
}

export interface DistrictDetailResponse {
  kpi: KpiResponse;
  categoryMix: CategorySliceResponse[];
}

export interface DistrictBoundaryFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: { districtId: number; district: string };
    geometry: Record<string, unknown>;
  }>;
}

export function getDistrictSummaries(token: string | null): Promise<DistrictSummaryResponse[]> {
  return apiFetch<DistrictSummaryResponse[]>('/api/geo/districts', {}, token);
}

export function getDistrictBoundaries(token: string | null): Promise<DistrictBoundaryFeatureCollection> {
  return apiFetch<DistrictBoundaryFeatureCollection>('/api/geo/districts/boundaries', {}, token);
}

export function getStationSummaries(token: string | null, districtId: number): Promise<StationSummaryResponse[]> {
  return apiFetch<StationSummaryResponse[]>(`/api/geo/districts/${districtId}/stations`, {}, token);
}

export function getDistrictDetail(token: string | null, districtId: number): Promise<DistrictDetailResponse> {
  return apiFetch<DistrictDetailResponse>(`/api/geo/districts/${districtId}/summary`, {}, token);
}

export function useDistrictSummaries(token: string | null) {
  return useQuery({
    queryKey: ['geo-district-summaries'],
    queryFn: () => getDistrictSummaries(token),
    staleTime: 60_000,
    enabled: token != null,
  });
}

export function useDistrictBoundaries(token: string | null) {
  return useQuery({
    queryKey: ['geo-district-boundaries'],
    queryFn: () => getDistrictBoundaries(token),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}

export function useStationSummaries(token: string | null, districtId: number | null) {
  return useQuery({
    queryKey: ['geo-station-summaries', districtId],
    queryFn: () => getStationSummaries(token, districtId as number),
    staleTime: 60_000,
    enabled: token != null && districtId != null,
  });
}

export function useDistrictDetail(token: string | null, districtId: number | null) {
  return useQuery({
    queryKey: ['geo-district-detail', districtId],
    queryFn: () => getDistrictDetail(token, districtId as number),
    staleTime: 60_000,
    enabled: token != null && districtId != null,
  });
}
