import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import { DemographicsScreen } from './DemographicsScreen';

describe('DemographicsScreen', () => {
  it('renders the Header title and the Demographics tab content', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({ data: undefined, isLoading: false, isError: false } as never);
    render(
      <MemoryRouter>
        <DemographicsScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Demographics' })).toBeInTheDocument();
    expect(screen.getByText('Victim Gender')).toBeInTheDocument();
  });
});
