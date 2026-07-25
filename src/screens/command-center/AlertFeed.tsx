import { useState } from 'react';
import { Bell } from 'lucide-react';
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
      <section className="rounded-xl border border-border border-t-4 border-t-ink bg-surface p-4 shadow-sm">
        <h3 className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink uppercase">
            <Bell className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            Emerging alerts
          </span>
          <span className="count mono text-[11px] font-medium text-muted">{alerts.length} active</span>
        </h3>
        {alerts.length === 0 ? (
          <p className="mt-4 text-center text-sm font-medium text-muted">No emerging alerts in this window.</p>
        ) : (
          <div className="alert-list mt-3 flex flex-col gap-2">
            {alerts.map((alert) => {
              const severity = alertSeverity(alert.zScore);
              return (
                <button
                  key={`${alert.unitId}-${alert.crimeSubHeadId}`}
                  type="button"
                  className={`alert-card severity-${severity} flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-danger`}
                  onClick={() => setSelected(alert)}
                >
                  <span className={`alert-pulse-dot severity-${severity}`} aria-hidden="true" />
                  <span className="alert-unit text-xs font-semibold text-ink">{alert.unitName}</span>
                  <span className="alert-subhead flex-1 text-xs text-muted">{alert.crimeSubHeadName}</span>
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
