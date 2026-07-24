import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import { ChatScreen } from './ChatScreen';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() };
}

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt',
    roles: ['SCRB_ANALYST'],
    username: 'demo.analyst',
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(
    mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse) as unknown as ReturnType<
      typeof meApiModule.useMe
    >,
  );
}

function renderWithClient() {
  mockAuth();
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ChatScreen />
    </QueryClientProvider>,
  );
}

describe('ChatScreen', () => {
  it('sends the typed message and renders the reply', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reply: 'Hello there', model: 'catalyst-model' }),
    } as unknown as Response);
    renderWithClient();

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('clears the input after sending', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reply: 'ok', model: 'catalyst-model' }),
    } as unknown as Response);
    renderWithClient();

    const input = screen.getByLabelText('Message') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(input.value).toBe(''));
  });
});
