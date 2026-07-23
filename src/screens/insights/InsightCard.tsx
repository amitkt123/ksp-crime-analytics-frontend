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
}

export function InsightCard({ title, note, live, children, expand }: InsightCardProps) {
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
        <ChartLightbox open={isExpanded} title={title} columns={expand.columns} rows={expand.rows} onClose={() => setIsExpanded(false)}>
          {children}
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
