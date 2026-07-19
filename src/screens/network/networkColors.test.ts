import { describe, it, expect } from 'vitest';
import { colorForCommunity } from './networkColors';

describe('colorForCommunity', () => {
  it('maps communityId 0 to --cat-1', () => {
    expect(colorForCommunity(0)).toBe('var(--cat-1)');
  });

  it('wraps communityId 7 to --cat-3 (7 % 5 = 2, slot index + 1)', () => {
    expect(colorForCommunity(7)).toBe('var(--cat-3)');
  });

  it('gives the same communityId the same color across calls', () => {
    expect(colorForCommunity(42)).toBe(colorForCommunity(42));
  });
});
