import { useState } from 'react';
import { EvidencePanel, type EvidenceData } from '../../design-system/EvidencePanel';
import { alertSeverity } from '../../api/alertsApi';
import type { CaseAnomalyResponse } from '../../api/sociologicalApi';

interface AnomalyListProps {
  anomalies: CaseAnomalyResponse[];
}

export function AnomalyList({ anomalies }: AnomalyListProps) {
  const [selected, setSelected] = useState<CaseAnomalyResponse | null>(null);

  const ranked = [...anomalies].sort((a, b) => b.zScore - a.zScore);

  const evidenceData: EvidenceData | null = selected && {
    claim: selected.explanation,
    confidence: Math.min(1, selected.zScore / 5),
    confidenceLabel: 'Deviation confidence',
    method: 'Sociological Anomaly Detection · registration-delay z-score',
    baseline: `District baseline mean delay: ${selected.baselineMeanDelayDays.toFixed(1)} days`,
    generatedAt: new Date().toLocaleString(),
    records: [selected.crimeNo],
  };

  return (
    <>
      <section>
        <h3>
          Case anomalies <span className="count">{ranked.length} flagged</span>
        </h3>
        {ranked.length === 0 ? (
          <p>No registration-delay anomalies for this crime type.</p>
        ) : (
          <div className="alert-list">
            {ranked.map((anomaly) => {
              const severity = alertSeverity(anomaly.zScore);
              return (
                <button
                  key={anomaly.caseMasterId}
                  className={`alert-card severity-${severity}`}
                  onClick={() => setSelected(anomaly)}
                >
                  <span className={`alert-pulse-dot severity-${severity}`} aria-hidden="true" />
                  <span className="alert-unit mono">{anomaly.crimeNo}</span>
                  <span className="alert-subhead">{anomaly.registrationDelayDays}-day registration delay</span>
                  <span className="chip alert mono">z={anomaly.zScore.toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <EvidencePanel data={evidenceData} onClose={() => setSelected(null)} />
    </>
  );
}
