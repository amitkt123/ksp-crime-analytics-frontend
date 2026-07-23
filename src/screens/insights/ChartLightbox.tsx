import { useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ChartLightboxProps {
  open: boolean;
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  onClose: () => void;
  children: ReactNode;
}

export function ChartLightbox({ open, title, columns, rows, onClose, children }: ChartLightboxProps) {
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
      <div className="chart-lightbox" role="dialog" aria-label={`${title} - expanded`} aria-modal="true">
        <div className="chart-lightbox-head">
          <h3>{title}</h3>
          <button className="evidence-close" aria-label="Close expanded chart" onClick={onClose}>
            ×
          </button>
        </div>
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
    </>
  );
}
