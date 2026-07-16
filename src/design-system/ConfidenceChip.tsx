interface ConfidenceChipProps {
  confidence: number;
}

export function ConfidenceChip({ confidence }: ConfidenceChipProps) {
  return <span className="chip predicted">{Math.round(confidence * 100)}%</span>;
}
