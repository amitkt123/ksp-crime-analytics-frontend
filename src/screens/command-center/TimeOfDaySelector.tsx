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
    <div className="tod-selector" role="group" aria-label="Time of day">
      <button
        type="button"
        className={`tod-option${value === 'all' ? ' active' : ''}`}
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
      >
        All day
      </button>
      {buckets.map((bucket) => (
        <button
          key={bucket.bucket}
          type="button"
          className={`tod-option${value === bucket.bucket ? ' active' : ''}`}
          aria-pressed={value === bucket.bucket}
          onClick={() => onChange(bucket.bucket)}
        >
          {bucket.label}
        </button>
      ))}
    </div>
  );
}
