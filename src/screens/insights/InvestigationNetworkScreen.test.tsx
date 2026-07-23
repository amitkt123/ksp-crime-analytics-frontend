import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as networkApiModule from '../../api/networkApi';
import { InvestigationNetworkScreen } from './InvestigationNetworkScreen';

function queryResult<T>(data: T) {
  return { data, isLoading: false, isError: false, refetch: vi.fn() } as never;
}

describe('InvestigationNetworkScreen', () => {
  it('renders the Header title and the Investigation Network tab content', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({ data: undefined, isLoading: false, isError: false } as never);
    vi.spyOn(networkApiModule, 'useRepeatOffenders').mockReturnValue(queryResult(undefined));

    render(
      <MemoryRouter>
        <InvestigationNetworkScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Investigation Network' })).toBeInTheDocument();
    expect(screen.getByText('Crime Head ↔ Act Linkage')).toBeInTheDocument();
  });
});
