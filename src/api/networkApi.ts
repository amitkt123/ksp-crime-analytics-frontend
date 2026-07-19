import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from './client';

export type GraphNodeType = 'PERSON' | 'CASE' | 'LOCATION';
export type GraphEdgeType = 'ACCUSED_IN' | 'VICTIM_IN' | 'ARRESTED_BY' | 'OCCURRED_AT' | 'CO_ACCUSED_WITH' | 'SHARES_MO_WITH';
export type SubgraphFocus = 'top-offenders' | 'person' | 'community' | 'path';

export interface GraphNodeResponse {
  id: string;
  type: GraphNodeType;
  label: string;
  confidence: number | null;
}

export interface GraphEdgeResponse {
  id: string;
  sourceId: string;
  targetId: string;
  type: GraphEdgeType;
  confidence: number | null;
}

export interface SubgraphResponse {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
  generatedAt: string;
}

export interface SubgraphParams {
  focus: SubgraphFocus;
  limit?: number;
  personId?: number;
  hops?: number;
  communityId?: number;
  from?: number;
  to?: number;
  maxHops?: number;
}

export interface RepeatOffenderResponse {
  personId: number;
  displayName: string;
  caseCount: number;
  gravityWeight: number;
  confidenceScore: number;
}

export interface CommunityResponse {
  communityId: number;
  size: number;
  memberDisplayNames: string[];
}

export interface NetworkPathResponse {
  personIds: number[];
  displayNames: string[];
  hopCount: number;
}

// A subgraph node's id is the string form of the same Neo4j internal id that
// personId/from/to/communityId carry as numbers elsewhere in this contract
// (RepeatOffenderResponse.personId, /path's from/to, /subgraph's personId
// param). This is the one place that conversion happens -- never compare a
// raw node.id string to a personId number anywhere else.
export function personIdOfNode(node: Pick<GraphNodeResponse, 'id'>): number {
  return Number(node.id);
}

export function subgraphQueryString(params: SubgraphParams): string {
  const query = new URLSearchParams({ focus: params.focus });
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.personId != null) query.set('personId', String(params.personId));
  if (params.hops != null) query.set('hops', String(params.hops));
  if (params.communityId != null) query.set('communityId', String(params.communityId));
  if (params.from != null) query.set('from', String(params.from));
  if (params.to != null) query.set('to', String(params.to));
  if (params.maxHops != null) query.set('maxHops', String(params.maxHops));
  return query.toString();
}

export function getSubgraph(token: string | null, params: SubgraphParams): Promise<SubgraphResponse> {
  return apiFetch<SubgraphResponse>(`/api/network/subgraph?${subgraphQueryString(params)}`, {}, token);
}

export function useSubgraph(token: string | null, params: SubgraphParams | null) {
  return useQuery({
    queryKey: ['network-subgraph', params],
    queryFn: () => getSubgraph(token, params as SubgraphParams),
    staleTime: 5 * 60_000,
    enabled: token != null && params != null,
  });
}

export function getRepeatOffenders(token: string | null, minCases = 2, limit = 10): Promise<RepeatOffenderResponse[]> {
  const query = new URLSearchParams({ minCases: String(minCases), limit: String(limit) });
  return apiFetch<RepeatOffenderResponse[]>(`/api/network/repeat-offenders?${query.toString()}`, {}, token);
}

export function useRepeatOffenders(token: string | null, minCases = 2, limit = 10) {
  return useQuery({
    queryKey: ['network-repeat-offenders', minCases, limit],
    queryFn: () => getRepeatOffenders(token, minCases, limit),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}

export function getCommunities(token: string | null, minSize = 3): Promise<CommunityResponse[]> {
  const query = new URLSearchParams({ minSize: String(minSize) });
  return apiFetch<CommunityResponse[]>(`/api/network/communities?${query.toString()}`, {}, token);
}

export function useCommunities(token: string | null, minSize = 3) {
  return useQuery({
    queryKey: ['network-communities', minSize],
    queryFn: () => getCommunities(token, minSize),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}

export async function getNetworkPath(
  token: string | null,
  from: number,
  to: number,
  maxHops = 6,
): Promise<NetworkPathResponse | null> {
  const query = new URLSearchParams({ from: String(from), to: String(to), maxHops: String(maxHops) });
  try {
    const result = await apiFetch<NetworkPathResponse | null>(`/api/network/path?${query.toString()}`, {}, token);
    return result ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function useNetworkPath(token: string | null, from: number | null, to: number | null, maxHops = 6) {
  return useQuery({
    queryKey: ['network-path', from, to, maxHops],
    queryFn: () => getNetworkPath(token, from as number, to as number, maxHops),
    staleTime: 5 * 60_000,
    enabled: token != null && from != null && to != null,
  });
}
