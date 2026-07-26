import type { TimeOfDayBucket, TimeOfDayBucketKey } from '../../api/geoApi';

export type TimeOfDaySelection = 'all' | TimeOfDayBucketKey;

interface TimeOfDaySelectorProps {
  buckets: TimeOfDayBucket[];
  value: TimeOfDaySelection;
  onChange: (value: TimeOfDaySelection) => void;
}

// Segmented control that swaps the map's choropleth scale between total case count
// ("All day") and a single time-of-day slice, so hotspots can be compared as they
// shift across the day rather than only ever showing an aggregate.
export function TimeOfDaySelector({ buckets, value, onChange }: TimeOfDaySelectorProps) {
  return (
    <div
      className="tod-selector flex w-fit items-center gap-1 rounded-lg border border-border bg-canvas p-1"
      role="group"
      aria-label="Time of day"
    >
      <button
        type="button"
        className={`tod-option cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
          value === 'all' ? 'active bg-surface text-accent shadow-sm' : 'text-muted hover:text-ink'
        }`}
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
      >
        All day
      </button>
      {buckets.map((bucket) => (
        <button
          key={bucket.bucket}
          type="button"
          className={`tod-option cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
            value === bucket.bucket ? 'active bg-surface text-accent shadow-sm' : 'text-muted hover:text-ink'
          }`}
          aria-pressed={value === bucket.bucket}
          onClick={() => onChange(bucket.bucket)}
        >
          {bucket.label}
        </button>
      ))}
    </div>
  );
}