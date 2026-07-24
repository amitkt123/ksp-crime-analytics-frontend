import { describe, it, expect, vi, afterEach } from 'vitest';
import * as mockData from './mockData';
import { apiFetch, ApiError } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiFetch', () => {
  it('always resolves through getMockResponse, with no network fetch involved', async () => {
    const mockSpy = vi.spyOn(mockData, 'getMockResponse').mockResolvedValue({ ok: true });
    const fetchSpy = vi.spyOn(global, 'fetch');

    const result = await apiFetch('/api/me', {}, 'test-token');

    expect(result).toEqual({ ok: true });
    expect(mockSpy).toHaveBeenCalledWith('/api/me', {}, 'test-token');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws ApiError when getMockResponse returns undefined for an unrecognized path', async () => {
    vi.spyOn(mockData, 'getMockResponse').mockResolvedValue(undefined);

    await expect(apiFetch('/api/unrecognized')).rejects.toBeInstanceOf(ApiError);
  });
});
