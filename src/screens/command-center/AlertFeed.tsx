import { useState } from 'react';
import { EvidencePanel } from '../../design-system/EvidencePanel';
import { alertSeverity, type EmergingAlertResponse } from '../../api/alertsApi';
import { useAuth } from '../../auth/AuthContext';
import { useExplainTrendAlert, toEvidenceData } from '../../api/agentApi';

interface AlertFeedProps {
  alerts: EmergingAlertResponse[];
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  const { token } = useAuth();
  const [selected, setSelected] = useState<EmergingAlertResponse | null>(null);
  const explainQuery = useExplainTrendAlert(token, selected?.unitId ?? null, selected?.crimeSubHeadId ?? null, selected != null);

  const evidenceData = selected && explainQuery.data
    ? toEvidenceData(explainQuery.data, '8-week trailing mean', [`${selected.unitName} · ${selected.crimeSubHeadName}`])
    : null;

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
