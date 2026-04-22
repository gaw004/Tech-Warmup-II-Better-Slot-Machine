// Seeded PRNG for all spin resolution.
//
// Uses mulberry32 — a 32-bit integer state generator that produces uniformly
// distributed floats in [0, 1). Deterministic for a given seed, so spins are
// reproducible for tests and audit replay.
//
// §8.2 requires crypto.getRandomValues() as the production seed source; the
// seeded overload exists purely so tests and tools can pin outcomes.

export type Rng = () => number;

export function createRng(seed?: number): Rng {
  let state = ((seed ?? cryptoSeed()) >>> 0) || 1;
  return function mulberry32(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cryptoSeed(): number {
  const arr = new Uint32Array(1);
  globalThis.crypto.getRandomValues(arr);
  return arr[0]!;
}
