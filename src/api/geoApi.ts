import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { KpiResponse, CategorySliceResponse, SparklinePointResponse } from './commandCenterApi';

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
  caseVolumeWeekly: SparklinePointResponse[];
  arrestsWeekly: SparklinePointResponse[];
}

export interface DistrictBoundaryFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: { districtId: number; district: string };
    geometry: Record<string, unknown>;
  }>;
}

export interface StationBoundaryFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: { unitId: number; unitName: string };
    geometry: Record<string, unknown>;
  }>;
}

export type TimeOfDayBucketKey = 'night' | 'morning' | 'afternoon' | 'evening';

export interface TimeOfDayBucket {
  bucket: TimeOfDayBucketKey;
  label: string;
  districtCaseCounts: Record<number, number>;
}

export interface DistrictTimeOfDayResponse {
  buckets: TimeOfDayBucket[];
}

export interface StationIncidentPointResponse {
  caseMasterId: number;
  crimeNo: string;
  latitude: number;
  longitude: number;
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

export function getStationBoundaries(token: string | null, districtId: number): Promise<StationBoundaryFeatureCollection> {
  return apiFetch<StationBoundaryFeatureCollection>(`/api/geo/districts/${districtId}/stations/boundaries`, {}, token);
}

export function getDistrictDetail(token: string | null, districtId: number): Promise<DistrictDetailResponse> {
  return apiFetch<DistrictDetailResponse>(`/api/geo/districts/${districtId}/summary`, {}, token);
}

export function getDistrictTimeOfDay(token: string | null): Promise<DistrictTimeOfDayResponse> {
  return apiFetch<DistrictTimeOfDayResponse>('/api/geo/districts/time-of-day', {}, token);
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

export function useStationBoundaries(token: string | null, districtId: number | null) {
  return useQuery({
    queryKey: ['geo-station-boundaries', districtId],
    queryFn: () => getStationBoundaries(token, districtId as number),
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

export function useDistrictTimeOfDay(token: string | null) {
  return useQuery({
    queryKey: ['geo-district-time-of-day'],
    queryFn: () => getDistrictTimeOfDay(token),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}

export function getStationIncidents(token: string | null, unitId: number): Promise<StationIncidentPointResponse[]> {
  return apiFetch<StationIncidentPointResponse[]>(`/api/geo/stations/${unitId}/incidents`, {}, token);
}

export function useStationIncidents(token: string | null, unitId: number | null) {
  return useQuery({
    queryKey: ['geo-station-incidents', unitId],
    queryFn: () => getStationIncidents(token, unitId as number),
    staleTime: 60_000,
    enabled: token != null && unitId != null,
  });
}
