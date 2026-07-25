import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as caseApiModule from '../../api/caseApi';
import * as agentApiModule from '../../api/agentApi';
import { CaseDetailScreen } from './CaseDetailScreen';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

const detail: caseApiModule.CaseDetailResponse = {
  caseId: 176000,
  caseNumber: '276/2026',
  unitId: 176,
  unitName: 'Whitefield PS',
  crimeSubHeadId: 103,
  crimeSubHeadName: 'Chain Snatching',
  status: 'under_investigation',
  firDate: '2026-05-26',
  crimeNumber: 'FIR-2026-KA-17600',
  gravity: 'serious',
  narrative: 'Chain Snatching reported to Whitefield PS.',
  parties: [
    {
      role: 'complainant',
      name: { masked: 'N***** S****', real: 'Nagaraj Setty' },
      phone: { masked: '98******01', real: '9810000001' },
      address: { masked: '**********, Karnataka', real: '45 Church Street, Karnataka' },
    },
    {
      role: 'victim',
      name: { masked: 'R***** K****', real: 'Ramesh Kumar' },
      phone: { masked: '98******00', real: '9810000000' },
      address: { masked: '**********, Karnataka', real: '12 MG Road, Karnataka' },
    },
  ],
  timeline: [
    { status: 'registered', timestamp: '2026-05-26', note: 'FIR registered.' },
    { status: 'under_investigation', timestamp: '2026-05-29', note: 'Investigation taken up by the station.' },
  ],
  arrests: [{ arrestDate: '2026-05-31', custodyStatus: 'Judicial custody' }],
  chargesheet: { filedDate: '2026-06-13', sectionsApplied: '379, 411 IPC', court: 'JMFC Court, Bengaluru Urban' },
};

const explanation: agentApiModule.ExplainResponse = {
  narrative: 'Chain Snatching case 276/2026 at Whitefield PS shares its crime sub-head with 2 other cases.',
  evidence: {
    claim: 'Chain Snatching case 276/2026 at Whitefield PS shares its crime sub-head with 2 other cases.',
    supportingRecordIds: ['277/2026'],
    queryOrMethod: 'Insight & Explanation Agent · case similarity within unit',
    confidence: 0.7,
    generatedAt: '2026-05-29',
    modelVersion: 'v1',
  },
};

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt',
    roles: ['INVESTIGATOR'],
    username: 'demo.investigator',
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(
    mockSuccess<meApiModule.MeResponse>(undefined as unknown as meApiModule.MeResponse),
  );
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/case-explorer/176000']}>
      <Routes>
        <Route path="/case-explorer/:caseId" element={<CaseDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CaseDetailScreen', () => {
  it('renders facts, crime number, gravity, grouped parties, and the timeline once the case loads', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));
    vi.spyOn(agentApiModule, 'useExplainCase').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.ExplainResponse),
    );

    renderScreen();

    expect(screen.getAllByText('276/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Under Investigation').length).toBeGreaterThan(0);
    expect(screen.getByText('FIR-2026-KA-17600')).toBeInTheDocument();
    expect(screen.getByText('Serious')).toBeInTheDocument();
    expect(screen.getByText('Complainant')).toBeInTheDocument();
    expect(screen.getByText('Victim')).toBeInTheDocument();
    expect(screen.queryByText('Accused')).not.toBeInTheDocument();
    expect(screen.getByText('N***** S****')).toBeInTheDocument();
    expect(screen.getByText('R***** K****')).toBeInTheDocument();
    expect(screen.queryByText('Nagaraj Setty')).not.toBeInTheDocument();
    expect(screen.getByText('Investigation taken up by the station.')).toBeInTheDocument();
  });

  it('reveals the real value when a PII field is toggled', async () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));
    vi.spyOn(agentApiModule, 'useExplainCase').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.ExplainResponse),
    );

    renderScreen();
    await userEvent.click(screen.getAllByRole('button', { name: 'Reveal' })[0]);

    expect(screen.getByText('Nagaraj Setty')).toBeInTheDocument();
  });

  it('renders arrests and chargesheet sections when present', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));
    vi.spyOn(agentApiModule, 'useExplainCase').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.ExplainResponse),
    );

    renderScreen();

    expect(screen.getByText('Judicial custody')).toBeInTheDocument();
    expect(screen.getByText('379, 411 IPC')).toBeInTheDocument();
    expect(screen.getByText('JMFC Court, Bengaluru Urban')).toBeInTheDocument();
  });

  it('omits arrests and chargesheet sections when the case has neither', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(
      mockSuccess({ ...detail, arrests: undefined, chargesheet: undefined }),
    );
    vi.spyOn(agentApiModule, 'useExplainCase').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.ExplainResponse),
    );

    renderScreen();

    expect(screen.queryByText('Arrests')).not.toBeInTheDocument();
    expect(screen.queryByText('Chargesheet')).not.toBeInTheDocument();
  });

  it('opens the evidence panel with the case explanation when "Explain this case" is clicked', async () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));
    vi.spyOn(agentApiModule, 'useExplainCase').mockReturnValue(mockSuccess(explanation));

    renderScreen();
    expect(screen.queryByRole('dialog', { name: 'Evidence panel' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Explain this case' }));

    expect(screen.getByRole('dialog', { name: 'Evidence panel' })).toBeInTheDocument();
    expect(screen.getByText(explanation.narrative)).toBeInTheDocument();
  });

  it('shows an alert and retry button when the query fails', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<caseApiModule.CaseDetailResponse, Error>);
    vi.spyOn(agentApiModule, 'useExplainCase').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.ExplainResponse),
    );

    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this case");
  });

  it('shows a not-found message with a link back when the case does not exist', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(
      mockSuccess<caseApiModule.CaseDetailResponse | undefined>(undefined) as UseQueryResult<
        caseApiModule.CaseDetailResponse,
        Error
      >,
    );
    vi.spyOn(agentApiModule, 'useExplainCase').mockReturnValue(
      mockSuccess(undefined as unknown as agentApiModule.ExplainResponse),
    );

    renderScreen();

    expect(screen.getByText('Case not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Case Explorer' })).toHaveAttribute('href', '/case-explorer');
  });
});
