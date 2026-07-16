import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceChip } from './ConfidenceChip';

describe('ConfidenceChip', () => {
  it('renders the confidence as a rounded percentage', () => {
    render(<ConfidenceChip confidence={0.814} />);
    expect(screen.getByText('81%')).toBeInTheDocument();
  });
});
