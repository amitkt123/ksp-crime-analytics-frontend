import { describe, it, expect, vi } from 'vitest';
import * as client from '../api/client';
import { login } from './authApi';

describe('login', () => {
  it('posts credentials to /api/auth/login and returns the parsed response', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      token: 'jwt-token',
      roles: ['SCRB_ANALYST'],
    });

    const result = await login('demo.analyst', 'Demo@12345');

    expect(apiFetchSpy).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.analyst', password: 'Demo@12345' }),
    });
    expect(result).toEqual({ token: 'jwt-token', roles: ['SCRB_ANALYST'] });
  });
});
