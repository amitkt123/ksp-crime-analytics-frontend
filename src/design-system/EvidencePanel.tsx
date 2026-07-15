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
            <span className="figure mono">{Math.round(data.confidence * 100)}%</span>
            <span className="eyebrow">{data.confidenceLabel}</span>
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
