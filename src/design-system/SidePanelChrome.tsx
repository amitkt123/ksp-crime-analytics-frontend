import { useEffect, type ReactNode } from 'react';

interface SidePanelChromeProps {
  open: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  children: ReactNode;
}

export function SidePanelChrome({ open, onClose, title, className, children }: SidePanelChromeProps) {
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
      <aside className={`evidence open${className ? ` ${className}` : ''}`} role="dialog" aria-label={title} aria-modal="true">
        <div className="evidence-head">
          <h3>{title}</h3>
          {/* Derived from title, not hardcoded: consumers' tests assert accessible name via `Close ${title}` (e.g. "Close Evidence panel") — decoupling this would silently break those assertions. */}
          <button className="evidence-close" aria-label={`Close ${title}`} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="evidence-body">{children}</div>
      </aside>
    </>
  );
}
