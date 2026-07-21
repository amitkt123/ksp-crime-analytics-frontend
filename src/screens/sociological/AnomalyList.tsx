import { useState } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { EvidencePanel, type EvidenceData } from '../../design-system/EvidencePanel';
import { alertSeverity, type AlertSeverity } from '../../api/alertsApi';
import type { CaseAnomalyResponse } from '../../api/sociologicalApi';

interface AnomalyListProps {
  anomalies: CaseAnomalyResponse[];
}

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: 'var(--alert)',
  high: 'var(--status-warning)',
  moderate: 'var(--muted-2)',
};

const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'high', 'moderate'];
const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: 'Critical', high: 'High', moderate: 'Moderate' };

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
          <>
            <AnomalySeverityScatter anomalies={ranked} />
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
          </>
        )}
      </section>
      <EvidencePanel data={evidenceData} onClose={() => setSelected(null)} />
    </>
  );
}

interface AnomalyScatterPoint {
  crimeNo: string;
  delayDays: number;
  zScore: number;
  severity: AlertSeverity;
}

function AnomalySeverityScatter({ anomalies }: { anomalies: CaseAnomalyResponse[] }) {
  const bySeverity: Record<AlertSeverity, AnomalyScatterPoint[]> = { critical: [], high: [], moderate: [] };
  for (const anomaly of anomalies) {
    const severity = alertSeverity(anomaly.zScore);
    bySeverity[severity].push({
      crimeNo: anomaly.crimeNo,
      delayDays: anomaly.registrationDelayDays,
      zScore: anomaly.zScore,
      severity,
    });
  }

  return (
    <div className="indicator-scatter anomaly-scatter">
      <div className="cat-legend">
        {SEVERITY_ORDER.map((severity) => (
          <span className="cat-legend-item" key={severity}>
            <span className="cat-swatch" style={{ background: SEVERITY_COLOR[severity] }} />
            {SEVERITY_LABEL[severity]}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="delayDays" name="Registration delay (days)" stroke="var(--muted)" fontSize={10} tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="zScore" name="Deviation (z-score)" stroke="var(--muted)" fontSize={10} tick={{ fontSize: 10 }} />
          <Tooltip
            cursor={{ stroke: 'var(--line)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as AnomalyScatterPoint;
              return (
                <div
                  style={{
                    background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6,
                    padding: '6px 8px', boxShadow: 'var(--shadow)', fontSize: 11,
                  }}
                >
                  <strong className="mono">{point.crimeNo}</strong>
                  <div>Delay: <span className="mono">{point.delayDays}d</span></div>
                  <div>z-score: <span className="mono">{point.zScore.toFixed(1)}</span></div>
                </div>
              );
            }}
          />
          {SEVERITY_ORDER.map((severity) => (
            <Scatter key={severity} data={bySeverity[severity]} fill={SEVERITY_COLOR[severity]} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
