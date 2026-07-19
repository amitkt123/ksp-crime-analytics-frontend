import { Link, useNavigate } from 'react-router-dom';
import {
  caseStatusChipClass,
  caseStatusLabel,
  gravityDotClass,
  gravityLabel,
  type CaseSummaryResponse,
} from '../../api/caseApi';

interface CaseListProps {
  cases: CaseSummaryResponse[];
}

export function CaseList({ cases }: CaseListProps) {
  const navigate = useNavigate();

  if (cases.length === 0) {
    return <p>No cases match these filters.</p>;
  }

  return (
    <div className="case-table-wrap">
      <table className="case-table">
        <thead>
          <tr>
            <th>Crime no.</th>
            <th>Case no.</th>
            <th>Registered</th>
            <th>Station</th>
            <th>District</th>
            <th>Crime head</th>
            <th>Gravity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr
              key={c.caseId}
              tabIndex={0}
              onClick={() => navigate(`/case-explorer/${c.caseId}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/case-explorer/${c.caseId}`);
              }}
            >
              <td className="mono crime-no">{c.crimeNumber ?? '—'}</td>
              <td className="mono">
                <Link to={`/case-explorer/${c.caseId}`} onClick={(e) => e.stopPropagation()}>
                  {c.caseNumber}
                </Link>
              </td>
              <td className="mono">{c.firDate}</td>
              <td>{c.station ?? c.unitName}</td>
              <td>{c.district ?? '—'}</td>
              <td>{c.crimeSubHeadName}</td>
              <td>
                {c.gravity ? (
                  <>
                    <span className={`gravity-dot ${gravityDotClass(c.gravity)}`} aria-hidden="true" />
                    {gravityLabel(c.gravity)}
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <span className={`chip ${caseStatusChipClass(c.status)}`}>{caseStatusLabel(c.status)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
