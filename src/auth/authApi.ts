import { apiFetch } from '../api/client';

export interface LoginResponse {
  token: string;
  roles: string[];
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
