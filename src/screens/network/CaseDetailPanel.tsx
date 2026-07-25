import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { SidePanelChrome } from '../../design-system/SidePanelChrome';
import { caseIdOfNode, type GraphNodeResponse } from '../../api/networkApi';
import {
  caseStatusChipClass,
  caseStatusLabel,
  gravityDotClass,
  gravityLabel,
  partyRoleLabel,
  useCaseDetail,
  type CasePartyRole,
} from '../../api/caseApi';

interface CaseDetailPanelProps {
  node: GraphNodeResponse | null;
  onClose: () => void;
  onFocus: (caseId: number) => void;
}

const PARTY_ROLE_ORDER: CasePartyRole[] = ['complainant', 'victim', 'accused'];

export function CaseDetailPanel({ node, onClose, onFocus }: CaseDetailPanelProps) {
  const { token } = useAuth();
  const caseId = node ? caseIdOfNode(node) : null;
  const caseDetailQuery = useCaseDetail(token, caseId);
  const detail = caseDetailQuery.data;

  const partyCounts = detail
    ? PARTY_ROLE_ORDER.map((role) => ({
        role,
        count: detail.parties.filter((party) => party.role === role).length,
      })).filter((entry) => entry.count > 0)
    : [];

  return (
    <SidePanelChrome open={node != null} onClose={onClose} title={node?.label ?? ''} className="case-detail-panel">
      {node && (
        <>
          <div className="evidence-meta-list">
            {detail ? (
              <>
                <div className="evidence-meta-row">
                  <span className={`chip ${caseStatusChipClass(detail.status)}`}>{caseStatusLabel(detail.status)}</span>
                  {detail.gravity && (
                    <span className="gravity-tag">
                      <span className={`gravity-dot ${gravityDotClass(detail.gravity)}`} aria-hidden="true" />
                      {gravityLabel(detail.gravity)}
                    </span>
                  )}
                </div>
                <div className="evidence-meta-row"><span className="k">Crime</span><span className="v">{detail.crimeSubHeadName}</span></div>
                <div className="evidence-meta-row"><span className="k">Station</span><span className="v">{detail.station ?? '—'}</span></div>
                <div className="evidence-meta-row"><span className="k">District</span><span className="v">{detail.district ?? '—'}</span></div>
                <div className="evidence-meta-row"><span className="k">FIR date</span><span className="v mono">{detail.firDate}</span></div>
              </>
            ) : (
              <>
                <div className="evidence-meta-row"><span className="k">Case No.</span><span className="v mono">{node.caseNo ?? '—'}</span></div>
                <div className="evidence-meta-row"><span className="k">Registered</span><span className="v">{node.crimeRegisteredDate ?? '—'}</span></div>
                <div className="evidence-meta-row"><span className="k">Gravity weight</span><span className="v mono">{node.gravityWeight ?? '—'}</span></div>
              </>
            )}
          </div>

          {caseDetailQuery.isError && (
            <div className="evidence-meta-list">
              <p role="alert">Couldn't load case details.</p>
              <button type="button" className="panel-action-btn" onClick={() => caseDetailQuery.refetch()}>
                Retry
              </button>
            </div>
          )}

          {detail && (
            <>
              <p className="evidence-claim narrative-clamp">{detail.narrative}</p>
              {partyCounts.length > 0 && (
                <div className="evidence-meta-list">
                  {partyCounts.map(({ role, count }) => (
                    <div className="evidence-meta-row" key={role}>
                      <span className="k">{partyRoleLabel(role)}</span>
                      <span className="v mono">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="panel-actions">
            <button type="button" className="panel-action-btn" onClick={() => onFocus(caseIdOfNode(node))}>
              Focus on Case
            </button>
            <Link className="panel-action-btn" to={`/case-explorer/${caseIdOfNode(node)}`}>
              Open in Case Explorer
            </Link>
          </div>
        </>
      )}
    </SidePanelChrome>
  );
}
