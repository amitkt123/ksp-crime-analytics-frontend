import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface MeResponse {
  username: string;
  firstName: string;
  rank: string | null;
  unit: string | null;
  unitId: number | null;
  districtId: number | null;
  roles: string[];
}

export function getMe(token: string | null): Promise<MeResponse> {
  return apiFetch<MeResponse>('/api/me', {}, token);
}

export function useMe(token: string | null) {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => getMe(token),
    staleTime: 5 * 60_000,
    enabled: token != null,
  });
}
