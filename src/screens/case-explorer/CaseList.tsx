import { Link } from 'react-router-dom';
import { caseStatusChipClass, caseStatusLabel, type CaseSummaryResponse } from '../../api/caseApi';

interface CaseListProps {
  cases: CaseSummaryResponse[];
}

export function CaseList({ cases }: CaseListProps) {
  if (cases.length === 0) {
    return <p>No cases match these filters.</p>;
  }

  return (
    <ul className="case-list">
      {cases.map((c) => (
        <li key={c.caseId} className="case-list-row">
          <Link to={`/case-explorer/${c.caseId}`}>
            <span className="mono">{c.caseNumber}</span>
            <span>{c.crimeSubHeadName}</span>
            <span className={`chip ${caseStatusChipClass(c.status)}`}>{caseStatusLabel(c.status)}</span>
            <span className="case-date">{c.firDate}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
