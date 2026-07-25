import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, MapPin, ShieldAlert, Tag } from 'lucide-react';
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
    <SidePanelChrome open={open} onClose={onClose} title={title} className="modal cc-mockup-type">
      {open && caseDetailQuery.isLoading && <p>Loading case…</p>}
      {open && caseDetailQuery.isError && (
        <p role="alert">
          Couldn't load this case.{' '}
          <button onClick={() => caseDetailQuery.refetch()}>Retry</button>
        </p>
      )}
      {caseDetail && (
        <div className="flex flex-col gap-4 text-sm text-ink">
          <div className="case-facts grid grid-cols-2 gap-3 rounded-lg border border-border bg-canvas p-3">
            {caseDetail.crimeNumber && (
              <Fact icon={Tag} label="Crime number">
                <span className="mono crime-no">{caseDetail.crimeNumber}</span>
              </Fact>
            )}
            <Fact icon={CheckCircle2} label="Status">
              <span className={`chip ${caseStatusChipClass(caseDetail.status)}`}>{caseStatusLabel(caseDetail.status)}</span>
            </Fact>
            {caseDetail.gravity && (
              <Fact icon={ShieldAlert} label="Gravity">
                <span className="gravity-tag flex items-center text-ink">
                  <span className={`gravity-dot ${gravityDotClass(caseDetail.gravity)}`} aria-hidden="true" />
                  {gravityLabel(caseDetail.gravity)}
                </span>
              </Fact>
            )}
            <Fact icon={MapPin} label="Unit">
              {caseDetail.unitName}
            </Fact>
            <Fact icon={Calendar} label="FIR date">
              {caseDetail.firDate}
            </Fact>
            <Fact icon={Tag} label="Crime sub-head">
              {caseDetail.crimeSubHeadName}
            </Fact>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold tracking-wider text-muted uppercase">Incident narrative</span>
            <p className="narrative-clamp rounded-md border border-border bg-canvas p-3 text-muted">{caseDetail.narrative}</p>
          </div>

          <section className="case-parties flex flex-col gap-3">
            <h3 className="text-[13px] font-bold text-ink">Parties</h3>
            {PARTY_ROLE_ORDER.filter((role) => caseDetail.parties.some((party) => party.role === role)).map(
              (role) => (
                <div key={role} className="party-group">
                  <h4 className="mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">{partyRoleLabel(role)}</h4>
                  {caseDetail.parties
                    .filter((party) => party.role === role)
                    .map((party, index) => (
                      <div key={`${role}-${index}`} className="party-card mt-1.5 rounded-lg border border-border bg-canvas p-2.5">
                        <PiiField masked={party.name.masked} real={party.name.real} />
                      </div>
                    ))}
                </div>
              ),
            )}
          </section>

          {canOpenFullCase && (
            <div className="panel-actions">
              <Link
                className="panel-action-btn inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent no-underline hover:border-accent"
                to={`/case-explorer/${caseDetail.caseId}`}
              >
                View full case
              </Link>
            </div>
          )}
        </div>
      )}
    </SidePanelChrome>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden />
      <div>
        <span className="block text-[11px] text-muted">{label}</span>
        <span className="font-semibold text-ink">{children}</span>
      </div>
    </div>
  );
}
