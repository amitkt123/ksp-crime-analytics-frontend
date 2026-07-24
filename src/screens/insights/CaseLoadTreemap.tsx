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

interface UnitNode {
  name: string;
  value: number;
  layoutValue: number;
}

interface DistrictNode {
  name: string;
  children: UnitNode[];
}

const DISTRICT_COLORS = [
  '#123a63', '#1e8a5f', '#c0392b', '#d4a017', '#6c5ce7', '#e67e22',
  '#2b8fd1', '#a06cd5', '#38b6a7', '#e05797', '#4a6fa5', '#7cb342',
];

const HEADER_HEIGHT = 22;
// Purely a layout floor so a zero-total district still gets a visible sliver
// instead of a zero-area (invisible) box -- the header/table always show the
// real total, never this nominal weight.
const NOMINAL_EMPTY_DISTRICT_UNIT_WEIGHT = 8;

export function CaseLoadTreemap({ data, width = 1080, height = 520 }: CaseLoadTreemapProps) {
  const districtTotal = (d: DistrictNode) => d.children.reduce((sum, c) => sum + c.value, 0);

  const districts: DistrictNode[] = useMemo(() => {
    const byDistrict = new Map<string, Array<{ name: string; value: number }>>();
    data.forEach((row) => {
      const list = byDistrict.get(row.districtName) ?? [];
      list.push({ name: row.unitName, value: row.caseCount });
      byDistrict.set(row.districtName, list);
    });
    const nodes: DistrictNode[] = [...byDistrict.entries()].map(([name, children]) => {
      const total = children.reduce((sum, c) => sum + c.value, 0);
      const withLayout = children.map((c) => ({ ...c, layoutValue: total > 0 ? c.value : NOMINAL_EMPTY_DISTRICT_UNIT_WEIGHT }));
      return { name, children: withLayout };
    });
    const byName = (a: DistrictNode, b: DistrictNode) => a.name.localeCompare(b.name);
    const withData = nodes.filter((d) => districtTotal(d) > 0).sort(byName);
    const withoutData = nodes.filter((d) => districtTotal(d) === 0).sort(byName);
    return [...withData, ...withoutData];
  }, [data]);

  const root = useMemo(() => {
    const h = hierarchy<{ name: string; children?: DistrictNode[] }>({ name: 'root', children: districts } as never)
      .sum((d) => (d as unknown as { layoutValue?: number }).layoutValue ?? 0);
    return treemap<{ name: string }>()
      .tile(treemapBinary)
      .size([width, height])
      .paddingTop((node) => (node.depth === 0 ? 0 : HEADER_HEIGHT))
      .paddingInner(2)(h as never);
  }, [districts, width, height]);

  const districtLayoutNodes = (root.children ?? []) as unknown as Array<{
    data: DistrictNode;
    x0: number; y0: number; x1: number; y1: number;
    children?: Array<{ data: { name: string; value: number }; x0: number; y0: number; x1: number; y1: number }>;
  }>;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Case load by district and unit">
      {districtLayoutNodes.map((district, i) => {
        const color = DISTRICT_COLORS[i % DISTRICT_COLORS.length];
        const total = districtTotal(district.data);
        return (
          <g key={district.data.name}>
            <rect
              className="treemap-district-header"
              x={district.x0}
              y={district.y0}
              width={district.x1 - district.x0}
              height={HEADER_HEIGHT}
              fill={color}
            />
            <text
              x={district.x0 + 6}
              y={district.y0 + HEADER_HEIGHT / 2}
              dy="0.35em"
              fontSize={11}
              fontWeight={700}
              fill="#ffffff"
            >
              {district.data.name} ({total > 0 ? total.toLocaleString() : 'No data'})
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
