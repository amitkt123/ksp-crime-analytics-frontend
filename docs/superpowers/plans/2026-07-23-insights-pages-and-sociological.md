# Insights → Standalone Pages, Layout Overhaul, Sociological Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `/insights` into five standalone left-nav pages with row-based layout overhauls, add a real Karnataka hotspot map, PII reveal cards with avatars, gender color override, expanded demographic/officer data, and Sociological chart enlargement with tooltip+zoom.

**Architecture:** Existing `*Tab.tsx` components become the content of five new thin `*Screen.tsx` wrappers, each its own route. New shared pieces: two CSS grid classes, a `Donut` color-override prop, a `KarnatakaHotspotMap` component, a `PersonRevealModal` component, an `InfoTip` component — all additive, no existing component's public API breaks.

**Tech Stack:** React 19, TypeScript, Recharts, MapLibre GL (already a dependency), Vitest + Testing Library.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-07-23-insights-pages-and-sociological-design.md`.
- PII reveal cards show a stylized initials avatar, never a real/fake photo.
- `/network` (Network / Link Analysis) is untouched — a different screen from the new `/investigation-network`.
- Predictive risk panel (`RiskForecastChart`/`AnomalyList`) and `IndicatorChoroplethMap` are untouched.

---

### Task 1: Add `.insight-grid-2`/`.insight-grid-3` CSS row classes

**Files:**
- Modify: `src/design-system/components.css` (append after `.insight-grid`, currently line 381)

- [ ] **Step 1: Add the two grid variants**

```css
.insight-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.insight-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 900px) {
  .insight-grid-2, .insight-grid-3 { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Run the full test suite and build**

Run: `npm run test && npx tsc -b`
Expected: pass, no new errors (CSS-only change).

- [ ] **Step 3: Commit**

```bash
git add src/design-system/components.css
git commit -m "style: add fixed 2/3-column insight-grid row variants"
```

---

### Task 2: Split Insights into five standalone routes

**Files:**
- Create: `src/screens/insights/OverviewScreen.tsx`, `CrimeTrendsScreen.tsx`, `DemographicsScreen.tsx`, `InvestigationNetworkScreen.tsx`, `JudicialUnitsScreen.tsx`
- Delete: `src/screens/insights/InsightsScreen.tsx`, `InsightsScreen.test.tsx`
- Modify: `src/auth/roleRouting.ts`, `src/app/App.tsx`, `src/app/Rail.tsx`, `src/app/Rail.test.tsx`
- Test: one test file per new screen (see Step 3)

**Interfaces:**
- Produces: routes `/overview`, `/crime-trends`, `/demographics`, `/investigation-network`, `/judicial-units`; `/insights` redirects to `/overview`.

- [ ] **Step 1: Add the five routes to `ROUTE_ALLOWED_ROLES`**

In `src/auth/roleRouting.ts`, replace the `'/insights': [...]` entry:

```ts
export const ROUTE_ALLOWED_ROLES: Record<string, string[]> = {
  '/command-center': ['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER'],
  '/overview': [
    'INVESTIGATOR', 'STATION_SUPERVISOR', 'DISTRICT_SUPERVISOR',
    'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN', 'SUPER_ADMIN',
  ],
  '/crime-trends': [
    'INVESTIGATOR', 'STATION_SUPERVISOR', 'DISTRICT_SUPERVISOR',
    'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN', 'SUPER_ADMIN',
  ],
  '/demographics': [
    'INVESTIGATOR', 'STATION_SUPERVISOR', 'DISTRICT_SUPERVISOR',
    'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN', 'SUPER_ADMIN',
  ],
  '/investigation-network': [
    'INVESTIGATOR', 'STATION_SUPERVISOR', 'DISTRICT_SUPERVISOR',
    'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN', 'SUPER_ADMIN',
  ],
  '/judicial-units': [
    'INVESTIGATOR', 'STATION_SUPERVISOR', 'DISTRICT_SUPERVISOR',
    'SCRB_ANALYST', 'POLICYMAKER', 'ADMIN', 'SUPER_ADMIN',
  ],
  '/case-explorer': ['INVESTIGATOR', 'STATION_SUPERVISOR'],
  '/network': ['SCRB_ANALYST'],
  '/sociological': ['DISTRICT_SUPERVISOR', 'SCRB_ANALYST', 'POLICYMAKER'],
  '/admin': ['ADMIN'],
};
```

- [ ] **Step 2: Create the five thin screen wrappers**

```tsx
// src/screens/insights/OverviewScreen.tsx
import { Header } from '../../app/Header';
import { OverviewTab } from './OverviewTab';

export function OverviewScreen() {
  return (
    <>
      <Header title="Overview" />
      <main className="main-single insights-main">
        <OverviewTab />
      </main>
    </>
  );
}
```

```tsx
// src/screens/insights/CrimeTrendsScreen.tsx
import { Header } from '../../app/Header';
import { CrimeTrendsTab } from './CrimeTrendsTab';

export function CrimeTrendsScreen() {
  return (
    <>
      <Header title="Crime Trends" />
      <main className="main-single insights-main">
        <CrimeTrendsTab />
      </main>
    </>
  );
}
```

```tsx
// src/screens/insights/DemographicsScreen.tsx
import { Header } from '../../app/Header';
import { DemographicsTab } from './DemographicsTab';

export function DemographicsScreen() {
  return (
    <>
      <Header title="Demographics" />
      <main className="main-single insights-main">
        <DemographicsTab />
      </main>
    </>
  );
}
```

```tsx
// src/screens/insights/InvestigationNetworkScreen.tsx
import { Header } from '../../app/Header';
import { InvestigationNetworkTab } from './InvestigationNetworkTab';

export function InvestigationNetworkScreen() {
  return (
    <>
      <Header title="Investigation Network" />
      <main className="main-single insights-main">
        <InvestigationNetworkTab />
      </main>
    </>
  );
}
```

```tsx
// src/screens/insights/JudicialUnitsScreen.tsx
import { Header } from '../../app/Header';
import { JudicialUnitsTab } from './JudicialUnitsTab';

export function JudicialUnitsScreen() {
  return (
    <>
      <Header title="Judicial & Units" />
      <main className="main-single insights-main">
        <JudicialUnitsTab />
      </main>
    </>
  );
}
```

- [ ] **Step 3: Write a test per new screen**

```tsx
// src/screens/insights/OverviewScreen.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../auth/AuthContext';
import * as meApiModule from '../../api/meApi';
import { vi } from 'vitest';
import { OverviewScreen } from './OverviewScreen';

describe('OverviewScreen', () => {
  it('renders the Header title and the Overview tab content', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({ data: undefined, isLoading: false, isError: false } as never);
    render(
      <MemoryRouter>
        <OverviewScreen />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Registrations vs Chargesheeted')).toBeInTheDocument();
  });
});
```

Repeat the same pattern for the other four (`CrimeTrendsScreen.test.tsx` checking heading "Crime Trends" + text "Crime Head Distribution"; `DemographicsScreen.test.tsx` checking "Demographics" + "Victim Gender"; `InvestigationNetworkScreen.test.tsx` checking "Investigation Network" + "Crime Head ↔ Act Linkage"; `JudicialUnitsScreen.test.tsx` checking "Judicial & Units" + "Court-wise Pending Cases") — each following its tab's own existing test mocking needs (check each `*Tab.test.tsx` for what it mocks and mirror that in the screen test).

- [ ] **Step 4: Delete `InsightsScreen.tsx` and its test**

```bash
git rm src/screens/insights/InsightsScreen.tsx src/screens/insights/InsightsScreen.test.tsx
```

- [ ] **Step 5: Update `App.tsx` routes**

Replace the `/insights` route and its import:

```tsx
import { OverviewScreen } from '../screens/insights/OverviewScreen';
import { CrimeTrendsScreen } from '../screens/insights/CrimeTrendsScreen';
import { DemographicsScreen } from '../screens/insights/DemographicsScreen';
import { InvestigationNetworkScreen } from '../screens/insights/InvestigationNetworkScreen';
import { JudicialUnitsScreen } from '../screens/insights/JudicialUnitsScreen';
```

```tsx
        <Route path="/insights" element={<Navigate to="/overview" replace />} />
        <Route
          path="/overview"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/overview']}>
              <OverviewScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crime-trends"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/crime-trends']}>
              <CrimeTrendsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/demographics"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/demographics']}>
              <DemographicsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investigation-network"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/investigation-network']}>
              <InvestigationNetworkScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/judicial-units"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES['/judicial-units']}>
              <JudicialUnitsScreen />
            </ProtectedRoute>
          }
        />
```

(Remove the old `import { InsightsScreen } ...` line.)

- [ ] **Step 6: Update `Rail.tsx`'s nav items**

Replace the single Insights entry with five, and add four new small icon functions:

```tsx
const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center', icon: GridIcon },
  { path: '/overview', label: 'Overview', icon: ChartIcon },
  { path: '/crime-trends', label: 'Crime Trends', icon: TrendUpIcon },
  { path: '/demographics', label: 'Demographics', icon: PeopleIcon },
  { path: '/investigation-network', label: 'Investigation Network', icon: LinkageIcon },
  { path: '/judicial-units', label: 'Judicial & Units', icon: GavelIcon },
  { path: '/case-explorer', label: 'Case Explorer', icon: FolderIcon },
  { path: '/network', label: 'Network / Link Analysis', icon: NetworkIcon },
  { path: '/sociological', label: 'Sociological & Predictive', icon: TrendIcon },
  { path: '/admin', label: 'Admin / Audit', icon: ShieldIcon },
];
```

Add these four new icon functions (alongside the existing ones):

```tsx
function TrendUpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 15 8 9l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="7" cy="6.5" r="2.3" />
      <path d="M2.5 16c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5" strokeLinecap="round" />
      <circle cx="14.5" cy="7.5" r="1.8" />
      <path d="M12.7 11.7c.5-.2 1.1-.3 1.8-.3 2.1 0 3.7 1.4 3.7 3.7" strokeLinecap="round" />
    </svg>
  );
}

function LinkageIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="5" cy="10" r="2.2" />
      <circle cx="15" cy="5" r="2.2" />
      <circle cx="15" cy="15" r="2.2" />
      <path d="M7 9 13 6M7 11l6 4" strokeLinecap="round" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 12.5 8.5 8M11 4.5 15.5 9M9.3 6.2l4.5 4.5M2.5 17.5h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 7: Update `Rail.test.tsx` for the new labels**

Replace the label lists in the SUPER_ADMIN tests with the new full set (`'Command Center', 'Overview', 'Crime Trends', 'Demographics', 'Investigation Network', 'Judicial & Units', 'Case Explorer', 'Network / Link Analysis', 'Sociological & Predictive', 'Admin / Audit'`), and update the INVESTIGATOR test's expectations (INVESTIGATOR can now access `/overview`, `/crime-trends`, `/demographics`, `/investigation-network`, `/judicial-units`, `/case-explorer` — assert those six are present, `Command Center`/`Network / Link Analysis`/`Sociological & Predictive`/`Admin / Audit` are absent).

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS — new screen tests pass, Rail tests pass with updated expectations, all five `*Tab.test.tsx` files (unchanged content, still directly testable) still pass since the tab components themselves aren't touched by this task.

- [ ] **Step 9: Commit**

```bash
git add src/auth/roleRouting.ts src/app/App.tsx src/app/Rail.tsx src/app/Rail.test.tsx \
  src/screens/insights/OverviewScreen.tsx src/screens/insights/OverviewScreen.test.tsx \
  src/screens/insights/CrimeTrendsScreen.tsx src/screens/insights/CrimeTrendsScreen.test.tsx \
  src/screens/insights/DemographicsScreen.tsx src/screens/insights/DemographicsScreen.test.tsx \
  src/screens/insights/InvestigationNetworkScreen.tsx src/screens/insights/InvestigationNetworkScreen.test.tsx \
  src/screens/insights/JudicialUnitsScreen.tsx src/screens/insights/JudicialUnitsScreen.test.tsx
git commit -m "feat: split Insights into five standalone left-nav pages, replacing the ?tab= pill switcher"
```

---

### Task 3: Overview — row layout, Sankey target-color, Recent FIRs Gravity/Status columns

**Files:**
- Modify: `src/screens/insights/OverviewTab.tsx`
- Modify: `src/screens/insights/SankeyChart.tsx`
- Modify: `src/screens/insights/SankeyChart.test.tsx`

- [ ] **Step 1: Write the failing test for target-colored Sankey links**

Add to `SankeyChart.test.tsx`:

```tsx
  it('colors each link by its target node, not its source', () => {
    const { container } = render(
      <SankeyChart
        nodeLabels={['Registered', 'Chargesheeted', 'Undetected']}
        links={[
          { source: 0, target: 1, value: 80 },
          { source: 0, target: 2, value: 20 },
        ]}
      />,
    );
    const paths = container.querySelectorAll('svg > g:first-of-type > path');
    // Target index 1 -> NODE_COLORS[1], target index 2 -> NODE_COLORS[2]
    expect(paths[0]).toHaveAttribute('stroke', 'var(--cat-2)');
    expect(paths[1]).toHaveAttribute('stroke', 'var(--cat-3)');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- SankeyChart.test.tsx`
Expected: FAIL — links are currently colored by `sourceIndex` (both would be `NODE_COLORS[0]` = `var(--real)`).

- [ ] **Step 3: Flip link coloring from source to target**

In `SankeyChart.tsx`, replace the link-rendering block:

```tsx
      <g>
        {laidOutLinks.map((link, i) => {
          const targetIndex = typeof link.target === 'object' ? (link.target as SankeyNode<NodeDatum, SankeyLinkInput>).index! : link.target;
          return (
            <path
              key={i}
              d={pathGenerator(link as SankeyLink<NodeDatum, SankeyLinkInput>) ?? undefined}
              fill="none"
              stroke={NODE_COLORS[targetIndex % NODE_COLORS.length]}
              strokeOpacity={0.35}
              strokeWidth={Math.max(1, link.width ?? 1)}
            />
          );
        })}
      </g>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- SankeyChart.test.tsx`
Expected: PASS (all tests, including the pre-existing ones which don't assert on color).

- [ ] **Step 5: Restructure OverviewTab.tsx into explicit rows**

Read the current file's card order (Registrations vs Chargesheeted, Case Journey, Case Category Mix, Gravity of Offence, Top Districts, Recent FIRs) and regroup into separate grid containers:

```tsx
  return (
    <>
      <div className="insight-grid">
        <InsightCard
          title="Registrations vs Chargesheeted"
          live={false}
          note="Monthly, last 12 months."
          expand={{ columns: ['Month', 'Registered', 'Chargesheeted'], rows: trend.map((t) => [t.monthLabel, t.registered, t.chargesheeted]) }}
        >
          {/* unchanged LineChart */}
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Case Journey"
          live={false}
          note="Registration through final outcome."
          expand={{ columns: ['Stage', 'Count'], rows: journey.map((j) => [j.stage, j.count]) }}
        >
          <SankeyChart nodeLabels={journeySankey.nodeLabels} links={journeySankey.links} />
        </InsightCard>
      </div>

      <div className="insight-grid-3" style={{ marginTop: 16 }}>
        <InsightCard
          title="Case Category Mix"
          live={false}
          note="FIR / UDR / Zero FIR / PAR."
          expand={{ columns: ['Category', 'Count'], rows: categoryMixDemo.map((c) => [c.category, c.count]) }}
        >
          {/* unchanged Donut */}
        </InsightCard>
        <InsightCard
          title="Gravity of Offence"
          live={false}
          expand={{ columns: ['Gravity', 'Count'], rows: gravityDemo.map((g) => [g.gravity, g.count]) }}
        >
          {/* unchanged Donut */}
        </InsightCard>
        <InsightCard title="Top Districts by Case Volume" live>
          {/* unchanged loading/error/RankedBarList branch */}
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Recent FIRs"
          live={liveRecentFirs}
          note={liveRecentFirs ? undefined : "Recent FIRs isn't available state/district-wide yet — showing representative data."}
        >
          {liveRecentFirs ? (
            recentFirsQuery.isLoading ? <p>Loading…</p> : <CaseList cases={recentFirsQuery.data ?? []} />
          ) : (
            <DemoRecentFirsTable cases={demoRecentFirs} />
          )}
        </InsightCard>
      </div>
    </>
  );
```

(The outer `return` changes from one `<div className="insight-grid">` wrapping everything to a `<>...</>` fragment wrapping four separate grid containers, each holding one "row" of cards, per the spec. `journey` stays as a variable — still used for the Case Journey card's `expand` rows.)

- [ ] **Step 6: Add Gravity and Status columns to the Recent FIRs table, rename Registered header to Date**

Add the import:
```tsx
import { gravityDotClass, gravityLabel, caseStatusChipClass, caseStatusLabel } from '../../api/caseApi';
```

Replace `DemoRecentFirsTable`:

```tsx
function DemoRecentFirsTable({ cases }: { cases: CaseSummaryResponse[] }) {
  return (
    <div className="case-table-wrap">
      <table className="case-table">
        <thead>
          <tr>
            <th>Crime no.</th>
            <th>Case no.</th>
            <th>Date</th>
            <th>Station</th>
            <th>District</th>
            <th>Crime head</th>
            <th>Gravity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.caseId}>
              <td className="mono crime-no">{c.crimeNumber}</td>
              <td className="mono">{c.caseNumber}</td>
              <td className="mono">{c.firDate}</td>
              <td>{c.station}</td>
              <td>{c.district}</td>
              <td>{c.crimeSubHeadName}</td>
              <td>
                {c.gravity && (
                  <>
                    <span className={`gravity-dot ${gravityDotClass(c.gravity)}`} aria-hidden="true" />
                    {gravityLabel(c.gravity)}
                  </>
                )}
              </td>
              <td>
                <span className={`chip ${caseStatusChipClass(c.status)}`}>{caseStatusLabel(c.status)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Run the full test suite**

Run: `npm run test -- OverviewTab.test.tsx SankeyChart.test.tsx`
Expected: PASS. If `OverviewTab.test.tsx` asserts on the demo Recent FIRs row's exact cell count/text, it still passes since existing columns/values are unchanged, only new columns appended.

- [ ] **Step 8: Commit**

```bash
git add src/screens/insights/OverviewTab.tsx src/screens/insights/SankeyChart.tsx src/screens/insights/SankeyChart.test.tsx
git commit -m "feat: Overview page row layout (full-width trend/journey, 3-up mix row, full-width Recent FIRs with Gravity/Status)"
```

---

### Task 4: Add `Donut`'s `colorForLabel` override and Female → pink

**Files:**
- Modify: `src/screens/insights/Donut.tsx`
- Modify: `src/screens/insights/Donut.test.tsx`
- Modify: `src/screens/insights/DemographicsTab.tsx`

- [ ] **Step 1: Write the failing test**

Add to `Donut.test.tsx`:

```tsx
  it('uses colorForLabel to override a specific slice color when provided', () => {
    const { container } = render(
      <Donut
        slices={[{ label: 'Male', value: 60 }, { label: 'Female', value: 40 }]}
        colorForLabel={(label) => (label === 'Female' ? '#e8608f' : undefined)}
      />,
    );
    const circles = container.querySelectorAll('circle');
    expect(circles[1]).toHaveAttribute('stroke', '#e8608f');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Donut.test.tsx`
Expected: FAIL — `Donut` has no `colorForLabel` prop.

- [ ] **Step 3: Add the prop**

```tsx
export interface DonutSlice {
  label: string;
  value: number;
}

interface DonutProps {
  slices: DonutSlice[];
  colorForLabel?: (label: string) => string | undefined;
}

const SLOT_COLORS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--muted-2)'];
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Donut({ slices, colorForLabel }: DonutProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;
  const colorOf = (label: string, i: number) => colorForLabel?.(label) ?? SLOT_COLORS[i % SLOT_COLORS.length];

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 160 160" width={160} height={160} role="img" aria-label="Donut chart">
        <g transform="translate(80,80) rotate(-90)">
          {slices.map((slice, i) => {
            const fraction = total === 0 ? 0 : slice.value / total;
            const dash = fraction * CIRCUMFERENCE;
            const gap = CIRCUMFERENCE - dash;
            const offset = -cumulative * CIRCUMFERENCE;
            cumulative += fraction;
            return (
              <circle
                key={slice.label}
                r={RADIUS}
                fill="none"
                stroke={colorOf(slice.label, i)}
                strokeWidth={24}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" className="donut-total mono">
          {total.toLocaleString()}
        </text>
        <text x="80" y="94" textAnchor="middle" className="donut-total-label">
          total
        </text>
      </svg>
      <div className="cat-legend">
        {slices.map((slice, i) => (
          <span key={slice.label} className="cat-legend-item">
            <span className="cat-swatch" style={{ background: colorOf(slice.label, i) }} />
            {slice.label} ({total === 0 ? 0 : Math.round((slice.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- Donut.test.tsx`
Expected: PASS

- [ ] **Step 5: Wire Female → pink into the three gender donuts**

In `DemographicsTab.tsx`, add a shared helper near the top of the file (after imports):

```tsx
function genderColor(label: string): string | undefined {
  return label === 'Female' ? '#e8608f' : undefined;
}
```

Update the three gender `<Donut>` usages to pass `colorForLabel={genderColor}`:

```tsx
      <InsightCard title="Victim Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: victimGender.map((g) => [g.gender, g.count]) }}>
        <Donut slices={victimGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
      </InsightCard>
      <InsightCard title="Accused Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: accusedGender.map((g) => [g.gender, g.count]) }}>
        <Donut slices={accusedGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
      </InsightCard>
      <InsightCard title="Complainant Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: complainantGender.map((g) => [g.gender, g.count]) }}>
        <Donut slices={complainantGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
      </InsightCard>
```

- [ ] **Step 6: Run the full test suite**

Run: `npm run test -- Donut.test.tsx DemographicsTab.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/screens/insights/Donut.tsx src/screens/insights/Donut.test.tsx src/screens/insights/DemographicsTab.tsx
git commit -m "feat: add Donut colorForLabel override, use it to make Female slices pink"
```

---

### Task 5: Demographics — row layout, new Accused demographic data

**Files:**
- Modify: `src/api/demoAnalyticsData.ts`
- Modify: `src/screens/insights/DemographicsTab.tsx`

- [ ] **Step 1: Add the three new Accused demographic demo-data functions**

Append to `demoAnalyticsData.ts` (after `getOccupationDemo`):

```ts
export function getAccusedReligionDemo(): LabeledCount[] {
  return [
    { label: 'Hindu', count: 9840 },
    { label: 'Muslim', count: 2120 },
    { label: 'Christian', count: 640 },
    { label: 'Jain', count: 110 },
    { label: 'Sikh', count: 90 },
    { label: 'Buddhist', count: 160 },
    { label: 'Other', count: 100 },
  ];
}

export function getAccusedCasteDemo(): LabeledCount[] {
  return [
    { label: 'General', count: 2140 },
    { label: 'OBC', count: 5860 },
    { label: 'SC', count: 2680 },
    { label: 'ST', count: 1580 },
    { label: 'Other', count: 800 },
  ];
}

export function getAccusedOccupationDemo(): LabeledCount[] {
  return [
    { label: 'Farmer', count: 1840 },
    { label: 'Govt Employee', count: 620 },
    { label: 'Private Employee', count: 2140 },
    { label: 'Business', count: 1960 },
    { label: 'Student', count: 980 },
    { label: 'Daily Wage Labour', count: 2860 },
    { label: 'Homemaker', count: 240 },
    { label: 'Unemployed', count: 2420 },
  ];
}
```

- [ ] **Step 2: Restructure DemographicsTab.tsx into explicit rows and wire the new data**

Add the three new imports to the `demoAnalyticsData` import list, and three new `const` lines alongside the existing ones (`const accusedReligion = getAccusedReligionDemo();` etc.), then replace the return statement's single `<div className="insight-grid">` with row-grouped containers:

```tsx
  return (
    <>
      <div className="insight-grid-3">
        <InsightCard title="Victim Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: victimGender.map((g) => [g.gender, g.count]) }}>
          <Donut slices={victimGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
        </InsightCard>
        <InsightCard title="Accused Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: accusedGender.map((g) => [g.gender, g.count]) }}>
          <Donut slices={accusedGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
        </InsightCard>
        <InsightCard title="Complainant Gender" live={false} expand={{ columns: ['Gender', 'Count'], rows: complainantGender.map((g) => [g.gender, g.count]) }}>
          <Donut slices={complainantGender.map((g) => ({ label: g.gender, value: g.count }))} colorForLabel={genderColor} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Age Distribution — Victims vs Accused"
          live={false}
          note="5-year age bands."
          expand={{ columns: ['Band', 'Victims', 'Accused'], rows: ageDistribution.map((a) => [a.band, a.victims, a.accused]) }}
        >
          {/* unchanged BarChart */}
        </InsightCard>
      </div>

      <div className="insight-grid-3" style={{ marginTop: 16 }}>
        <InsightCard title="Complainant Religion" live={false} expand={{ columns: ['Religion', 'Count'], rows: religion.map((r) => [r.label, r.count]) }}>
          <RankedBarList items={religion.map((r) => ({ label: r.label, value: r.count }))} />
        </InsightCard>
        <InsightCard title="Complainant Caste Category" live={false} expand={{ columns: ['Caste', 'Count'], rows: caste.map((c) => [c.label, c.count]) }}>
          <RankedBarList items={caste.map((c) => ({ label: c.label, value: c.count }))} />
        </InsightCard>
        <InsightCard title="Complainant Occupation" live={false} expand={{ columns: ['Occupation', 'Count'], rows: occupation.map((o) => [o.label, o.count]) }}>
          <RankedBarList items={occupation.map((o) => ({ label: o.label, value: o.count }))} />
        </InsightCard>
      </div>

      <div className="insight-grid-3" style={{ marginTop: 16 }}>
        <InsightCard title="Accused Religion" live={false} expand={{ columns: ['Religion', 'Count'], rows: accusedReligion.map((r) => [r.label, r.count]) }}>
          <RankedBarList items={accusedReligion.map((r) => ({ label: r.label, value: r.count }))} />
        </InsightCard>
        <InsightCard title="Accused Caste Category" live={false} expand={{ columns: ['Caste', 'Count'], rows: accusedCaste.map((c) => [c.label, c.count]) }}>
          <RankedBarList items={accusedCaste.map((c) => ({ label: c.label, value: c.count }))} />
        </InsightCard>
        <InsightCard title="Accused Occupation" live={false} expand={{ columns: ['Occupation', 'Count'], rows: accusedOccupation.map((o) => [o.label, o.count]) }}>
          <RankedBarList items={accusedOccupation.map((o) => ({ label: o.label, value: o.count }))} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard title="Victim Gender × Crime Head Cross-tab" live={false}>
          {/* unchanged table */}
        </InsightCard>
      </div>
    </>
  );
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test -- DemographicsTab.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/screens/insights/DemographicsTab.tsx
git commit -m "feat: Demographics page row layout, add Accused Religion/Caste/Occupation row"
```

---

### Task 6: Crime Trends — row layout, matrix expansion to all 30 districts + filter

**Files:**
- Modify: `src/api/demoAnalyticsData.ts`
- Modify: `src/screens/insights/CrimeTrendsTab.tsx`
- Modify: `src/screens/insights/CrimeTrendsTab.test.tsx` (if it asserts district counts)

- [ ] **Step 1: Add the full 30-district weight list and rewire the matrix to use it**

Replace `TOP_DISTRICTS_DEMO` (and its usage) in `demoAnalyticsData.ts`:

```ts
// Full 30-district weight list, copied from mockData.ts's MOCK_DISTRICTS so this
// matrix's per-district totals stay consistent with Command Center's numbers.
const ALL_DISTRICTS_DEMO: Array<[string, number]> = [
  ['Bagalkote', 89], ['Ballari', 350], ['Belagavi', 586], ['Bengaluru Rural', 107],
  ['Bengaluru Urban', 1840], ['Bidar', 282], ['Chamarajanagara', 349], ['Chikkaballapura', 187],
  ['Chikkamagaluru', 80], ['Chitradurga', 289], ['Dakshina Kannada', 396], ['Davanagere', 327],
  ['Dharwad', 293], ['Gadag', 182], ['Hassan', 422], ['Haveri', 449], ['Kalaburagi', 526],
  ['Kodagu', 265], ['Kolar', 253], ['Koppal', 127], ['Mandya', 288], ['Mysuru', 687],
  ['Raichur', 269], ['Ramanagara', 458], ['Shivamogga', 406], ['Tumakuru', 678],
  ['Udupi', 401], ['Uttara Kannada', 185], ['Vijayapura', 451], ['Yadgir', 268],
];

export function getDistrictCrimeHeadMatrix(districtFilter?: string): DistrictCrimeHeadCell[] {
  const headShare: Record<string, number> = {
    'Crimes Against Body': 0.22,
    'Crimes Against Property': 0.35,
    'Crimes Against Women': 0.16,
    'Economic Offences': 0.15,
    'Cyber Crimes': 0.12,
  };
  const districts = districtFilter ? ALL_DISTRICTS_DEMO.filter(([name]) => name === districtFilter) : ALL_DISTRICTS_DEMO;
  const cells: DistrictCrimeHeadCell[] = [];
  districts.forEach(([districtName, weight]) => {
    CRIME_HEADS_DEMO.forEach((crimeHead) => {
      cells.push({ districtName, crimeHead, count: Math.round(weight * headShare[crimeHead]) });
    });
  });
  return cells;
}

export function getAllDistrictNamesDemo(): string[] {
  return ALL_DISTRICTS_DEMO.map(([name]) => name);
}
```

(Delete the old `TOP_DISTRICTS_DEMO` constant and its comment entirely — fully replaced.)

- [ ] **Step 2: Add the district filter and restructure CrimeTrendsTab.tsx into rows**

Add `useState` and the new imports:

```tsx
import { useState } from 'react';
```

Add `getAllDistrictNamesDemo` to the `demoAnalyticsData` import list.

Inside the component, add:

```tsx
  const [matrixDistrictFilter, setMatrixDistrictFilter] = useState('');
  const allDistrictNames = getAllDistrictNamesDemo();
```

Replace the `matrix` computation to use the filter:

```tsx
  const matrix = getDistrictCrimeHeadMatrix(matrixDistrictFilter || undefined);
```

Restructure the return into rows:

```tsx
  return (
    <>
      <div className="insight-grid-2">
        <InsightCard title="Crime Head Distribution" live>
          {/* unchanged loading/error/CategoryMixChart branch */}
        </InsightCard>
        <InsightCard
          title="Crime Head Trend by Month"
          live={false}
          note="Stacked monthly volume across the top crime heads."
          expand={{
            columns: ['Month', ...CRIME_HEADS_DEMO],
            rows: monthlyTrend.map((p) => [p.monthLabel, ...CRIME_HEADS_DEMO.map((h) => p[h] as number)]),
          }}
        >
          {/* unchanged AreaChart */}
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Cohort Analysis — Case Closure Velocity"
          live={false}
          note="% of each monthly cohort chargesheeted within N months of registration."
          expand={{ columns: ['Cohort', 'Lag', '% Chargesheeted'], rows: cohort.map((c) => [c.cohortLabel, c.lagLabel, `${Math.round(c.pct * 100)}%`]) }}
        >
          {/* unchanged HeatmapGrid */}
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="District × Crime Head Hotspot Matrix"
          live={false}
          note="Case counts per district per crime head, across all 30 Karnataka districts."
          expand={{ columns: ['District', 'Crime Head', 'Count'], rows: matrix.map((m) => [m.districtName, m.crimeHead, m.count]) }}
        >
          <div className="filter-field" style={{ marginBottom: 10 }}>
            <select aria-label="Filter by district" value={matrixDistrictFilter} onChange={(e) => setMatrixDistrictFilter(e.target.value)}>
              <option value="">All districts</option>
              {allDistrictNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <HeatmapGrid rows={matrixRows} cols={matrixCols} cells={matrixCells} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Incident Location Hotspots"
          live={liveHotspots}
          note={
            liveHotspots
              ? 'District-level DBSCAN clusters, bubble size = case count.'
              : "Cluster hotspots aren't available for unit-scoped roles — showing representative data."
          }
        >
          {/* replaced by KarnatakaHotspotMap in Task 7 */}
        </InsightCard>
      </div>
    </>
  );
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test -- CrimeTrendsTab.test.tsx`
Expected: PASS — if the test asserted on the old 8-district matrix, update it to account for 30 districts (e.g. change any `toHaveLength(40)`-style assertion on matrix cells to `toHaveLength(150)` = 30×5).

- [ ] **Step 4: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/screens/insights/CrimeTrendsTab.tsx src/screens/insights/CrimeTrendsTab.test.tsx
git commit -m "feat: Crime Trends row layout, expand hotspot matrix to all 30 districts with a district filter"
```

---

### Task 7: Real Karnataka map for Incident Location Hotspots

**Files:**
- Create: `src/screens/insights/KarnatakaHotspotMap.tsx`
- Test: `src/screens/insights/KarnatakaHotspotMap.test.tsx`
- Modify: `src/api/demoAnalyticsData.ts` (add `count` to demo hotspot points)
- Modify: `src/screens/insights/CrimeTrendsTab.tsx`

**Interfaces:**
- Produces: `KarnatakaHotspotMap({ boundaries: DistrictBoundaryFeatureCollection; points: Array<{ lat: number; lon: number; crimeHead: string; count: number }> })`.

- [ ] **Step 1: Add a `count` field to the demo hotspot generator**

In `demoAnalyticsData.ts`, update `DemoHotspotPoint` and `getIncidentHotspotsDemo`:

```ts
export interface DemoHotspotPoint {
  lat: number;
  lon: number;
  crimeHead: string;
  count: number;
}

export function getIncidentHotspotsDemo(): DemoHotspotPoint[] {
  const centers: Array<[number, number]> = [
    [12.97, 77.59],
    [12.3, 76.64],
    [13.34, 77.1],
    [15.85, 74.5],
    [17.33, 76.83],
  ];
  const points: DemoHotspotPoint[] = [];
  centers.forEach(([lat, lon], ci) => {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      points.push({
        lat: Number((lat + Math.sin(angle + ci) * 0.18).toFixed(4)),
        lon: Number((lon + Math.cos(angle + ci) * 0.18).toFixed(4)),
        crimeHead: CRIME_HEADS_DEMO[(ci + i) % CRIME_HEADS_DEMO.length],
        count: 8 + ((ci * 7 + i * 3) % 40),
      });
    }
  });
  return points;
}
```

- [ ] **Step 2: Write the failing test for KarnatakaHotspotMap**

```tsx
// src/screens/insights/KarnatakaHotspotMap.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { KarnatakaHotspotMap } from './KarnatakaHotspotMap';

vi.mock('maplibre-gl', () => {
  const mapInstance = {
    on: vi.fn((event: string, cb: () => void) => { if (event === 'load') cb(); }),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getSource: vi.fn(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
  };
  return { default: { Map: vi.fn(() => mapInstance) } };
});

const boundaries = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { districtId: 1, district: 'Bengaluru Urban' }, geometry: { type: 'Polygon', coordinates: [[[77, 12], [78, 12], [78, 13], [77, 12]]] } },
  ],
};

describe('KarnatakaHotspotMap', () => {
  it('renders a map container and initializes MapLibre with the boundaries and points', async () => {
    const maplibregl = (await import('maplibre-gl')).default;
    const { container } = render(
      <KarnatakaHotspotMap boundaries={boundaries} points={[{ lat: 12.97, lon: 77.59, crimeHead: 'Cyber Crimes', count: 12 }]} />,
    );
    expect(container.querySelector('.hotspot-map-canvas')).not.toBeNull();
    expect(maplibregl.Map).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- KarnatakaHotspotMap.test.tsx`
Expected: FAIL — `Cannot find module './KarnatakaHotspotMap'`

- [ ] **Step 4: Implement KarnatakaHotspotMap**

```tsx
// src/screens/insights/KarnatakaHotspotMap.tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DistrictBoundaryFeatureCollection } from '../../api/geoApi';
import { featureCollectionBounds } from '../command-center/geoBounds';

export interface HotspotPoint {
  lat: number;
  lon: number;
  crimeHead: string;
  count: number;
}

interface KarnatakaHotspotMapProps {
  boundaries: DistrictBoundaryFeatureCollection;
  points: HotspotPoint[];
}

const CRIME_HEAD_COLORS = ['#123a63', '#d4a017', '#c0392b', '#1e8a5f', '#6c5ce7', '#e67e22'];

export function KarnatakaHotspotMap({ boundaries, points }: KarnatakaHotspotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [76.5, 15.3],
      zoom: 5.5,
    });

    map.on('load', () => {
      map.addSource('district-outline', { type: 'geojson', data: boundaries as never });
      map.addLayer({
        id: 'district-outline-fill',
        type: 'fill',
        source: 'district-outline',
        paint: { 'fill-color': '#eef1f6', 'fill-opacity': 1 },
      });
      map.addLayer({
        id: 'district-outline-line',
        type: 'line',
        source: 'district-outline',
        paint: { 'line-color': '#123a63', 'line-width': 1 },
      });

      const crimeHeads = [...new Set(points.map((p) => p.crimeHead))];
      const pointFeatures = {
        type: 'FeatureCollection' as const,
        features: points.map((p) => ({
          type: 'Feature' as const,
          properties: { crimeHead: p.crimeHead, count: p.count },
          geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
        })),
      };
      map.addSource('hotspot-points', { type: 'geojson', data: pointFeatures });
      map.addLayer({
        id: 'hotspot-circles',
        type: 'circle',
        source: 'hotspot-points',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 5, 4, 50, 16],
          'circle-color': [
            'match',
            ['get', 'crimeHead'],
            ...crimeHeads.flatMap((head, i) => [head, CRIME_HEAD_COLORS[i % CRIME_HEAD_COLORS.length]]),
            '#8493B0',
          ],
          'circle-opacity': 0.65,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.fitBounds(featureCollectionBounds(boundaries), { padding: 30 });
    });

    return () => map.remove();
  }, [boundaries, points]);

  return <div ref={containerRef} className="hotspot-map-canvas" style={{ width: '100%', height: 320, borderRadius: 10, overflow: 'hidden' }} />;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- KarnatakaHotspotMap.test.tsx`
Expected: PASS

- [ ] **Step 6: Wire into CrimeTrendsTab.tsx**

Add the import:
```tsx
import { KarnatakaHotspotMap } from './KarnatakaHotspotMap';
import { useDistrictBoundaries } from '../../api/geoApi';
```

Add the boundaries query alongside the other queries in the component:
```tsx
  const boundariesQuery = useDistrictBoundaries(token);
```

Replace the "Incident Location Hotspots" card body (the two `ScatterChart` branches):

```tsx
      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Incident Location Hotspots"
          live={liveHotspots}
          note={
            liveHotspots
              ? 'District-level DBSCAN clusters, bubble size = case count.'
              : "Cluster hotspots aren't available for unit-scoped roles — showing representative data."
          }
        >
          {boundariesQuery.isLoading ? (
            <p>Loading…</p>
          ) : boundariesQuery.isError ? (
            <p role="alert">Couldn't load district boundaries.</p>
          ) : liveHotspots ? (
            hotspotsQuery.isLoading ? (
              <p>Loading…</p>
            ) : hotspotsQuery.isError ? (
              <p role="alert">Couldn't load hotspot clusters.</p>
            ) : (
              <KarnatakaHotspotMap
                boundaries={boundariesQuery.data!}
                points={(hotspotsQuery.data ?? []).map((h) => ({ lat: h.centroidLat, lon: h.centroidLon, crimeHead: 'Cluster', count: h.caseCount }))}
              />
            )
          ) : (
            <KarnatakaHotspotMap boundaries={boundariesQuery.data!} points={demoHotspots} />
          )}
        </InsightCard>
      </div>
```

Remove the now-unused Recharts scatter imports (`ScatterChart, Scatter, ZAxis`) from the top of the file if nothing else in the file uses them.

- [ ] **Step 7: Run the full test suite**

Run: `npm run test -- CrimeTrendsTab.test.tsx KarnatakaHotspotMap.test.tsx`
Expected: PASS — update `CrimeTrendsTab.test.tsx` if it asserts on the old `ScatterChart`-specific DOM for this card; mock `useDistrictBoundaries` the same way the test already mocks the other hooks.

- [ ] **Step 8: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/screens/insights/KarnatakaHotspotMap.tsx \
  src/screens/insights/KarnatakaHotspotMap.test.tsx src/screens/insights/CrimeTrendsTab.tsx \
  src/screens/insights/CrimeTrendsTab.test.tsx
git commit -m "fix: render Incident Location Hotspots on a real Karnataka map instead of a raw lon/lat scatter plot"
```

---

### Task 8: Investigation Network — row layout, Area chart, PersonRevealModal, expanded IO columns

**Files:**
- Create: `src/screens/insights/PersonRevealModal.tsx`
- Test: `src/screens/insights/PersonRevealModal.test.tsx`
- Modify: `src/api/demoAnalyticsData.ts`
- Modify: `src/screens/insights/InvestigationNetworkTab.tsx`

- [ ] **Step 1: Write the failing test for PersonRevealModal**

```tsx
// src/screens/insights/PersonRevealModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonRevealModal } from './PersonRevealModal';

describe('PersonRevealModal', () => {
  it('renders nothing when no person is open', () => {
    const { container } = render(<PersonRevealModal person={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the initials avatar, real name, and detail rows, and closes on click', () => {
    const onClose = vi.fn();
    render(
      <PersonRevealModal
        person={{ realName: 'Vijay Kumar', details: [{ label: 'Age', value: '34' }, { label: 'Top crime head', value: 'Crimes Against Property' }] }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('VK')).toBeInTheDocument();
    expect(screen.getByText('Vijay Kumar')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- PersonRevealModal.test.tsx`
Expected: FAIL — `Cannot find module './PersonRevealModal'`

- [ ] **Step 3: Implement PersonRevealModal**

```tsx
// src/screens/insights/PersonRevealModal.tsx
import { useEffect } from 'react';

export interface PersonRevealDetail {
  label: string;
  value: string;
}

export interface PersonRevealData {
  realName: string;
  details: PersonRevealDetail[];
}

interface PersonRevealModalProps {
  person: PersonRevealData | null;
  onClose: () => void;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function PersonRevealModal({ person, onClose }: PersonRevealModalProps) {
  useEffect(() => {
    if (!person) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [person, onClose]);

  if (!person) return null;

  return (
    <>
      <div className="scrim open" onClick={onClose} />
      <div className="evidence open modal" role="dialog" aria-label="Person details" aria-modal="true">
        <div className="evidence-head">
          <h3>Person details</h3>
          <button className="evidence-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="evidence-body">
          <div className="role-avatar" style={{ width: 48, height: 48, fontSize: 16, margin: '0 auto' }}>
            {initialsOf(person.realName)}
          </div>
          <p className="evidence-claim" style={{ textAlign: 'center', fontWeight: 600 }}>{person.realName}</p>
          <div className="evidence-meta-list">
            {person.details.map((d) => (
              <div className="evidence-meta-row" key={d.label}>
                <span className="k">{d.label}</span>
                <span className="v">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- PersonRevealModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Expand offender and IO demo data with reveal-card fields**

In `demoAnalyticsData.ts`, replace `RepeatOffenderDemoRow`/`getRepeatOffendersDemo`:

```ts
export interface RepeatOffenderDemoRow {
  displayName: string;
  realName: string;
  age: number;
  gender: string;
  topCrimeHead: string;
  caseCount: number;
}

export function getRepeatOffendersDemo(): RepeatOffenderDemoRow[] {
  return [
    { displayName: 'M**** K****', realName: 'Manjunath Kumar', age: 34, gender: 'Male', topCrimeHead: 'Crimes Against Property', caseCount: 7 },
    { displayName: 'R**** P****', realName: 'Ravindra Poojary', age: 29, gender: 'Male', topCrimeHead: 'Economic Offences', caseCount: 6 },
    { displayName: 'S**** N****', realName: 'Suresh Naik', age: 41, gender: 'Male', topCrimeHead: 'Crimes Against Property', caseCount: 5 },
    { displayName: 'A**** V****', realName: 'Anitha Vasu', age: 37, gender: 'Female', topCrimeHead: 'Cyber Crime', caseCount: 5 },
    { displayName: 'G**** H****', realName: 'Girish Hegde', age: 26, gender: 'Male', topCrimeHead: 'Crimes Against Body', caseCount: 4 },
    { displayName: 'D**** S****', realName: 'Deepak Shetty', age: 45, gender: 'Male', topCrimeHead: 'Economic Offences', caseCount: 4 },
    { displayName: 'K**** B****', realName: 'Kavya Bhat', age: 31, gender: 'Female', topCrimeHead: 'Cyber Crime', caseCount: 3 },
    { displayName: 'P**** M****', realName: 'Prakash Murthy', age: 38, gender: 'Male', topCrimeHead: 'Crimes Against Property', caseCount: 3 },
    { displayName: 'V**** T****', realName: 'Vinay Tantry', age: 24, gender: 'Male', topCrimeHead: 'Crimes Against Body', caseCount: 2 },
    { displayName: 'N**** L****', realName: 'Nandini Lobo', age: 33, gender: 'Female', topCrimeHead: 'Economic Offences', caseCount: 2 },
  ];
}
```

Replace `IoLeaderboardRow`/`getIoLeaderboardDemo`:

```ts
export interface IoLeaderboardRow {
  displayName: string;
  realName: string;
  rank: string;
  unit: string;
  district: string;
  casesHandled: number;
  arrests: number;
  chargesheetRatePct: number;
  avgDaysToChargesheet: number;
}

export function getIoLeaderboardDemo(): IoLeaderboardRow[] {
  return [
    { displayName: 'R**** K****', realName: 'Ravi Kumar', rank: 'Police Inspector', unit: 'Whitefield PS', district: 'Bengaluru Urban', casesHandled: 84, arrests: 61, chargesheetRatePct: 71, avgDaysToChargesheet: 42 },
    { displayName: 'S**** M****', realName: 'Santosh Mallya', rank: 'Sub-Inspector', unit: 'Hubli SubUrban PS', district: 'Dharwad', casesHandled: 76, arrests: 52, chargesheetRatePct: 68, avgDaysToChargesheet: 47 },
    { displayName: 'P**** N****', realName: 'Prakash Naidu', rank: 'Police Inspector', unit: 'Mysuru Town PS', district: 'Mysuru', casesHandled: 71, arrests: 55, chargesheetRatePct: 74, avgDaysToChargesheet: 39 },
    { displayName: 'V**** G****', realName: 'Vikram Gowda', rank: 'Sub-Inspector', unit: 'Belagavi Rural PS', district: 'Belagavi', casesHandled: 68, arrests: 46, chargesheetRatePct: 65, avgDaysToChargesheet: 51 },
    { displayName: 'A**** S****', realName: 'Anand Shetty', rank: 'Circle Inspector', unit: 'Kalaburagi Town PS', district: 'Kalaburagi', casesHandled: 63, arrests: 44, chargesheetRatePct: 70, avgDaysToChargesheet: 44 },
    { displayName: 'D**** R****', realName: 'Deepak Rao', rank: 'Sub-Inspector', unit: 'Tumakuru Circle Office', district: 'Tumakuru', casesHandled: 59, arrests: 39, chargesheetRatePct: 66, avgDaysToChargesheet: 49 },
    { displayName: 'K**** P****', realName: 'Kiran Patil', rank: 'Police Inspector', unit: 'Ballari Town PS', district: 'Ballari', casesHandled: 55, arrests: 41, chargesheetRatePct: 72, avgDaysToChargesheet: 41 },
    { displayName: 'N**** H****', realName: 'Nagaraj Hegde', rank: 'Sub-Inspector', unit: 'Shivamogga Rural PS', district: 'Shivamogga', casesHandled: 52, arrests: 33, chargesheetRatePct: 63, avgDaysToChargesheet: 53 },
  ];
}
```

- [ ] **Step 6: Restructure InvestigationNetworkTab.tsx — rows, Area chart, reveal modal, expanded IO table**

Add imports:
```tsx
import { AreaChart, Area } from 'recharts';
import { useState } from 'react';
import { PersonRevealModal, type PersonRevealData } from './PersonRevealModal';
```

Add state near the top of the component:
```tsx
  const [revealedPerson, setRevealedPerson] = useState<PersonRevealData | null>(null);
```

Replace the "Arrests vs Surrenders by Month" `<BarChart><Bar>` with `<AreaChart><Area>`:
```tsx
          <AreaChart data={arrestsVsSurrenders}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" stroke="var(--muted)" fontSize={10} />
            <YAxis stroke="var(--muted)" fontSize={10} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="arrests" name="Arrests" stroke="var(--real)" fill="var(--real)" fillOpacity={0.5} />
            <Area type="monotone" dataKey="surrenders" name="Surrenders" stroke="var(--predicted)" fill="var(--predicted)" fillOpacity={0.5} />
          </AreaChart>
```
(Remove the now-unused `BarChart, Bar` import if nothing else in the file uses them; keep `ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend`.)

Replace the demo repeat-offenders `RankedBarList` with a clickable list (new small inline component in the same file):

```tsx
function ClickableOffenderList({ offenders, onSelect }: { offenders: RepeatOffenderDemoRow[]; onSelect: (o: RepeatOffenderDemoRow) => void }) {
  const sorted = [...offenders].sort((a, b) => b.caseCount - a.caseCount);
  const max = sorted[0]?.caseCount ?? 0;
  return (
    <div className="cat-bars">
      {sorted.map((o) => (
        <button
          key={o.displayName}
          type="button"
          className="cat-bar-row"
          style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }}
          onClick={() => onSelect(o)}
        >
          <span className="cat-bar-label">{o.displayName}</span>
          <div className="cat-bar-track">
            <div className="cat-bar-fill" style={{ width: `${max === 0 ? 0 : (o.caseCount / max) * 100}%`, background: 'var(--real)' }} />
          </div>
          <span className="cat-bar-count mono">{o.caseCount}</span>
        </button>
      ))}
    </div>
  );
}
```

Replace the row layout (Steps below assume the file's imports for `RepeatOffenderDemoRow`/`IoLeaderboardRow` types are already implicitly available via the demo-data functions' return types):

```tsx
  return (
    <>
      <div className="insight-grid">
        <InsightCard
          title="Crime Head ↔ Act Linkage"
          live={false}
          note="Flow weight = number of act-section associations linking a crime head to a legal act."
          expand={{ columns: ['Linkage', 'Cases'], rows: linkage.map((l) => [l.label, l.count]) }}
        >
          <ChordDiagram labels={linkageMatrix.labels} matrix={linkageMatrix.matrix} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard
          title="Arrests vs Surrenders by Month"
          live={false}
          expand={{ columns: ['Month', 'Arrests', 'Surrenders'], rows: arrestsVsSurrenders.map((a) => [a.monthLabel, a.arrests, a.surrenders]) }}
        >
          <ResponsiveContainer width="100%" height={220}>
            {/* AreaChart from Step 6 above */}
          </ResponsiveContainer>
        </InsightCard>
      </div>

      <div className="insight-grid-2" style={{ marginTop: 16 }}>
        <InsightCard
          title="Top Repeat Offenders"
          live={liveRepeatOffenders}
          note={liveRepeatOffenders ? undefined : "Repeat-offender data isn't available for this role — showing representative data."}
        >
          {liveRepeatOffenders ? (
            topOffendersQuery.isLoading ? (
              <p>Loading…</p>
            ) : topOffendersQuery.isError ? (
              <p role="alert">Couldn't load repeat-offender data.</p>
            ) : (
              <RankedBarList items={(topOffendersQuery.data ?? []).map((o) => ({ label: o.displayName, value: o.caseCount }))} />
            )
          ) : (
            <ClickableOffenderList
              offenders={demoRepeatOffenders}
              onSelect={(o) =>
                setRevealedPerson({
                  realName: o.realName,
                  details: [
                    { label: 'Age', value: String(o.age) },
                    { label: 'Gender', value: o.gender },
                    { label: 'Top crime head', value: o.topCrimeHead },
                    { label: 'Case count', value: String(o.caseCount) },
                  ],
                })
              }
            />
          )}
        </InsightCard>

        <InsightCard title="Accused: First-time vs Repeat" live={liveRepeatOffenders}>
          {/* unchanged Donut branch */}
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard title="Investigating Officer Leaderboard" live={false}>
          <div className="case-table-wrap">
            <table className="case-table">
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Rank</th>
                  <th>Unit</th>
                  <th>District</th>
                  <th>Cases Handled</th>
                  <th>Arrests</th>
                  <th>Chargesheet Rate</th>
                  <th>Avg Days to CS</th>
                </tr>
              </thead>
              <tbody>
                {ioLeaderboard.map((row) => (
                  <tr key={row.displayName + row.unit}>
                    <td>
                      <button
                        type="button"
                        style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--real)' }}
                        onClick={() =>
                          setRevealedPerson({
                            realName: row.realName,
                            details: [
                              { label: 'Rank', value: row.rank },
                              { label: 'Unit', value: row.unit },
                              { label: 'District', value: row.district },
                              { label: 'Cases handled', value: String(row.casesHandled) },
                            ],
                          })
                        }
                      >
                        {row.displayName}
                      </button>
                    </td>
                    <td>{row.rank}</td>
                    <td>{row.unit}</td>
                    <td>{row.district}</td>
                    <td className="mono">{row.casesHandled}</td>
                    <td className="mono">{row.arrests}</td>
                    <td className="mono">{row.chargesheetRatePct}%</td>
                    <td className="mono">{row.avgDaysToChargesheet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>
      </div>

      <PersonRevealModal person={revealedPerson} onClose={() => setRevealedPerson(null)} />
    </>
  );
```

- [ ] **Step 7: Run the full test suite**

Run: `npm run test -- InvestigationNetworkTab.test.tsx PersonRevealModal.test.tsx`
Expected: PASS — update `InvestigationNetworkTab.test.tsx`'s IO Leaderboard column assertions if it checked the old 5-column header set, and its demo-offender assertions if it queried `RankedBarList`-specific DOM for that card (now a `ClickableOffenderList` button list instead).

- [ ] **Step 8: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/screens/insights/InvestigationNetworkTab.tsx \
  src/screens/insights/InvestigationNetworkTab.test.tsx src/screens/insights/PersonRevealModal.tsx \
  src/screens/insights/PersonRevealModal.test.tsx
git commit -m "feat: Investigation Network row layout, Area chart, PII reveal cards, expanded IO Leaderboard columns"
```

---

### Task 9: Judicial & Units — row layout, treemap expansion to all 30 districts

**Files:**
- Modify: `src/api/demoAnalyticsData.ts`
- Modify: `src/screens/insights/JudicialUnitsTab.tsx`

- [ ] **Step 1: Expand DISTRICT_UNITS_DEMO/DISTRICT_WEIGHTS_DEMO to all 30 districts**

Replace both constants in `demoAnalyticsData.ts`:

```ts
const ALL_DISTRICT_NAMES_DEMO = [
  'Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar',
  'Chamarajanagara', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada',
  'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar',
  'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi',
  'Uttara Kannada', 'Vijayapura', 'Yadgir',
];

const DISTRICT_WEIGHTS_DEMO: Record<string, number> = {
  Bagalkote: 89, Ballari: 350, Belagavi: 586, 'Bengaluru Rural': 107, 'Bengaluru Urban': 1840,
  Bidar: 282, Chamarajanagara: 349, Chikkaballapura: 187, Chikkamagaluru: 80, Chitradurga: 289,
  'Dakshina Kannada': 396, Davanagere: 327, Dharwad: 293, Gadag: 182, Hassan: 422, Haveri: 449,
  Kalaburagi: 526, Kodagu: 265, Kolar: 253, Koppal: 127, Mandya: 288, Mysuru: 687, Raichur: 269,
  Ramanagara: 458, Shivamogga: 406, Tumakuru: 678, Udupi: 401, 'Uttara Kannada': 185,
  Vijayapura: 451, Yadgir: 268,
};

// Unit names for the 25 districts beyond the original 5 curated ones are generated
// formulaically ("{District} Town/Rural PS") rather than hand-invented, matching the
// same synthetic-station-naming convention the reference prototype's own generator uses.
function districtUnitNames(districtName: string): string[] {
  const curated: Record<string, string[]> = {
    'Bengaluru Urban': ['Whitefield PS', 'Koramangala PS', 'Yeshwanthpur PS', 'Electronic City PS'],
    Mysuru: ['Mysuru Town PS', 'Mysuru Rural PS', 'Nazarbad PS'],
    Tumakuru: ['Tumakuru Town PS', 'Tumakuru Rural PS', 'Tumakuru Circle Office'],
    Belagavi: ['Belagavi Town PS', 'Belagavi Rural PS', 'Belagavi Circle Office'],
    Kalaburagi: ['Kalaburagi Town PS', 'Kalaburagi Rural PS'],
  };
  return curated[districtName] ?? [`${districtName} Town PS`, `${districtName} Rural PS`];
}

export function getDistrictUnitCaseLoadDemo(): UnitCaseLoad[] {
  const rows: UnitCaseLoad[] = [];
  ALL_DISTRICT_NAMES_DEMO.forEach((districtName) => {
    const units = districtUnitNames(districtName);
    const share = Math.round(DISTRICT_WEIGHTS_DEMO[districtName] / units.length);
    units.forEach((unitName, i) => {
      rows.push({ districtName, unitName, caseCount: Math.max(20, share - i * Math.round(share * 0.12)) });
    });
  });
  return rows;
}
```

(Delete the old `DISTRICT_UNITS_DEMO` constant entirely — fully replaced by `ALL_DISTRICT_NAMES_DEMO` + `districtUnitNames`.)

- [ ] **Step 2: Restructure JudicialUnitsTab.tsx into rows**

Replace the single flat return with row groups:

```tsx
  return (
    <>
      <div className="insight-grid-2">
        <InsightCard
          title="Court-wise Pending Cases"
          live={false}
          note="Top 12 courts by pending load."
          expand={{ columns: ['Court', 'Pending'], rows: courtPending.map((c) => [c.court, c.pending]) }}
        >
          <RankedBarList items={courtPending.map((c) => ({ label: c.court, value: c.pending }))} />
        </InsightCard>
        <InsightCard title="Final Report Outcome" live={false} expand={{ columns: ['Outcome', 'Count'], rows: outcome.map((o) => [o.outcome, o.count]) }}>
          <Donut slices={outcome.map((o) => ({ label: o.outcome, value: o.count }))} />
        </InsightCard>
      </div>

      <div className="insight-grid" style={{ marginTop: 16 }}>
        <InsightCard title="District → Unit Case Load" live={false} note="Area = FIRs registered per unit, across all 30 Karnataka districts.">
          {/* unchanged Treemap + full data table */}
        </InsightCard>
      </div>

      <div className="insight-grid-2" style={{ marginTop: 16 }}>
        <InsightCard
          title="Employee Rank Distribution"
          live={false}
          expand={{ columns: ['Rank', 'Headcount'], rows: rankDistribution.map((r) => [r.rank, r.headcount]) }}
        >
          <RankedBarList items={rankDistribution.map((r) => ({ label: r.rank, value: r.headcount }))} />
        </InsightCard>
        <InsightCard title="Unit Performance" live={false} note="Case count, pending share & average resolution time per unit.">
          {/* unchanged table */}
        </InsightCard>
      </div>
    </>
  );
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test -- JudicialUnitsTab.test.tsx`
Expected: PASS — update if it asserted on the old 5-district/15-unit treemap data shape.

- [ ] **Step 4: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/screens/insights/JudicialUnitsTab.tsx src/screens/insights/JudicialUnitsTab.test.tsx
git commit -m "feat: Judicial & Units row layout, expand treemap to all 30 Karnataka districts"
```

---

### Task 10: Sociological — full-width stacked charts, InfoTip, zoom via ChartLightbox

**Files:**
- Create: `src/design-system/InfoTip.tsx`
- Test: `src/design-system/InfoTip.test.tsx`
- Modify: `src/screens/sociological/CorrelationScatterChart.tsx`
- Modify: `src/design-system/components.css`

- [ ] **Step 1: Write the failing test for InfoTip**

```tsx
// src/design-system/InfoTip.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTip } from './InfoTip';

describe('InfoTip', () => {
  it('shows the explanation text when the info button is clicked, and hides it again on a second click', () => {
    render(<InfoTip label="Literacy rate" text="Higher literacy rates generally correlate with lower crime rates." />);
    expect(screen.queryByText(/Higher literacy rates/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('How to read Literacy rate'));
    expect(screen.getByText(/Higher literacy rates/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('How to read Literacy rate'));
    expect(screen.queryByText(/Higher literacy rates/)).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<InfoTip label="Literacy rate" text="Explanation text." />);
    fireEvent.click(screen.getByLabelText('How to read Literacy rate'));
    expect(screen.getByText('Explanation text.')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Explanation text.')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- InfoTip.test.tsx`
Expected: FAIL — `Cannot find module './InfoTip'`

- [ ] **Step 3: Implement InfoTip**

```tsx
// src/design-system/InfoTip.tsx
import { useEffect, useState } from 'react';

interface InfoTipProps {
  label: string;
  text: string;
}

export function InfoTip({ label, text }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <span className="info-tip">
      <button
        type="button"
        className="info-tip-button"
        aria-label={`How to read ${label}`}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && <span className="info-tip-popover">{text}</span>}
    </span>
  );
}
```

- [ ] **Step 4: Add InfoTip CSS**

Append to `components.css`:

```css
.info-tip { position: relative; display: inline-flex; margin-left: 6px; }
.info-tip-button { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--muted-2); background: var(--canvas); color: var(--muted); font-size: 10px; font-style: italic; font-family: 'IBM Plex Sans', sans-serif; cursor: pointer; display: grid; place-items: center; padding: 0; }
.info-tip-button:hover { color: var(--text); border-color: var(--muted); }
.info-tip-popover { position: absolute; top: 22px; left: 0; z-index: 10; width: 220px; background: var(--text); color: var(--canvas); font-size: 11px; line-height: 1.4; padding: 8px 10px; border-radius: 6px; box-shadow: var(--shadow); }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- InfoTip.test.tsx`
Expected: PASS

- [ ] **Step 6: Restructure CorrelationScatterChart.tsx to full-width stacked panels with InfoTip + zoom**

Add imports:
```tsx
import { useState } from 'react';
import { InfoTip } from '../../design-system/InfoTip';
import { ChartLightbox } from '../insights/ChartLightbox';
```

Add a per-indicator "how to read" text map near the top of the file:

```tsx
const INDICATOR_EXPLANATION: Record<IndicatorKey, string> = {
  literacyRate: 'Each dot is a district. Higher literacy rate (x-axis) generally correlates with a lower crime rate per 100k population (y-axis) — a downward-sloping trend line indicates that relationship.',
  unemploymentRate: 'Each dot is a district. Higher unemployment (x-axis) is often associated with higher crime rates per 100k population (y-axis) — an upward-sloping trend line indicates that relationship.',
  urbanizationRate: 'Each dot is a district. More urbanized districts (x-axis) often see different crime rates per 100k population (y-axis) than rural ones — the trend line direction shows which way.',
  perCapitaIncome: 'Each dot is a district. Per-capita income (x-axis) plotted against crime rate per 100k population (y-axis) — the trend line direction shows whether wealthier districts trend higher or lower.',
};
```

Add zoom state and replace the grid with full-width stacked panels:

```tsx
export function CorrelationScatterChart({ districts, highlightedDistrictId = null }: CorrelationScatterChartProps) {
  const [zoomedKey, setZoomedKey] = useState<IndicatorKey | null>(null);
  // ... existing panels/sortedPanels/strongestKey computation unchanged ...

  const zoomedPanel = sortedPanels.find((p) => p.key === zoomedKey) ?? null;

  return (
    <section>
      <h3>Socio-economic correlation</h3>
      <div className="correlation-stack">
        {sortedPanels.map((panel) => (
          <div key={panel.key} className="indicator-scatter-row">
            <div className="indicator-scatter-row-head">
              <span>{panel.label}</span>
              <InfoTip label={panel.label} text={INDICATOR_EXPLANATION[panel.key]} />
              <button type="button" className="insight-card-expand" aria-label={`Expand ${panel.label}`} onClick={() => setZoomedKey(panel.key)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <IndicatorScatterPlot
              label={panel.label}
              yLabel={Y_LABEL}
              points={panel.points}
              regression={panel.regression}
              isStrongest={panel.key === strongestKey}
              highlightedDistrictId={highlightedDistrictId}
            />
          </div>
        ))}
      </div>
      <ChartLightbox
        open={zoomedPanel !== null}
        title={zoomedPanel?.label ?? ''}
        columns={['District', panel_x_label(zoomedPanel), Y_LABEL]}
        rows={(zoomedPanel?.points ?? []).map((p) => [p.districtName, p.x.toFixed(1), p.y.toFixed(1)])}
        onClose={() => setZoomedKey(null)}
      >
        {zoomedPanel && (
          <IndicatorScatterPlot
            label={zoomedPanel.label}
            yLabel={Y_LABEL}
            points={zoomedPanel.points}
            regression={zoomedPanel.regression}
            isStrongest={zoomedPanel.key === strongestKey}
            highlightedDistrictId={highlightedDistrictId}
          />
        )}
      </ChartLightbox>
    </section>
  );
}

function panel_x_label(panel: IndicatorPanel | null): string {
  return panel?.label ?? 'Value';
}
```

- [ ] **Step 7: Add `.correlation-stack`/`.indicator-scatter-row` CSS, replacing the 2×2 `.correlation-grid`**

Replace the existing `.correlation-grid` rule block in `components.css`:

```css
.correlation-stack { display: flex; flex-direction: column; gap: 16px; }
.indicator-scatter-row { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px 4px; background: var(--panel); }
.indicator-scatter-row-head { display: flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 600; margin-bottom: 4px; }
.indicator-scatter-row-head .insight-card-expand { margin-left: auto; }
```

(Leave `.indicator-scatter`/`.indicator-scatter-head`/etc. in place if `IndicatorScatterPlot.tsx` still uses its own wrapping `<div className="indicator-scatter">` internally — it does, and that's fine nested inside the new `.indicator-scatter-row`.)

- [ ] **Step 8: Run the full test suite**

Run: `npm run test -- CorrelationScatterChart.test.tsx InfoTip.test.tsx` (if a `CorrelationScatterChart.test.tsx` exists; otherwise run the full `sociological` directory's tests: `npm run test -- src/screens/sociological`)
Expected: PASS — update any test asserting on `.correlation-grid` DOM to expect `.correlation-stack` instead.

- [ ] **Step 9: Manual visual check**

Run: `npm run dev`, open `/sociological`, confirm: the four indicator charts now stack full-width, each shows an "i" info button (click to see explanation, click again or Escape to close) and an expand icon (opens the same lightbox pattern used in Insights, with the enlarged chart + a district/value data table), and the right-hand Predictive risk panel (Risk Forecast + Anomaly List) is unchanged.

- [ ] **Step 10: Commit**

```bash
git add src/design-system/InfoTip.tsx src/design-system/InfoTip.test.tsx \
  src/screens/sociological/CorrelationScatterChart.tsx src/design-system/components.css
git commit -m "feat: Sociological correlation charts go full-width, add info tooltip + zoom lightbox per chart"
```

---

## Final verification (all tasks)

- [ ] Run: `npm run test` — full suite passes.
- [ ] Run: `npx tsc -b` — no new type errors versus the pre-existing baseline (the same handful of unrelated `DistrictMap.tsx`/`CaseHeatmapView.tsx`/`mockData.test.ts` errors from before this work started).
- [ ] Manual browser QA (`npm run dev`), logged in as a role with full access (e.g. `demo.analyst` / `Demo@12345`, with `sessionStorage['ksp-mock']='1'` for mock mode):
  - Rail shows Overview / Crime Trends / Demographics / Investigation Network / Judicial & Units as five separate entries; `/insights` redirects to `/overview`.
  - Overview: full-width trend chart, full-width Sankey (links colored by destination), 3-up category/gravity/districts row, full-width Recent FIRs with Gravity + Status columns styled like Case Explorer's.
  - Crime Trends: 2-up distribution/trend row, full-width cohort heatmap, full-width district×crime-head matrix (30 rows) with a working district filter dropdown, and a real Karnataka map (not a scatter plot) for Incident Location Hotspots.
  - Demographics: Female slices are pink across all three gender donuts, full-width age chart, two 3-up rows (Complainant then Accused religion/caste/occupation), full-width cross-tab.
  - Investigation Network: full-width chord diagram, full-width area chart, 50/50 offenders/first-time-vs-repeat row (clicking an offender name opens the reveal modal with an initials avatar), full-width IO Leaderboard with all 8 columns (clicking an officer name opens the same reveal modal).
  - Judicial & Units: 50/50 court/outcome row, full-width treemap covering all 30 districts, 50/50 rank/unit-performance row.
  - Sociological: four full-width stacked correlation charts, each with a working info tooltip and zoom lightbox; Predictive risk panel unchanged.
