import { describe, it, expect } from 'vitest';

import {
  BET_LEVELS,
  MAX_TOTAL_BET,
  MIN_TOTAL_BET,
  PACK_CREDITS,
  PAYLINE_COUNT,
  STARTING_BALANCE,
  __WALLET_STORAGE_KEY,
  createMemoryStorage,
  createWallet,
} from '../pureLogic/wallet';
import type { WalletState } from '../types/stores';

describe('wallet constants (§9.1, §9.2)', () => {
  it('exposes the exact bet ladder [1, 2, 5, 10, 25, 50, 100]', () => {
    expect(BET_LEVELS).toEqual([1, 2, 5, 10, 25, 50, 100]);
  });

  it('total bet = line bet × 25 paylines, min 25, max 2500', () => {
    expect(PAYLINE_COUNT).toBe(25);
    expect(MIN_TOTAL_BET).toBe(25);
    expect(MAX_TOTAL_BET).toBe(2500);
  });

  it('STARTING_BALANCE is 10,000 CC on first install (§9.1)', () => {
    expect(STARTING_BALANCE).toBe(10_000);
  });
});

describe('wallet: initial state', () => {
  it('starts at 10,000 CC with line bet 1 (= total bet 25), last win 0', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const s = wallet.getState();
    expect(s.balance).toBe(10_000);
    expect(s.lineBet).toBe(1);
    expect(s.totalBet).toBe(25);
    expect(s.lastWin).toBe(0);
    expect(s.sessionStats.spins).toBe(0);
    expect(s.sessionStats.wagered).toBe(0);
    expect(s.sessionStats.won).toBe(0);
    expect(s.sessionStats.netChange).toBe(0);
  });

  it('uses injected `now` for sessionStats.startedAt', () => {
    const wallet = createWallet({
      storage: createMemoryStorage(),
      now: () => 1_234_567,
    });
    expect(wallet.getState().sessionStats.startedAt).toBe(1_234_567);
  });
});

describe('wallet: setLineBet cycles through every legal value', () => {
  it('setLineBet accepts each legal level and updates totalBet to level × 25', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    for (const level of BET_LEVELS) {
      wallet.setLineBet(level);
      const s = wallet.getState();
      expect(s.lineBet).toBe(level);
      expect(s.totalBet).toBe(level * 25);
    }
  });

  it('setLineBet rejects illegal values at runtime', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    // Cast: BetLevel is a TS literal union, but runtime drift can still feed
    // a bad value (e.g. via JSON.parse). The store must reject it loudly.
    expect(() => wallet.setLineBet(3 as never)).toThrow();
    expect(() => wallet.setLineBet(7 as never)).toThrow();
    expect(() => wallet.setLineBet(0 as never)).toThrow();
    expect(() => wallet.setLineBet(101 as never)).toThrow();
    // Unchanged after rejection.
    expect(wallet.getState().lineBet).toBe(1);
  });

  it('maxBet snaps line bet to 100 = total bet 2500', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    wallet.maxBet();
    const s = wallet.getState();
    expect(s.lineBet).toBe(100);
    expect(s.totalBet).toBe(2_500);
  });
});

describe('wallet: deductStake (atomic check, balance floor)', () => {
  it('subtracts total bet from balance on success and updates session stats', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const ok = wallet.deductStake(25);
    expect(ok).toBe(true);
    const s = wallet.getState();
    expect(s.balance).toBe(10_000 - 25);
    expect(s.sessionStats.spins).toBe(1);
    expect(s.sessionStats.wagered).toBe(25);
    expect(s.sessionStats.netChange).toBe(-25);
  });

  it('rejects when balance is insufficient and does not mutate state', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const snapshot = wallet.getState();
    const ok = wallet.deductStake(10_001);
    expect(ok).toBe(false);
    expect(wallet.getState()).toEqual(snapshot);
  });

  it('rejects zero and negative bets', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    expect(wallet.deductStake(0)).toBe(false);
    expect(wallet.deductStake(-10)).toBe(false);
    expect(wallet.getState().balance).toBe(10_000);
  });

  it('allows draining exactly to zero but not below', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    expect(wallet.deductStake(10_000)).toBe(true);
    expect(wallet.getState().balance).toBe(0);
    expect(wallet.deductStake(1)).toBe(false);
    expect(wallet.getState().balance).toBe(0);
  });
});

describe('wallet: creditWin', () => {
  it('adds credits, stores lastWin, bumps session won/netChange', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    wallet.deductStake(25);
    wallet.creditWin(100);
    const s = wallet.getState();
    expect(s.balance).toBe(10_000 - 25 + 100);
    expect(s.lastWin).toBe(100);
    expect(s.sessionStats.won).toBe(100);
    expect(s.sessionStats.netChange).toBe(-25 + 100);
  });

  it('creditWin(0) resets lastWin but does not affect balance or session won', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    wallet.creditWin(50);
    wallet.creditWin(0);
    const s = wallet.getState();
    expect(s.lastWin).toBe(0);
    expect(s.balance).toBe(10_000 + 50);
    expect(s.sessionStats.won).toBe(50);
  });
});

describe('wallet: addPurchase', () => {
  it('credits the pack CC value from §9.3', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    wallet.addPurchase('starter');
    expect(wallet.getState().balance).toBe(10_000 + PACK_CREDITS.starter);
  });

  it('covers every pack id in the table', () => {
    for (const pack of Object.keys(PACK_CREDITS) as (keyof typeof PACK_CREDITS)[]) {
      const wallet = createWallet({ storage: createMemoryStorage() });
      wallet.addPurchase(pack);
      expect(wallet.getState().balance).toBe(10_000 + PACK_CREDITS[pack]);
    }
  });
});

describe('wallet: subscribe emits on each action', () => {
  it('fires one event per mutation', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const calls: WalletState[] = [];
    const unsub = wallet.subscribe((s) => calls.push(s));
    wallet.setLineBet(5);
    wallet.deductStake(125);
    wallet.creditWin(50);
    expect(calls).toHaveLength(3);
    expect(calls[0]!.lineBet).toBe(5);
    expect(calls[1]!.balance).toBe(10_000 - 125);
    expect(calls[2]!.lastWin).toBe(50);
    unsub();
    wallet.setLineBet(10);
    expect(calls).toHaveLength(3); // unsubscribed
  });

  it('does not emit when setLineBet is called with the current value', () => {
    const wallet = createWallet({ storage: createMemoryStorage() });
    const calls: WalletState[] = [];
    wallet.subscribe((s) => calls.push(s));
    wallet.setLineBet(1); // already 1
    expect(calls).toHaveLength(0);
  });
});

describe('wallet: localStorage round-trip', () => {
  it('persists balance, lineBet, and lastWin across a simulated reload', () => {
    const storage = createMemoryStorage();
    const first = createWallet({ storage });
    first.setLineBet(10);
    first.deductStake(250);
    first.creditWin(1_000);

    const reloaded = createWallet({ storage });
    const s = reloaded.getState();
    expect(s.balance).toBe(10_000 - 250 + 1_000);
    expect(s.lineBet).toBe(10);
    expect(s.totalBet).toBe(250);
    expect(s.lastWin).toBe(1_000);
  });

  it('resets sessionStats on reload (session = one app open)', () => {
    const storage = createMemoryStorage();
    const first = createWallet({ storage, now: () => 1_000 });
    first.deductStake(25);
    first.creditWin(40);
    expect(first.getState().sessionStats.spins).toBe(1);

    const reloaded = createWallet({ storage, now: () => 2_000 });
    const s = reloaded.getState();
    expect(s.sessionStats.spins).toBe(0);
    expect(s.sessionStats.wagered).toBe(0);
    expect(s.sessionStats.won).toBe(0);
    expect(s.sessionStats.netChange).toBe(0);
    expect(s.sessionStats.startedAt).toBe(2_000);
  });

  it('falls back to starting balance if stored JSON is corrupt', () => {
    const storage = createMemoryStorage({ [__WALLET_STORAGE_KEY]: '{"not":"valid"' });
    const wallet = createWallet({ storage });
    expect(wallet.getState().balance).toBe(STARTING_BALANCE);
    expect(wallet.getState().lineBet).toBe(1);
  });

  it('ignores persisted state with an illegal bet level', () => {
    const storage = createMemoryStorage({
      [__WALLET_STORAGE_KEY]: JSON.stringify({ balance: 999, lineBet: 3, lastWin: 0 }),
    });
    const wallet = createWallet({ storage });
    expect(wallet.getState().lineBet).toBe(1);
    expect(wallet.getState().balance).toBe(STARTING_BALANCE);
  });

  it('works with storage === null (persistence disabled)', () => {
    const wallet = createWallet({ storage: null });
    wallet.deductStake(25);
    expect(wallet.getState().balance).toBe(9_975);
    // No throw when the second call attempts persistence.
    wallet.creditWin(10);
    expect(wallet.getState().balance).toBe(9_985);
  });
});
