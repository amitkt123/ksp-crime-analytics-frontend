import { describe, expect, it, vi } from 'vitest';
import { getExplainTrendAlert } from './agentApi';

describe('agentApi', () => {
  it('calls the trend-alert explain endpoint with query params', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      narrative: 'Cubbon Park saw a spike.',
      evidence: { claim: 'spike', supportingRecordIds: ['10'], queryOrMethod: 'get_trend_deviation', confidence: 0.85, generatedAt: '2026-07-22T00:00:00Z', modelVersion: 'claude-haiku-4-5-20251001' },
      agentAvailable: true,
    }), { status: 200 }));

    const result = await getExplainTrendAlert('token', 102, 3);

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/agent/explain/trend-alert?unitId=102&crimeSubHeadId=3'), expect.anything());
    expect(result.narrative).toContain('spike');
  });
});
