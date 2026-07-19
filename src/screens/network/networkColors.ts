const COMMUNITY_SLOT_COUNT = 5;

// A real Neo4j communityId is an arbitrary Louvain cluster id -- this hashes
// it into one of tokens.css's --cat-1..--cat-5 slots. Deliberately NOT a reuse
// of CategoryMixChart's crimeHeadId -> slot map: that map only makes sense
// for the fixed 5-value crimeHeadId domain, not an open-ended cluster id.
export function colorForCommunity(communityId: number): string {
  const normalized = ((communityId % COMMUNITY_SLOT_COUNT) + COMMUNITY_SLOT_COUNT) % COMMUNITY_SLOT_COUNT;
  return `var(--cat-${normalized + 1})`;
}
