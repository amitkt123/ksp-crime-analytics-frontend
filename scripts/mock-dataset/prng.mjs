// Deterministic PRNG (mulberry32) so the generated dataset is reproducible and
// diffable in review -- this repo's mock layer never uses Math.random() (see
// src/api/mockData.ts's per-function comments), and a 2-lakh-record generator
// is no exception.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
