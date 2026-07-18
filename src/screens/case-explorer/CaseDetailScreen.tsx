import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import { PiiField } from '../../design-system/PiiField';
import { caseStatusChipClass, caseStatusLabel, useCaseDetail } from '../../api/caseApi';

export function CaseDetailScreen() {
  const { token } = useAuth();
  const { caseId } = useParams<{ caseId: string }>();
  const caseDetailQuery = useCaseDetail(token, caseId ? Number(caseId) : null);

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
          <span className={`chip ${caseStatusChipClass(caseDetail.status)}`}>
            {caseStatusLabel(caseDetail.status)}
          </span>
          <p>
            {caseDetail.crimeSubHeadName} · {caseDetail.unitName} · {caseDetail.firDate}
          </p>
          <p>{caseDetail.narrative}</p>
        </section>

        <section className="case-parties">
          <h3>Parties</h3>
          {caseDetail.parties.map((party, index) => (
            <div key={`${party.role}-${index}`} className="party-card">
              <span className="party-role">{party.role === 'victim' ? 'Victim' : 'Accused'}</span>
              <PiiField masked={party.name.masked} real={party.name.real} />
              <PiiField masked={party.phone.masked} real={party.phone.real} />
              <PiiField masked={party.address.masked} real={party.address.real} />
            </div>
          ))}
        </section>

        <section className="case-timeline">
          <h3>Timeline</h3>
          <ul>
            {caseDetail.timeline.map((entry, index) => (
              <li key={index}>
                <span className="mono">{entry.timestamp}</span>
                <span className={`chip ${caseStatusChipClass(entry.status)}`}>{caseStatusLabel(entry.status)}</span>
                <span>{entry.note}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
