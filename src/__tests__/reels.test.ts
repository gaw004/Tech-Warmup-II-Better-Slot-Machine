import { describe, it, expect } from 'vitest';

import { createRng, cryptoSeed } from '../pureLogic/rng';
import { REEL_STRIPS, spinReels } from '../pureLogic/reels';
import type { SymbolGrid } from '../types/spin';

// Minimal inline payline evaluator used ONLY for the hit-frequency smoke test.
// The real evaluator lives in P02; we duplicate a trimmed 25-line map here so
// the P01 strip weights can be validated without importing downstream code.
// Each entry is a [reel0..reel4] row index (0 top, 2 bottom).
const PAYLINES_25: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [0, 1, 2, 2, 1],
  [2, 1, 0, 0, 1],
  [1, 0, 2, 1, 0],
  [1, 2, 0, 1, 2],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
];

function countScatters(grid: SymbolGrid): number {
  let n = 0;
  for (const col of grid) for (const s of col) if (s === 'scatter') n++;
  return n;
}

function hasPaylineWin(grid: SymbolGrid): boolean {
  for (const line of PAYLINES_25) {
    const anchor = grid[0][line[0]];
    if (anchor === 'scatter' || anchor === 'bonus' || anchor === 'wild') continue;
    let count = 1;
    for (let r = 1; r < 5; r++) {
      const s = grid[r][line[r]];
      if (s === anchor || s === 'wild') count++;
      else break;
    }
    if (count >= 3) return true;
  }
  return false;
}

function isHit(grid: SymbolGrid): boolean {
  return hasPaylineWin(grid) || countScatters(grid) >= 3;
}

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('returns floats in [0, 1)', () => {
    const rng = createRng(12345);
    for (let i = 0; i < 10_000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('cryptoSeed returns an unsigned 32-bit integer', () => {
    const s = cryptoSeed();
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});

describe('reel strips', () => {
  it('all 5 strips are defined with non-empty length', () => {
    expect(REEL_STRIPS).toHaveLength(5);
    for (const strip of REEL_STRIPS) expect(strip.length).toBeGreaterThan(0);
  });

  it('reels 0 and 4 contain zero wilds (§5.1)', () => {
    expect(REEL_STRIPS[0].filter((s) => s === 'wild')).toHaveLength(0);
    expect(REEL_STRIPS[4].filter((s) => s === 'wild')).toHaveLength(0);
  });

  it('wild appears on reels 1, 2, and 3 (§5.1)', () => {
    expect(REEL_STRIPS[1].filter((s) => s === 'wild').length).toBeGreaterThan(0);
    expect(REEL_STRIPS[2].filter((s) => s === 'wild').length).toBeGreaterThan(0);
    expect(REEL_STRIPS[3].filter((s) => s === 'wild').length).toBeGreaterThan(0);
  });

  it('bonus appears only on reels 0, 2, and 4 (§5.3)', () => {
    expect(REEL_STRIPS[0].filter((s) => s === 'bonus').length).toBeGreaterThan(0);
    expect(REEL_STRIPS[2].filter((s) => s === 'bonus').length).toBeGreaterThan(0);
    expect(REEL_STRIPS[4].filter((s) => s === 'bonus').length).toBeGreaterThan(0);
    expect(REEL_STRIPS[1].filter((s) => s === 'bonus')).toHaveLength(0);
    expect(REEL_STRIPS[3].filter((s) => s === 'bonus')).toHaveLength(0);
  });

  it('scatter appears on every reel (scatter pays anywhere, §5.2)', () => {
    for (const strip of REEL_STRIPS) {
      expect(strip.filter((s) => s === 'scatter').length).toBeGreaterThan(0);
    }
  });

  it('every paying symbol appears on every reel so 5-of-a-kind is reachable', () => {
    const paying = [
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
    ] as const;
    for (let r = 0; r < 5; r++) {
      for (const sym of paying) {
        expect(REEL_STRIPS[r].includes(sym)).toBe(true);
      }
    }
  });
});

describe('spinReels', () => {
  it('returns a 5×3 grid', () => {
    const rng = createRng(7);
    const grid = spinReels(rng);
    expect(grid).toHaveLength(5);
    for (const col of grid) expect(col).toHaveLength(3);
  });

  it('is deterministic when fed a seeded RNG', () => {
    const gridA = spinReels(createRng(99));
    const gridB = spinReels(createRng(99));
    expect(gridA).toEqual(gridB);
  });

  it('reels 0 and 4 never produce a wild on the visible grid', () => {
    const rng = createRng(2024);
    for (let i = 0; i < 5_000; i++) {
      const grid = spinReels(rng);
      for (let row = 0; row < 3; row++) {
        expect(grid[0][row]).not.toBe('wild');
        expect(grid[4][row]).not.toBe('wild');
      }
    }
  });

  it('reels 1 and 3 never produce a bonus on the visible grid', () => {
    const rng = createRng(2025);
    for (let i = 0; i < 5_000; i++) {
      const grid = spinReels(rng);
      for (let row = 0; row < 3; row++) {
        expect(grid[1][row]).not.toBe('bonus');
        expect(grid[3][row]).not.toBe('bonus');
      }
    }
  });

  it('over 100k spins the hit frequency is within ±2% of the §8.1 target (28%)', () => {
    const rng = createRng(0xbadc0de);
    const trials = 100_000;
    let hits = 0;
    for (let i = 0; i < trials; i++) {
      if (isHit(spinReels(rng))) hits++;
    }
    const rate = hits / trials;
    expect(rate).toBeGreaterThanOrEqual(0.26);
    expect(rate).toBeLessThanOrEqual(0.3);
  });
});
