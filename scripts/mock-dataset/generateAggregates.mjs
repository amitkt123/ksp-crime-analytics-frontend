function weeklySeries(base, weeks = 12) {
  return Array.from({ length: weeks }, (_, i) => ({
    isoYear: 2026,
    isoWeek: 20 + i,
    count: Math.round(base + Math.sin(i / 2) * base * 0.15 + i * 2),
  }));
}

export function buildCommandCenterSummary(districts, crimeSubHeads) {
  const stateCaseCount = districts.reduce((sum, d) => sum + d.caseCount, 0);
  const byHead = new Map();
  crimeSubHeads.forEach((c) => {
    const entry = byHead.get(c.crimeHeadId) ?? { crimeHeadId: c.crimeHeadId, crimeGroupName: c.crimeGroupName, count: 0 };
    entry.count += Math.round(stateCaseCount / crimeSubHeads.length);
    byHead.set(c.crimeHeadId, entry);
  });
  const top = crimeSubHeads[0];
  return {
    kpi: {
      stateCaseCount,
      stateCaseCountDeltaPct: 4.2,
      resolvedPct: 61.3,
      resolvedPctDeltaPts: 1.8,
      topCrimeSubHead: top.crimeSubHeadName,
      topCrimeSubHeadCount: Math.round(stateCaseCount * 0.09),
    },
    stateCaseVolumeWeekly: weeklySeries(stateCaseCount / 14),
    crimesAgainstPropertyWeekly: weeklySeries(stateCaseCount / 32),
    arrestsWeekly: weeklySeries(stateCaseCount / 60),
    categoryMix: Array.from(byHead.values()),
  };
}

export function buildDistrictSummaries(districts) {
  return districts.map((d) => ({ districtId: d.districtId, districtName: d.districtName, caseCount: d.caseCount }));
}

export function buildDistrictCorrelation(districts) {
  return districts.map((d) => ({
    districtId: d.districtId,
    districtName: d.districtName,
    caseCount: d.caseCount,
    population: d.population,
    literacyRate: d.literacyRate,
    unemploymentRate: d.unemploymentRate,
    urbanizationRate: d.urbanizationRate,
    perCapitaIncome: d.perCapitaIncome,
  }));
}

const TIME_OF_DAY_BUCKETS = [
  { bucket: 'night', label: 'Night · 12–6 AM' },
  { bucket: 'morning', label: 'Morning · 6 AM–12 PM' },
  { bucket: 'afternoon', label: 'Afternoon · 12–6 PM' },
  { bucket: 'evening', label: 'Evening · 6 PM–12 AM' },
];

function timeOfDayShares(districtId) {
  const shares = [0.18, 0.18, 0.18, 0.18];
  shares[districtId % 4] = 0.46;
  return shares;
}

export function buildTimeOfDayBuckets(districts) {
  return TIME_OF_DAY_BUCKETS.map(({ bucket, label }, bucketIndex) => {
    const districtCaseCounts = {};
    districts.forEach((d) => {
      districtCaseCounts[d.districtId] = Math.round(d.caseCount * timeOfDayShares(d.districtId)[bucketIndex]);
    });
    return { bucket, label, districtCaseCounts };
  });
}

export function buildPredictiveRisk(allCases, crimeSubHeads, rng) {
  const byUnitAndCrime = new Map();
  allCases.forEach((c) => {
    const key = `${c.unitId}:${c.crimeSubHeadId}`;
    const entry = byUnitAndCrime.get(key) ?? { unitId: c.unitId, unitName: c.unitName, crimeSubHeadId: c.crimeSubHeadId, count: 0 };
    entry.count += 1;
    byUnitAndCrime.set(key, entry);
  });
  const subHeadNames = new Map(crimeSubHeads.map((c) => [c.crimeSubHeadId, c.crimeSubHeadName]));
  return Array.from(byUnitAndCrime.values())
    .filter((e) => e.count >= 3)
    .map((e) => {
      const backtestActualCount = e.count;
      const backtestPredictedCount = Number((backtestActualCount + (rng() - 0.5) * 4).toFixed(1));
      return {
        unitId: e.unitId,
        unitName: e.unitName,
        districtId: null,
        crimeSubHeadId: e.crimeSubHeadId,
        crimeSubHeadName: subHeadNames.get(e.crimeSubHeadId) ?? 'Unknown',
        predictedCount: Number((backtestActualCount * (1 + rng() * 0.2)).toFixed(1)),
        backtestActualCount,
        backtestPredictedCount,
        backtestAbsoluteError: Number(Math.abs(backtestActualCount - backtestPredictedCount).toFixed(1)),
      };
    });
}

export function buildCaseAnomalies(allCases, rng, count) {
  return allCases.slice(0, count).map((c, i) => {
    const baselineMeanDelayDays = Number((3 + rng() * 3).toFixed(1));
    const registrationDelayDays = Math.round(baselineMeanDelayDays + 5 + rng() * 20);
    const zScore = Number(((registrationDelayDays - baselineMeanDelayDays) / (baselineMeanDelayDays || 1)).toFixed(1));
    return {
      caseMasterId: c.caseId,
      crimeNo: c.caseNumber ?? `${100 + i}/2026`,
      registrationDelayDays,
      baselineMeanDelayDays,
      zScore,
      explanation: `Registration delay of ${registrationDelayDays} days is ${zScore} standard deviations above the baseline mean of ${baselineMeanDelayDays} days`,
    };
  });
}

export function buildSearchIndex(allCases, tuples) {
  const index = [];
  allCases.forEach((c) => index.push({ id: `case-${c.caseId}`, type: 'CASE', label: c.caseNumber }));
  const seenPerson = new Set();
  tuples.forEach((t) => {
    if (!seenPerson.has(t.accusedId)) {
      seenPerson.add(t.accusedId);
      index.push({ id: String(t.accusedId), type: 'PERSON', label: t.accusedName });
    }
  });
  return index;
}
