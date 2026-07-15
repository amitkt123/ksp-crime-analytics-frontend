import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, ApiError } from './client';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('attaches a Bearer authorization header when a token is provided', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    });

    await apiFetch('/api/example', {}, 'test-token');

    const [, options] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((options.headers as Headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('omits the authorization header when no token is provided', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await apiFetch('/api/example');

    const [, options] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((options.headers as Headers).has('Authorization')).toBe(false);
  });

  it('throws ApiError with the response status when the response is not ok', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    });

    await expect(apiFetch('/api/example')).rejects.toThrow(ApiError);
  });

  it('resolves with the parsed JSON body on success', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    });

    const result = await apiFetch<{ hello: string }>('/api/example');
    expect(result).toEqual({ hello: 'world' });
  });
});
