import { describe, it, expect } from 'vitest';

import { evaluate } from '../pureLogic/evaluate';
import { PAYLINES, symbolsOnLine } from '../pureLogic/paylines';
import { PAYTABLE, scatterPayout } from '../pureLogic/paytable';
import type { SymbolId } from '../types/symbols';
import type { SymbolColumn, SymbolGrid } from '../types/spin';

// Grid constructors --------------------------------------------------------
//
// Every test isolates a specific payline outcome by filling the non-target
// cells with 'bonus'. Bonus-led lines return null from evaluateLine (§5.3:
// bonus never pays on paylines), and bonus is not a wild, so it also breaks
// anchor-extension on any crossing line. That lets us assert precisely which
// paylines fire without accidental cross-line matches.
//
// Bonus fillers can raise the heist trigger if placed on reels 0, 2, AND 4.
// Tests that care about the trigger flags explicitly account for it.

const B: SymbolId = 'bonus';

function column(top: SymbolId, mid: SymbolId, bot: SymbolId): SymbolColumn {
  return [top, mid, bot];
}

// Put `row1Symbols[reel]` on the middle row of each reel; fill top/bottom
// rows with bonus. Middle row is PAYLINES[0] = [1,1,1,1,1], the unique 1-1-1
// line on the reel-0..reel-2 prefix.
function middleRowGrid(row1Symbols: readonly [SymbolId, SymbolId, SymbolId, SymbolId, SymbolId]): SymbolGrid {
  return [
    column(B, row1Symbols[0], B),
    column(B, row1Symbols[1], B),
    column(B, row1Symbols[2], B),
    column(B, row1Symbols[3], B),
    column(B, row1Symbols[4], B),
  ];
}

const PAYING_SYMBOLS: readonly SymbolId[] = [
  'cherry',
  'lime',
  'watermelon',
  'bar',
  'bell',
  'horseshoe',
  'clover',
  'diamond',
  'neon7',
  'katana',
  'cyberIris',
  'chromeSkull',
  'goldKanji',
];

// Distinct "stopper" — any symbol that is not the one under test, not wild,
// not scatter, not bonus — guaranteed to break an anchor run.
function otherPaying(notThis: SymbolId): SymbolId {
  for (const s of PAYING_SYMBOLS) if (s !== notThis) return s;
  throw new Error('no other symbol');
}

// -------------------------------------------------------------------------

describe('paylines', () => {
  it('has exactly 25 fixed paylines (§3)', () => {
    expect(PAYLINES).toHaveLength(25);
  });

  it('every payline visits 5 reels with row indices in 0..2', () => {
    for (const line of PAYLINES) {
      expect(line).toHaveLength(5);
      for (const row of line) expect([0, 1, 2]).toContain(row);
    }
  });

  it('all 25 paylines are distinct', () => {
    const keys = new Set(PAYLINES.map((l) => l.join(',')));
    expect(keys.size).toBe(25);
  });

  it('line 0 is the middle row (canonical fixture)', () => {
    expect(PAYLINES[0]).toEqual([1, 1, 1, 1, 1]);
  });

  it('symbolsOnLine extracts the 5 visited symbols', () => {
    const grid = middleRowGrid(['cherry', 'bell', 'bar', 'diamond', 'neon7']);
    expect(symbolsOnLine(grid, PAYLINES[0]!)).toEqual(['cherry', 'bell', 'bar', 'diamond', 'neon7']);
  });
});

describe('paytable', () => {
  it('every paying symbol matches §4.2 exactly', () => {
    expect(PAYTABLE.cherry).toEqual([10, 40, 120]);
    expect(PAYTABLE.lime).toEqual([10, 40, 120]);
    expect(PAYTABLE.watermelon).toEqual([10, 40, 120]);
    expect(PAYTABLE.bar).toEqual([20, 75, 235]);
    expect(PAYTABLE.bell).toEqual([20, 75, 235]);
    expect(PAYTABLE.horseshoe).toEqual([20, 85, 310]);
    expect(PAYTABLE.clover).toEqual([20, 85, 310]);
    expect(PAYTABLE.diamond).toEqual([35, 150, 525]);
    expect(PAYTABLE.neon7).toEqual([75, 300, 1050]);
    expect(PAYTABLE.katana).toEqual([95, 375, 1300]);
    expect(PAYTABLE.cyberIris).toEqual([130, 440, 1550]);
    expect(PAYTABLE.chromeSkull).toEqual([210, 725, 2100]);
    expect(PAYTABLE.goldKanji).toEqual([325, 1300, 5000]);
    expect(PAYTABLE.wild).toEqual([100, 500, 2000]);
  });

  it('scatter and bonus rows are zeroed — they do not pay on paylines', () => {
    expect(PAYTABLE.scatter).toEqual([0, 0, 0]);
    expect(PAYTABLE.bonus).toEqual([0, 0, 0]);
  });

  it('scatterPayout returns 2/10/50 for 3/4/5 and 0 otherwise (§5.2)', () => {
    expect(scatterPayout(0)).toBe(0);
    expect(scatterPayout(2)).toBe(0);
    expect(scatterPayout(3)).toBe(2);
    expect(scatterPayout(4)).toBe(10);
    expect(scatterPayout(5)).toBe(50);
    expect(scatterPayout(6)).toBe(50); // out-of-range upper — clamps
  });
});

describe('evaluate — each paying symbol at 3/4/5 of a kind on line 0', () => {
  const lineBet = 10;
  const totalBet = 250;

  for (const sym of PAYING_SYMBOLS) {
    const stopper = otherPaying(sym);

    it(`${sym}: 3-of-a-kind pays ${sym}[0] × lineBet`, () => {
      const grid = middleRowGrid([sym, sym, sym, stopper, stopper]);
      const result = evaluate(grid, lineBet, totalBet);
      const lineWin = result.wins.find((w) => w.lineIndex === 0);
      expect(lineWin).toBeDefined();
      expect(lineWin!.symbol).toBe(sym);
      expect(lineWin!.count).toBe(3);
      expect(lineWin!.multiplier).toBe(PAYTABLE[sym][0]);
      expect(lineWin!.credits).toBe(PAYTABLE[sym][0] * lineBet);
    });

    it(`${sym}: 4-of-a-kind pays ${sym}[1] × lineBet`, () => {
      const grid = middleRowGrid([sym, sym, sym, sym, stopper]);
      const result = evaluate(grid, lineBet, totalBet);
      const lineWin = result.wins.find((w) => w.lineIndex === 0);
      expect(lineWin).toBeDefined();
      expect(lineWin!.count).toBe(4);
      expect(lineWin!.multiplier).toBe(PAYTABLE[sym][1]);
      expect(lineWin!.credits).toBe(PAYTABLE[sym][1] * lineBet);
    });

    it(`${sym}: 5-of-a-kind pays ${sym}[2] × lineBet`, () => {
      const grid = middleRowGrid([sym, sym, sym, sym, sym]);
      const result = evaluate(grid, lineBet, totalBet);
      const lineWin = result.wins.find((w) => w.lineIndex === 0);
      expect(lineWin).toBeDefined();
      expect(lineWin!.count).toBe(5);
      expect(lineWin!.multiplier).toBe(PAYTABLE[sym][2]);
      expect(lineWin!.credits).toBe(PAYTABLE[sym][2] * lineBet);
    });
  }
});

describe('evaluate — wild substitution (§5.1)', () => {
  it('W-C-C-C-C on middle row resolves as 5-of-a-kind cherry via substitute', () => {
    const grid = middleRowGrid(['wild', 'cherry', 'cherry', 'cherry', 'cherry']);
    const result = evaluate(grid, 10, 250);
    const lineWin = result.wins.find((w) => w.lineIndex === 0);
    expect(lineWin).toBeDefined();
    expect(lineWin!.symbol).toBe('cherry');
    expect(lineWin!.count).toBe(5);
    expect(lineWin!.credits).toBe(PAYTABLE.cherry[2] * 10);
  });

  it('C-W-C on middle row (reels 0-2) resolves as 3-of-a-kind cherry', () => {
    const stopper = otherPaying('cherry');
    const grid = middleRowGrid(['cherry', 'wild', 'cherry', stopper, stopper]);
    const result = evaluate(grid, 5, 125);
    const lineWin = result.wins.find((w) => w.lineIndex === 0);
    expect(lineWin).toBeDefined();
    expect(lineWin!.symbol).toBe('cherry');
    expect(lineWin!.count).toBe(3);
    expect(lineWin!.credits).toBe(PAYTABLE.cherry[0] * 5);
  });

  it('wild 3-of-a-kind pays on its own when substitute extension is blocked', () => {
    // W W W bonus <anything>: bonus breaks both anchor detection and the
    // wild run. Pure wild pays 3-of-a-kind.
    const grid = middleRowGrid(['wild', 'wild', 'wild', 'bonus', 'horseshoe']);
    const result = evaluate(grid, 10, 250);
    const lineWin = result.wins.find((w) => w.lineIndex === 0);
    expect(lineWin).toBeDefined();
    expect(lineWin!.symbol).toBe('wild');
    expect(lineWin!.count).toBe(3);
    expect(lineWin!.credits).toBe(PAYTABLE.wild[0] * 10);
  });

  it('takes the higher-paying interpretation when both wild-only and substitute qualify', () => {
    // WWWW C: wild 4-of-a-kind pays 500× line bet; cherry 5-of-a-kind via
    // substitute pays 120× line bet. Wild-only wins.
    const grid = middleRowGrid(['wild', 'wild', 'wild', 'wild', 'cherry']);
    const result = evaluate(grid, 10, 250);
    const lineWin = result.wins.find((w) => w.lineIndex === 0);
    expect(lineWin).toBeDefined();
    expect(lineWin!.symbol).toBe('wild');
    expect(lineWin!.count).toBe(4);
    expect(lineWin!.credits).toBe(PAYTABLE.wild[1] * 10);
  });
});

describe('evaluate — scatter pays anywhere (§5.2)', () => {
  function gridWithScatters(n: number): SymbolGrid {
    // Start with a blank bonus-free grid so bonus/scatter filler doesn't
    // accidentally fire heist / line wins. Fill with 'diamond' everywhere,
    // then sprinkle `n` scatters on distinct cells.
    const cells: SymbolId[][] = [];
    for (let r = 0; r < 5; r++) cells.push(['diamond', 'diamond', 'diamond']);
    let placed = 0;
    for (let r = 0; r < 5 && placed < n; r++) {
      for (let row = 0; row < 3 && placed < n; row++) {
        // Avoid putting scatter on middle row of reels 0-4 so we don't form
        // a line 0 diamond run; middle row is where diamond-5-of-a-kind
        // would otherwise fire. Use top row instead.
        if (row !== 0) continue;
        cells[r]![row] = 'scatter';
        placed++;
      }
    }
    return cells.map((c) => [c[0]!, c[1]!, c[2]!]) as unknown as SymbolGrid;
  }

  it('3 scatters anywhere → scatterWin = 2 × totalBet, freeSpins = 10', () => {
    const grid = gridWithScatters(3);
    const result = evaluate(grid, 10, 250);
    expect(result.scatterWin).toBe(2 * 250);
    expect(result.triggers.freeSpins).toBe(10);
  });

  it('4 scatters → scatterWin = 10 × totalBet, freeSpins = 15', () => {
    const grid = gridWithScatters(4);
    const result = evaluate(grid, 10, 250);
    expect(result.scatterWin).toBe(10 * 250);
    expect(result.triggers.freeSpins).toBe(15);
  });

  it('5 scatters → scatterWin = 50 × totalBet, freeSpins = 25', () => {
    const grid = gridWithScatters(5);
    const result = evaluate(grid, 10, 250);
    expect(result.scatterWin).toBe(50 * 250);
    expect(result.triggers.freeSpins).toBe(25);
  });

  it('2 scatters → no scatter pay, no freeSpins trigger', () => {
    const grid = gridWithScatters(2);
    const result = evaluate(grid, 10, 250);
    expect(result.scatterWin).toBe(0);
    expect(result.triggers.freeSpins).toBeUndefined();
  });
});

describe('evaluate — line fixtures', () => {
  it('3-of-a-kind on line 0 (middle row) is isolated to that single payline', () => {
    const stopper = otherPaying('cherry');
    const grid = middleRowGrid(['cherry', 'cherry', 'cherry', stopper, stopper]);
    const result = evaluate(grid, 10, 250);
    expect(result.wins).toHaveLength(1);
    expect(result.wins[0]!.lineIndex).toBe(0);
    expect(result.wins[0]!.symbol).toBe('cherry');
    expect(result.wins[0]!.count).toBe(3);
  });

  it('5-of-a-kind pays only the 5-of-a-kind row — no double count of 3 or 4', () => {
    const grid = middleRowGrid(['cherry', 'cherry', 'cherry', 'cherry', 'cherry']);
    const result = evaluate(grid, 10, 250);
    const line0Wins = result.wins.filter((w) => w.lineIndex === 0);
    expect(line0Wins).toHaveLength(1);
    expect(line0Wins[0]!.count).toBe(5);
  });

  it('a line that starts with scatter at reel 0 does not pay', () => {
    // Middle row anchored by scatter: line 0 returns null. Row 0/bot are
    // bonus, so row-0/row-2 lines also fail. Result should have zero wins.
    const grid: SymbolGrid = [
      column(B, 'scatter', B),
      column(B, 'cherry', B),
      column(B, 'cherry', B),
      column(B, 'cherry', B),
      column(B, 'cherry', B),
    ];
    const result = evaluate(grid, 10, 250);
    expect(result.wins).toHaveLength(0);
  });

  it('a line that starts with bonus at reel 0 does not pay', () => {
    const grid: SymbolGrid = [
      column(B, B, B), // reel 0 middle = bonus
      column(B, 'cherry', B),
      column(B, 'cherry', B),
      column(B, 'cherry', B),
      column(B, 'cherry', B),
    ];
    const result = evaluate(grid, 10, 250);
    // line 0 anchor = bonus → skipped; bonus-filler prevents other lines too
    expect(result.wins).toHaveLength(0);
  });
});

describe('evaluate — triggers', () => {
  it('5 Gold Kanji on line 0 raises the fixedJackpot trigger (§7.1)', () => {
    const grid = middleRowGrid(['goldKanji', 'goldKanji', 'goldKanji', 'goldKanji', 'goldKanji']);
    const result = evaluate(grid, 10, 250);
    expect(result.triggers.fixedJackpot).toBe(true);
    expect(result.wins[0]!.credits).toBe(5000 * 10);
  });

  it('4 Gold Kanji does NOT raise the fixedJackpot trigger', () => {
    const stopper = otherPaying('goldKanji');
    const grid = middleRowGrid(['goldKanji', 'goldKanji', 'goldKanji', 'goldKanji', stopper]);
    const result = evaluate(grid, 10, 250);
    expect(result.triggers.fixedJackpot).toBeUndefined();
  });

  it('heist trigger requires bonus on reels 0 AND 2 AND 4 (§5.3)', () => {
    const other: SymbolId = 'cherry';
    const grid: SymbolGrid = [
      column(B, other, other), // reel 0 has bonus
      column(other, other, other), // reel 1 no bonus
      column(other, B, other), // reel 2 has bonus
      column(other, other, other), // reel 3 no bonus
      column(other, other, B), // reel 4 has bonus
    ];
    const result = evaluate(grid, 10, 250);
    expect(result.triggers.heist).toBe(true);
  });

  it('heist NOT triggered when bonus is missing from reel 4', () => {
    const other: SymbolId = 'cherry';
    const grid: SymbolGrid = [
      column(B, other, other),
      column(other, other, other),
      column(other, B, other),
      column(other, other, other),
      column(other, other, other), // reel 4 no bonus
    ];
    const result = evaluate(grid, 10, 250);
    expect(result.triggers.heist).toBeUndefined();
  });

  it('heist NOT triggered when bonus is only on reels 1 and 3', () => {
    const other: SymbolId = 'cherry';
    const grid: SymbolGrid = [
      column(other, other, other),
      column(B, other, other),
      column(other, other, other),
      column(other, B, other),
      column(other, other, other),
    ];
    const result = evaluate(grid, 10, 250);
    expect(result.triggers.heist).toBeUndefined();
  });

  it('wildRespin triggered by 2 wilds on the grid (§6.4)', () => {
    const stopper = otherPaying('cherry');
    const grid: SymbolGrid = [
      column(stopper, 'cherry', stopper),
      column(stopper, 'wild', stopper), // wild 1
      column(stopper, 'wild', stopper), // wild 2
      column(stopper, stopper, stopper),
      column(stopper, stopper, stopper),
    ];
    const result = evaluate(grid, 10, 250);
    expect(result.triggers.wildRespin).toBe(true);
  });

  it('wildRespin NOT triggered by a single wild', () => {
    const stopper = otherPaying('cherry');
    const grid: SymbolGrid = [
      column(stopper, 'cherry', stopper),
      column(stopper, 'wild', stopper),
      column(stopper, stopper, stopper),
      column(stopper, stopper, stopper),
      column(stopper, stopper, stopper),
    ];
    const result = evaluate(grid, 10, 250);
    expect(result.triggers.wildRespin).toBeUndefined();
  });

  it('freeSpins trigger thresholds map 3→10, 4→15, 5→25 (§6.1)', () => {
    const stopper = otherPaying('scatter');
    const gridN = (n: number): SymbolGrid => {
      const grid: SymbolId[][] = [
        [stopper, stopper, stopper],
        [stopper, stopper, stopper],
        [stopper, stopper, stopper],
        [stopper, stopper, stopper],
        [stopper, stopper, stopper],
      ];
      let placed = 0;
      outer: for (let r = 0; r < 5; r++) {
        for (let row = 0; row < 3 && placed < n; row++) {
          grid[r]![row] = 'scatter';
          placed++;
          if (placed === n) break outer;
        }
      }
      return grid.map((c) => [c[0]!, c[1]!, c[2]!]) as unknown as SymbolGrid;
    };
    expect(evaluate(gridN(3), 10, 250).triggers.freeSpins).toBe(10);
    expect(evaluate(gridN(4), 10, 250).triggers.freeSpins).toBe(15);
    expect(evaluate(gridN(5), 10, 250).triggers.freeSpins).toBe(25);
  });
});

describe('evaluate — totalWin composition', () => {
  it('totalWin = line wins + scatter win', () => {
    // Construct a grid that has both a line win AND 3+ scatters.
    // Middle row: cherry cherry cherry stopper stopper → cherry 3-of-a-kind.
    // Place 3 scatters on top row of reels 0, 1, 2.
    const stopper = otherPaying('cherry');
    const grid: SymbolGrid = [
      column('scatter', 'cherry', stopper),
      column('scatter', 'cherry', stopper),
      column('scatter', 'cherry', stopper),
      column(stopper, stopper, stopper),
      column(stopper, stopper, stopper),
    ];
    const result = evaluate(grid, 10, 250);
    const lineCredit = result.wins.reduce((s, w) => s + w.credits, 0);
    expect(lineCredit).toBeGreaterThan(0);
    expect(result.scatterWin).toBe(2 * 250);
    expect(result.totalWin).toBe(lineCredit + result.scatterWin);
  });
});
