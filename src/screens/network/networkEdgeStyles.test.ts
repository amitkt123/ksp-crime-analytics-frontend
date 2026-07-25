import { describe, expect, it } from 'vitest';
import { edgeStyleFor, ALL_EDGE_TYPES } from './networkEdgeStyles';
import type { GraphEdgeType } from '../../api/networkApi';

describe('edgeStyleFor', () => {
  it('has a distinct style entry for every GraphEdgeType', () => {
    const types: GraphEdgeType[] = ['ACCUSED_IN', 'VICTIM_IN', 'ARRESTED_BY', 'OCCURRED_AT', 'CO_ACCUSED_WITH', 'SHARES_MO_WITH'];
    types.forEach((type) => {
      const style = edgeStyleFor(type);
      expect(style.label).toBeTruthy();
      expect(style.color).toBeTruthy();
    });
    expect(ALL_EDGE_TYPES).toEqual(types.slice().sort());
  });

  it('gives CO_ACCUSED_WITH and SHARES_MO_WITH different dash patterns from each other and from the direct-fact types', () => {
    const coAccused = edgeStyleFor('CO_ACCUSED_WITH');
    const sharesMo = edgeStyleFor('SHARES_MO_WITH');
    const accusedIn = edgeStyleFor('ACCUSED_IN');
    expect(coAccused.dash).not.toEqual(sharesMo.dash);
    expect(accusedIn.dash).toBeUndefined();
  });
});
