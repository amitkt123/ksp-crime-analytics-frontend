import { getMockResponse } from './mockData';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const mock = await getMockResponse(path, options, token);
  if (mock === undefined) {
    throw new ApiError(404, `No mock response registered for ${path}`);
  }
  return mock as T;
}
