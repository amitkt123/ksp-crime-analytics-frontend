import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { PiiField } from '../../design-system/PiiField';
import { EvidencePanel, type EvidenceData } from '../../design-system/EvidencePanel';
import {
  caseStatusChipClass,
  caseStatusLabel,
  gravityDotClass,
  gravityLabel,
  partyRoleLabel,
  useCaseDetail,
  useCaseExplanation,
  type CasePartyRole,
} from '../../api/caseApi';
import { CaseTimeline } from './CaseTimeline';

const PARTY_ROLE_ORDER: CasePartyRole[] = ['complainant', 'victim', 'accused'];

export function CaseDetailScreen() {
  const { token } = useAuth();
  const { caseId } = useParams<{ caseId: string }>();
  const numericCaseId = caseId ? Number(caseId) : null;
  const caseDetailQuery = useCaseDetail(token, numericCaseId);
  const [explainOpen, setExplainOpen] = useState(false);
  const explanationQuery = useCaseExplanation(token, numericCaseId, explainOpen);

  if (caseDetailQuery.isLoading) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <p>Loading case…</p>
        </main>
      </>
    );
  }

  if (caseDetailQuery.isError) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <p role="alert">Couldn't load this case — check your connection and try again.</p>
          <button onClick={() => caseDetailQuery.refetch()}>Retry</button>
        </main>
      </>
    );
  }

  const caseDetail = caseDetailQuery.data;
  if (!caseDetail) {
    return (
      <>
        <Header title="Case Explorer" />
        <main className="main-single">
          <p>Case not found.</p>
          <Link to="/case-explorer">Back to Case Explorer</Link>
        </main>
      </>
    );
  }

  const evidenceData: EvidenceData | null = explainOpen && explanationQuery.data ? explanationQuery.data : null;

  return (
    <>
      <Header title="Case Explorer" />
      <main className="main-single case-detail">
        <div className="breadcrumb">
          <Link className="breadcrumb-back" to="/case-explorer">Case Explorer</Link>
          <span className="sep">›</span>
          <b>{caseDetail.caseNumber}</b>
        </div>

        <section className="case-facts">
          <h2>{caseDetail.caseNumber}</h2>
          {caseDetail.crimeNumber && <span className="mono crime-no">{caseDetail.crimeNumber}</span>}
          <span className={`chip ${caseStatusChipClass(caseDetail.status)}`}>
            {caseStatusLabel(caseDetail.status)}
          </span>
          {caseDetail.gravity && (
            <span className="gravity-tag">
              <span className={`gravity-dot ${gravityDotClass(caseDetail.gravity)}`} aria-hidden="true" />
              {gravityLabel(caseDetail.gravity)}
            </span>
          )}
          <p>
            {caseDetail.crimeSubHeadName} · {caseDetail.unitName} · {caseDetail.firDate}
          </p>
          <p>{caseDetail.narrative}</p>
          <button type="button" className="explain-btn" onClick={() => setExplainOpen(true)}>
            Explain this case
          </button>
        </section>

        <div className="case-detail-columns">
          <div className="case-detail-main">
            <section className="case-parties">
              <h3>Parties</h3>
              {PARTY_ROLE_ORDER.filter((role) => caseDetail.parties.some((party) => party.role === role)).map(
                (role) => (
                  <div key={role} className="party-group">
                    <h4>{partyRoleLabel(role)}</h4>
                    {caseDetail.parties
                      .filter((party) => party.role === role)
                      .map((party, index) => (
                        <div key={`${role}-${index}`} className="party-card">
                          <PiiField masked={party.name.masked} real={party.name.real} />
                          <PiiField masked={party.phone.masked} real={party.phone.real} />
                          <PiiField masked={party.address.masked} real={party.address.real} />
                        </div>
                      ))}
                  </div>
                ),
              )}
            </section>

            {caseDetail.arrests && caseDetail.arrests.length > 0 && (
              <section className="case-arrests">
                <h3>Arrests</h3>
                {caseDetail.arrests.map((arrest, index) => (
                  <div key={index} className="fact-row">
                    <span className="k">Arrest date</span>
                    <span className="v mono">{arrest.arrestDate}</span>
                    <span className="k">Custody status</span>
                    <span className="v">{arrest.custodyStatus}</span>
                  </div>
                ))}
              </section>
            )}

            {caseDetail.chargesheet && (
              <section className="case-chargesheet">
                <h3>Chargesheet</h3>
                <div className="fact-row">
                  <span className="k">Filed date</span>
                  <span className="v mono">{caseDetail.chargesheet.filedDate}</span>
                </div>
                <div className="fact-row">
                  <span className="k">Sections applied</span>
                  <span className="v mono">{caseDetail.chargesheet.sectionsApplied}</span>
                </div>
                <div className="fact-row">
                  <span className="k">Court</span>
                  <span className="v">{caseDetail.chargesheet.court}</span>
                </div>
              </section>
            )}
          </div>

          <div className="case-detail-side">
            <section className="case-timeline">
              <h3>Timeline</h3>
              <CaseTimeline entries={caseDetail.timeline} />
            </section>
          </div>
        </div>
      </main>
      <EvidencePanel data={evidenceData} onClose={() => setExplainOpen(false)} variant="modal" />
    </>
  );
}
