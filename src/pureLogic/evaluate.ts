import type { SymbolId } from '../types/symbols';
import type { SymbolGrid, LineWin, SpinOutput, SpinTriggers } from '../types/spin';
import type { Credits } from '../types/economy';

import { PAYLINES, symbolsOnLine } from './paylines';
import type { Payline } from './paylines';
import { PAYTABLE, scatterPayout } from './paytable';

// evaluate — pure resolver for a single spin grid. Produces the list of
// payline wins, the scatter pay, the combined total, and any bonus-feature
// triggers this grid activates. No RNG, no state, no cascading — P03 runs the
// chain by calling back into here, and P04/P05/P06 react to the triggers.
//
// §3: paylines are left-to-right with a minimum of 3 matches starting from
//   reel 0.
// §5.1: wilds substitute for any symbol except scatter and bonus, and also
//   pay on their own.
// §5.2: scatters pay anywhere regardless of payline and use total-bet
//   multipliers.
// §5.3: bonus never pays on paylines; it's a heist-trigger marker.
// §6.1 / §6.4 / §7.1: triggers are computed here but not acted on.

type EvaluateResult = Pick<SpinOutput, 'wins' | 'scatterWin' | 'totalWin' | 'triggers'>;

export function evaluate(
  grid: SymbolGrid,
  lineBet: Credits,
  totalBet: Credits,
): EvaluateResult {
  const wins: LineWin[] = [];
  const triggers: SpinTriggers = {};

  for (let i = 0; i < PAYLINES.length; i++) {
    const win = evaluateLine(i, symbolsOnLine(grid, PAYLINES[i] as Payline), lineBet);
    if (!win) continue;
    wins.push(win);
    if (win.symbol === 'goldKanji' && win.count === 5) {
      triggers.fixedJackpot = true;
    }
  }

  const scatterCount = countOnGrid(grid, 'scatter');
  const scatterWin = scatterPayout(scatterCount) * totalBet;
  if (scatterCount >= 3) {
    triggers.freeSpins = scatterCount >= 5 ? 25 : scatterCount === 4 ? 15 : 10;
  }

  if (
    reelHasSymbol(grid, 0, 'bonus') &&
    reelHasSymbol(grid, 2, 'bonus') &&
    reelHasSymbol(grid, 4, 'bonus')
  ) {
    triggers.heist = true;
  }

  if (countOnGrid(grid, 'wild') >= 2) {
    triggers.wildRespin = true;
  }

  const lineTotal = wins.reduce((sum, w) => sum + w.credits, 0);

  return { wins, scatterWin, totalWin: lineTotal + scatterWin, triggers };
}

// Resolves a single payline. §5.1 gives the wild two personalities — it pays
// on its own as a wild, and it substitutes for other symbols. We compute both
// candidate reads and return whichever yields more credits (standard
// industry rule, and the practical interpretation of "a single line pays
// only the longest win" for wild-led lines).
function evaluateLine(
  lineIndex: number,
  symbols: readonly SymbolId[],
  lineBet: Credits,
): LineWin | null {
  const first = symbols[0];
  if (!first || first === 'scatter' || first === 'bonus') return null;

  const pureWildCount = countLeading(symbols, 'wild');
  const pureWildWin =
    pureWildCount >= 3 ? buildWin(lineIndex, 'wild', pureWildCount, lineBet) : null;

  let anchor: SymbolId | null = null;
  for (const s of symbols) {
    if (s === 'wild') continue;
    if (s !== 'scatter' && s !== 'bonus') anchor = s;
    break;
  }

  let substituteWin: LineWin | null = null;
  if (anchor) {
    let count = 0;
    for (const s of symbols) {
      if (s === anchor || s === 'wild') count++;
      else break;
    }
    if (count >= 3) substituteWin = buildWin(lineIndex, anchor, count, lineBet);
  }

  if (pureWildWin && substituteWin) {
    return pureWildWin.credits >= substituteWin.credits ? pureWildWin : substituteWin;
  }
  return pureWildWin ?? substituteWin;
}

function buildWin(
  lineIndex: number,
  symbol: SymbolId,
  count: number,
  lineBet: Credits,
): LineWin {
  const multiplier = PAYTABLE[symbol][count - 3 as 0 | 1 | 2];
  return {
    lineIndex,
    symbol,
    count: count as 3 | 4 | 5,
    multiplier,
    credits: multiplier * lineBet,
  };
}

function countLeading(symbols: readonly SymbolId[], target: SymbolId): number {
  let n = 0;
  for (const s of symbols) {
    if (s === target) n++;
    else break;
  }
  return n;
}

function countOnGrid(grid: SymbolGrid, target: SymbolId): number {
  let n = 0;
  for (const col of grid) for (const s of col) if (s === target) n++;
  return n;
}

function reelHasSymbol(grid: SymbolGrid, reel: number, target: SymbolId): boolean {
  const col = grid[reel];
  if (!col) return false;
  for (const s of col) if (s === target) return true;
  return false;
}
