import { useEffect } from 'react';

export interface PersonRevealDetail {
  label: string;
  value: string;
}

export interface PersonRevealData {
  realName: string;
  details: PersonRevealDetail[];
}

interface PersonRevealModalProps {
  person: PersonRevealData | null;
  onClose: () => void;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function PersonRevealModal({ person, onClose }: PersonRevealModalProps) {
  useEffect(() => {
    if (!person) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [person, onClose]);

  if (!person) return null;

  return (
    <>
      <div className="scrim open" onClick={onClose} />
      <div className="evidence open modal" role="dialog" aria-label="Person details" aria-modal="true">
        <div className="evidence-head">
          <h3>Person details</h3>
          <button className="evidence-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="evidence-body">
          <div className="role-avatar" style={{ width: 48, height: 48, fontSize: 16, margin: '0 auto' }}>
            {initialsOf(person.realName)}
          </div>
          <p className="evidence-claim" style={{ textAlign: 'center', fontWeight: 600 }}>{person.realName}</p>
          <div className="evidence-meta-list">
            {person.details.map((d) => (
              <div className="evidence-meta-row" key={d.label}>
                <span className="k">{d.label}</span>
                <span className="v">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
