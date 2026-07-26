// Regenerates the entire synthetic dataset ksp-crime-analytics-frontend runs on
// in mock mode -- deterministic (seeded PRNG, no Math.random()), targets roughly
// the datathon's suggested 1-2 lakh case-record scale. Not part of the Vite
// build -- run manually: node scripts/generate-mock-dataset.mjs
// (then commit the generated public/data/mock/** output, same convention as
// src/api/generatedStationFixtures.ts / generatedStationCentroids.ts).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mulberry32 } from './mock-dataset/prng.mjs';
import { DISTRICTS, CRIME_SUB_HEADS, scaleWeightsToTarget } from './mock-dataset/seedData.mjs';
import { readTsJsonConst, generateStationCases, distributeDistrictCasesAcrossStations, setCrimeSubHeads } from './mock-dataset/generateCases.mjs';
import { pickNetworkDemoCases, buildOffenderPool, buildRepeatOffenders, buildCommunities } from './mock-dataset/generateNetwork.mjs';
import {
  buildCommandCenterSummary, buildDistrictSummaries, buildDistrictCorrelation,
  buildTimeOfDayBuckets, buildPredictiveRisk, buildCaseAnomalies, buildSearchIndex,
} from './mock-dataset/generateAggregates.mjs';

const TARGET_TOTAL_CASES = 200_000;
const SEED = 20260724;
// Its own seed/stream, decoupled from `rng` above, so tuning the network demo
// sample never reshuffles the unrelated case/aggregate output.
const NETWORK_SEED = 20260725;
const OUT_DIR = 'public/data/mock';

async function writeJson(relativePath, data) {
  const fullPath = path.join(OUT_DIR, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(data));
}

async function main() {
  setCrimeSubHeads(CRIME_SUB_HEADS);
  const rng = mulberry32(SEED);

  const stationsByDistrict = await readTsJsonConst('src/api/generatedStationFixtures.ts', 'STATIONS_BY_DISTRICT');
  const stationCentroids = await readTsJsonConst('src/api/generatedStationCentroids.ts', 'STATION_CENTROIDS');

  const districtsWithCounts = scaleWeightsToTarget(DISTRICTS, TARGET_TOTAL_CASES);

  const allCases = [];
  const unitIdToDistrictId = new Map();
  for (const district of districtsWithCounts) {
    const roster = stationsByDistrict[String(district.districtId)] ?? [];
    if (roster.length === 0) continue;
    const stationsWithCentroids = roster.map((s) => ({ ...s, centroid: stationCentroids[String(s.unitId)] }));
    const perStation = distributeDistrictCasesAcrossStations(district.caseCount, stationsWithCentroids, rng);

    for (const { station, caseCount } of perStation) {
      unitIdToDistrictId.set(station.unitId, district.districtId);
      const stationCases = generateStationCases(station, district.districtName, caseCount, rng);
      await writeJson(`cases/station-${station.unitId}.json`, stationCases);
      allCases.push(...stationCases);
    }
  }

  const networkRng = mulberry32(NETWORK_SEED);
  const { tuples } = buildOffenderPool(pickNetworkDemoCases(allCases, networkRng), networkRng);
  await writeJson('network/repeat-offenders.json', buildRepeatOffenders(tuples, 2, 500));
  await writeJson('network/communities.json', buildCommunities(tuples, CRIME_SUB_HEADS, 3));
  await writeJson('network/tuples.json', tuples);

  await writeJson('aggregates/command-center-summary.json', buildCommandCenterSummary(districtsWithCounts, CRIME_SUB_HEADS));
  await writeJson('aggregates/district-summaries.json', buildDistrictSummaries(districtsWithCounts));
  await writeJson('aggregates/district-correlation.json', buildDistrictCorrelation(districtsWithCounts));
  await writeJson('aggregates/time-of-day.json', { buckets: buildTimeOfDayBuckets(districtsWithCounts) });
  await writeJson('aggregates/predictive-risk.json', buildPredictiveRisk(allCases, CRIME_SUB_HEADS, rng, unitIdToDistrictId));
  await writeJson('aggregates/case-anomalies.json', buildCaseAnomalies(allCases, rng, 200));

  await writeJson('search-index.json', buildSearchIndex(allCases, tuples));

  console.log(`Generated ${allCases.length} cases across ${districtsWithCounts.length} districts.`);
}

main();
