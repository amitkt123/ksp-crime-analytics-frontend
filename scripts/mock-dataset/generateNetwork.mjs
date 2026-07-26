// Real offender networks are far smaller than case counts -- this pool size
// (roughly case count / 8) keeps repeat-offender reuse meaningful without
// ballooning to one person per case, while always staying below the case
// count itself. Applies independently to accused and victim identity pools.
// (A larger divisor means more distinct identities, so ego-network subgraphs
// come out a bit sparser than a tighter pool would produce.)
function poolSize(caseCount) {
  return Math.max(1, Math.floor(caseCount / 8));
}

// Feeding all ~200k generated cases into buildOffenderPool produces a
// pool this large (caseCount/8) that the /network screen's ego/path
// subgraphs read as a hairball. Narrowing to a handful of stations first --
// instead of shrinking the divisor -- keeps enough same-station case
// density for buildPathAdjacency's co-accused chaining and buildCommunities'
// crime-category grouping to still produce a legible, multi-hop demo graph.
const NETWORK_DEMO_STATION_COUNT = 6;
const NETWORK_DEMO_CASES_PER_STATION = 24;

export function pickNetworkDemoCases(allCases, rng) {
  const byStation = new Map();
  allCases.forEach((c) => {
    const list = byStation.get(c.unitId);
    if (list) list.push(c);
    else byStation.set(c.unitId, [c]);
  });

  const stationPool = Array.from(byStation.keys());
  const pickedStationIds = [];
  for (let i = 0; i < NETWORK_DEMO_STATION_COUNT && stationPool.length > 0; i++) {
    const index = Math.floor(rng() * stationPool.length);
    pickedStationIds.push(stationPool.splice(index, 1)[0]);
  }

  const sample = [];
  pickedStationIds.forEach((unitId) => {
    sample.push(...byStation.get(unitId).slice(0, NETWORK_DEMO_CASES_PER_STATION));
  });
  return sample;
}

const FIRST_NAMES = ['Suresh', 'Vijay', 'Rakesh', 'Prakash', 'Imran', 'Ganesh', 'Anand', 'Farhan', 'Girish', 'Harish', 'Iqbal', 'Jagadish', 'Kiran', 'Lokesh', 'Manoj', 'Naveen'];
const LAST_NAMES = ['Naik', 'Kumar', 'Yadav', 'Shetty', 'Khan', 'Bhat', 'Deshpande', 'Sheikh', 'Kulkarni', 'Poojary', 'Ahmed', 'Rao', 'Reddy', 'Gowda', 'Hegde', 'Setty'];

function personName(id) {
  return `${FIRST_NAMES[id % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(id / FIRST_NAMES.length) % LAST_NAMES.length]}`;
}

// One tuple per case, drawing accused/victim ids from a bounded pool (weighted
// toward the low end of the pool via rng()**2, so a minority of ids account for
// a majority of appearances -- the repeat-offender pattern the network screen
// is built to show) instead of one unique identity per case.
export function buildOffenderPool(allCases, rng) {
  const size = poolSize(allCases.length);
  const tuples = allCases.map((c) => {
    const accusedId = 500_000 + Math.floor((rng() ** 2) * size);
    const victimId = 700_000 + Math.floor((rng() ** 2) * size);
    return {
      caseId: c.caseId,
      caseNumber: c.caseNumber,
      unitId: c.unitId,
      unitName: c.unitName,
      crimeSubHeadId: c.crimeSubHeadId,
      accusedId,
      accusedName: personName(accusedId),
      victimId,
      victimName: personName(victimId),
    };
  });
  return { tuples, personCount: size };
}

function confidenceScoreFor(caseCount) {
  return Math.min(0.97, 0.55 + caseCount * 0.06);
}

export function buildRepeatOffenders(tuples, minCases, limit) {
  const byId = new Map();
  tuples.forEach((t) => {
    const entry = byId.get(t.accusedId) ?? { personId: t.accusedId, displayName: t.accusedName, caseCount: 0 };
    entry.caseCount += 1;
    byId.set(t.accusedId, entry);
  });
  return Array.from(byId.values())
    .filter((p) => p.caseCount >= minCases)
    .sort((a, b) => b.caseCount - a.caseCount || a.personId - b.personId)
    .slice(0, limit)
    .map((p) => ({
      personId: p.personId,
      displayName: p.displayName,
      caseCount: p.caseCount,
      gravityWeight: p.caseCount * 3,
      confidenceScore: confidenceScoreFor(p.caseCount),
    }));
}

export function buildCommunities(tuples, crimeSubHeads, minSize) {
  const subHeadToHead = new Map(crimeSubHeads.map((c) => [c.crimeSubHeadId, c]));
  const byCommunity = new Map();
  const seenPerson = new Set();
  tuples.forEach((t) => {
    if (seenPerson.has(t.accusedId)) return;
    seenPerson.add(t.accusedId);
    const crimeType = subHeadToHead.get(t.crimeSubHeadId);
    if (!crimeType) return;
    const list = byCommunity.get(crimeType.crimeHeadId) ?? [];
    list.push(t.accusedName);
    byCommunity.set(crimeType.crimeHeadId, list);
  });
  return Array.from(byCommunity.entries())
    .map(([communityId, memberDisplayNames]) => ({ communityId, size: memberDisplayNames.length, memberDisplayNames }))
    .filter((c) => c.size >= minSize)
    .sort((a, b) => b.size - a.size);
}
