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
            return (
              <div
                key={col}
                className="heatmap-cell"
                role="cell"
                style={{ background: `rgba(18, 58, 99, ${intensity})` }}
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
