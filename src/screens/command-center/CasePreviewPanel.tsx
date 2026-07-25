import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { SidePanelChrome } from '../../design-system/SidePanelChrome';
import { PiiField } from '../../design-system/PiiField';
import {
  caseStatusChipClass,
  caseStatusLabel,
  gravityDotClass,
  gravityLabel,
  partyRoleLabel,
  useCaseDetail,
  type CasePartyRole,
} from '../../api/caseApi';

const PARTY_ROLE_ORDER: CasePartyRole[] = ['complainant', 'victim', 'accused'];

// /case-explorer/:caseId is only reachable by these roles (see App.tsx) -- Command
// Center's own roles (DISTRICT_SUPERVISOR/SCRB_ANALYST/POLICYMAKER) would hit an
// access-denied redirect, so the "View full case" link only renders when it works.
const CASE_EXPLORER_ROLES = ['INVESTIGATOR', 'STATION_SUPERVISOR'];

interface CasePreviewPanelProps {
  caseId: number | null;
  onClose: () => void;
}

export function CasePreviewPanel({ caseId, onClose }: CasePreviewPanelProps) {
  const { token, roles } = useAuth();
  const caseDetailQuery = useCaseDetail(token, caseId);
  const canOpenFullCase = roles.some((role) => CASE_EXPLORER_ROLES.includes(role));

  const open = caseId != null;
  const caseDetail = caseDetailQuery.data;
  const title = caseDetail?.caseNumber ?? 'Case preview';

  return (
    <SidePanelChrome open={open} onClose={onClose} title={title} className="modal">
      {open && caseDetailQuery.isLoading && <p>Loading case…</p>}
      {open && caseDetailQuery.isError && (
        <p role="alert">
          Couldn't load this case.{' '}
          <button onClick={() => caseDetailQuery.refetch()}>Retry</button>
        </p>
      )}
      {caseDetail && (
        <>
          <div className="case-facts">
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
            <p className="narrative-clamp">{caseDetail.narrative}</p>
          </div>

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
                      </div>
                    ))}
                </div>
              ),
            )}
          </section>

          {canOpenFullCase && (
            <div className="panel-actions">
              <Link className="panel-action-btn" to={`/case-explorer/${caseDetail.caseId}`}>
                View full case
              </Link>
            </div>
          )}
        </>
      )}
    </SidePanelChrome>
  );
}
