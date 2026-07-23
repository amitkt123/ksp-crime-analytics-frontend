import type { ReactNode } from 'react';
import { DemoDataBadge } from './DemoDataBadge';

interface InsightCardProps {
  title: string;
  note?: string;
  live: boolean;
  children: ReactNode;
}

export function InsightCard({ title, note, live, children }: InsightCardProps) {
  return (
    <div className="insight-card">
      <div className="insight-card-head">
        <h3>{title}</h3>
        {!live && <DemoDataBadge />}
      </div>
      {note && <p className="insight-card-note">{note}</p>}
      <div className="insight-card-body">{children}</div>
    </div>
  );
}
