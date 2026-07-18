import { useState } from 'react';
import { EvidencePanel, type EvidenceData } from '../../design-system/EvidencePanel';
import { alertSeverity, type EmergingAlertResponse } from '../../api/alertsApi';

interface AlertFeedProps {
  alerts: EmergingAlertResponse[];
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  const [selected, setSelected] = useState<EmergingAlertResponse | null>(null);

  const evidenceData: EvidenceData | null = selected && {
    claim: selected.explanation,
    confidence: Math.min(1, selected.zScore / 5),
    confidenceLabel: 'Deviation confidence',
    method: 'Trend & Anomaly Engine · z-score',
    baseline: '8-week trailing mean',
    generatedAt: new Date().toLocaleString(),
    records: [`${selected.unitName} · ${selected.crimeSubHeadName}`],
  };

  return (
    <>
      <section>
        <h3>
          Emerging alerts <span className="count">{alerts.length} active</span>
        </h3>
        {alerts.length === 0 ? (
          <p>No emerging alerts in this window.</p>
        ) : (
          <div className="alert-list">
            {alerts.map((alert) => {
              const severity = alertSeverity(alert.zScore);
              return (
                <button
                  key={`${alert.unitId}-${alert.crimeSubHeadId}`}
                  className={`alert-card severity-${severity}`}
                  onClick={() => setSelected(alert)}
                >
                  <span className={`alert-pulse-dot severity-${severity}`} aria-hidden="true" />
                  <span className="alert-unit">{alert.unitName}</span>
                  <span className="alert-subhead">{alert.crimeSubHeadName}</span>
                  <span className="chip alert mono">z={alert.zScore.toFixed(1)}</span>
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
