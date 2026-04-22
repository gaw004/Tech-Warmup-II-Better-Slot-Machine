import type { SymbolId } from '../types/symbols';
import type { SymbolColumn, SymbolGrid } from '../types/spin';
import type { Rng } from './rng';

// Reel strips for the 5-reel grid. The spin primitive picks a uniform starting
// index on each strip and reads three consecutive positions (top/middle/bottom)
// to form that reel's column in the visible grid.
//
// §5.1: Wild only on reels 1, 2, 3 (0-indexed). Reels 0 and 4 MUST contain zero
// wilds so lines cannot be completed from reel 0 alone.
// §5.3: Bonus only on reels 0, 2, 4 (0-indexed). Reels 1 and 3 MUST contain
// zero bonus so the 3-mask trigger is the only way to launch the Heist.
//
// §18.2 open item: weights here are a first-pass approximation aimed at §8.1's
// targets (~28% hit, ~1/150 scatter trigger, ~1/250 bonus trigger,
// ~1/1,000,000 five-Gold-Kanji). A proper Monte-Carlo RTP pass is still owed
// and may re-tune every count below.
// TODO: tune to 96% RTP.
//
// Layout note: low-pay symbols (cherry / lime / watermelon) are interleaved
// rather than clustered on the strip so a reel's 3-row window is likely to
// show each of them on a distinct row. That spreads potential anchor symbols
// across all three rows of each reel and lets multiple paylines resolve
// simultaneously — the mechanism that lifts the 25-line hit rate toward the
// §8.1 target instead of bottlenecking on one anchor per spin.

type WeightTable = ReadonlyArray<readonly [SymbolId, number]>;

// Build a strip where any symbols listed with an `interleave` flag of 3 are
// placed at positions (offset, offset+3, offset+6, ...) so consecutive strip
// positions cycle through them. Remaining symbols are appended in the listed
// order (clustered).
function buildInterleavedStrip(
  lows: readonly [SymbolId, SymbolId, SymbolId],
  lowCount: number,
  tail: WeightTable,
): readonly SymbolId[] {
  const total = lowCount * 3 + tail.reduce((n, [, c]) => n + c, 0);
  const strip: SymbolId[] = new Array(total);
  for (let i = 0; i < lowCount * 3; i++) {
    strip[i] = lows[i % 3]!;
  }
  let idx = lowCount * 3;
  for (const [sym, count] of tail) {
    for (let i = 0; i < count; i++) strip[idx++] = sym;
  }
  return strip;
}

// Reel 0 — no wild, has bonus. Length 50.
// Interleaved: cherry 10, lime 10, watermelon 10 (30 positions, cycled c/l/w).
// Tail: bar 4, bell 4, horseshoe 2, clover 2, diamond 1, neon7 1, katana 1,
//       cyberIris 1, chromeSkull 1, goldKanji 1, scatter 1, bonus 1 (20).
const STRIP_0 = buildInterleavedStrip(['cherry', 'lime', 'watermelon'], 10, [
  ['bar', 4],
  ['bell', 4],
  ['horseshoe', 2],
  ['clover', 2],
  ['diamond', 1],
  ['neon7', 1],
  ['katana', 1],
  ['cyberIris', 1],
  ['chromeSkull', 1],
  ['goldKanji', 1],
  ['scatter', 1],
  ['bonus', 1],
]);

// Reel 1 — has wild, no bonus. Length 50.
// Interleaved: cherry 10, lime 10, watermelon 10.
// Tail: bar 4, bell 4, horseshoe 2, clover 2, diamond 1, neon7 1, katana 1,
//       cyberIris 1, chromeSkull 1, goldKanji 1, wild 1, scatter 1 (20).
const STRIP_1 = buildInterleavedStrip(['cherry', 'lime', 'watermelon'], 10, [
  ['bar', 4],
  ['bell', 4],
  ['horseshoe', 2],
  ['clover', 2],
  ['diamond', 1],
  ['neon7', 1],
  ['katana', 1],
  ['cyberIris', 1],
  ['chromeSkull', 1],
  ['goldKanji', 1],
  ['wild', 1],
  ['scatter', 1],
]);

// Reel 2 — has wild, has bonus. Length 50.
// Interleaved: cherry 10, lime 10, watermelon 10.
// Tail: bar 3, bell 4, horseshoe 2, clover 2, diamond 1, neon7 1, katana 1,
//       cyberIris 1, chromeSkull 1, goldKanji 1, wild 1, scatter 1, bonus 1 (20).
const STRIP_2 = buildInterleavedStrip(['cherry', 'lime', 'watermelon'], 10, [
  ['bar', 3],
  ['bell', 4],
  ['horseshoe', 2],
  ['clover', 2],
  ['diamond', 1],
  ['neon7', 1],
  ['katana', 1],
  ['cyberIris', 1],
  ['chromeSkull', 1],
  ['goldKanji', 1],
  ['wild', 1],
  ['scatter', 1],
  ['bonus', 1],
]);

// Reel 3 — has wild, no bonus. Length 50. Mirror of reel 1.
const STRIP_3 = buildInterleavedStrip(['cherry', 'lime', 'watermelon'], 10, [
  ['bar', 4],
  ['bell', 4],
  ['horseshoe', 2],
  ['clover', 2],
  ['diamond', 1],
  ['neon7', 1],
  ['katana', 1],
  ['cyberIris', 1],
  ['chromeSkull', 1],
  ['goldKanji', 1],
  ['wild', 1],
  ['scatter', 1],
]);

// Reel 4 — no wild, has bonus. Length 50. Mirror of reel 0.
const STRIP_4 = buildInterleavedStrip(['cherry', 'lime', 'watermelon'], 10, [
  ['bar', 4],
  ['bell', 4],
  ['horseshoe', 2],
  ['clover', 2],
  ['diamond', 1],
  ['neon7', 1],
  ['katana', 1],
  ['cyberIris', 1],
  ['chromeSkull', 1],
  ['goldKanji', 1],
  ['scatter', 1],
  ['bonus', 1],
]);

export const REEL_STRIPS: readonly [
  readonly SymbolId[],
  readonly SymbolId[],
  readonly SymbolId[],
  readonly SymbolId[],
  readonly SymbolId[],
] = [STRIP_0, STRIP_1, STRIP_2, STRIP_3, STRIP_4];

function spinColumn(strip: readonly SymbolId[], rng: Rng): SymbolColumn {
  const n = strip.length;
  const start = Math.floor(rng() * n);
  return [strip[start % n]!, strip[(start + 1) % n]!, strip[(start + 2) % n]!];
}

// Draws one spin outcome: a 5×3 grid indexed grid[reel][row]. Reels 0–4
// left-to-right, rows 0–2 top-to-bottom. Every spin is fully independent — no
// session history, no "due for a win" modulation (§17.1).
export function spinReels(rng: Rng): SymbolGrid {
  return [
    spinColumn(REEL_STRIPS[0], rng),
    spinColumn(REEL_STRIPS[1], rng),
    spinColumn(REEL_STRIPS[2], rng),
    spinColumn(REEL_STRIPS[3], rng),
    spinColumn(REEL_STRIPS[4], rng),
  ];
}
