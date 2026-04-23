import type { SymbolId } from '../types/symbols';

// Paytable values per §4.2 — each entry is the line-bet multiplier for 3, 4,
// and 5 matching symbols on a single payline.
//
// Scatter and bonus do NOT pay on paylines:
// - Scatter pays anywhere on the grid in multiples of the total bet (§5.2).
//   Use scatterPayout(count) below; scatter's PAYTABLE row is zeroed so it
//   cannot accidentally be summed as a line win.
// - Bonus never pays directly (§5.3); it triggers the Heist mini-game. Its
//   PAYTABLE row is zeroed for the same reason.
//
// The Gold Kanji 5-of-a-kind value of 5,000× is also the fixed-jackpot payout
// from §7.1; the evaluator raises a `fixedJackpot` trigger so P07 can book
// the hit.

export const PAYTABLE: Record<SymbolId, readonly [k3: number, k4: number, k5: number]> = {
  cherry: [10, 40, 120],
  lime: [10, 40, 120],
  watermelon: [10, 40, 120],
  bar: [20, 75, 235],
  bell: [20, 75, 235],
  horseshoe: [20, 85, 310],
  clover: [20, 85, 310],
  diamond: [35, 150, 525],
  neon7: [75, 300, 1050],
  katana: [95, 375, 1300],
  cyberIris: [130, 440, 1550],
  chromeSkull: [210, 725, 2100],
  goldKanji: [325, 1300, 5000],
  wild: [100, 500, 2000],
  scatter: [0, 0, 0],
  bonus: [0, 0, 0],
};

// Scatter payout as a multiple of the TOTAL bet (not line bet), §4.2 / §5.2.
// 3 scatters → 2×, 4 → 10×, 5 → 50×. Any count below 3 pays nothing.
export function scatterPayout(count: number): number {
  if (count >= 5) return 50;
  if (count === 4) return 10;
  if (count === 3) return 2;
  return 0;
}
