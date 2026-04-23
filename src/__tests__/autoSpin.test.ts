import { describe, it, expect } from 'vitest';

import {
  AUTO_SPIN_PRESETS,
  MAX_AUTO_SPINS,
  MIN_AUTO_SPINS,
  MIN_SPIN_INTERVAL_MS,
  createAutoSpin,
  createFakeClock,
  type AutoSpinTick,
  type SpinFn,
} from '../pureLogic/autoSpin';
import { createMemoryStorage, createWallet } from '../pureLogic/wallet';
import type { SpinOutput, SpinTriggers, SymbolGrid } from '../types/spin';

const EMPTY_GRID: SymbolGrid = [
  ['cherry', 'cherry', 'cherry'],
  ['cherry', 'cherry', 'cherry'],
  ['cherry', 'cherry', 'cherry'],
  ['cherry', 'cherry', 'cherry'],
  ['cherry', 'cherry', 'cherry'],
];

function makeResult(partial: Partial<SpinOutput> = {}): SpinOutput {
  return {
    grid: EMPTY_GRID,
    wins: [],
    scatterWin: 0,
    totalWin: 0,
    triggers: {},
    ...partial,
  };
}

function constantSpin(result: SpinOutput = makeResult()): SpinFn {
  return () => result;
}

describe('autoSpin: constants (§12.1, §12.2)', () => {
  it('exposes the spec presets and interval floor', () => {
    expect(AUTO_SPIN_PRESETS).toEqual([10, 25, 50, 100]);
    expect(MIN_AUTO_SPINS).toBe(1);
    expect(MAX_AUTO_SPINS).toBe(100);
    expect(MIN_SPIN_INTERVAL_MS).toBe(2_000);
  });
});

describe('autoSpin: 10-spin run respects the 2s interval', () => {
  it('fires spin #1 synchronously; spins #2..#10 require 9 × 2s advances', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const clock = createFakeClock();
    const ticks: AutoSpinTick[] = [];
    const auto = createAutoSpin({ spin: constantSpin(), wallet, clock });
    auto.onTick((t) => ticks.push(t));

    const done = auto.start({ count: 10, totalBet: 25 });

    // First tick runs immediately on start.
    expect(ticks).toHaveLength(1);
    expect(ticks[0]!.index).toBe(1);
    expect(ticks[0]!.remaining).toBe(9);

    // Advancing by less than 2s must not trigger the next spin.
    clock.advance(1_999);
    expect(ticks).toHaveLength(1);

    // Finishing the first interval triggers spin #2.
    clock.advance(1);
    expect(ticks).toHaveLength(2);

    // Remaining 8 spins: advance 2s at a time.
    for (let i = 0; i < 8; i++) clock.advance(2_000);

    const reason = await done;
    expect(reason).toBe('completed');
    expect(ticks).toHaveLength(10);
    expect(ticks.map((t) => t.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(ticks[9]!.stop).toBe('completed');
    expect(auto.isRunning()).toBe(false);
  });

  it('deducts stake and credits wins through the wallet each spin', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const clock = createFakeClock();
    const auto = createAutoSpin({
      spin: constantSpin(makeResult({ totalWin: 10 })),
      wallet,
      clock,
    });

    const done = auto.start({ count: 3, totalBet: 25 });
    clock.advance(2_000);
    clock.advance(2_000);
    await done;

    // 3 × (-25 stake + 10 win) = -45 net change.
    const s = wallet.getState();
    expect(s.sessionStats.spins).toBe(3);
    expect(s.sessionStats.wagered).toBe(75);
    expect(s.sessionStats.won).toBe(30);
    expect(s.balance).toBe(10_000 - 75 + 30);
  });

  it('turbo flag does not change the 2s interval (§12.2)', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const clock = createFakeClock();
    const ticks: AutoSpinTick[] = [];
    const auto = createAutoSpin({ spin: constantSpin(), wallet, clock });
    auto.onTick((t) => ticks.push(t));

    const done = auto.start({ count: 3, totalBet: 25, turbo: true });
    clock.advance(1_999);
    expect(ticks).toHaveLength(1);
    clock.advance(1);
    expect(ticks).toHaveLength(2);
    clock.advance(2_000);
    await done;
    expect(ticks).toHaveLength(3);
  });
});

describe('autoSpin: stop conditions (§12.1)', () => {
  it('balance-below stop fires when balance drops under the threshold', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    // Starting 10,000. Each spin stakes 2,500 and wins 0. After 1 spin: 7,500.
    const clock = createFakeClock();
    const ticks: AutoSpinTick[] = [];
    const auto = createAutoSpin({ spin: constantSpin(), wallet, clock });
    auto.onTick((t) => ticks.push(t));

    const reason = await auto.start({
      count: 10,
      totalBet: 2_500,
      stopConditions: { balanceBelow: 8_000 },
    });
    expect(reason).toBe('balanceBelow');
    expect(ticks).toHaveLength(1);
    expect(ticks[0]!.stop).toBe('balanceBelow');
    expect(wallet.getState().balance).toBe(7_500);
  });

  it('single-win-above stop fires when a spin pays over the threshold', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const clock = createFakeClock();
    let spinNum = 0;
    const auto = createAutoSpin({
      spin: () => {
        spinNum += 1;
        return makeResult({ totalWin: spinNum === 2 ? 500 : 0 });
      },
      wallet,
      clock,
    });

    const done = auto.start({
      count: 5,
      totalBet: 25,
      stopConditions: { singleWinAbove: 100 },
    });
    clock.advance(2_000);
    const reason = await done;
    expect(reason).toBe('singleWinAbove');
    expect(spinNum).toBe(2);
  });

  it('any-bonus-trigger stop fires on free-spins, heist, wild-respin, or fixed jackpot', async () => {
    for (const triggers of [
      { freeSpins: 10 } satisfies SpinTriggers,
      { heist: true } satisfies SpinTriggers,
      { wildRespin: true } satisfies SpinTriggers,
      { fixedJackpot: true } satisfies SpinTriggers,
    ]) {
      const wallet = createWallet({ storage: createMemoryStorage() });
      const clock = createFakeClock();
      const auto = createAutoSpin({
        spin: constantSpin(makeResult({ triggers })),
        wallet,
        clock,
      });
      const reason = await auto.start({
        count: 5,
        totalBet: 25,
        stopConditions: { anyBonusTrigger: true },
      });
      expect(reason).toBe('anyBonusTrigger');
    }
  });

  it('total-loss-above stop is measured from the run start, not session start', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    // Pre-run losses should not count toward the auto-run's loss threshold.
    wallet.deductStake(5_000);
    const clock = createFakeClock();
    const auto = createAutoSpin({ spin: constantSpin(), wallet, clock });
    const done = auto.start({
      count: 10,
      totalBet: 1_000,
      stopConditions: { totalLossAbove: 2_500 },
    });
    clock.advance(2_000); // spin 2
    clock.advance(2_000); // spin 3 → loss this run reaches 3,000 → stops
    const reason = await done;
    expect(reason).toBe('totalLossAbove');
  });

  it('insufficient funds stops without emitting a tick past the failure', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const clock = createFakeClock();
    const ticks: AutoSpinTick[] = [];
    const auto = createAutoSpin({ spin: constantSpin(), wallet, clock });
    auto.onTick((t) => ticks.push(t));
    // 10,000 / 2,500 = 4 affordable spins.
    const done = auto.start({ count: 10, totalBet: 2_500 });
    for (let i = 0; i < 4; i++) clock.advance(2_000);
    const reason = await done;
    expect(reason).toBe('insufficientFunds');
    expect(ticks).toHaveLength(4);
  });
});

describe('autoSpin: cancel', () => {
  it('cancel() mid-run stops before the next scheduled spin', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const clock = createFakeClock();
    const ticks: AutoSpinTick[] = [];
    const auto = createAutoSpin({ spin: constantSpin(), wallet, clock });
    auto.onTick((t) => ticks.push(t));

    const done = auto.start({ count: 10, totalBet: 25 });
    expect(ticks).toHaveLength(1);
    auto.cancel();
    // Advance past an interval; no further tick should appear.
    clock.advance(10_000);
    const reason = await done;
    expect(reason).toBe('cancelled');
    expect(ticks).toHaveLength(1);
    expect(auto.isRunning()).toBe(false);
  });
});

describe('autoSpin: validation', () => {
  it('rejects out-of-range counts', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const auto = createAutoSpin({ spin: constantSpin(), wallet, clock: createFakeClock() });
    await expect(auto.start({ count: 0, totalBet: 25 })).rejects.toThrow();
    await expect(auto.start({ count: 101, totalBet: 25 })).rejects.toThrow();
    await expect(auto.start({ count: 5, totalBet: 0 })).rejects.toThrow();
  });

  it('rejects a second start() while already running', async () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const clock = createFakeClock();
    const auto = createAutoSpin({ spin: constantSpin(), wallet, clock });
    const first = auto.start({ count: 5, totalBet: 25 });
    await expect(auto.start({ count: 5, totalBet: 25 })).rejects.toThrow();
    auto.cancel();
    await first;
  });
});
