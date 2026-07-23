import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import { JudicialUnitsScreen } from './JudicialUnitsScreen';

describe('JudicialUnitsScreen', () => {
  it('renders the Header title and the Judicial & Units tab content', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({ data: undefined, isLoading: false, isError: false } as never);
    render(
      <MemoryRouter>
        <JudicialUnitsScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Judicial & Units' })).toBeInTheDocument();
    expect(screen.getByText('Court-wise Pending Cases')).toBeInTheDocument();
  });
});
