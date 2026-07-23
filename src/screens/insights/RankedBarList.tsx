export interface RankedBarItem {
  label: string;
  value: number;
}

interface RankedBarListProps {
  items: RankedBarItem[];
  valueFormatter?: (value: number) => string;
}

export function RankedBarList({ items, valueFormatter }: RankedBarListProps) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 0;
  const format = valueFormatter ?? ((value: number) => value.toLocaleString());

  return (
    <div className="cat-bars">
      {sorted.map((item) => (
        <div key={item.label} className="cat-bar-row">
          <span className="cat-bar-label">{item.label}</span>
          <div className="cat-bar-track">
            <div
              className="cat-bar-fill"
              style={{ width: `${max === 0 ? 0 : (item.value / max) * 100}%`, background: 'var(--real)' }}
            />
          </div>
          <span className="cat-bar-count mono">{format(item.value)}</span>
        </div>
      ))}
    </div>
  );
}
