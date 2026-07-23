# UI Polish + Top-Pill Nav & Fixed KPI Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the clipped InfoTip popover, rebuild the treemap, overhaul the chord diagram (thinner geometry, value labels, hover-fade, fixed label rotation, side-by-side lightbox), fix heatmap contrast, and replace the left rail with a top pill nav plus a persistent KPI strip on every page.

**Architecture:** Additive/isolated fixes for items 1-4 (no shared-component breakage); item 5-6 restructure the app shell (`.shell` grid, `Header.tsx`, `Rail.tsx` → `TopNavPills.tsx`) used by every screen.

**Tech Stack:** React 19, TypeScript, `d3-hierarchy` (new dependency), existing `d3-chord`/`d3-shape`.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-07-24-ui-polish-and-nav-overhaul-design.md`.
- All 10 rail destinations become pills (confirmed); the same 6 KPIs appear on every page (confirmed).
- `ChartLightbox`'s new `layout` prop defaults to today's stacked behavior — every existing lightbox usage except the chord diagram is visually unchanged.

---

### Task 1: Fix InfoTip popover clipping off-screen

**Files:**
- Modify: `src/design-system/components.css`

- [ ] **Step 1: Anchor the popover to the right instead of the left**

Replace the `.info-tip-popover` rule:
```css
.info-tip-popover { position: absolute; top: 22px; right: 0; left: auto; z-index: 10; width: 220px; background: var(--text); color: var(--canvas); font-size: 11px; line-height: 1.4; padding: 8px 10px; border-radius: 6px; box-shadow: var(--shadow); }
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test -- InfoTip.test.tsx`
Expected: PASS (CSS-only change, no DOM/assertion impact).

- [ ] **Step 3: Manual visual check**

Run `npm run dev`, open `/sociological`, click an info icon near the right edge of a card, confirm the full explanation text is visible and not clipped.

- [ ] **Step 4: Commit**

```bash
git add src/design-system/components.css
git commit -m "fix: InfoTip popover was clipped off-screen -- anchor it right instead of left"
```

---

### Task 2: Fix HeatmapGrid contrast (Cohort Analysis + District × Crime Head Matrix)

**Files:**
- Modify: `src/screens/insights/HeatmapGrid.tsx`
- Modify: `src/screens/insights/HeatmapGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `HeatmapGrid.test.tsx`:
```tsx
  it('uses dark text on low-intensity (light) cells and light text on high-intensity (dark) cells', () => {
    const { container } = render(
      <HeatmapGrid
        rows={['R1']}
        cols={['C1', 'C2']}
        cells={[
          { row: 'R1', col: 'C1', intensity: 0.1, display: 'low' },
          { row: 'R1', col: 'C2', intensity: 0.9, display: 'high' },
        ]}
      />,
    );
    const cells = container.querySelectorAll('.heatmap-cell');
    expect(cells[0]).toHaveStyle({ color: 'var(--text)' });
    expect(cells[1]).toHaveStyle({ color: '#ffffff' });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- HeatmapGrid.test.tsx`
Expected: FAIL — every cell currently gets its color from the fixed CSS class rule, not an inline per-cell style.

- [ ] **Step 3: Compute per-cell text color by intensity**

Replace `src/screens/insights/HeatmapGrid.tsx`:
```tsx
export interface HeatmapCell {
  row: string;
  col: string;
  intensity: number; // 0..1, clamped when rendered
  display: string;
}

interface HeatmapGridProps {
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
}

// Fixed rgba over the light-theme --real hex (18,58,99 = navy #123a63). Kept as a literal
// rather than var(--real) because CSS custom properties can't be used inside an rgba()
// alpha channel computation here; must be kept in sync if --real's hex changes.
export function HeatmapGrid({ rows, cols, cells }: HeatmapGridProps) {
  const lookup = new Map(cells.map((c) => [`${c.row}|${c.col}`, c]));

  return (
    <div className="heatmap-grid" role="table">
      <div className="heatmap-row heatmap-header" role="row">
        <div className="heatmap-corner" role="columnheader" />
        {cols.map((col) => (
          <div key={col} className="heatmap-col-label" role="columnheader">
            {col}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row} className="heatmap-row" role="row">
          <div className="heatmap-row-label" role="rowheader">
            {row}
          </div>
          {cols.map((col) => {
            const cell = lookup.get(`${row}|${col}`);
            const intensity = Math.min(1, Math.max(0, cell?.intensity ?? 0));
            // Below ~45% intensity the navy fill is light enough that dark text reads better;
            // above it, the fill is dark enough that only white text stays legible.
            const textColor = intensity < 0.45 ? 'var(--text)' : '#ffffff';
            return (
              <div
                key={col}
                className="heatmap-cell"
                role="cell"
                style={{ background: `rgba(18, 58, 99, ${intensity})`, color: textColor }}
              >
                {cell?.display ?? '—'}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Remove the now-redundant fixed color from the CSS class**

In `src/design-system/components.css`, remove `color: #fff;` from the `.heatmap-cell` rule (line ~425) — the inline style now controls it per-cell:
```css
.heatmap-cell { width: 56px; height: 26px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 9.5px; border-radius: 3px; font-family: 'IBM Plex Mono', monospace; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- HeatmapGrid.test.tsx`
Expected: PASS

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: PASS (no other test asserts on `.heatmap-cell`'s color).

- [ ] **Step 7: Commit**

```bash
git add src/screens/insights/HeatmapGrid.tsx src/screens/insights/HeatmapGrid.test.tsx src/design-system/components.css
git commit -m "fix: heatmap cells used fixed white text regardless of background intensity, making low-intensity cells nearly illegible"
```

---

### Task 3: Rebuild the treemap as a real hierarchical, colorful visualization

**Files:**
- Create: `src/screens/insights/CaseLoadTreemap.tsx`
- Test: `src/screens/insights/CaseLoadTreemap.test.tsx`
- Modify: `src/screens/insights/JudicialUnitsTab.tsx`
- Modify: `package.json` (add `d3-hierarchy`, `@types/d3-hierarchy`)

**Interfaces:**
- Produces: `CaseLoadTreemap({ data: Array<{ districtName: string; unitName: string; caseCount: number }>; width?: number; height?: number })`.

- [ ] **Step 1: Install d3-hierarchy**

Run: `npm install d3-hierarchy && npm install -D @types/d3-hierarchy`

- [ ] **Step 2: Write the failing test**

```tsx
// src/screens/insights/CaseLoadTreemap.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CaseLoadTreemap } from './CaseLoadTreemap';

const data = [
  { districtName: 'Bengaluru Urban', unitName: 'Whitefield PS', caseCount: 400 },
  { districtName: 'Bengaluru Urban', unitName: 'Koramangala PS', caseCount: 300 },
  { districtName: 'Mysuru', unitName: 'Mysuru Town PS', caseCount: 200 },
];

describe('CaseLoadTreemap', () => {
  it('renders one header group per district and one cell per unit', () => {
    const { container } = render(<CaseLoadTreemap data={data} />);
    expect(container.querySelectorAll('.treemap-district-header')).toHaveLength(2);
    expect(container.querySelectorAll('.treemap-unit-cell')).toHaveLength(3);
  });

  it('shows the district total in its header label', () => {
    const { container } = render(<CaseLoadTreemap data={data} />);
    const headerTexts = Array.from(container.querySelectorAll('.treemap-district-header + text')).map((el) => el.textContent);
    expect(headerTexts.some((t) => t?.includes('Bengaluru Urban') && t?.includes('700'))).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- CaseLoadTreemap.test.tsx`
Expected: FAIL — `Cannot find module './CaseLoadTreemap'`

- [ ] **Step 4: Implement CaseLoadTreemap**

```tsx
// src/screens/insights/CaseLoadTreemap.tsx
import { useMemo } from 'react';
import { hierarchy, treemap, treemapBinary } from 'd3-hierarchy';

interface CaseLoadRow {
  districtName: string;
  unitName: string;
  caseCount: number;
}

interface CaseLoadTreemapProps {
  data: CaseLoadRow[];
  width?: number;
  height?: number;
}

interface DistrictNode {
  name: string;
  children: Array<{ name: string; value: number }>;
}

const DISTRICT_COLORS = [
  '#123a63', '#1e8a5f', '#c0392b', '#d4a017', '#6c5ce7', '#e67e22',
  '#2b8fd1', '#a06cd5', '#38b6a7', '#e05797', '#4a6fa5', '#7cb342',
];

const HEADER_HEIGHT = 22;

export function CaseLoadTreemap({ data, width = 1080, height = 520 }: CaseLoadTreemapProps) {
  const districts: DistrictNode[] = useMemo(() => {
    const byDistrict = new Map<string, Array<{ name: string; value: number }>>();
    data.forEach((row) => {
      const list = byDistrict.get(row.districtName) ?? [];
      list.push({ name: row.unitName, value: row.caseCount });
      byDistrict.set(row.districtName, list);
    });
    return [...byDistrict.entries()].map(([name, children]) => ({ name, children }));
  }, [data]);

  const districtTotal = (d: DistrictNode) => d.children.reduce((sum, c) => sum + c.value, 0);

  const root = useMemo(() => {
    const h = hierarchy<{ name: string; children?: DistrictNode[] }>({ name: 'root', children: districts } as never)
      .sum((d) => (d as unknown as { value?: number }).value ?? 0);
    return treemap<{ name: string }>().tile(treemapBinary).size([width, height]).paddingTop(HEADER_HEIGHT).paddingInner(2)(h as never);
  }, [districts, width, height]);

  const districtLayoutNodes = (root.children ?? []) as Array<{
    data: DistrictNode;
    x0: number; y0: number; x1: number; y1: number;
    children?: Array<{ data: { name: string; value: number }; x0: number; y0: number; x1: number; y1: number }>;
  }>;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Case load by district and unit">
      {districtLayoutNodes.map((district, i) => {
        const color = DISTRICT_COLORS[i % DISTRICT_COLORS.length];
        return (
          <g key={district.data.name}>
            <rect
              className="treemap-district-header"
              x={district.x0}
              y={district.y0 - HEADER_HEIGHT}
              width={district.x1 - district.x0}
              height={HEADER_HEIGHT}
              fill={color}
            />
            <text
              x={district.x0 + 6}
              y={district.y0 - HEADER_HEIGHT / 2}
              dy="0.35em"
              fontSize={11}
              fontWeight={700}
              fill="#ffffff"
            >
              {district.data.name} ({districtTotal(district.data).toLocaleString()})
            </text>
            {(district.children ?? []).map((unit) => {
              const w = unit.x1 - unit.x0;
              const h = unit.y1 - unit.y0;
              return (
                <g key={unit.data.name}>
                  <rect
                    className="treemap-unit-cell"
                    x={unit.x0}
                    y={unit.y0}
                    width={w}
                    height={h}
                    fill={color}
                    fillOpacity={0.35}
                    stroke="var(--panel)"
                    strokeWidth={1.5}
                  >
                    <title>{`${unit.data.name}: ${unit.data.value.toLocaleString()} cases`}</title>
                  </rect>
                  {w > 50 && h > 16 && (
                    <text x={unit.x0 + 5} y={unit.y0 + 14} fontSize={9.5} fill="var(--text)">
                      {unit.data.name.length > Math.floor(w / 6) ? `${unit.data.name.slice(0, Math.floor(w / 6) - 1)}…` : unit.data.name}
                    </text>
                  )}
                  {w > 40 && h > 28 && (
                    <text x={unit.x0 + 5} y={unit.y0 + 26} fontSize={9} fill="var(--muted)" className="mono">
                      {unit.data.value.toLocaleString()}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- CaseLoadTreemap.test.tsx`
Expected: PASS

- [ ] **Step 6: Wire into JudicialUnitsTab.tsx**

Replace the `Treemap`/`ResponsiveContainer`/`Tooltip` import and usage:
```tsx
import { CaseLoadTreemap } from './CaseLoadTreemap';
```
(remove `import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';` and the `treemapData` computation — no longer needed, `CaseLoadTreemap` takes `unitCaseLoad` directly.)

Replace:
```tsx
          <ResponsiveContainer width="100%" height={200}>
            <Treemap data={treemapData} dataKey="size" stroke="var(--panel)" fill="var(--real)">
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 11 }} />
            </Treemap>
          </ResponsiveContainer>
```
with:
```tsx
          <CaseLoadTreemap data={unitCaseLoad} height={520} />
```

- [ ] **Step 7: Run the full test suite**

Run: `npm run test -- JudicialUnitsTab.test.tsx CaseLoadTreemap.test.tsx`
Expected: PASS

- [ ] **Step 8: Manual visual check**

Run `npm run dev`, open `/judicial-units`, confirm the treemap shows a colored header bar per district with `(total)`, nested unit rectangles with visible names/counts where space allows, and a browser tooltip (native `<title>`) on hover for cramped cells.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/screens/insights/CaseLoadTreemap.tsx \
  src/screens/insights/CaseLoadTreemap.test.tsx src/screens/insights/JudicialUnitsTab.tsx
git commit -m "feat: rebuild District -> Unit Case Load as a real hierarchical treemap with colored district headers"
```

---

### Task 4: Chord diagram overhaul — thinner geometry, value labels, hover-fade, fixed label rotation

**Files:**
- Modify: `src/screens/insights/ChordDiagram.tsx`
- Modify: `src/screens/insights/ChordDiagram.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `ChordDiagram.test.tsx`:
```tsx
  it('shows a value label for each arc', () => {
    const { getByText } = render(
      <ChordDiagram labels={['Head A', 'Head B', 'Act X']} matrix={[[0, 0, 10], [0, 0, 5], [10, 5, 0]]} />,
    );
    expect(getByText('10')).toBeInTheDocument(); // Head A's total (only linked to Act X, value 10)
  });

  it('fades unrelated ribbons and arcs on hover, and keeps the hovered arc at full opacity', () => {
    const { container } = render(
      <ChordDiagram labels={['Head A', 'Head B', 'Act X']} matrix={[[0, 0, 10], [0, 0, 5], [10, 5, 0]]} />,
    );
    const arcs = container.querySelectorAll('path.chord-arc');
    fireEvent.mouseEnter(arcs[0]);
    const ribbons = container.querySelectorAll('path.chord-ribbon');
    const unrelatedRibbon = Array.from(ribbons).find((r) => !r.classList.contains('chord-ribbon-active'));
    expect(unrelatedRibbon).toBeDefined();
    expect(arcs[0]).toHaveClass('chord-arc-active');
  });
```

Add the `fireEvent` import to the top of the file:
```tsx
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ChordDiagram } from './ChordDiagram';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ChordDiagram.test.tsx`
Expected: FAIL — no value labels, no hover classes exist yet.

- [ ] **Step 3: Rewrite ChordDiagram with hover state, value labels, thinner geometry, and fixed label rotation**

```tsx
// src/screens/insights/ChordDiagram.tsx
import { useMemo, useState } from 'react';
import { chord, ribbon } from 'd3-chord';
import { arc as d3arc } from 'd3-shape';

interface ChordDiagramProps {
  labels: string[];
  matrix: number[][];
  size?: number;
}

const CHORD_COLORS = ['var(--real)', 'var(--predicted)', 'var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--muted-2)'];

export function ChordDiagram({ labels, matrix, size = 320 }: ChordDiagramProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Thinner ring than before (was a 14px-thick band) -- a finer ring reads closer to the
  // reference chord-diagram aesthetic and leaves more room for ribbon curvature.
  const outerRadius = size / 2 - 46;
  const innerRadius = outerRadius - 8;

  const chordLayout = useMemo(
    () => chord().padAngle(0.04).sortSubgroups((a, b) => b - a)(matrix),
    [matrix],
  );

  const arcGenerator = useMemo(
    () => d3arc<(typeof chordLayout.groups)[number]>().innerRadius(innerRadius).outerRadius(outerRadius),
    [innerRadius, outerRadius],
  );
  const ribbonGenerator = useMemo(() => ribbon<(typeof chordLayout)[number], never>().radius(innerRadius), [innerRadius]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="img" aria-label="Crime head to act chord diagram">
      <g transform={`translate(${size / 2},${size / 2})`}>
        {chordLayout.map((d, i) => {
          const isRelated = hoveredIndex === null || d.source.index === hoveredIndex || d.target.index === hoveredIndex;
          return (
            <path
              key={i}
              className={`chord-ribbon${isRelated && hoveredIndex !== null ? ' chord-ribbon-active' : ''}`}
              d={ribbonGenerator(d) ?? undefined}
              fill={CHORD_COLORS[d.source.index % CHORD_COLORS.length]}
              fillOpacity={isRelated ? 0.55 : 0.1}
              stroke="var(--panel)"
              strokeWidth={0.5}
              style={{ transition: 'fill-opacity 0.15s ease' }}
            />
          );
        })}
        {chordLayout.groups.map((group, i) => {
          const midAngle = (group.startAngle + group.endAngle) / 2;
          const isLeftHalf = midAngle > Math.PI;
          const isHovered = hoveredIndex === i;
          const isFaded = hoveredIndex !== null && !isHovered;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              <path
                className={`chord-arc${isHovered ? ' chord-arc-active' : ''}`}
                d={arcGenerator(group) ?? undefined}
                fill={CHORD_COLORS[i % CHORD_COLORS.length]}
                opacity={isFaded ? 0.3 : 1}
                style={{ transition: 'opacity 0.15s ease' }}
              />
              <text
                transform={`rotate(${(midAngle * 180) / Math.PI - 90}) translate(${outerRadius + 8}) ${isLeftHalf ? 'rotate(180)' : ''}`}
                textAnchor={isLeftHalf ? 'end' : 'start'}
                fontSize={9.5}
                fill="var(--text)"
                opacity={isFaded ? 0.35 : 1}
                style={{ transition: 'opacity 0.15s ease' }}
              >
                {labels[i]}
              </text>
              <text
                transform={`rotate(${(midAngle * 180) / Math.PI - 90}) translate(${outerRadius + 8}) ${isLeftHalf ? 'rotate(180)' : ''}`}
                dy="1.2em"
                textAnchor={isLeftHalf ? 'end' : 'start'}
                fontSize={9}
                fontWeight={isHovered ? 700 : 400}
                fill={isHovered ? 'var(--real)' : 'var(--muted)'}
                opacity={isFaded ? 0.35 : 1}
                className="mono"
                style={{ transition: 'opacity 0.15s ease' }}
              >
                {group.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ChordDiagram.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm run test -- InvestigationNetworkTab.test.tsx`
Expected: PASS (no assertions on internals this change touches).

- [ ] **Step 6: Commit**

```bash
git add src/screens/insights/ChordDiagram.tsx src/screens/insights/ChordDiagram.test.tsx
git commit -m "feat: chord diagram gets thinner geometry, per-arc value labels, hover-fade highlighting, and fixed left-hemisphere label rotation"
```

---

### Task 5: ChartLightbox `layout` prop + chord diagram side-by-side, full-size lightbox

**Files:**
- Modify: `src/screens/insights/ChartLightbox.tsx`
- Modify: `src/screens/insights/ChartLightbox.test.tsx`
- Modify: `src/screens/insights/InsightCard.tsx`
- Modify: `src/screens/insights/InvestigationNetworkTab.tsx`
- Modify: `src/design-system/components.css`

- [ ] **Step 1: Write the failing test**

Add to `ChartLightbox.test.tsx`:
```tsx
  it('applies the side-by-side layout class when layout="side"', () => {
    const { container } = render(
      <ChartLightbox open title="Chord" columns={['A', 'B']} rows={[]} onClose={vi.fn()} layout="side">
        <p>chart</p>
      </ChartLightbox>,
    );
    expect(container.querySelector('.chart-lightbox')).toHaveClass('layout-side');
  });

  it('defaults to the stacked layout when layout is omitted', () => {
    const { container } = render(
      <ChartLightbox open title="Chart" columns={['A']} rows={[]} onClose={vi.fn()}>
        <p>chart</p>
      </ChartLightbox>,
    );
    expect(container.querySelector('.chart-lightbox')).not.toHaveClass('layout-side');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ChartLightbox.test.tsx`
Expected: FAIL — no `layout` prop exists yet.

- [ ] **Step 3: Add the `layout` prop**

```tsx
// src/screens/insights/ChartLightbox.tsx
import { useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ChartLightboxProps {
  open: boolean;
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  onClose: () => void;
  children: ReactNode;
  layout?: 'stacked' | 'side';
}

export function ChartLightbox({ open, title, columns, rows, onClose, children, layout = 'stacked' }: ChartLightboxProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="scrim open" onClick={onClose} />
      <div className={`chart-lightbox${layout === 'side' ? ' layout-side' : ''}`} role="dialog" aria-label={`${title} - expanded`} aria-modal="true">
        <div className="chart-lightbox-head">
          <h3>{title}</h3>
          <button className="evidence-close" aria-label="Close expanded chart" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="chart-lightbox-body">
          <div className="chart-lightbox-chart">{children}</div>
          <div className="chart-lightbox-table case-table-wrap">
            <table className="case-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ChartLightbox.test.tsx`
Expected: PASS

- [ ] **Step 5: Update the lightbox CSS for the new wrapper + side layout**

Replace the existing `.chart-lightbox*` rules in `components.css`:
```css
.chart-lightbox {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(920px, 94vw); max-height: 88vh;
  background: var(--panel); border: 1px solid var(--line); border-radius: 14px;
  box-shadow: 0 24px 60px -20px rgba(0,0,0,0.45);
  z-index: 51; display: flex; flex-direction: column; overflow: hidden;
}
.chart-lightbox.layout-side { width: min(1200px, 96vw); }
.chart-lightbox-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); flex-shrink: 0; }
.chart-lightbox-head h3 { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; margin: 0; }
.chart-lightbox-body { display: flex; flex-direction: column; overflow: auto; }
.chart-lightbox.layout-side .chart-lightbox-body { flex-direction: row; align-items: stretch; }
.chart-lightbox-chart { padding: 20px; overflow: auto; flex: 1; }
.chart-lightbox-chart svg { width: 100%; height: auto; }
.chart-lightbox-table { margin: 0 20px 20px; max-height: 240px; overflow-y: auto; flex-shrink: 0; }
.chart-lightbox.layout-side .chart-lightbox-table { width: 320px; margin: 20px 20px 20px 0; max-height: none; }
```

- [ ] **Step 6: Add `expandedContent`/`expandLayout` to InsightCard**

```tsx
// src/screens/insights/InsightCard.tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { DemoDataBadge } from './DemoDataBadge';
import { ChartLightbox } from './ChartLightbox';

export interface InsightCardExpand {
  columns: string[];
  rows: Array<Array<string | number>>;
}

interface InsightCardProps {
  title: string;
  note?: string;
  live: boolean;
  children: ReactNode;
  expand?: InsightCardExpand;
  expandedContent?: ReactNode;
  expandLayout?: 'stacked' | 'side';
}

export function InsightCard({ title, note, live, children, expand, expandedContent, expandLayout }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="insight-card">
      <div className="insight-card-head">
        <h3>{title}</h3>
        <div className="insight-card-head-actions">
          {!live && <DemoDataBadge />}
          {expand && (
            <button type="button" className="insight-card-expand" aria-label={`Expand ${title}`} onClick={() => setIsExpanded(true)}>
              <ExpandIcon />
            </button>
          )}
        </div>
      </div>
      {note && <p className="insight-card-note">{note}</p>}
      <div className="insight-card-body">{children}</div>
      {expand && (
        <ChartLightbox
          open={isExpanded}
          title={title}
          columns={expand.columns}
          rows={expand.rows}
          onClose={() => setIsExpanded(false)}
          layout={expandLayout}
        >
          {expandedContent ?? children}
        </ChartLightbox>
      )}
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 7: Wire the chord card in InvestigationNetworkTab.tsx to use both new props**

Replace the Crime Head ↔ Act Linkage card:
```tsx
        <InsightCard
          title="Crime Head ↔ Act Linkage"
          live={false}
          note="Flow weight = number of act-section associations linking a crime head to a legal act."
          expand={{ columns: ['Linkage', 'Cases'], rows: linkage.map((l) => [l.label, l.count]) }}
          expandedContent={<ChordDiagram labels={linkageMatrix.labels} matrix={linkageMatrix.matrix} size={640} />}
          expandLayout="side"
        >
          <ChordDiagram labels={linkageMatrix.labels} matrix={linkageMatrix.matrix} />
        </InsightCard>
```

- [ ] **Step 8: Run the full test suite**

Run: `npm run test -- ChartLightbox.test.tsx InsightCard.test.tsx InvestigationNetworkTab.test.tsx`
Expected: PASS

- [ ] **Step 9: Manual visual check**

Run `npm run dev`, open `/investigation-network`, click the Chord diagram's expand icon, confirm: the chord renders much larger, the data table sits beside it (not below), hovering an arc fades unrelated ribbons/arcs and bolds the hovered arc's value.

- [ ] **Step 10: Commit**

```bash
git add src/screens/insights/ChartLightbox.tsx src/screens/insights/ChartLightbox.test.tsx \
  src/screens/insights/InsightCard.tsx src/screens/insights/InvestigationNetworkTab.tsx \
  src/design-system/components.css
git commit -m "feat: ChartLightbox supports a side-by-side layout, chord diagram expands full-size with the table alongside it"
```

---

### Task 6: Top pill nav replaces the left rail

**Files:**
- Create: `src/app/TopNavPills.tsx`
- Test: `src/app/TopNavPills.test.tsx`
- Delete: `src/app/Rail.tsx`, `src/app/Rail.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/design-system/components.css`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/TopNavPills.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../auth/AuthContext';
import { TopNavPills } from './TopNavPills';

function mockAuth(roles: string[]) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    token: 'jwt', roles, username: 'demo', login: vi.fn(), logout: vi.fn(),
  });
}

const ALL_LABELS = [
  'Command Center', 'Overview', 'Crime Trends', 'Demographics', 'Investigation Network',
  'Judicial & Units', 'Case Explorer', 'Network / Link Analysis', 'Sociological & Predictive', 'Admin / Audit',
];

describe('TopNavPills', () => {
  it('renders all 10 pills with the current one marked active, for a SUPER_ADMIN', () => {
    mockAuth(['SUPER_ADMIN']);
    render(
      <MemoryRouter initialEntries={['/case-explorer']}>
        <TopNavPills />
      </MemoryRouter>,
    );
    ALL_LABELS.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Case Explorer' })).toHaveAttribute('aria-current', 'page');
  });

  it('only shows pills an INVESTIGATOR can actually open', () => {
    mockAuth(['INVESTIGATOR']);
    render(
      <MemoryRouter>
        <TopNavPills />
      </MemoryRouter>,
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Case Explorer')).toBeInTheDocument();
    expect(screen.queryByText('Command Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin / Audit')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- TopNavPills.test.tsx`
Expected: FAIL — `Cannot find module './TopNavPills'`

- [ ] **Step 3: Implement TopNavPills**

```tsx
// src/app/TopNavPills.tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccessRoute } from '../auth/roleRouting';

const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center' },
  { path: '/overview', label: 'Overview' },
  { path: '/crime-trends', label: 'Crime Trends' },
  { path: '/demographics', label: 'Demographics' },
  { path: '/investigation-network', label: 'Investigation Network' },
  { path: '/judicial-units', label: 'Judicial & Units' },
  { path: '/case-explorer', label: 'Case Explorer' },
  { path: '/network', label: 'Network / Link Analysis' },
  { path: '/sociological', label: 'Sociological & Predictive' },
  { path: '/admin', label: 'Admin / Audit' },
];

export function TopNavPills() {
  const { roles } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => canAccessRoute(roles, item.path));

  return (
    <nav className="pill-nav" aria-label="Primary">
      {visibleItems.map(({ path, label }) => (
        <NavLink key={path} to={path} className="pill-nav-item">
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- TopNavPills.test.tsx`
Expected: PASS

- [ ] **Step 5: Delete Rail.tsx and its test**

```bash
git rm src/app/Rail.tsx src/app/Rail.test.tsx
```

- [ ] **Step 6: Update App.tsx to render TopNavPills instead of Rail, restructure the shell**

Replace the import and usage:
```tsx
import { TopNavPills } from './TopNavPills';
```
(remove `import { Rail } from './Rail';`)

```tsx
function AuthenticatedShell() {
  return (
    <div className="shell">
      <TopNavPills />
      <Routes>
        {/* ...unchanged... */}
      </Routes>
    </div>
  );
}
```

- [ ] **Step 7: Restructure `.shell` CSS and remove the old rail rules**

Replace the `.shell` rule and delete the `/* ---- left labeled nav rail ---- */` block entirely:
```css
.shell {
  display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto 1fr;
  grid-template-areas: "header" "pillnav" "main"; height: 100vh; min-height: 640px;
}

/* ---- top pill nav (replaces the old left rail) ---- */
.pill-nav { grid-area: pillnav; display: flex; gap: 6px; padding: 10px 20px; background: var(--panel); border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.pill-nav-item { border: 1px solid var(--line); background: var(--canvas); color: var(--muted); padding: 7px 16px; border-radius: 20px; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; }
.pill-nav-item:hover { background: var(--panel-raised); color: var(--text); }
.pill-nav-item[aria-current="page"] { background: var(--real); color: #ffffff; border-color: var(--real); }
```

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS — every screen's own `<Header>`/`<main>` still resolve into the `header`/`main` grid areas unchanged; only the removed rail and the new pill nav differ. Fix any test that specifically queried `nav.rail`/`.rail-item` (update to `nav[aria-label="Primary"]`/`.pill-nav-item` if any exist beyond the deleted `Rail.test.tsx`).

- [ ] **Step 9: Commit**

```bash
git add -A src/app/TopNavPills.tsx src/app/TopNavPills.test.tsx src/app/App.tsx src/design-system/components.css
git commit -m "feat: replace the left icon rail with a top pill nav for all 10 destinations"
```

---

### Task 7: Persistent KPI strip on every page

**Files:**
- Modify: `src/api/demoAnalyticsData.ts`
- Modify: `src/app/Header.tsx`
- Modify: `src/app/Header.test.tsx` (create if it doesn't exist)
- Modify: `src/design-system/components.css`

- [ ] **Step 1: Add the global KPI demo-data function**

Append to `demoAnalyticsData.ts`:
```ts
export interface GlobalKpiStripDemo {
  totalFirs: number;
  heinousPct: number;
  chargesheetRatePct: number;
  avgDaysToChargesheet: number;
  pendingInvestigation: number;
  accusedArrestedPct: number;
}

// Reuses getCaseJourneyStages()/getGravityMixDemo() for 4 of the 6 numbers so this strip
// never disagrees with the Overview page's own Case Journey/Gravity cards.
export function getGlobalKpiStripDemo(): GlobalKpiStripDemo {
  const journey = getCaseJourneyStages();
  const gravity = getGravityMixDemo();
  const totalFirs = journey[0].count;
  const chargesheeted = journey.find((j) => j.stage === 'Chargesheeted')?.count ?? 0;
  const pendingInvestigation = journey.find((j) => j.stage === 'Under Investigation')?.count ?? 0;
  const heinous = gravity.find((g) => g.gravity === 'Heinous')?.count ?? 0;
  const gravityTotal = gravity.reduce((sum, g) => sum + g.count, 0);
  return {
    totalFirs,
    heinousPct: Math.round((heinous / gravityTotal) * 1000) / 10,
    chargesheetRatePct: Math.round((chargesheeted / totalFirs) * 1000) / 10,
    avgDaysToChargesheet: 46,
    pendingInvestigation,
    accusedArrestedPct: 61.4,
  };
}
```

- [ ] **Step 2: Write the failing test for Header**

```tsx
// src/app/Header.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as AuthContextModule from '../auth/AuthContext';
import * as meApiModule from '../api/meApi';
import { Header } from './Header';

describe('Header', () => {
  it('renders the title and a 6-tile KPI strip', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      token: 'jwt', roles: ['SCRB_ANALYST'], username: 'demo.analyst', login: vi.fn(), logout: vi.fn(),
    });
    vi.spyOn(meApiModule, 'useMe').mockReturnValue({ data: undefined, isLoading: false, isError: false } as never);

    render(<Header title="Overview" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Total FIRs (24 mo)')).toBeInTheDocument();
    expect(screen.getByText('Heinous Offences')).toBeInTheDocument();
    expect(screen.getByText('Chargesheet Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg. Days to Chargesheet')).toBeInTheDocument();
    expect(screen.getByText('Pending Investigation')).toBeInTheDocument();
    expect(screen.getByText('Accused Arrested')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- Header.test.tsx`
Expected: FAIL — no KPI strip rendered yet.

- [ ] **Step 4: Add the KPI strip to Header.tsx**

```tsx
// src/app/Header.tsx
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useMe } from '../api/meApi';
import { ThemeToggle } from '../design-system/ThemeToggle';
import { getGlobalKpiStripDemo } from '../api/demoAnalyticsData';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  const { token, username, roles } = useAuth();
  const { data: me } = useMe(token);
  const rankAndUnit = me?.rank && me?.unit ? `${me.rank} · ${me.unit}` : roles.join(', ');
  const kpi = getGlobalKpiStripDemo();

  return (
    <header className="header">
      <div className="header-top-row">
        <div className="title-block">
          <h1>{title}</h1>
        </div>
        <div className="filters">{children}</div>
        <div className="header-right">
          <ThemeToggle />
          <div className="role-chip">
            <div className="role-avatar">{initials(username)}</div>
            <div className="role-text">
              <span className="name">{username}</span>
              <span className="rank">{rankAndUnit}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="kpi-strip">
        <div className="kpi">
          <div className="val">{kpi.totalFirs.toLocaleString()}</div>
          <div className="lbl">Total FIRs (24 mo)</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.heinousPct}%</div>
          <div className="lbl">Heinous Offences</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.chargesheetRatePct}%</div>
          <div className="lbl">Chargesheet Rate</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.avgDaysToChargesheet} days</div>
          <div className="lbl">Avg. Days to Chargesheet</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.pendingInvestigation.toLocaleString()}</div>
          <div className="lbl">Pending Investigation</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.accusedArrestedPct}%</div>
          <div className="lbl">Accused Arrested</div>
        </div>
      </div>
    </header>
  );
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(/[.\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
```

- [ ] **Step 5: Restructure the header CSS into a two-row column, add the KPI strip styles**

Replace the `.header`/`.title-block`/etc. block in `components.css`:
```css
/* ---- header / filter bar ---- */
.header { grid-area: header; background: linear-gradient(120deg, #0b2340 0%, #123a63 100%); color: #fff; display: flex; flex-direction: column; min-width: 0; }
.header-top-row { display: flex; align-items: center; gap: 18px; padding: 0 20px; height: 60px; min-width: 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
.title-block { display: flex; flex-direction: column; gap: 1px; margin-right: 6px; flex-shrink: 0; }
.title-block h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; letter-spacing: -0.01em; margin: 0; }
.header .title-block h1 { color: #ffffff; }
.header .filter-field { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); color: #fff; }
.header .filter-field svg { color: rgba(255,255,255,0.7); }
.header .role-chip { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
.header .role-text .name { color: #fff; }
.header .role-text .rank { color: rgba(255,255,255,0.7); }

.kpi-strip { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; padding: 12px 20px; background: #0e2c50; }
.kpi { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 9px 12px; color: #fff; min-width: 0; }
.kpi .val { font-size: 19px; font-weight: 700; line-height: 1.1; font-family: 'Space Grotesk', sans-serif; white-space: nowrap; }
.kpi .lbl { font-size: 10px; color: #a9bad2; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 1100px) {
  .kpi-strip { grid-template-columns: repeat(3, 1fr); }
}
```

(Leave `.filters`/`.filter-field`/`.role-chip`/`.role-avatar`/`.role-text` base rules — defined elsewhere already — untouched.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- Header.test.tsx`
Expected: PASS

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: PASS — every screen renders `<Header>`, so every screen test now implicitly renders the KPI strip too; none of the existing tests assert on the header's exact children count/structure in a way this would break (confirmed no test queries `.header-top-row` directly or asserts `.header`'s childElementCount).

- [ ] **Step 8: Manual visual check**

Run `npm run dev`, confirm every page (Command Center, all 5 Insights pages, Case Explorer, Network, Sociological, Admin) shows the navy header with the 6-tile KPI strip beneath it, then the pill nav row, then page content.

- [ ] **Step 9: Commit**

```bash
git add src/api/demoAnalyticsData.ts src/app/Header.tsx src/app/Header.test.tsx src/design-system/components.css
git commit -m "feat: add a persistent 6-KPI strip to the shared Header, shown identically on every page"
```

---

## Final verification (all tasks)

- [ ] Run: `npm run test` — full suite passes.
- [ ] Run: `npx tsc -b` — no new type errors versus the pre-existing baseline.
- [ ] Manual browser QA (`npm run dev`):
  - Sociological info tooltip is fully visible near the right edge, not clipped.
  - Cohort Analysis and District × Crime Head Matrix cells are legible (dark text on light cells, white text on dark cells) at every intensity.
  - Judicial & Units treemap shows colored per-district headers with totals and labeled unit cells.
  - Investigation Network's chord diagram: thinner ring/ribbons, value labels per arc, hovering an arc fades unrelated ribbons/arcs and bolds the hovered value, "IPC"-style left-hemisphere labels read upright, and the expanded lightbox shows a much larger chord with the table beside it (not below).
  - Every page shows the top pill nav (no left sidebar) filtered correctly per role, and the same 6-KPI strip under the header.
