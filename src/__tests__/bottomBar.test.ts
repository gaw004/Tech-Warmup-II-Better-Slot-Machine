import { describe, it, expect } from 'vitest';

import {
  BET_LADDER,
  DEFAULT_AUTO_SPIN_PRESETS,
  PAYLINE_COUNT,
  canStep,
  formatCredits,
  nextLineBet,
} from '../ui/BottomBar';
import { createMemoryStorage, createWallet } from '../pureLogic/wallet';

// Pure-helper tests for P15. Rendering is covered by the demo page in dev and
// by Playwright in P24 — vitest stays in the `node` environment here so the
// module boundary matches the rest of the test suite.

describe('BottomBar: nextLineBet / canStep', () => {
  it('BET_LADDER matches the §9.2 bet ladder exactly', () => {
    expect(BET_LADDER).toEqual([1, 2, 5, 10, 25, 50, 100]);
    expect(PAYLINE_COUNT).toBe(25);
  });

  it('cycles forward through the full ladder and stops at 100', () => {
    const forward: number[] = [BET_LADDER[0]!];
    let level = BET_LADDER[0]!;
    for (let i = 0; i < BET_LADDER.length; i++) {
      const next = nextLineBet(level, 'up');
      if (next === null) break;
      forward.push(next);
      level = next;
    }
    expect(forward).toEqual([...BET_LADDER]);
    expect(nextLineBet(100, 'up')).toBeNull();
  });

  it('cycles backward through the full ladder and stops at 1', () => {
    const backward: number[] = [100];
    let level = 100 as (typeof BET_LADDER)[number];
    for (let i = 0; i < BET_LADDER.length; i++) {
      const prev = nextLineBet(level, 'down');
      if (prev === null) break;
      backward.push(prev);
      level = prev;
    }
    expect(backward).toEqual([...BET_LADDER].reverse());
    expect(nextLineBet(1, 'down')).toBeNull();
  });

  it('canStep gates the stepper buttons at the endpoints', () => {
    expect(canStep(1, 'down')).toBe(false);
    expect(canStep(1, 'up')).toBe(true);
    expect(canStep(100, 'down')).toBe(true);
    expect(canStep(100, 'up')).toBe(false);
    for (const mid of [2, 5, 10, 25, 50] as const) {
      expect(canStep(mid, 'down')).toBe(true);
      expect(canStep(mid, 'up')).toBe(true);
    }
  });
});

describe('BottomBar: formatCredits', () => {
  it('formats thousands with commas and rounds fractional credits', () => {
    expect(formatCredits(0)).toBe('0');
    expect(formatCredits(25)).toBe('25');
    expect(formatCredits(2_500)).toBe('2,500');
    expect(formatCredits(1_234_567)).toBe('1,234,567');
    expect(formatCredits(999.6)).toBe('1,000');
  });
});

describe('BottomBar: DEFAULT_AUTO_SPIN_PRESETS', () => {
  it('matches the §12.1 preset set', () => {
    expect(DEFAULT_AUTO_SPIN_PRESETS).toEqual([10, 25, 50, 100]);
  });
});

describe('BottomBar ↔ WalletStore: total-bet readout math', () => {
  it('total bet tracks line bet × 25 across the full ladder', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    for (const level of BET_LADDER) {
      wallet.setLineBet(level);
      const state = wallet.getState();
      expect(state.lineBet).toBe(level);
      expect(state.totalBet).toBe(level * PAYLINE_COUNT);
    }
  });

  it('max-bet snaps line bet to 100 and total bet to 2,500 in one action', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    wallet.setLineBet(1);
    wallet.maxBet();
    const state = wallet.getState();
    expect(state.lineBet).toBe(100);
    expect(state.totalBet).toBe(2_500);
  });

  it('emits to subscribers on bet / win changes so the bar re-renders', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    let emissions = 0;
    const unsub = wallet.subscribe(() => {
      emissions += 1;
    });
    wallet.setLineBet(5);
    wallet.creditWin(250);
    wallet.maxBet();
    unsub();
    wallet.creditWin(100); // after unsubscribe — must not count
    expect(emissions).toBe(3);
    expect(wallet.getState().lastWin).toBe(100);
  });
});
