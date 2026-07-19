import { useState } from 'react';
import { caseStatusChipClass, caseStatusLabel, type CaseTimelineEntryResponse } from '../../api/caseApi';

interface CaseTimelineProps {
  entries: CaseTimelineEntryResponse[];
}

function daysBetween(from: string, to: string): number | null {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return null;
  return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

export function CaseTimeline({ entries }: CaseTimelineProps) {
  const chronological = [...entries].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const lastIndex = chronological.length - 1;
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(lastIndex >= 0 ? [lastIndex] : []));

  function toggle(index: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  if (chronological.length === 0) {
    return <p>No timeline entries yet.</p>;
  }

  return (
    <ol className="case-timeline-steps">
      {chronological.map((entry, index) => {
        const isCurrent = index === lastIndex;
        const isExpanded = expanded.has(index);
        const gap = index > 0 ? daysBetween(chronological[index - 1].timestamp, entry.timestamp) : null;

        return (
          <li key={`${entry.status}-${entry.timestamp}-${index}`} className={isCurrent ? 'timeline-step current' : 'timeline-step'}>
            {gap != null && gap > 0 && (
              <div className="timeline-gap" aria-hidden="true">
                +{gap} day{gap === 1 ? '' : 's'}
              </div>
            )}
            <button
              type="button"
              className="timeline-step-head"
              onClick={() => toggle(index)}
              aria-expanded={isExpanded}
            >
              <span className="timeline-dot" aria-hidden="true" />
              <span className="mono timeline-timestamp">{entry.timestamp}</span>
              <span className={`chip ${caseStatusChipClass(entry.status)}`}>{caseStatusLabel(entry.status)}</span>
              {isCurrent && <span className="timeline-current-badge">Current</span>}
              <span className="timeline-chevron" aria-hidden="true">
                {isExpanded ? '▾' : '▸'}
              </span>
            </button>
            {isExpanded && (
              <div className="timeline-step-body">
                <p>{entry.note}</p>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
