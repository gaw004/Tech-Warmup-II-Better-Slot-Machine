import { describe, expect, it } from 'vitest';

import { PAYLINES } from '../pureLogic/paylines';
import {
  PAYING_SYMBOL_IDS,
  SPECIAL_SYMBOL_IDS,
  diagramCellCenter,
  paylinePolylinePoints,
} from '../ui/Paytable';

// Pure-helper tests for the P21 Paytable screen. Rendering itself is covered
// by the demo harness and Playwright in P24; the diagram math and symbol
// partitions must stay correct regardless of CSS.

describe('paytable symbol partitions', () => {
  it('lists all 13 paying symbols in low→top order', () => {
    expect(PAYING_SYMBOL_IDS).toEqual([
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
    ]);
    expect(PAYING_SYMBOL_IDS).toHaveLength(13);
  });

  it('groups wild / scatter / bonus in the special partition', () => {
    expect(SPECIAL_SYMBOL_IDS).toEqual(['wild', 'scatter', 'bonus']);
  });

  it('paying and special partitions do not overlap', () => {
    const overlap = PAYING_SYMBOL_IDS.filter((id) => SPECIAL_SYMBOL_IDS.includes(id));
    expect(overlap).toEqual([]);
  });
});

describe('diagramCellCenter geometry', () => {
  it('reel 0 column x is consistent across rows', () => {
    const top = diagramCellCenter(0, 0);
    const mid = diagramCellCenter(0, 1);
    const bot = diagramCellCenter(0, 2);
    expect(top.x).toBe(mid.x);
    expect(mid.x).toBe(bot.x);
    expect(top.y).toBeLessThan(mid.y);
    expect(mid.y).toBeLessThan(bot.y);
  });

  it('row 1 y is consistent across reels', () => {
    const ys = Array.from({ length: 5 }, (_, r) => diagramCellCenter(r, 1).y);
    expect(new Set(ys).size).toBe(1);
  });

  it('reel spacing is monotonic left-to-right', () => {
    const xs = Array.from({ length: 5 }, (_, r) => diagramCellCenter(r, 0).x);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]! > xs[i - 1]!).toBe(true);
    }
  });
});

describe('paylinePolylinePoints', () => {
  it('emits 5 comma-separated points for every payline', () => {
    for (const line of PAYLINES) {
      const pts = paylinePolylinePoints(line).split(' ');
      expect(pts).toHaveLength(5);
      for (const p of pts) {
        expect(p).toMatch(/^[\d.]+,[\d.]+$/);
      }
    }
  });

  it('middle horizontal line has identical y across all reels', () => {
    const middle = PAYLINES[0]!;
    const coords = paylinePolylinePoints(middle)
      .split(' ')
      .map((p) => p.split(',').map(Number) as [number, number]);
    const ys = coords.map(([, y]) => y);
    expect(new Set(ys).size).toBe(1);
  });

  it('V-shape line (line 3) dips then rises symmetrically', () => {
    const v = PAYLINES[3]!;
    expect(v).toEqual([0, 1, 2, 1, 0]);
    const coords = paylinePolylinePoints(v)
      .split(' ')
      .map((p) => p.split(',').map(Number) as [number, number]);
    const ys = coords.map(([, y]) => y);
    expect(ys[0]).toBeLessThan(ys[2]!);
    expect(ys[4]).toBeLessThan(ys[2]!);
    expect(ys[0]).toBe(ys[4]);
  });
});
