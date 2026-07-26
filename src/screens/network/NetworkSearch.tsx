import { useState } from 'react';
import type { PersonReference } from '../../api/networkApi';
import { PersonSelector } from './PersonSelector';

interface NetworkSearchProps {
  onPersonSubmit: (personId: number) => void;
  onPathSubmit: (from: number, to: number) => void;
}

export function NetworkSearch({ onPersonSubmit, onPathSubmit }: NetworkSearchProps) {
  const [mode, setMode] = useState<'person' | 'path'>('person');
  const [selectedPerson, setSelectedPerson] = useState<PersonReference | null>(null);
  const [pathFrom, setPathFrom] = useState<PersonReference | null>(null);
  const [pathTo, setPathTo] = useState<PersonReference | null>(null);

  function handleSubmit() {
    if (mode === 'person' && selectedPerson) {
      onPersonSubmit(selectedPerson.personId);
    } else if (mode === 'path' && pathFrom && pathTo) {
      onPathSubmit(pathFrom.personId, pathTo.personId);
    }
  }

  return (
    <div className="network-search-container">
      <div className="network-search-modes">
        <button onClick={() => setMode('person')} className={mode === 'person' ? 'active' : ''}>
          Find Network
        </button>
        <button onClick={() => setMode('path')} className={mode === 'path' ? 'active' : ''}>
          Find Link
        </button>
      </div>
      <div className="network-search-body">
        {mode === 'person' ? (
          <>
            <p>See all connections for a single person.</p>
            <PersonSelector label="Person" value={selectedPerson} onChange={setSelectedPerson} placeholder="Search by name" />
          </>
        ) : (
          <>
            <p>Find the shortest path between two people.</p>
            <PersonSelector label="From" value={pathFrom} onChange={setPathFrom} placeholder="Search for starting person" />
            <PersonSelector label="To" value={pathTo} onChange={setPathTo} placeholder="Search for ending person" />
          </>
        )}
      </div>
      <div className="network-search-footer">
        <button onClick={handleSubmit} disabled={mode === 'person' ? !selectedPerson : !pathFrom || !pathTo}>
          Find
        </button>
      </div>
    </div>
  );
}