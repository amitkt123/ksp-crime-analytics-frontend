import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { usePeople, type PersonReference } from '../../api/networkApi';
import { useDebounce } from '../../design-system/useDebounce';

interface PersonSelectorProps {
  label: string;
  value: PersonReference | null;
  onChange: (person: PersonReference | null) => void;
  placeholder?: string;
}

export function PersonSelector({ label, value, onChange, placeholder }: PersonSelectorProps) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [caseNo, setCaseNo] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const debouncedCaseNo = useDebounce(caseNo, 300);
  const { data: people, isLoading } = usePeople(token, debouncedQuery, debouncedCaseNo);

  if (value) {
    return (
      <div className="person-selector">
        <label>{label}</label>
        <div className="person-selected-chip">
          <span>{value.displayName}</span>
          <button type="button" className="person-selected-clear" aria-label={`Clear ${label}`} onClick={() => onChange(null)}>
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="person-selector">
      <label>{label}</label>
      <div className="person-selector-fields">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
        <input
          type="text"
          className="person-selector-caseno"
          value={caseNo}
          onChange={(e) => setCaseNo(e.target.value)}
          placeholder="FIR / Case No. (optional, to tell same-name people apart)"
        />
      </div>
      {isLoading && <div className="loading-spinner" />}
      {people && people.length > 0 && (
        <ul className="person-selector-results">
          {people.map((person) => (
            <li key={person.personId} onClick={() => onChange(person)}>
              {person.displayName}
            </li>
          ))}
        </ul>
      )}
      {people && people.length === 0 && !isLoading && debouncedQuery.length >= 2 && (
        <p className="person-selector-empty">No matches.</p>
      )}
    </div>
  );
}
