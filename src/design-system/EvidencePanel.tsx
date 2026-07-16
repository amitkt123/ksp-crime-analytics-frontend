import { useEffect } from 'react';

export interface EvidenceData {
  claim: string;
  confidence: number;
  confidenceLabel: string;
  method: string;
  baseline: string;
  generatedAt: string;
  records: string[];
}

interface EvidencePanelProps {
  data: EvidenceData | null;
  onClose: () => void;
}

export function EvidencePanel({ data, onClose }: EvidencePanelProps) {
  useEffect(() => {
    if (!data) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [data, onClose]);

  if (!data) return null;

  return (
    <>
      <div className="scrim open" onClick={onClose} />
      <aside className="evidence open" role="dialog" aria-label="Evidence panel" aria-modal="true">
        <div className="evidence-head">
          <h3>Evidence</h3>
          <button className="evidence-close" aria-label="Close evidence panel" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="evidence-body">
          <p className="evidence-claim">{data.claim}</p>
          <div className="confidence-row">
            <svg className="confidence-ring" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--line)" strokeWidth="5" />
              <circle
                className="confidence-arc"
                cx="28" cy="28" r="24" fill="none" stroke="var(--predicted)" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 24 * data.confidence} ${2 * Math.PI * 24}`}
                transform="rotate(-90 28 28)"
              />
            </svg>
            <div className="confidence-meta">
              <span className="figure mono">{Math.round(data.confidence * 100)}%</span>
              <span className="eyebrow">{data.confidenceLabel}</span>
            </div>
          </div>
          <div className="evidence-meta-list">
            <div className="evidence-meta-row"><span className="k">Method</span><span className="v">{data.method}</span></div>
            <div className="evidence-meta-row"><span className="k">Baseline window</span><span className="v">{data.baseline}</span></div>
            <div className="evidence-meta-row"><span className="k">Generated at</span><span className="v">{data.generatedAt}</span></div>
          </div>
          <section>
            <h3>Supporting records</h3>
            <div className="evidence-records">
              {data.records.map((record) => (
                <div className="evidence-record" key={record}>
                  <span className="mono">{record}</span>
                  <span className="tag">Case file</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
