import type { CategorySliceResponse } from '../../api/commandCenterApi';

// Fixed crime_head_id -> categorical palette slot (tokens.css's --cat-1..--cat-5), chosen so
// "Crimes Against Women" (seeded id 3) never lands on the green slot (--cat-1) -- per
// docs/superpowers/specs/2026-07-15-frontend-project-design.md's categorical palette rule.
// IDs are the real seeded values from R__seed_reference_data.sql, not derived at runtime.
const CRIME_HEAD_SLOT: Record<number, number> = {
  1: 1, // Crimes Against Body
  3: 2, // Crimes Against Women
  4: 3, // Economic Offences
  2: 4, // Crimes Against Property
  5: 5, // Cyber Crimes
};

interface CategoryMixChartProps {
  categoryMix: CategorySliceResponse[];
}

export function CategoryMixChart({ categoryMix }: CategoryMixChartProps) {
  const total = categoryMix.reduce((sum, slice) => sum + slice.count, 0);
  const sorted = [...categoryMix].sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="cat-legend">
        {sorted.map((slice) => (
          <span key={slice.crimeHeadId} className="cat-legend-item">
            <span className="cat-swatch" style={{ background: `var(--cat-${CRIME_HEAD_SLOT[slice.crimeHeadId] ?? 5})` }} />
            {slice.crimeGroupName}
          </span>
        ))}
      </div>
      <div className="cat-bars">
        {sorted.map((slice) => (
          <div key={slice.crimeHeadId} className="cat-bar-row">
            <span className="cat-bar-label">{slice.crimeGroupName}</span>
            <div className="cat-bar-track">
              <div
                className="cat-bar-fill"
                style={{
                  width: `${total === 0 ? 0 : (slice.count / total) * 100}%`,
                  background: `var(--cat-${CRIME_HEAD_SLOT[slice.crimeHeadId] ?? 5})`,
                }}
              />
            </div>
            <span className="cat-bar-count mono">{slice.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
