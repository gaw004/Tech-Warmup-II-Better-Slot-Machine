import type { SymbolGrid } from '../types/spin';

// 25 fixed paylines for the 5×3 grid (§3). Each entry is a 5-tuple giving the
// row index (0 = top, 2 = bottom) visited on each reel 0 → 4. Lines are fixed;
// players cannot add or drop individual lines. Evaluation is left-to-right,
// starting at reel 0, with a minimum match length of 3 (§3, §4.2).
//
// The layout follows the industry-standard Starburst / Cleopatra family:
// - Lines 0–2: the three straight horizontals (middle, top, bottom).
// - Lines 3–4: V and inverse-V diagonals.
// - Lines 5–10: single zigzags and shallow U / inverted-U shapes.
// - Lines 11–19: alternating short zigzags.
// - Lines 20–24: asymmetric slopes and center peaks / troughs.
//
// Line 0 (the middle row) is the unique 1-1-1 line on the reel-0..reel-2
// prefix and is the line most commonly used as a canonical test fixture.

export type PaylineRow = 0 | 1 | 2;
export type Payline = readonly [PaylineRow, PaylineRow, PaylineRow, PaylineRow, PaylineRow];

export const PAYLINES: readonly Payline[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [0, 1, 2, 2, 2],
  [2, 1, 0, 0, 0],
  [0, 0, 0, 1, 2],
  [2, 2, 2, 1, 0],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
];

// Extracts the 5 symbols a given payline visits on the grid. Exposed so
// evaluators, test fixtures, and the paytable-screen diagram can all reason
// about a line without re-indexing the grid by hand.
export function symbolsOnLine(grid: SymbolGrid, line: Payline) {
  return [
    grid[0][line[0]],
    grid[1][line[1]],
    grid[2][line[2]],
    grid[3][line[3]],
    grid[4][line[4]],
  ] as const;
}
