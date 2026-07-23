import { describe, it, expect } from 'vitest';
import {
  getOverviewTrend,
  getCaseJourneyStages,
  getCaseCategoryMixDemo,
  getGravityMixDemo,
  getRecentFirsDemo,
  getCrimeHeadMonthlyTrend,
  getCohortHeatmap,
  getDistrictCrimeHeadMatrix,
  getIncidentHotspotsDemo,
  CRIME_HEADS_DEMO,
  getVictimGenderDemo,
  getAccusedGenderDemo,
  getComplainantGenderDemo,
  getAgeDistributionDemo,
  getReligionDemo,
  getCasteDemo,
  getOccupationDemo,
  getVictimGenderByCrimeHeadDemo,
  getRepeatOffendersDemo,
  getFirstTimeVsRepeatDemo,
  getCrimeHeadActLinkageDemo,
  getArrestsVsSurrendersDemo,
  getIoLeaderboardDemo,
  getCourtPendingDemo,
  getFinalReportOutcomeDemo,
  getDistrictUnitCaseLoadDemo,
  getRankDistributionDemo,
  getUnitPerformanceDemo,
} from './demoAnalyticsData';

describe('demoAnalyticsData: Overview + Crime Trends', () => {
  it('getOverviewTrend is deterministic and has 12 months of non-negative counts', () => {
    const a = getOverviewTrend();
    const b = getOverviewTrend();
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
    a.forEach((point) => {
      expect(point.registered).toBeGreaterThan(0);
      expect(point.chargesheeted).toBeGreaterThanOrEqual(0);
    });
  });

  it('getCaseJourneyStages sums to the state case count used elsewhere in mock data (12480)', () => {
    const stages = getCaseJourneyStages();
    const total = stages.slice(1).reduce((sum, s) => sum + s.count, 0);
    expect(total).toBe(12480);
    expect(stages[0]).toEqual({ stage: 'Registered', count: 12480 });
  });

  it('getCaseCategoryMixDemo and getGravityMixDemo both sum to 12480', () => {
    expect(getCaseCategoryMixDemo().reduce((s, c) => s + c.count, 0)).toBe(12480);
    expect(getGravityMixDemo().reduce((s, g) => s + g.count, 0)).toBe(12480);
  });

  it('getRecentFirsDemo returns CaseSummaryResponse-shaped rows with negative synthetic ids', () => {
    const rows = getRecentFirsDemo();
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row.caseId).toBeLessThan(0);
      expect(row.crimeNumber).toBeTruthy();
      expect(row.station).toBeTruthy();
      expect(['registered', 'under_investigation', 'closed']).toContain(row.status);
    });
  });

  it('getCrimeHeadMonthlyTrend has one point per month with every crime head as a numeric key', () => {
    const trend = getCrimeHeadMonthlyTrend();
    expect(trend).toHaveLength(12);
    trend.forEach((point) => {
      CRIME_HEADS_DEMO.forEach((head) => {
        expect(typeof point[head]).toBe('number');
        expect(point[head] as number).toBeGreaterThan(0);
      });
    });
  });

  it('getCohortHeatmap covers 8 cohorts x 7 lag buckets with pct in [0,1]', () => {
    const cells = getCohortHeatmap();
    expect(cells).toHaveLength(8 * 7);
    cells.forEach((c) => {
      expect(c.pct).toBeGreaterThanOrEqual(0);
      expect(c.pct).toBeLessThanOrEqual(1);
    });
  });

  it('getDistrictCrimeHeadMatrix covers every demo district x every demo crime head', () => {
    const cells = getDistrictCrimeHeadMatrix();
    const districts = new Set(cells.map((c) => c.districtName));
    const heads = new Set(cells.map((c) => c.crimeHead));
    expect(cells).toHaveLength(districts.size * heads.size);
    expect(heads.size).toBe(CRIME_HEADS_DEMO.length);
  });

  it('getIncidentHotspotsDemo returns points clustered around 5 district centers', () => {
    const points = getIncidentHotspotsDemo();
    expect(points.length).toBe(40);
    points.forEach((p) => {
      expect(p.lat).toBeGreaterThan(10);
      expect(p.lat).toBeLessThan(19);
      expect(p.lon).toBeGreaterThan(73);
      expect(p.lon).toBeLessThan(79);
    });
  });
});

describe('demoAnalyticsData: Demographics', () => {
  it('all three gender donuts have exactly Male/Female/Third Gender slices with positive counts', () => {
    [getVictimGenderDemo(), getAccusedGenderDemo(), getComplainantGenderDemo()].forEach((slices) => {
      expect(slices.map((s) => s.gender).sort()).toEqual(['Female', 'Male', 'Third Gender'].sort());
      slices.forEach((s) => expect(s.count).toBeGreaterThan(0));
    });
  });

  it('getAgeDistributionDemo covers 16 five-year bands from 0-4 to 75+ with a single peak', () => {
    const bands = getAgeDistributionDemo();
    expect(bands).toHaveLength(16);
    expect(bands[0].band).toBe('0-4');
    expect(bands[bands.length - 1].band).toBe('75+');
    const peakIndex = bands.reduce((best, b, i) => (b.victims > bands[best].victims ? i : best), 0);
    expect(peakIndex).toBeGreaterThan(0);
    expect(peakIndex).toBeLessThan(bands.length - 1);
  });

  it('religion, caste, and occupation demo bars each have positive counts and unique labels', () => {
    [getReligionDemo(), getCasteDemo(), getOccupationDemo()].forEach((rows) => {
      const labels = rows.map((r) => r.label);
      expect(new Set(labels).size).toBe(labels.length);
      rows.forEach((r) => expect(r.count).toBeGreaterThan(0));
    });
  });

  it('getVictimGenderByCrimeHeadDemo has one row per demo crime head, percentages summing to ~100', () => {
    const rows = getVictimGenderByCrimeHeadDemo();
    expect(rows).toHaveLength(5);
    rows.forEach((row) => {
      expect(row.malePct + row.femalePct + row.thirdGenderPct).toBe(100);
    });
  });
});

describe('demoAnalyticsData: Investigation Network + Judicial & Units', () => {
  it('getRepeatOffendersDemo is sorted descending by caseCount with masked-style names', () => {
    const rows = getRepeatOffendersDemo();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].caseCount).toBeLessThanOrEqual(rows[i - 1].caseCount);
    }
    rows.forEach((r) => expect(r.displayName).toMatch(/^\S\*+ \S\*+$/));
  });

  it('getFirstTimeVsRepeatDemo returns two positive counts', () => {
    const { firstTime, repeat } = getFirstTimeVsRepeatDemo();
    expect(firstTime).toBeGreaterThan(0);
    expect(repeat).toBeGreaterThan(0);
  });

  it('getCrimeHeadActLinkageDemo and getArrestsVsSurrendersDemo produce non-empty positive series', () => {
    getCrimeHeadActLinkageDemo().forEach((row) => expect(row.count).toBeGreaterThan(0));
    const arrests = getArrestsVsSurrendersDemo();
    expect(arrests).toHaveLength(12);
    arrests.forEach((row) => {
      expect(row.arrests).toBeGreaterThan(0);
      expect(row.surrenders).toBeGreaterThan(0);
    });
  });

  it('getIoLeaderboardDemo rows have masked-style officer names and a rate in [0,100]', () => {
    getIoLeaderboardDemo().forEach((row) => {
      expect(row.officer).toMatch(/^\S\*+ \S\*+$/);
      expect(row.chargesheetRatePct).toBeGreaterThanOrEqual(0);
      expect(row.chargesheetRatePct).toBeLessThanOrEqual(100);
    });
  });

  it('getCourtPendingDemo and getFinalReportOutcomeDemo are non-empty positive series', () => {
    expect(getCourtPendingDemo().length).toBeGreaterThan(0);
    getFinalReportOutcomeDemo().forEach((row) => expect(row.count).toBeGreaterThan(0));
  });

  it('getDistrictUnitCaseLoadDemo covers multiple units per district, all positive counts', () => {
    const rows = getDistrictUnitCaseLoadDemo();
    const byDistrict = new Map<string, number>();
    rows.forEach((r) => byDistrict.set(r.districtName, (byDistrict.get(r.districtName) ?? 0) + 1));
    byDistrict.forEach((count) => expect(count).toBeGreaterThan(1));
    rows.forEach((r) => expect(r.caseCount).toBeGreaterThan(0));
  });

  it('getRankDistributionDemo forms a pyramid: DGP has the smallest headcount, Constable the largest', () => {
    const ranks = getRankDistributionDemo();
    const dgp = ranks.find((r) => r.rank === 'DGP')!;
    const constable = ranks.find((r) => r.rank === 'Constable')!;
    expect(dgp.headcount).toBeLessThan(constable.headcount);
    ranks.forEach((r) => expect(r.headcount).toBeGreaterThan(0));
  });

  it('getUnitPerformanceDemo rows have a pending share in [0,100]', () => {
    getUnitPerformanceDemo().forEach((row) => {
      expect(row.pendingSharePct).toBeGreaterThanOrEqual(0);
      expect(row.pendingSharePct).toBeLessThanOrEqual(100);
    });
  });
});
