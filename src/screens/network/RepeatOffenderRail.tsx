import { ConfidenceChip } from '../../design-system/ConfidenceChip';
import type { RepeatOffenderResponse } from '../../api/networkApi';

interface RepeatOffenderRailProps {
  offenders: RepeatOffenderResponse[];
  onSelect: (personId: number) => void;
}

export function RepeatOffenderRail({ offenders, onSelect }: RepeatOffenderRailProps) {
  return (
    <aside className="offender-rail">
      <div className="offender-rail-head">
        <h3>Repeat offenders</h3>
        <div className="sub">Ranked by linked-case count</div>
      </div>
      <div className="offender-list">
        {offenders.length === 0 ? (
          <p>No repeat offenders in this scope.</p>
        ) : (
          offenders.map((offender, index) => (
            <button key={offender.personId} className="offender-card" onClick={() => onSelect(offender.personId)}>
              <div className="offender-top">
                <span className="offender-rank mono">{index + 1}</span>
                <span className="offender-name">{offender.displayName}</span>
                <ConfidenceChip confidence={offender.confidenceScore} />
              </div>
              <div className="offender-meta">
                <span className="cases mono">
                  {offender.caseCount} linked case{offender.caseCount === 1 ? '' : 's'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
