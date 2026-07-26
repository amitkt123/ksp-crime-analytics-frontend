import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as networkApiModule from '../../api/networkApi';
import { PersonSelector } from './PersonSelector';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

afterEach(() => {
  vi.restoreAllMocks();
});

function setup(peopleResult: networkApiModule.PersonReference[] = []) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'mock-token',
    username: 'demo',
    roles: [],
    login: vi.fn(),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof AuthContextModule.useAuth>);
  vi.spyOn(networkApiModule, 'usePeople').mockReturnValue(mockSuccess(peopleResult));
}

describe('PersonSelector', () => {
  it('shows a name field and an optional FIR/case number field when nothing is selected', () => {
    setup();
    render(<PersonSelector label="Person" value={null} onChange={vi.fn()} placeholder="Search by name" />);

    expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/FIR \/ Case No\./)).toBeInTheDocument();
  });

  it('renders search results and calls onChange when one is picked', async () => {
    setup([{ personId: 500001, displayName: 'Suresh Naik' }]);
    const onChange = vi.fn();
    render(<PersonSelector label="Person" value={null} onChange={onChange} />);

    await userEvent.click(screen.getByText('Suresh Naik'));

    expect(onChange).toHaveBeenCalledWith({ personId: 500001, displayName: 'Suresh Naik' });
  });

  it('shows the selected person as a chip instead of the search fields', () => {
    setup();
    render(<PersonSelector label="Person" value={{ personId: 500001, displayName: 'Suresh Naik' }} onChange={vi.fn()} />);

    expect(screen.getByText('Suresh Naik')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/FIR \/ Case No\./)).not.toBeInTheDocument();
  });

  it('clears the selection when the chip\'s clear button is clicked', async () => {
    setup();
    const onChange = vi.fn();
    render(<PersonSelector label="Person" value={{ personId: 500001, displayName: 'Suresh Naik' }} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Clear Person' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
