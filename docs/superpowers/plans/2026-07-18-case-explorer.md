# Case Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Case Explorer screen (station-scoped case worklist + case detail page) at `/case-explorer` and `/case-explorer/:caseId`, replacing the current placeholder for the Investigator and Station Supervisor roles.

**Architecture:** A new `caseApi.ts` module (interfaces + fetch functions + React Query hooks) following the existing `geoApi.ts`/`alertsApi.ts` pattern, backed in mock mode by deterministic generated case data in `mockData.ts`. Two new screen components (`CaseExplorerScreen`, `CaseDetailScreen`) reuse existing design-system pieces (`Header`, `PiiField`) and existing list/breadcrumb/chip CSS conventions.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest + Testing Library, existing mock-mode fetch layer (`src/api/client.ts`).

## Global Constraints

- No `Math.random()` in any mock data generator — results must be deterministic per input so tests stay stable (established convention, see `mockStations`/`timeOfDayShares` in `mockData.ts`).
- Read-only screen: no case status updates, notes, or reassignment in this plan.
- Both Investigator and Station Supervisor see the same station-scoped case pool (no per-investigator assignment filtering).
- Every status value renders through one shared `caseStatusLabel()` helper (and `caseStatusChipClass()` for styling) so wording/styling can't drift between the list, detail header, and timeline.
- Follow existing conventions exactly: API module shape (`getX`/`useX` pairs via `apiFetch`), list markup (`<ul className="x-list"><li className="x-list-row">`), loading/error patterns (`role="alert"` + retry button) from `CommandCenterScreen.tsx`.

Spec: `docs/superpowers/specs/2026-07-18-case-explorer-design.md`

---

### Task 1: Station identity — `unitId` on the logged-in user + mock login personas

**Files:**
- Modify: `src/api/meApi.ts`
- Modify: `src/api/meApi.test.tsx`
- Modify: `src/api/client.ts`
- Modify: `src/api/mockData.ts`
- Modify: `src/api/mockData.test.ts`

**Interfaces:**
- Produces: `MeResponse.unitId: number | null` — read by `CaseExplorerScreen` in Task 6 via `useMe(token)`.
- Produces: mock login personas `demo.investigator` / `demo.supervisor`, each landing at a real station (`unitId: 176`, "Whitefield PS", district 5 — the same station already used for the Whitefield alert in `MOCK_ALERTS`).

Today `getMockResponse('/api/auth/login', ...)` always returns `{ token: 'mock-token', roles: ['SCRB_ANALYST'] }` regardless of username, and `getMockResponse('/api/me', ...)` always returns the same `MOCK_ME` object — there is no way to reach `/case-explorer` as an Investigator/Station Supervisor in mock mode today. This task threads the auth token through to `getMockResponse` so `/api/me` can return a persona-specific profile, and makes `/api/auth/login` return a distinct token per demo username.

- [ ] **Step 1: Write the failing test for `MeResponse.unitId`**

Modify `src/api/meApi.test.tsx` — add `unitId: null` to the existing `sampleMe` fixture (the type will require it once Step 2 lands):

```tsx
const sampleMe: MeResponse = {
  username: 'demo.analyst',
  firstName: 'R.',
  rank: 'SCRB Analyst',
  unit: 'State CID HQ',
  unitId: null,
  roles: ['SCRB_ANALYST'],
};
```

- [ ] **Step 2: Run the type check to confirm it currently fails**

Run: `npx tsc -b --noEmit`
Expected: FAIL — `Object literal may only specify known properties, and 'unitId' does not exist in type 'MeResponse'.`

- [ ] **Step 3: Add `unitId` to `MeResponse`**

Modify `src/api/meApi.ts`:

```ts
export interface MeResponse {
  username: string;
  firstName: string;
  rank: string | null;
  unit: string | null;
  unitId: number | null;
  roles: string[];
}
```

- [ ] **Step 4: Run the type check and the meApi test to confirm they pass**

Run: `npx tsc -b --noEmit && npx vitest run src/api/meApi.test.tsx`
Expected: both PASS

- [ ] **Step 5: Write the failing tests for persona-aware mock login and `/api/me`**

Modify `src/api/mockData.test.ts` — add two new `describe` blocks:

```ts
describe('getMockResponse auth login personas', () => {
  it('returns the Investigator role and a distinct token for the investigator demo persona', async () => {
    const result = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.investigator', password: 'x' }),
    });
    expect(result).toEqual({ token: 'mock-token-investigator', roles: ['INVESTIGATOR'] });
  });

  it('returns the Station Supervisor role and a distinct token for the supervisor demo persona', async () => {
    const result = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.supervisor', password: 'x' }),
    });
    expect(result).toEqual({ token: 'mock-token-supervisor', roles: ['STATION_SUPERVISOR'] });
  });

  it('falls back to the SCRB Analyst persona for any other username', async () => {
    const result = await getMockResponse('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo.analyst', password: 'x' }),
    });
    expect(result).toEqual({ token: 'mock-token', roles: ['SCRB_ANALYST'] });
  });
});

describe('getMockResponse /api/me by persona', () => {
  it('returns the investigator profile with a real station unitId for the investigator token', async () => {
    const result = await getMockResponse('/api/me', { method: 'GET' }, 'mock-token-investigator');
    expect(result).toMatchObject({ roles: ['INVESTIGATOR'], unitId: 176, unit: 'Whitefield PS' });
  });

  it('returns the supervisor profile with a real station unitId for the supervisor token', async () => {
    const result = await getMockResponse('/api/me', { method: 'GET' }, 'mock-token-supervisor');
    expect(result).toMatchObject({ roles: ['STATION_SUPERVISOR'], unitId: 176, unit: 'Whitefield PS' });
  });

  it('returns the default SCRB Analyst profile with unitId null for the default token', async () => {
    const result = await getMockResponse('/api/me', { method: 'GET' }, 'mock-token');
    expect(result).toMatchObject({ roles: ['SCRB_ANALYST'], unitId: null });
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/api/mockData.test.ts -t "personas"`
Expected: FAIL — login always returns the SCRB Analyst token/roles regardless of username; `/api/me` doesn't accept a third argument and always returns the single `MOCK_ME`.

- [ ] **Step 7: Thread `token` into `getMockResponse` in the fetch client**

Modify `src/api/client.ts` — change the mock-mode branch inside `apiFetch`:

```ts
  if (mockModeEnabled()) {
    const mock = await getMockResponse(path, options, token);
    if (mock !== undefined) return mock as T;
  }
```

- [ ] **Step 8: Add login personas and persona-aware `/api/me` to `mockData.ts`**

Modify `src/api/mockData.ts`:

1. Add `unitId: null` to the existing `MOCK_ME` object:

```ts
const MOCK_ME = {
  username: 'demo.analyst',
  firstName: 'Demo',
  rank: 'SCRB Analyst',
  unit: 'State Crime Records Bureau',
  unitId: null as number | null,
  roles: ['SCRB_ANALYST'],
};
```

2. Add the persona map and two new profile objects, directly below `MOCK_ME`:

```ts
// Distinct demo personas so mock mode can actually reach /case-explorer -- the real
// backend issues one token per user; here the token itself encodes which demo persona
// is "logged in" so /api/me (which has no other way to know who's asking) can look up
// the right profile.
const MOCK_ME_INVESTIGATOR = {
  username: 'demo.investigator',
  firstName: 'Demo',
  rank: 'Investigator',
  unit: 'Whitefield PS',
  unitId: 176,
  roles: ['INVESTIGATOR'],
};

const MOCK_ME_SUPERVISOR = {
  username: 'demo.supervisor',
  firstName: 'Demo',
  rank: 'Station Supervisor',
  unit: 'Whitefield PS',
  unitId: 176,
  roles: ['STATION_SUPERVISOR'],
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
```

3. Update the `getMockResponse` signature and the two affected route handlers:

```ts
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
```

(The rest of `getMockResponse` is unchanged.)

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run src/api/mockData.test.ts src/api/client.test.ts src/api/meApi.test.tsx`
Expected: all PASS

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test`
Expected: all PASS (no regressions in `CommandCenterScreen.test.tsx` — `MOCK_ME`'s existing shape is unchanged aside from the new `unitId: null` field).

```bash
git add src/api/meApi.ts src/api/meApi.test.tsx src/api/client.ts src/api/mockData.ts src/api/mockData.test.ts
git commit -m "Add station identity to the logged-in user and mock login personas"
```

---

### Task 2: Deterministic case list mock data + `/api/cases` route

**Files:**
- Modify: `src/api/mockData.ts`
- Modify: `src/api/mockData.test.ts`

**Interfaces:**
- Produces: `mockCaseSummaries(unitId, unitName)` — a pure function returning 6 deterministic case summary objects, consumed by Task 3's `mockCaseDetail` and reused directly by the `/api/cases` route added here.
- Produces: mock route `GET /api/cases?unitId=&status=&crimeSubHeadId=&q=`, consumed by `caseApi.ts` (Task 4).

- [ ] **Step 1: Write the failing tests**

Modify `src/api/mockData.test.ts` — add:

```ts
describe('getMockResponse cases list', () => {
  it('returns a deterministic, station-scoped case list for a given unitId', async () => {
    const first = await getMockResponse('/api/cases?unitId=176', { method: 'GET' });
    const second = await getMockResponse('/api/cases?unitId=176', { method: 'GET' });
    expect(first).toEqual(second);
    expect(first).toHaveLength(6);
  });

  it('computes the expected fields for the first generated case at Whitefield PS', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176', { method: 'GET' })) as Array<{
      caseId: number;
      caseNumber: string;
      unitName: string;
      crimeSubHeadName: string;
      status: string;
      firDate: string;
    }>;
    expect(result[0]).toMatchObject({
      caseId: 176000,
      caseNumber: '276/2026',
      unitName: 'Whitefield PS',
      crimeSubHeadName: 'Chain Snatching',
      status: 'registered',
      firDate: '2026-05-26',
    });
  });

  it('filters by status', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176&status=closed', {
      method: 'GET',
    })) as Array<{ status: string }>;
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.status === 'closed')).toBe(true);
  });

  it('filters by free-text search over the case number', async () => {
    const result = (await getMockResponse('/api/cases?unitId=176&q=276%2F2026', {
      method: 'GET',
    })) as Array<{ caseNumber: string }>;
    expect(result).toEqual([expect.objectContaining({ caseNumber: '276/2026' })]);
  });

  it('returns an empty array for a unitId with no known station', async () => {
    const result = await getMockResponse('/api/cases?unitId=999999', { method: 'GET' });
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/api/mockData.test.ts -t "cases list"`
Expected: FAIL — `/api/cases` currently falls through to `return undefined`.

- [ ] **Step 3: Add the crime-type taxonomy, case generator, and `/api/cases` route**

Modify `src/api/mockData.ts` — add near the bottom, above `getMockResponse`:

```ts
export type CaseStatus = 'registered' | 'under_investigation' | 'closed';

const CASE_CRIME_TYPES: Array<{ crimeSubHeadId: number; crimeSubHeadName: string; crimeHeadId: number }> = [
  { crimeSubHeadId: 101, crimeSubHeadName: 'Theft of Motor Vehicle', crimeHeadId: 2 },
  { crimeSubHeadId: 102, crimeSubHeadName: 'House Break-in', crimeHeadId: 2 },
  { crimeSubHeadId: 103, crimeSubHeadName: 'Chain Snatching', crimeHeadId: 1 },
  { crimeSubHeadId: 104, crimeSubHeadName: 'Cyber Financial Fraud', crimeHeadId: 5 },
  { crimeSubHeadId: 105, crimeSubHeadName: 'Assault', crimeHeadId: 1 },
  { crimeSubHeadId: 106, crimeSubHeadName: 'Cattle Theft', crimeHeadId: 2 },
];

const CASE_STATUSES: CaseStatus[] = ['registered', 'under_investigation', 'closed'];
const CASES_PER_STATION = 6;

function offsetDate(base: string, deltaDays: number): string {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function findStationName(unitId: number): string | undefined {
  for (const roster of Object.values(STATIONS_BY_DISTRICT)) {
    const match = roster.find((station) => station.unitId === unitId);
    if (match) return match.unitName;
  }
  return undefined;
}

// Deterministic per-station case list -- no Math.random(), so a given unitId always
// produces the same 6 cases (stable across runs and tests). index rotates through
// crime type and status so a station's list isn't visually uniform.
function mockCaseSummaries(unitId: number, unitName: string) {
  return Array.from({ length: CASES_PER_STATION }, (_, index) => {
    const crimeType = CASE_CRIME_TYPES[(unitId + index) % CASE_CRIME_TYPES.length];
    const status = CASE_STATUSES[index % CASE_STATUSES.length];
    const dayOffset = (unitId % 10) + index * 5;
    return {
      caseId: unitId * 1000 + index,
      caseNumber: `${100 + unitId + index}/2026`,
      unitId,
      unitName,
      crimeSubHeadId: crimeType.crimeSubHeadId,
      crimeSubHeadName: crimeType.crimeSubHeadName,
      status,
      firDate: offsetDate('2026-06-01', -dayOffset),
    };
  });
}

function filterCaseSummaries(
  cases: ReturnType<typeof mockCaseSummaries>,
  filters: { status?: string; crimeSubHeadId?: string; q?: string },
) {
  return cases.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.crimeSubHeadId && String(c.crimeSubHeadId) !== filters.crimeSubHeadId) return false;
    if (filters.q && !c.caseNumber.toLowerCase().includes(filters.q.toLowerCase())) return false;
    return true;
  });
}
```

(Task 3 extends `filterCaseSummaries` to also match a case's party names, once party data exists.)

Then add the route handler inside `getMockResponse`, after the existing `districtDetailMatch` block and before `return undefined;`:

```ts
  if (path.startsWith('/api/cases?')) {
    const query = new URLSearchParams(path.split('?')[1]);
    const unitId = Number(query.get('unitId'));
    const unitName = findStationName(unitId);
    if (!unitName) return [];
    const all = mockCaseSummaries(unitId, unitName);
    return filterCaseSummaries(all, {
      status: query.get('status') ?? undefined,
      crimeSubHeadId: query.get('crimeSubHeadId') ?? undefined,
      q: query.get('q') ?? undefined,
    });
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/api/mockData.test.ts`
Expected: all PASS

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/api/mockData.ts src/api/mockData.test.ts
git commit -m "Add deterministic case list mock data and the /api/cases route"
```

---

### Task 3: Case detail mock data (parties, timeline, narrative) + `/api/cases/:caseId` route

**Files:**
- Modify: `src/api/mockData.ts`
- Modify: `src/api/mockData.test.ts`

**Interfaces:**
- Consumes: `mockCaseSummaries`, `findStationName`, `offsetDate`, `filterCaseSummaries` (Task 2).
- Produces: `mockCaseDetail(caseId)`, consumed by the new `/api/cases/:caseId` route here and by `filterCaseSummaries`'s extended party-name search (also added in this task).
- Produces: mock route `GET /api/cases/:caseId`, consumed by `caseApi.ts` (Task 4).

- [ ] **Step 1: Write the failing tests**

Modify `src/api/mockData.test.ts` — add:

```ts
describe('getMockResponse case detail', () => {
  it('returns full detail for a generated caseId, including narrative, parties, and a single-entry timeline for a registered case', async () => {
    const result = (await getMockResponse('/api/cases/176000', { method: 'GET' })) as {
      caseNumber: string;
      narrative: string;
      parties: Array<{ role: string }>;
      timeline: Array<{ status: string; timestamp: string; note: string }>;
    };
    expect(result.caseNumber).toBe('276/2026');
    expect(result.narrative.length).toBeGreaterThan(0);
    expect(result.parties.map((p) => p.role)).toEqual(['victim', 'accused']);
    expect(result.timeline).toEqual([{ status: 'registered', timestamp: '2026-05-26', note: 'FIR registered.' }]);
  });

  it('masks PII in party fields while preserving the real value', async () => {
    const result = (await getMockResponse('/api/cases/176000', { method: 'GET' })) as {
      parties: Array<{ name: { masked: string; real: string } }>;
    };
    expect(result.parties[0].name.real).toBe('Ramesh Kumar');
    expect(result.parties[0].name.masked).toBe('R***** K****');
  });

  it('builds a three-entry timeline for a closed case', async () => {
    // index 2 at unitId 176 has status 'closed' (see Task 2's status rotation)
    const result = (await getMockResponse('/api/cases/176002', { method: 'GET' })) as {
      timeline: Array<{ status: string }>;
    };
    expect(result.timeline.map((t) => t.status)).toEqual(['registered', 'under_investigation', 'closed']);
  });

  it('returns undefined for an unknown caseId', async () => {
    const result = await getMockResponse('/api/cases/999999000', { method: 'GET' });
    expect(result).toBeUndefined();
  });
});

describe('getMockResponse cases list free-text search over party names', () => {
  it('matches a case by a party real name even though the case number does not match', async () => {
    // index 0 at unitId 176 has victim 'Ramesh Kumar' (see the VICTIM_NAMES pool below)
    const result = (await getMockResponse('/api/cases?unitId=176&q=ramesh', {
      method: 'GET',
    })) as Array<{ caseId: number }>;
    expect(result.map((c) => c.caseId)).toContain(176000);
  });

  it('excludes cases whose case number and party names both fail to match', async () => {
    const result = await getMockResponse('/api/cases?unitId=176&q=nonexistent-name', { method: 'GET' });
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/api/mockData.test.ts -t "case detail"`
Expected: FAIL — there is no `mockCaseDetail` or `/api/cases/:caseId` route yet, and the party-name search tests fail since `filterCaseSummaries` only checks the case number so far.

- [ ] **Step 3: Add `mockCaseDetail`, masking, narrative, and timeline helpers**

Modify `src/api/mockData.ts` — add the following above `filterCaseSummaries` (defined in Task 2), since Step 4 below extends `filterCaseSummaries` to call `mockCaseDetail`:

```ts
const VICTIM_NAMES = ['Ramesh Kumar', 'Sunita Devi', 'Arjun Rao', 'Lakshmi Bai', 'Manjunath Gowda', 'Fathima Begum'];
const ACCUSED_NAMES = ['Suresh Naik', 'Vijay Kumar', 'Rakesh Yadav', 'Prakash Shetty', 'Imran Khan', 'Ganesh Bhat'];
const ADDRESS_STREETS = ['12 MG Road', '45 Church Street', '7 Station Road', '3 Market Lane', '21 Temple Street', '9 Ring Road'];

function maskName(real: string): string {
  return real
    .split(' ')
    .map((part) => part[0] + '*'.repeat(Math.max(part.length - 1, 1)))
    .join(' ');
}

function maskPhone(real: string): string {
  return `${real.slice(0, 2)}${'*'.repeat(real.length - 4)}${real.slice(-2)}`;
}

function maskAddress(real: string): string {
  const [street, ...rest] = real.split(', ');
  return ['*'.repeat(street.length), ...rest].join(', ');
}

function mockParty(role: 'victim' | 'accused', index: number) {
  const names = role === 'victim' ? VICTIM_NAMES : ACCUSED_NAMES;
  const real = names[index % names.length];
  const phone = `98${String(10000000 + index * 37).slice(0, 8)}`;
  const address = `${ADDRESS_STREETS[index % ADDRESS_STREETS.length]}, Karnataka`;
  return {
    role,
    name: { masked: maskName(real), real },
    phone: { masked: maskPhone(phone), real: phone },
    address: { masked: maskAddress(address), real: address },
  };
}

function mockNarrative(crimeSubHeadName: string, unitName: string): string {
  return `${crimeSubHeadName} reported to ${unitName}. Field verification and evidence collection are logged in the case diary.`;
}

function mockTimeline(status: CaseStatus, firDate: string) {
  const timeline = [{ status: 'registered' as CaseStatus, timestamp: firDate, note: 'FIR registered.' }];
  if (status === 'registered') return timeline;
  timeline.push({
    status: 'under_investigation' as CaseStatus,
    timestamp: offsetDate(firDate, 3),
    note: 'Investigation taken up by the station.',
  });
  if (status === 'under_investigation') return timeline;
  timeline.push({ status: 'closed' as CaseStatus, timestamp: offsetDate(firDate, 21), note: 'Case closed.' });
  return timeline;
}

function mockCaseDetail(caseId: number) {
  const unitId = Math.floor(caseId / 1000);
  const index = caseId % 1000;
  const unitName = findStationName(unitId);
  if (!unitName) return undefined;
  const summary = mockCaseSummaries(unitId, unitName)[index];
  if (!summary) return undefined;
  return {
    ...summary,
    narrative: mockNarrative(summary.crimeSubHeadName, unitName),
    parties: [mockParty('victim', index), mockParty('accused', index + 1)],
    timeline: mockTimeline(summary.status, summary.firDate),
  };
}
```

Then add the route handler inside `getMockResponse`, directly after the `/api/cases?` block added in Task 2:

```ts
  const caseDetailMatch = path.match(/^\/api\/cases\/(\d+)$/);
  if (caseDetailMatch) return mockCaseDetail(Number(caseDetailMatch[1]));
```

- [ ] **Step 4: Extend `filterCaseSummaries` to also match a party's real name**

Modify `src/api/mockData.ts` — replace the `q` filter line added in Task 2 with:

```ts
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const matchesNumber = c.caseNumber.toLowerCase().includes(q);
      const detail = mockCaseDetail(c.caseId);
      const matchesParty = detail?.parties.some((p) => p.name.real.toLowerCase().includes(q)) ?? false;
      if (!matchesNumber && !matchesParty) return false;
    }
```

so the full `filterCaseSummaries` now reads:

```ts
function filterCaseSummaries(
  cases: ReturnType<typeof mockCaseSummaries>,
  filters: { status?: string; crimeSubHeadId?: string; q?: string },
) {
  return cases.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.crimeSubHeadId && String(c.crimeSubHeadId) !== filters.crimeSubHeadId) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const matchesNumber = c.caseNumber.toLowerCase().includes(q);
      const detail = mockCaseDetail(c.caseId);
      const matchesParty = detail?.parties.some((p) => p.name.real.toLowerCase().includes(q)) ?? false;
      if (!matchesNumber && !matchesParty) return false;
    }
    return true;
  });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/api/mockData.test.ts`
Expected: all PASS

- [ ] **Step 6: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/api/mockData.ts src/api/mockData.test.ts
git commit -m "Add case detail mock data (parties, timeline, narrative) and the case detail route"
```

---

### Task 4: `caseApi.ts` module

**Files:**
- Create: `src/api/caseApi.ts`
- Create: `src/api/caseApi.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/api/client.ts` (existing).
- Produces: `CaseStatus`, `CaseSummaryResponse`, `CasePartyResponse`, `CaseTimelineEntryResponse`, `CaseDetailResponse`, `CaseFilters` types; `getCases`, `useCases`, `getCaseDetail`, `useCaseDetail`, `caseStatusLabel`, `caseStatusChipClass` — all consumed by `CaseList` (Task 5), `CaseExplorerScreen` (Task 6), and `CaseDetailScreen` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `src/api/caseApi.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as client from './client';
import {
  getCases,
  useCases,
  getCaseDetail,
  useCaseDetail,
  caseStatusLabel,
  caseStatusChipClass,
  type CaseSummaryResponse,
  type CaseDetailResponse,
} from './caseApi';

const sampleCases: CaseSummaryResponse[] = [
  {
    caseId: 176000,
    caseNumber: '276/2026',
    unitId: 176,
    unitName: 'Whitefield PS',
    crimeSubHeadId: 103,
    crimeSubHeadName: 'Chain Snatching',
    status: 'registered',
    firDate: '2026-05-26',
  },
];

describe('getCases', () => {
  it('fetches /api/cases with unitId and any set filters as query params', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleCases);
    await getCases('test-token', 176, { status: 'closed', q: 'ramesh' });
    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/api/cases?unitId=176&status=closed&q=ramesh',
      {},
      'test-token',
    );
  });

  it('omits unset filters from the query string', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleCases);
    await getCases('test-token', 176, {});
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/cases?unitId=176', {}, 'test-token');
  });
});

describe('getCaseDetail', () => {
  it('fetches /api/cases/{caseId} with the auth token', async () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({} as CaseDetailResponse);
    await getCaseDetail('test-token', 176000);
    expect(apiFetchSpy).toHaveBeenCalledWith('/api/cases/176000', {}, 'test-token');
  });
});

describe('useCases', () => {
  it('returns the fetched cases once loaded', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleCases);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCases('test-token', 176, {}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleCases);
  });

  it('does not fetch when unitId is null', () => {
    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue(sampleCases);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    renderHook(() => useCases('test-token', null, {}), { wrapper });

    expect(apiFetchSpy).not.toHaveBeenCalled();
  });
});

describe('useCaseDetail', () => {
  it('returns the fetched case detail once loaded', async () => {
    const detail = { ...sampleCases[0], narrative: 'x', parties: [], timeline: [] } as CaseDetailResponse;
    vi.spyOn(client, 'apiFetch').mockResolvedValue(detail);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCaseDetail('test-token', 176000), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(detail);
  });
});

describe('caseStatusLabel', () => {
  it('maps every status to a plain-language label', () => {
    expect(caseStatusLabel('registered')).toBe('Registered');
    expect(caseStatusLabel('under_investigation')).toBe('Under Investigation');
    expect(caseStatusLabel('closed')).toBe('Closed');
  });
});

describe('caseStatusChipClass', () => {
  it('maps every status to a chip CSS class', () => {
    expect(caseStatusChipClass('registered')).toBe('status-neutral');
    expect(caseStatusChipClass('under_investigation')).toBe('status-warning');
    expect(caseStatusChipClass('closed')).toBe('status-good');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/caseApi.test.ts`
Expected: FAIL — `src/api/caseApi.ts` does not exist yet.

- [ ] **Step 3: Implement `caseApi.ts`**

Create `src/api/caseApi.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export type CaseStatus = 'registered' | 'under_investigation' | 'closed';

export interface CaseSummaryResponse {
  caseId: number;
  caseNumber: string;
  unitId: number;
  unitName: string;
  crimeSubHeadId: number;
  crimeSubHeadName: string;
  status: CaseStatus;
  firDate: string;
}

export interface CasePartyResponse {
  role: 'victim' | 'accused';
  name: { masked: string; real: string };
  phone: { masked: string; real: string };
  address: { masked: string; real: string };
}

export interface CaseTimelineEntryResponse {
  status: CaseStatus;
  timestamp: string;
  note: string;
}

export interface CaseDetailResponse extends CaseSummaryResponse {
  narrative: string;
  parties: CasePartyResponse[];
  timeline: CaseTimelineEntryResponse[];
}

export interface CaseFilters {
  status?: CaseStatus;
  crimeSubHeadId?: number;
  q?: string;
}

const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  registered: 'Registered',
  under_investigation: 'Under Investigation',
  closed: 'Closed',
};

const CASE_STATUS_CHIP_CLASS: Record<CaseStatus, string> = {
  registered: 'status-neutral',
  under_investigation: 'status-warning',
  closed: 'status-good',
};

export function caseStatusLabel(status: CaseStatus): string {
  return CASE_STATUS_LABEL[status];
}

export function caseStatusChipClass(status: CaseStatus): string {
  return CASE_STATUS_CHIP_CLASS[status];
}

export function getCases(token: string | null, unitId: number, filters: CaseFilters): Promise<CaseSummaryResponse[]> {
  const params = new URLSearchParams({ unitId: String(unitId) });
  if (filters.status) params.set('status', filters.status);
  if (filters.crimeSubHeadId != null) params.set('crimeSubHeadId', String(filters.crimeSubHeadId));
  if (filters.q) params.set('q', filters.q);
  return apiFetch<CaseSummaryResponse[]>(`/api/cases?${params.toString()}`, {}, token);
}

export function getCaseDetail(token: string | null, caseId: number): Promise<CaseDetailResponse> {
  return apiFetch<CaseDetailResponse>(`/api/cases/${caseId}`, {}, token);
}

export function useCases(token: string | null, unitId: number | null, filters: CaseFilters) {
  return useQuery({
    queryKey: ['cases', unitId, filters],
    queryFn: () => getCases(token, unitId as number, filters),
    staleTime: 30_000,
    enabled: token != null && unitId != null,
  });
}

export function useCaseDetail(token: string | null, caseId: number | null) {
  return useQuery({
    queryKey: ['case-detail', caseId],
    queryFn: () => getCaseDetail(token, caseId as number),
    staleTime: 30_000,
    enabled: token != null && caseId != null,
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/api/caseApi.test.ts`
Expected: all PASS

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/api/caseApi.ts src/api/caseApi.test.ts
git commit -m "Add caseApi module: types, fetch functions, and React Query hooks"
```

---

### Task 5: `CaseList` component

**Files:**
- Create: `src/screens/case-explorer/CaseList.tsx`
- Create: `src/screens/case-explorer/CaseList.test.tsx`
- Modify: `src/design-system/components.css`

**Interfaces:**
- Consumes: `CaseSummaryResponse`, `caseStatusLabel`, `caseStatusChipClass` from `src/api/caseApi.ts` (Task 4).
- Produces: `<CaseList cases={CaseSummaryResponse[]} />`, consumed by `CaseExplorerScreen` (Task 6).

- [ ] **Step 1: Write the failing test**

Create `src/screens/case-explorer/CaseList.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaseList } from './CaseList';
import type { CaseSummaryResponse } from '../../api/caseApi';

const cases: CaseSummaryResponse[] = [
  {
    caseId: 176000,
    caseNumber: '276/2026',
    unitId: 176,
    unitName: 'Whitefield PS',
    crimeSubHeadId: 103,
    crimeSubHeadName: 'Chain Snatching',
    status: 'registered',
    firDate: '2026-05-26',
  },
];

describe('CaseList', () => {
  it('renders a row per case, linking to its detail page', () => {
    render(
      <MemoryRouter>
        <CaseList cases={cases} />
      </MemoryRouter>,
    );

    expect(screen.getByText('276/2026')).toBeInTheDocument();
    expect(screen.getByText('Chain Snatching')).toBeInTheDocument();
    expect(screen.getByText('Registered')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/case-explorer/176000');
  });

  it('shows an empty state when there are no cases', () => {
    render(
      <MemoryRouter>
        <CaseList cases={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText('No cases match these filters.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/case-explorer/CaseList.test.tsx`
Expected: FAIL — `CaseList.tsx` does not exist yet.

- [ ] **Step 3: Implement `CaseList`**

Create `src/screens/case-explorer/CaseList.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { caseStatusChipClass, caseStatusLabel, type CaseSummaryResponse } from '../../api/caseApi';

interface CaseListProps {
  cases: CaseSummaryResponse[];
}

export function CaseList({ cases }: CaseListProps) {
  if (cases.length === 0) {
    return <p>No cases match these filters.</p>;
  }

  return (
    <ul className="case-list">
      {cases.map((c) => (
        <li key={c.caseId} className="case-list-row">
          <Link to={`/case-explorer/${c.caseId}`}>
            <span className="mono">{c.caseNumber}</span>
            <span>{c.crimeSubHeadName}</span>
            <span className={`chip ${caseStatusChipClass(c.status)}`}>{caseStatusLabel(c.status)}</span>
            <span className="case-date">{c.firDate}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Add CSS for the case list, status chips, and filter bar**

Modify `src/design-system/components.css` — append:

```css
.case-list { list-style: none; margin: 16px 24px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.case-list-row a { display: grid; grid-template-columns: 110px 1fr 140px 100px; align-items: center; gap: 10px; padding: 10px 12px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; font-size: 12.5px; color: inherit; text-decoration: none; }
.case-list-row a:hover { border-color: var(--real); }
.case-list-row.skeleton { height: 42px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; opacity: 0.5; }
.case-date { color: var(--muted); text-align: right; }

.chip.status-neutral { background: var(--line); color: var(--muted); }
.chip.status-warning { background: var(--status-warning-fill); color: var(--status-warning-ink); }
.chip.status-good { background: var(--status-good-fill); color: var(--status-good-ink); }

.case-filters { display: flex; gap: 8px; align-items: center; }
.case-filters select, .case-filters input[type="search"] { font: inherit; font-size: 12.5px; padding: 6px 9px; border: 1px solid var(--line); border-radius: 7px; background: var(--panel); color: var(--text); }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/screens/case-explorer/CaseList.test.tsx`
Expected: PASS

- [ ] **Step 6: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/screens/case-explorer/CaseList.tsx src/screens/case-explorer/CaseList.test.tsx src/design-system/components.css
git commit -m "Add CaseList component"
```

---

### Task 6: `CaseExplorerScreen`

**Files:**
- Create: `src/screens/case-explorer/CaseExplorerScreen.tsx`
- Create: `src/screens/case-explorer/CaseExplorerScreen.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`src/auth/AuthContext.tsx`), `Header` (`src/app/Header.tsx`), `useMe` (`src/api/meApi.ts`), `useCases`/`CaseFilters`/`CaseStatus` (`src/api/caseApi.ts`), `CaseList` (Task 5).
- Produces: `<CaseExplorerScreen />`, wired into `/case-explorer` in Task 8.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/case-explorer/CaseExplorerScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as caseApiModule from '../../api/caseApi';
import { CaseExplorerScreen } from './CaseExplorerScreen';

function mockSuccess<T>(data: T) {
  return { data, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() } as unknown as UseQueryResult<
    T,
    Error
  >;
}

const cases: caseApiModule.CaseSummaryResponse[] = [
  {
    caseId: 176000,
    caseNumber: '276/2026',
    unitId: 176,
    unitName: 'Whitefield PS',
    crimeSubHeadId: 103,
    crimeSubHeadName: 'Chain Snatching',
    status: 'registered',
    firDate: '2026-05-26',
  },
];

const me: meApiModule.MeResponse = {
  username: 'demo.investigator',
  firstName: 'Demo',
  rank: 'Investigator',
  unit: 'Whitefield PS',
  unitId: 176,
  roles: ['INVESTIGATOR'],
};

function mockAuth() {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt',
    roles: ['INVESTIGATOR'],
    username: 'demo.investigator',
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.spyOn(meApiModule, 'useMe').mockReturnValue(mockSuccess(me));
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/case-explorer']}>
      <Routes>
        <Route path="/case-explorer" element={<CaseExplorerScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CaseExplorerScreen', () => {
  it('renders the case list once cases load, scoped to the current unitId', async () => {
    mockAuth();
    const useCasesSpy = vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess(cases));

    renderScreen();

    expect(await screen.findByText('276/2026')).toBeInTheDocument();
    expect(useCasesSpy).toHaveBeenCalledWith('jwt', 176, { status: undefined, crimeSubHeadId: undefined, q: undefined });
  });

  it('changing the status filter re-queries with the new status', async () => {
    mockAuth();
    const useCasesSpy = vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess(cases));

    renderScreen();
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'closed');

    expect(useCasesSpy).toHaveBeenLastCalledWith('jwt', 176, {
      status: 'closed',
      crimeSubHeadId: undefined,
      q: undefined,
    });
  });

  it('shows an alert and retry button when the cases query fails', async () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<caseApiModule.CaseSummaryResponse[], Error>);

    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load cases");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows an empty state when no cases match the filters', async () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCases').mockReturnValue(mockSuccess([]));

    renderScreen();

    expect(await screen.findByText('No cases match these filters.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/screens/case-explorer/CaseExplorerScreen.test.tsx`
Expected: FAIL — `CaseExplorerScreen.tsx` does not exist yet.

- [ ] **Step 3: Implement `CaseExplorerScreen`**

Create `src/screens/case-explorer/CaseExplorerScreen.tsx`:

```tsx
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { useMe } from '../../api/meApi';
import { useCases, type CaseFilters, type CaseStatus } from '../../api/caseApi';
import { CaseList } from './CaseList';

const CRIME_TYPE_OPTIONS: Array<{ crimeSubHeadId: number; crimeSubHeadName: string }> = [
  { crimeSubHeadId: 101, crimeSubHeadName: 'Theft of Motor Vehicle' },
  { crimeSubHeadId: 102, crimeSubHeadName: 'House Break-in' },
  { crimeSubHeadId: 103, crimeSubHeadName: 'Chain Snatching' },
  { crimeSubHeadId: 104, crimeSubHeadName: 'Cyber Financial Fraud' },
  { crimeSubHeadId: 105, crimeSubHeadName: 'Assault' },
  { crimeSubHeadId: 106, crimeSubHeadName: 'Cattle Theft' },
];

export function CaseExplorerScreen() {
  const { token } = useAuth();
  const meQuery = useMe(token);
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const [crimeSubHeadId, setCrimeSubHeadId] = useState<number | ''>('');
  const [q, setQ] = useState('');

  const unitId = meQuery.data?.unitId ?? null;
  const filters: CaseFilters = {
    status: status || undefined,
    crimeSubHeadId: crimeSubHeadId || undefined,
    q: q || undefined,
  };
  const casesQuery = useCases(token, unitId, filters);

  const isLoading = meQuery.isLoading || casesQuery.isLoading;
  const isError = meQuery.isError || casesQuery.isError;

  if (isLoading) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <div className="case-list">
            <div className="case-list-row skeleton" />
            <div className="case-list-row skeleton" />
            <div className="case-list-row skeleton" />
          </div>
        </main>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <p role="alert">Couldn't load cases — check your connection and try again.</p>
          <button
            onClick={() => {
              meQuery.refetch();
              casesQuery.refetch();
            }}
          >
            Retry
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Case Explorer">
        <div className="case-filters">
          <select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus | '')} aria-label="Status">
            <option value="">All statuses</option>
            <option value="registered">Registered</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={crimeSubHeadId}
            onChange={(e) => setCrimeSubHeadId(e.target.value ? Number(e.target.value) : '')}
            aria-label="Crime type"
          >
            <option value="">All crime types</option>
            {CRIME_TYPE_OPTIONS.map((option) => (
              <option key={option.crimeSubHeadId} value={option.crimeSubHeadId}>
                {option.crimeSubHeadName}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search case number or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search cases"
          />
        </div>
      </Header>
      <main className="main-single">
        <CaseList cases={casesQuery.data ?? []} />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/screens/case-explorer/CaseExplorerScreen.test.tsx`
Expected: all PASS

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/screens/case-explorer/CaseExplorerScreen.tsx src/screens/case-explorer/CaseExplorerScreen.test.tsx
git commit -m "Add CaseExplorerScreen: filterable, station-scoped case list"
```

---

### Task 7: `CaseDetailScreen`

**Files:**
- Create: `src/screens/case-explorer/CaseDetailScreen.tsx`
- Create: `src/screens/case-explorer/CaseDetailScreen.test.tsx`
- Modify: `src/design-system/components.css`

**Interfaces:**
- Consumes: `useAuth`, `Header`, `PiiField` (`src/design-system/PiiField.tsx`), `useCaseDetail`/`caseStatusLabel`/`caseStatusChipClass` (`src/api/caseApi.ts`), `useParams`/`Link` from `react-router-dom`.
- Produces: `<CaseDetailScreen />`, wired into `/case-explorer/:caseId` in Task 8.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/case-explorer/CaseDetailScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import * as caseApiModule from '../../api/caseApi';
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
  narrative: 'Chain Snatching reported to Whitefield PS.',
  parties: [
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
  it('renders facts, a masked party, and the timeline once the case loads', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    renderScreen();

    expect(screen.getByText('276/2026')).toBeInTheDocument();
    expect(screen.getByText('Under Investigation')).toBeInTheDocument();
    expect(screen.getByText('R***** K****')).toBeInTheDocument();
    expect(screen.queryByText('Ramesh Kumar')).not.toBeInTheDocument();
    expect(screen.getByText('FIR registered.')).toBeInTheDocument();
    expect(screen.getByText('Investigation taken up by the station.')).toBeInTheDocument();
  });

  it('reveals the real value when a PII field is toggled', async () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(mockSuccess(detail));

    renderScreen();
    await userEvent.click(screen.getAllByRole('button', { name: 'Reveal' })[0]);

    expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
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

    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this case");
  });

  it('shows a not-found message with a link back when the case does not exist', () => {
    mockAuth();
    vi.spyOn(caseApiModule, 'useCaseDetail').mockReturnValue(
      mockSuccess<caseApiModule.CaseDetailResponse | undefined>(undefined),
    );

    renderScreen();

    expect(screen.getByText('Case not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Case Explorer' })).toHaveAttribute('href', '/case-explorer');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/screens/case-explorer/CaseDetailScreen.test.tsx`
Expected: FAIL — `CaseDetailScreen.tsx` does not exist yet.

- [ ] **Step 3: Implement `CaseDetailScreen`**

Create `src/screens/case-explorer/CaseDetailScreen.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { PiiField } from '../../design-system/PiiField';
import { caseStatusChipClass, caseStatusLabel, useCaseDetail } from '../../api/caseApi';

export function CaseDetailScreen() {
  const { token } = useAuth();
  const { caseId } = useParams<{ caseId: string }>();
  const caseDetailQuery = useCaseDetail(token, caseId ? Number(caseId) : null);

  if (caseDetailQuery.isLoading) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <p>Loading case…</p>
        </main>
      </>
    );
  }

  if (caseDetailQuery.isError) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <p role="alert">Couldn't load this case — check your connection and try again.</p>
          <button onClick={() => caseDetailQuery.refetch()}>Retry</button>
        </main>
      </>
    );
  }

  const caseDetail = caseDetailQuery.data;
  if (!caseDetail) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <p>Case not found.</p>
          <Link to="/case-explorer">Back to Case Explorer</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Case Explorer" />
      <main className="main-single case-detail">
        <div className="breadcrumb">
          <Link className="breadcrumb-back" to="/case-explorer">Case Explorer</Link>
          <span className="sep">›</span>
          <b>{caseDetail.caseNumber}</b>
        </div>

        <section className="case-facts">
          <h2>{caseDetail.caseNumber}</h2>
          <span className={`chip ${caseStatusChipClass(caseDetail.status)}`}>
            {caseStatusLabel(caseDetail.status)}
          </span>
          <p>
            {caseDetail.crimeSubHeadName} · {caseDetail.unitName} · {caseDetail.firDate}
          </p>
          <p>{caseDetail.narrative}</p>
        </section>

        <section className="case-parties">
          <h3>Parties</h3>
          {caseDetail.parties.map((party, index) => (
            <div key={`${party.role}-${index}`} className="party-card">
              <span className="party-role">{party.role === 'victim' ? 'Victim' : 'Accused'}</span>
              <PiiField masked={party.name.masked} real={party.name.real} />
              <PiiField masked={party.phone.masked} real={party.phone.real} />
              <PiiField masked={party.address.masked} real={party.address.real} />
            </div>
          ))}
        </section>

        <section className="case-timeline">
          <h3>Timeline</h3>
          <ul>
            {caseDetail.timeline.map((entry, index) => (
              <li key={index}>
                <span className="mono">{entry.timestamp}</span>
                <span className={`chip ${caseStatusChipClass(entry.status)}`}>{caseStatusLabel(entry.status)}</span>
                <span>{entry.note}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
```

- [ ] **Step 4: Add CSS for the detail layout, party cards, and timeline**

Modify `src/design-system/components.css` — append:

```css
.case-detail { margin: 16px 24px; display: flex; flex-direction: column; gap: 16px; }
.case-facts h2 { margin: 8px 0 4px; }
.case-parties { display: flex; flex-direction: column; gap: 8px; }
.party-card { display: flex; align-items: center; gap: 12px; padding: 8px 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 7px; font-size: 12.5px; }
.party-role { font-weight: 600; min-width: 70px; }
.case-timeline ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.case-timeline li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 7px; font-size: 12.5px; }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/screens/case-explorer/CaseDetailScreen.test.tsx`
Expected: all PASS

- [ ] **Step 6: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/screens/case-explorer/CaseDetailScreen.tsx src/screens/case-explorer/CaseDetailScreen.test.tsx src/design-system/components.css
git commit -m "Add CaseDetailScreen: facts, PII-masked parties, and status timeline"
```

---

### Task 8: Wire routes into `App.tsx` and verify end-to-end

**Files:**
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `CaseExplorerScreen` (Task 6), `CaseDetailScreen` (Task 7).
- Produces: working `/case-explorer` and `/case-explorer/:caseId` routes, reachable via `roleRouting.ts`'s existing `defaultRouteForRoles` for `INVESTIGATOR`/`STATION_SUPERVISOR` (already covered by `roleRouting.test.ts`, unchanged).

- [ ] **Step 1: Replace the placeholder route and add the detail route**

Modify `src/app/App.tsx`:

1. Add imports near the top, alongside the existing `CommandCenterScreen` import:

```ts
import { CaseExplorerScreen } from '../screens/case-explorer/CaseExplorerScreen';
import { CaseDetailScreen } from '../screens/case-explorer/CaseDetailScreen';
```

2. Replace the existing `/case-explorer` route:

```tsx
        <Route
          path="/case-explorer"
          element={
            <ProtectedRoute allowedRoles={['INVESTIGATOR', 'STATION_SUPERVISOR']}>
              <CaseExplorerScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/case-explorer/:caseId"
          element={
            <ProtectedRoute allowedRoles={['INVESTIGATOR', 'STATION_SUPERVISOR']}>
              <CaseDetailScreen />
            </ProtectedRoute>
          }
        />
```

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: all PASS (156+ tests — `roleRouting.test.ts` already asserts `INVESTIGATOR`/`STATION_SUPERVISOR` route to `/case-explorer`; no test currently asserts what renders there, so none break, and the new screen test files from Tasks 5–7 exercise the components directly).

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc -b --noEmit && npm run lint`
Expected: both PASS with no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, then open the printed local URL.

In the browser console, set a mock session directly (this is how this app's mock/demo mode is already exercised without a live backend — see `src/api/client.ts`'s `mockModeEnabled()`):

```js
sessionStorage.setItem('ksp-mock', '1');
sessionStorage.setItem('ksp-auth', JSON.stringify({ token: 'mock-token-investigator', roles: ['INVESTIGATOR'], username: 'demo.investigator' }));
location.href = '/case-explorer';
```

Confirm:
- The case list renders 6 rows for Whitefield PS, each with a case number, crime type, status chip, and FIR date.
- Changing the Status and Crime type filters narrows the list; typing in the search box filters by case number or party name (try "Ramesh").
- Clicking a row navigates to `/case-explorer/<id>` and renders facts, the status chip, the narrative, party cards with masked PII, and a status timeline.
- Clicking "Reveal" on a party field shows the real value; clicking "Hide" masks it again.
- The breadcrumb link returns to `/case-explorer`.
- Navigating to `/case-explorer/999999000` (a nonexistent case) shows "Case not found." with a working link back.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx
git commit -m "Wire Case Explorer routes into App.tsx"
```
