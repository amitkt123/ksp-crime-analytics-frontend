import { describe, it, expect, vi } from 'vitest';
import * as client from './client';
import {
  getDistrictCorrelation,
  getPredictiveRisk,
  getCaseAnomalies,
  type DistrictCorrelationResponse,
  type PredictiveRiskForecastResponse,
  type CaseAnomalyResponse,
} from './sociologicalApi';

describe('getDistrictCorrelation', () => {
  it('fetches without a year param when year is omitted', async () => {
    const sample: DistrictCorrelationResponse[] = [
      {
        districtId: 5, districtName: 'Bengaluru Urban', caseCount: 1840, population: 9700000,
        literacyRate: 87.7, unemploymentRate: 4.1, urbanizationRate: 91.0, perCapitaIncome: 341000,
      },
    ];
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sample);
    const result = await getDistrictCorrelation('test-token');
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/sociological/correlation', {}, 'test-token');
    expect(result).toEqual(sample);
  });

  it('appends the year param when provided', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getDistrictCorrelation('test-token', 2025);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/sociological/correlation?year=2025', {}, 'test-token');
  });
});

describe('getPredictiveRisk', () => {
  it('fetches without a crimeSubHeadId param when omitted', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getPredictiveRisk('test-token');
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/sociological/predictive-risk', {}, 'test-token');
  });

  it('appends the crimeSubHeadId param when provided', async () => {
    const sample: PredictiveRiskForecastResponse[] = [
      {
        unitId: 12, unitName: 'Halasuru PS', districtId: 5, crimeSubHeadId: 101,
        crimeSubHeadName: 'Theft of Motor Vehicle', predictedCount: 14.2,
        backtestActualCount: 12, backtestPredictedCount: 13.1, backtestAbsoluteError: 1.1,
      },
    ];
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sample);
    const result = await getPredictiveRisk('test-token', 101);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/sociological/predictive-risk?crimeSubHeadId=101', {}, 'test-token');
    expect(result).toEqual(sample);
  });
});

describe('getCaseAnomalies', () => {
  it('fetches without a crimeSubHeadId param when omitted', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue([]);
    await getCaseAnomalies('test-token');
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/sociological/case-anomalies', {}, 'test-token');
  });

  it('appends the crimeSubHeadId param when provided', async () => {
    const sample: CaseAnomalyResponse[] = [
      {
        caseMasterId: 9001, crimeNo: '101/2026/5/12', registrationDelayDays: 19,
        baselineMeanDelayDays: 4.2, zScore: 3.9,
        explanation: 'Registration delay of 19 days is 3.9 standard deviations above the baseline mean of 4.2 days',
      },
    ];
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sample);
    const result = await getCaseAnomalies('test-token', 101);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/sociological/case-anomalies?crimeSubHeadId=101', {}, 'test-token');
    expect(result).toEqual(sample);
  });
});
