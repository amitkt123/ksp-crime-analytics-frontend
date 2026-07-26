import { describe, it, expect, vi, afterEach } from 'vitest';
import { explainCase, explainCorrelation } from './agentApi';
import type { CaseDetailResponse } from './caseApi';
import type { DistrictCorrelationResponse } from './sociologicalApi';

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleCase: CaseDetailResponse = {
  caseId: 176000, caseNumber: '100/2026', unitId: 176, unitName: 'Whitefield PS',
  crimeSubHeadId: 103, crimeSubHeadName: 'Chain Snatching', status: 'registered', firDate: '2026-05-01',
  station: 'Whitefield PS', district: 'Bengaluru Urban',
  narrative: 'x', parties: [], timeline: [],
};

describe('explainCase', () => {
  it('POSTs to /api/explain with EXPLAIN_CASE and the case facts, mapped to agent-service field names', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ narrative: 'n', evidence: { claim: 'c', supportingRecordIds: [], queryOrMethod: 'm', confidence: 1, generatedAt: 'now', modelVersion: 'v' } }),
    } as unknown as Response);

    const result = await explainCase(sampleCase);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/explain'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          requestType: 'EXPLAIN_CASE',
          caseMasterId: 176000,
          crimeNo: undefined,
          caseNo: '100/2026',
          policeStationName: 'Whitefield PS',
          districtName: 'Bengaluru Urban',
          crimeMajorHeadName: undefined,
          crimeMinorHeadName: 'Chain Snatching',
          gravityOffenceName: undefined,
          caseStatusName: 'registered',
          accusedCount: 0,
          arrestCount: 0,
          chargesheetCount: 0,
        }),
      }),
    );
    expect(result.narrative).toBe('n');
    expect(result.evidence.queryOrMethod).toBe('m');
  });
});

describe('explainCorrelation', () => {
  it('POSTs EXPLAIN_CORRELATION with the district\'s fields verbatim', async () => {
    const district: DistrictCorrelationResponse = {
      districtId: 5, districtName: 'Bengaluru Urban', caseCount: 32000, population: 12000000,
      literacyRate: 88.5, unemploymentRate: 4.1, urbanizationRate: 91.2, perCapitaIncome: 300000,
    };
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ narrative: 'n', evidence: { claim: 'c', supportingRecordIds: [], queryOrMethod: 'm', confidence: 0.7, generatedAt: 'now', modelVersion: 'v' } }),
    } as unknown as Response);

    await explainCorrelation(district);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/explain'),
      expect.objectContaining({ body: JSON.stringify({ requestType: 'EXPLAIN_CORRELATION', ...district }) }),
    );
  });
});
