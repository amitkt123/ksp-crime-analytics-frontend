// Production data layer: ksp-crime-analytics-frontend has no live backend (see
// docs/superpowers/specs/2026-07-24-frontend-only-deployment-pivot-design.md).
// Serves every /api/* call from the generated dataset under public/data/mock/
// (see scripts/generate-mock-dataset.mjs) instead of a real network round trip.
import { STATIONS_BY_DISTRICT } from './generatedStationFixtures';
import type {
  DistrictCorrelationResponse,
  PredictiveRiskForecastResponse,
  CaseAnomalyResponse,
} from './sociologicalApi';
import type { CaseDetailResponse } from './caseApi';

const jsonCache = new Map<string, Promise<unknown>>();
function loadJson<T>(url: string): Promise<T> {
  if (!jsonCache.has(url)) {
    jsonCache.set(url, fetch(url).then((r) => r.json()));
  }
  return jsonCache.get(url)! as Promise<T>;
}

function loadBoundaries(): Promise<unknown> {
  return loadJson('/data/karnataka-districts.geojson');
}
function loadStationBoundaries(districtId: number): Promise<unknown> {
  return loadJson(`/data/stations/${districtId}.geojson`);
}

interface StationCaseFile extends CaseDetailResponse {}

function loadStationCases(unitId: number): Promise<StationCaseFile[]> {
  return loadJson(`/data/mock/cases/station-${unitId}.json`);
}

interface DistrictSummary { districtId: number; districtName: string; caseCount: number }
function loadDistrictSummaries(): Promise<DistrictSummary[]> {
  return loadJson('/data/mock/aggregates/district-summaries.json');
}

interface CommandCenterSummary {
  kpi: { stateCaseCount: number; stateCaseCountDeltaPct: number; resolvedPct: number; resolvedPctDeltaPts: number; topCrimeSubHead: string; topCrimeSubHeadCount: number };
  stateCaseVolumeWeekly: Array<{ isoYear: number; isoWeek: number; count: number }>;
  crimesAgainstPropertyWeekly: Array<{ isoYear: number; isoWeek: number; count: number }>;
  arrestsWeekly: Array<{ isoYear: number; isoWeek: number; count: number }>;
  categoryMix: Array<{ crimeHeadId: number; crimeGroupName: string; count: number }>;
}
function loadCommandCenterSummary(): Promise<CommandCenterSummary> {
  return loadJson('/data/mock/aggregates/command-center-summary.json');
}

interface RepeatOffender { personId: number; displayName: string; caseCount: number; gravityWeight: number; confidenceScore: number }
function loadRepeatOffenders(): Promise<RepeatOffender[]> {
  return loadJson('/data/mock/network/repeat-offenders.json');
}
interface Community { communityId: number; size: number; memberDisplayNames: string[] }
function loadCommunities(): Promise<Community[]> {
  return loadJson('/data/mock/network/communities.json');
}
interface NetworkCaseTuple {
  caseId: number; caseNumber: string; unitId: number; unitName: string; crimeSubHeadId: number;
  accusedId: number; accusedName: string; victimId: number; victimName: string;
}
function loadTuples(): Promise<NetworkCaseTuple[]> {
  return loadJson('/data/mock/network/tuples.json');
}
interface SearchIndexEntry { id: string; type: 'CASE' | 'PERSON'; label: string }
function loadSearchIndex(): Promise<SearchIndexEntry[]> {
  return loadJson('/data/mock/search-index.json');
}

const MOCK_ME = {
  username: 'demo.analyst', firstName: 'Demo', rank: 'SCRB Analyst', unit: 'State Crime Records Bureau',
  unitId: null as number | null, districtId: null as number | null, roles: ['SCRB_ANALYST'],
};
const MOCK_ME_INVESTIGATOR = {
  username: 'demo.investigator', firstName: 'Demo', rank: 'Investigator', unit: 'Whitefield PS',
  unitId: 176, districtId: 5, roles: ['INVESTIGATOR'],
};
const MOCK_ME_SUPERVISOR = {
  username: 'demo.supervisor', firstName: 'Demo', rank: 'Station Supervisor', unit: 'Whitefield PS',
  unitId: 176, districtId: 5, roles: ['STATION_SUPERVISOR'],
};
const DEMO_LOGINS: Record<string, { token: string; roles: string[] }> = {
  'demo.investigator': { token: 'mock-token-investigator', roles: ['INVESTIGATOR'] },
  'demo.supervisor': { token: 'mock-token-supervisor', roles: ['STATION_SUPERVISOR'] },
};
const MOCK_ME_BY_TOKEN: Record<string, typeof MOCK_ME> = {
  'mock-token-investigator': MOCK_ME_INVESTIGATOR,
  'mock-token-supervisor': MOCK_ME_SUPERVISOR,
};
function mockLogin(username: string): { token: string; roles: string[] } {
  return DEMO_LOGINS[username] ?? { token: 'mock-token', roles: ['SCRB_ANALYST'] };
}

function findStationName(unitId: number): string | undefined {
  for (const roster of Object.values(STATIONS_BY_DISTRICT)) {
    const match = roster.find((station) => station.unitId === unitId);
    if (match) return match.unitName;
  }
  return undefined;
}
function findStationDistrictId(unitId: number): number | undefined {
  for (const [districtId, roster] of Object.entries(STATIONS_BY_DISTRICT)) {
    if (roster.some((s) => s.unitId === unitId)) return Number(districtId);
  }
  return undefined;
}

function filterCaseSummaries(
  cases: StationCaseFile[],
  filters: { status?: string; crimeSubHeadId?: string; q?: string },
): StationCaseFile[] {
  return cases.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.crimeSubHeadId && String(c.crimeSubHeadId) !== filters.crimeSubHeadId) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const matchesNumber = c.caseNumber.toLowerCase().includes(q) || (c.crimeNumber?.toLowerCase().includes(q) ?? false);
      const matchesParty = c.parties.some((p) => p.name.real.toLowerCase().includes(q));
      if (!matchesNumber && !matchesParty) return false;
    }
    return true;
  });
}

async function mockDistrictDetail(districtId: number) {
  const [summaries, kpiSummary] = await Promise.all([loadDistrictSummaries(), loadCommandCenterSummary()]);
  const district = summaries.find((d) => d.districtId === districtId);
  const ratio = (district?.caseCount ?? 0) / kpiSummary.kpi.stateCaseCount;
  return {
    kpi: {
      ...kpiSummary.kpi,
      stateCaseCount: Math.round(kpiSummary.kpi.stateCaseCount * ratio),
      topCrimeSubHeadCount: Math.round(kpiSummary.kpi.topCrimeSubHeadCount * ratio),
    },
    categoryMix: kpiSummary.categoryMix.map((slice) => ({ ...slice, count: Math.round(slice.count * ratio) })),
  };
}

async function mockStations(districtId: number) {
  const roster = STATIONS_BY_DISTRICT[districtId] ?? [];
  if (roster.length === 0) return [];
  const counts = await Promise.all(roster.map(async (station) => (await loadStationCases(station.unitId)).length));
  return roster.map((station, i) => ({ unitId: station.unitId, unitName: station.unitName, caseCount: counts[i] }));
}

function toSummary(detail: StationCaseFile) {
  const { narrative: _narrative, parties: _parties, timeline: _timeline, arrests: _arrests, chargesheet: _chargesheet, ...summary } = detail;
  return summary;
}

async function mockCaseDetail(caseId: number) {
  const unitId = Math.floor(caseId / 100_000);
  const stationCases = await loadStationCases(unitId).catch(() => undefined);
  return stationCases?.find((c) => c.caseId === caseId);
}

async function mockCaseExplanation(caseId: number) {
  const detail = await mockCaseDetail(caseId);
  if (!detail) return undefined;
  const stationCases = await loadStationCases(detail.unitId);
  const related = stationCases
    .filter((c) => c.crimeSubHeadId === detail.crimeSubHeadId && c.caseId !== detail.caseId)
    .map((c) => c.caseNumber);
  const confidence = Math.min(0.95, 0.5 + related.length * 0.1 + detail.timeline.length * 0.03);
  const claim = related.length > 0
    ? `${detail.crimeSubHeadName} case ${detail.caseNumber} at ${detail.unitName} shares its crime sub-head ` +
      `and jurisdiction with ${related.length} other case${related.length === 1 ? '' : 's'} registered at this ` +
      'station, consistent with an active local pattern.'
    : `${detail.crimeSubHeadName} case ${detail.caseNumber} at ${detail.unitName} is currently the only case ` +
      'of this crime sub-head registered at this station in the sampled window -- no local repeat pattern detected.';
  return {
    claim,
    confidence,
    confidenceLabel: 'Pattern confidence',
    method: 'Insight & Explanation Agent · case similarity within unit',
    baseline: 'Same crime sub-head, same station, most recent 6 cases',
    generatedAt: detail.timeline[detail.timeline.length - 1].timestamp,
    records: related.length > 0 ? related.slice(0, 10) : [detail.caseNumber],
  };
}

const MAX_SUBGRAPH_NODES = 75;
type MockGraphNode = {
  id: string; type: 'PERSON' | 'CASE' | 'LOCATION'; label: string; confidence: number | null;
  crimeNo: string | null; caseNo: string | null; crimeRegisteredDate: string | null;
  gravityWeight: number | null; moKeywordTags: string[] | null;
  locationKey: string | null; latitude: number | null; longitude: number | null;
};
type MockGraphEdge = { id: string; sourceId: string; targetId: string; type: string; confidence: number | null; sharedCaseLabel: string | null };

function confidenceScoreFor(caseCount: number): number {
  return Math.min(0.97, 0.55 + caseCount * 0.06);
}

function capSubgraph(nodes: MockGraphNode[], edges: MockGraphEdge[]) {
  const seen = new Set<string>();
  const cappedNodes = nodes.filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true))).slice(0, MAX_SUBGRAPH_NODES);
  const nodeIds = new Set(cappedNodes.map((n) => n.id));
  const cappedEdges = edges.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));
  return { nodes: cappedNodes, edges: cappedEdges, generatedAt: '2026-07-24T00:00:00Z' };
}

function personNode(id: number, label: string): MockGraphNode {
  return {
    id: String(id), type: 'PERSON', label, confidence: confidenceScoreFor(1),
    crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null, moKeywordTags: null,
    locationKey: null, latitude: null, longitude: null,
  };
}
function caseNode(t: NetworkCaseTuple): MockGraphNode {
  return {
    id: `case-${t.caseId}`, type: 'CASE', label: t.caseNumber, confidence: null,
    crimeNo: t.caseNumber, caseNo: t.caseNumber, crimeRegisteredDate: null, gravityWeight: null, moKeywordTags: null,
    locationKey: null, latitude: null, longitude: null,
  };
}
function locationNode(t: NetworkCaseTuple): MockGraphNode {
  return {
    id: `location-${t.unitId}`, type: 'LOCATION', label: t.unitName, confidence: null,
    crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null, moKeywordTags: null,
    locationKey: t.unitName, latitude: null, longitude: null,
  };
}

function egoNetwork(seedPersonIds: number[], tuples: NetworkCaseTuple[]) {
  const nodes: MockGraphNode[] = [];
  const edges: MockGraphEdge[] = [];
  const seen = new Set<string>();
  function addNode(node: MockGraphNode) {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    nodes.push(node);
  }
  tuples.forEach((t) => {
    if (!seedPersonIds.includes(t.accusedId) && !seedPersonIds.includes(t.victimId)) return;
    addNode(personNode(t.accusedId, t.accusedName));
    addNode(caseNode(t));
    addNode(locationNode(t));
    addNode(personNode(t.victimId, t.victimName));
    edges.push({ id: `acc-${t.accusedId}-${t.caseId}`, sourceId: String(t.accusedId), targetId: `case-${t.caseId}`, type: 'ACCUSED_IN', confidence: null, sharedCaseLabel: null });
    edges.push({ id: `vic-${t.victimId}-${t.caseId}`, sourceId: String(t.victimId), targetId: `case-${t.caseId}`, type: 'VICTIM_IN', confidence: null, sharedCaseLabel: null });
    edges.push({ id: `occ-${t.caseId}-${t.unitId}`, sourceId: `case-${t.caseId}`, targetId: `location-${t.unitId}`, type: 'OCCURRED_AT', confidence: null, sharedCaseLabel: null });
  });
  return capSubgraph(nodes, edges);
}

async function buildSubgraph(focus: string, limit: number, personId: number | undefined, communityId: number | undefined) {
  const tuples = await loadTuples();

  if (focus === 'person' && personId != null) {
    return egoNetwork([personId], tuples);
  }
  if (focus === 'community' && communityId != null) {
    const communities = await loadCommunities();
    const community = communities.find((c) => c.communityId === communityId);
    const memberIds = tuples
      .filter((t) => community?.memberDisplayNames.includes(t.accusedName))
      .map((t) => t.accusedId);
    return egoNetwork(memberIds, tuples);
  }
  const offenders = await loadRepeatOffenders();
  return egoNetwork(offenders.slice(0, limit).map((o) => o.personId), tuples);
}

export async function getMockResponse(
  path: string,
  options: RequestInit,
  token?: string | null,
): Promise<unknown | undefined> {
  if (path === '/api/auth/login' && options.method === 'POST') {
    const { username } = JSON.parse((options.body as string) ?? '{}');
    return mockLogin(username);
  }
  if (path === '/api/me') return MOCK_ME_BY_TOKEN[token ?? ''] ?? MOCK_ME;
  if (path === '/api/command-center/summary') return loadCommandCenterSummary();
  if (path === '/api/alerts/emerging') return [];
  if (path === '/api/sociological/correlation' || path.startsWith('/api/sociological/correlation?')) {
    return loadJson<DistrictCorrelationResponse[]>('/data/mock/aggregates/district-correlation.json');
  }
  if (path === '/api/sociological/predictive-risk' || path.startsWith('/api/sociological/predictive-risk?')) {
    const query = new URLSearchParams(path.split('?')[1] ?? '');
    const all = await loadJson<PredictiveRiskForecastResponse[]>('/data/mock/aggregates/predictive-risk.json');
    const crimeSubHeadId = query.get('crimeSubHeadId');
    return crimeSubHeadId ? all.filter((f) => f.crimeSubHeadId === Number(crimeSubHeadId)) : all;
  }
  if (path === '/api/sociological/case-anomalies' || path.startsWith('/api/sociological/case-anomalies?')) {
    const query = new URLSearchParams(path.split('?')[1] ?? '');
    const all = await loadJson<CaseAnomalyResponse[]>('/data/mock/aggregates/case-anomalies.json');
    const crimeSubHeadId = query.get('crimeSubHeadId');
    return crimeSubHeadId ? all.filter((a) => (a as unknown as { crimeSubHeadId?: number }).crimeSubHeadId === Number(crimeSubHeadId)) : all;
  }
  if (path === '/api/geo/districts') return loadDistrictSummaries();
  if (path === '/api/geo/districts/boundaries') return loadBoundaries();
  if (path === '/api/geo/districts/time-of-day') return loadJson('/data/mock/aggregates/time-of-day.json');

  const stationMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations$/);
  if (stationMatch) return mockStations(Number(stationMatch[1]));

  const stationBoundariesMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/stations\/boundaries$/);
  if (stationBoundariesMatch) return loadStationBoundaries(Number(stationBoundariesMatch[1]));

  const districtDetailMatch = path.match(/^\/api\/geo\/districts\/(\d+)\/summary$/);
  if (districtDetailMatch) return mockDistrictDetail(Number(districtDetailMatch[1]));

  const stationIncidentsMatch = path.match(/^\/api\/geo\/stations\/(\d+)\/incidents$/);
  if (stationIncidentsMatch) {
    const unitId = Number(stationIncidentsMatch[1]);
    const districtId = findStationDistrictId(unitId);
    if (districtId == null) return [];
    const cases = await loadStationCases(unitId).catch(() => []);
    return cases.map((c) => ({
      caseMasterId: c.caseId,
      crimeNo: c.caseNumber,
      latitude: c.location?.lat ?? 0,
      longitude: c.location?.lng ?? 0,
    }));
  }

  if (path.startsWith('/api/cases?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const unitId = Number(query.get('unitId'));
    const unitName = findStationName(unitId);
    if (!unitName) return [];
    const all = await loadStationCases(unitId).catch(() => []);
    return filterCaseSummaries(all, {
      status: query.get('status') ?? undefined,
      crimeSubHeadId: query.get('crimeSubHeadId') ?? undefined,
      q: query.get('q') ?? undefined,
    }).map(toSummary);
  }

  const caseDetailMatch = path.match(/^\/api\/cases\/(\d+)$/);
  if (caseDetailMatch) return mockCaseDetail(Number(caseDetailMatch[1]));

  const caseExplainMatch = path.match(/^\/api\/cases\/(\d+)\/explain$/);
  if (caseExplainMatch) return mockCaseExplanation(Number(caseExplainMatch[1]));

  if (path.startsWith('/api/network/search?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const q = (query.get('q') ?? '').toLowerCase();
    const limit = Number(query.get('limit') ?? 10);
    if (q.length < 2) return [];
    const index = await loadSearchIndex();
    return index
      .filter((e) => e.label.toLowerCase().includes(q))
      .slice(0, limit)
      .map((e) => ({
        id: e.id, type: e.type, label: e.label, confidence: e.type === 'PERSON' ? confidenceScoreFor(1) : null,
        crimeNo: null, caseNo: null, crimeRegisteredDate: null, gravityWeight: null, moKeywordTags: null,
        locationKey: null, latitude: null, longitude: null,
      }));
  }

  if (path.startsWith('/api/network/subgraph?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    return buildSubgraph(
      query.get('focus') ?? 'top-offenders',
      Number(query.get('limit') ?? 10),
      query.get('personId') ? Number(query.get('personId')) : undefined,
      query.get('communityId') ? Number(query.get('communityId')) : undefined,
    );
  }

  if (path.startsWith('/api/network/repeat-offenders?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const minCases = Number(query.get('minCases') ?? 2);
    const limit = Number(query.get('limit') ?? 10);
    const all = await loadRepeatOffenders();
    return all.filter((o) => o.caseCount >= minCases).slice(0, limit);
  }

  if (path.startsWith('/api/network/communities?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const minSize = Number(query.get('minSize') ?? 3);
    const all = await loadCommunities();
    return all.filter((c) => c.size >= minSize);
  }

  if (path.startsWith('/api/network/path?')) {
    return null; // path-finding over the full generated graph is out of scope for this pivot's mock layer
  }

  return undefined;
}
