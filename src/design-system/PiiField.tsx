import { useState } from 'react';

interface PiiFieldProps {
  masked: string;
  real: string;
}

export function PiiField({ masked, real }: PiiFieldProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className="pii-field">
      <em className="pii-masked">{revealed ? real : masked}</em>
      <button className="pii-reveal" onClick={() => setRevealed((current) => !current)}>
        {revealed ? 'Hide' : 'Reveal'}
      </button>
    </span>
  );
}
