import { useEffect, useState } from 'react';

interface InfoTipProps {
  label: string;
  text: string;
}

export function InfoTip({ label, text }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <span className="info-tip">
      <button
        type="button"
        className="info-tip-button"
        aria-label={`How to read ${label}`}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && <span className="info-tip-popover">{text}</span>}
    </span>
  );
}
