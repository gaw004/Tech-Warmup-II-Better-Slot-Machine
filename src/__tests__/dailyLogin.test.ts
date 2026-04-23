import { describe, expect, it } from 'vitest';

import { summarizeExtras } from '../ui/DailyLoginModal';
import {
  DAILY_CYCLE_LENGTH,
  DAILY_REWARDS,
  MS_PER_DAY,
  canClaimAt,
  createMockDailyBonusStore,
  cycleTotalCc,
  formatTimeUntilNextClaim,
  nextStreakDay,
  rewardForDay,
} from '../ui/dailyBonusMock';

// Pure-helper tests for the P21 daily-login flow. Covers the §14.1 reward
// table, streak-advance rules, claim eligibility, and the subscription
// contract the modal uses via `useSyncExternalStore`.

describe('DAILY_REWARDS schedule (§14.1)', () => {
  it('covers a seven-day cycle', () => {
    expect(DAILY_CYCLE_LENGTH).toBe(7);
    expect(Object.keys(DAILY_REWARDS).map(Number).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('matches the §14.1 CC ladder exactly', () => {
    const cc = [1, 2, 3, 4, 5, 6, 7].map((d) => DAILY_REWARDS[d]!.cc);
    expect(cc).toEqual([1_000, 2_000, 3_000, 5_000, 7_500, 10_000, 25_000]);
  });

  it('adds free-spins on days 3 and 6, Heist entry on day 7', () => {
    expect(DAILY_REWARDS[3]!.freeSpins).toBe(5);
    expect(DAILY_REWARDS[6]!.freeSpins).toBe(10);
    expect(DAILY_REWARDS[7]!.heistEntry).toBe(true);
  });

  it('reports the total CC across one full cycle', () => {
    expect(cycleTotalCc()).toBe(53_500);
  });
});

describe('nextStreakDay / rewardForDay', () => {
  it('advances 1 → 2 → … → 7 → 1', () => {
    expect(nextStreakDay(1)).toBe(2);
    expect(nextStreakDay(6)).toBe(7);
    expect(nextStreakDay(7)).toBe(1);
  });

  it('clamps bad inputs to 1', () => {
    expect(nextStreakDay(-3)).toBe(1);
    expect(nextStreakDay(Number.NaN)).toBe(1);
    expect(nextStreakDay(99)).toBe(1);
  });

  it('rewardForDay wraps out-of-range days back into 1..7', () => {
    expect(rewardForDay(8).day).toBe(1);
    expect(rewardForDay(15).day).toBe(1);
    expect(rewardForDay(7).day).toBe(7);
  });
});

describe('canClaimAt eligibility', () => {
  it('null lastClaim is always claimable', () => {
    expect(canClaimAt(null, Date.now())).toBe(true);
  });

  it('same calendar day is not claimable', () => {
    const ts = new Date('2026-01-12T09:00:00').getTime();
    const later = new Date('2026-01-12T23:59:00').getTime();
    expect(canClaimAt(ts, later)).toBe(false);
  });

  it('next calendar day is claimable', () => {
    const ts = new Date('2026-01-12T09:00:00').getTime();
    const tomorrow = new Date('2026-01-13T00:05:00').getTime();
    expect(canClaimAt(ts, tomorrow)).toBe(true);
  });
});

describe('formatTimeUntilNextClaim', () => {
  it('counts down to local midnight in H/M form', () => {
    const now = new Date('2026-01-12T22:00:00').getTime();
    expect(formatTimeUntilNextClaim(now)).toMatch(/^\d+h \d{2}m$/);
  });
});

describe('createMockDailyBonusStore contract', () => {
  it('exposes canClaim=true initially and reports day 1 reward', () => {
    const store = createMockDailyBonusStore({ now: () => 0 });
    const state = store.getState();
    expect(state.canClaim).toBe(true);
    expect(state.streakDay).toBe(1);
    expect(state.todaysReward.cc).toBe(DAILY_REWARDS[1]!.cc);
  });

  it('claim() advances streak and flips canClaim off for the same day', () => {
    let ts = 1_700_000_000_000;
    const store = createMockDailyBonusStore({ now: () => ts });
    const reward = store.claim();
    expect(reward).not.toBeNull();
    expect(reward?.day).toBe(1);
    expect(store.getState().streakDay).toBe(2);
    expect(store.getState().canClaim).toBe(false);
    // Second call on the same day is a no-op.
    expect(store.claim()).toBeNull();
  });

  it('next calendar day re-enables the claim', () => {
    let ts = 1_700_000_000_000;
    const store = createMockDailyBonusStore({ now: () => ts });
    store.claim();
    ts += MS_PER_DAY;
    expect(store.getState().canClaim).toBe(true);
    const second = store.claim();
    expect(second?.day).toBe(2);
  });

  it('subscribe receives snapshots on claim', () => {
    let ts = 1_700_000_000_000;
    const store = createMockDailyBonusStore({ now: () => ts });
    const snapshots: number[] = [];
    const unsub = store.subscribe((s) => snapshots.push(s.streakDay));
    store.claim();
    ts += MS_PER_DAY;
    store.claim();
    unsub();
    expect(snapshots).toEqual([2, 3]);
  });
});

describe('summarizeExtras', () => {
  it('formats free spins + heist entry', () => {
    expect(summarizeExtras(DAILY_REWARDS[3]!)).toBe('5 free spins');
    expect(summarizeExtras(DAILY_REWARDS[7]!)).toBe('Heist entry');
    expect(summarizeExtras(DAILY_REWARDS[1]!)).toBe('');
  });
});
