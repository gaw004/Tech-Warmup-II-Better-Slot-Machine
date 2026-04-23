import { describe, expect, it } from 'vitest';

import {
  VIP_TIER_LABELS,
  VIP_TIER_ORDER,
  VIP_TIER_PERKS,
  VIP_TIER_THRESHOLDS,
  calculateVipProgress,
  createMockVipStore,
  nextVipTier,
  vipTierForLifetimeWager,
} from '../ui/vipMock';

// Pure-helper tests for the P21 VIP screen. §14.4 asks for five tiers named
// Bronze/Silver/Gold/Platinum/Chrome Jack; these helpers bucket lifetime
// wagering into the ladder and compute progress to the next rank.

describe('VIP tier metadata (§14.4)', () => {
  it('enumerates five tiers in ascending order', () => {
    expect(VIP_TIER_ORDER).toEqual(['bronze', 'silver', 'gold', 'platinum', 'chromeJack']);
  });

  it('labels each tier with the "Jack" suffix', () => {
    for (const tier of VIP_TIER_ORDER) {
      expect(VIP_TIER_LABELS[tier]).toMatch(/Jack$/);
    }
  });

  it('thresholds are monotonic non-decreasing', () => {
    const values = VIP_TIER_ORDER.map((t) => VIP_TIER_THRESHOLDS[t]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]! > values[i - 1]!).toBe(true);
    }
  });

  it('perks strictly improve with tier', () => {
    const order = VIP_TIER_ORDER;
    for (let i = 1; i < order.length; i++) {
      const prev = VIP_TIER_PERKS[order[i - 1]!];
      const curr = VIP_TIER_PERKS[order[i]!];
      expect(curr.dailyMultiplier).toBeGreaterThanOrEqual(prev.dailyMultiplier);
      expect(curr.packBonusPct).toBeGreaterThanOrEqual(prev.packBonusPct);
      expect(curr.themes.length).toBeGreaterThanOrEqual(prev.themes.length);
    }
  });
});

describe('vipTierForLifetimeWager', () => {
  it('returns bronze at 0 CC', () => {
    expect(vipTierForLifetimeWager(0)).toBe('bronze');
  });

  it('promotes at each threshold', () => {
    for (const tier of VIP_TIER_ORDER) {
      expect(vipTierForLifetimeWager(VIP_TIER_THRESHOLDS[tier])).toBe(tier);
    }
  });

  it('stays on the lower tier just before the threshold', () => {
    expect(vipTierForLifetimeWager(VIP_TIER_THRESHOLDS.silver - 1)).toBe('bronze');
    expect(vipTierForLifetimeWager(VIP_TIER_THRESHOLDS.gold - 1)).toBe('silver');
    expect(vipTierForLifetimeWager(VIP_TIER_THRESHOLDS.chromeJack - 1)).toBe('platinum');
  });

  it('tops out at chromeJack beyond the highest threshold', () => {
    expect(vipTierForLifetimeWager(VIP_TIER_THRESHOLDS.chromeJack * 10)).toBe('chromeJack');
  });
});

describe('nextVipTier', () => {
  it('returns the next tier up', () => {
    expect(nextVipTier('bronze')).toBe('silver');
    expect(nextVipTier('silver')).toBe('gold');
    expect(nextVipTier('gold')).toBe('platinum');
    expect(nextVipTier('platinum')).toBe('chromeJack');
  });

  it('returns null at the apex', () => {
    expect(nextVipTier('chromeJack')).toBeNull();
  });
});

describe('calculateVipProgress', () => {
  it('at tier floor, progress is 0', () => {
    const p = calculateVipProgress(VIP_TIER_THRESHOLDS.silver);
    expect(p.tier).toBe('silver');
    expect(p.progressToNext).toBe(0);
    expect(p.creditsToNext).toBe(VIP_TIER_THRESHOLDS.gold - VIP_TIER_THRESHOLDS.silver);
  });

  it('midway between two tiers, progress is ~0.5', () => {
    const mid =
      (VIP_TIER_THRESHOLDS.silver + VIP_TIER_THRESHOLDS.gold) / 2;
    const p = calculateVipProgress(mid);
    expect(p.tier).toBe('silver');
    expect(p.progressToNext).toBeCloseTo(0.5, 2);
    expect(p.next).toBe('gold');
  });

  it('at the apex, progress is 1 and creditsToNext is 0', () => {
    const p = calculateVipProgress(VIP_TIER_THRESHOLDS.chromeJack);
    expect(p.tier).toBe('chromeJack');
    expect(p.next).toBeNull();
    expect(p.progressToNext).toBe(1);
    expect(p.creditsToNext).toBe(0);
  });
});

describe('createMockVipStore', () => {
  it('initializes to the tier matching the seeded wager', () => {
    const store = createMockVipStore({ lifetimeWager: VIP_TIER_THRESHOLDS.gold });
    expect(store.getState().tier).toBe('gold');
  });

  it('addWager promotes the tier when crossing a threshold', () => {
    const store = createMockVipStore({ lifetimeWager: VIP_TIER_THRESHOLDS.silver - 1 });
    expect(store.getState().tier).toBe('bronze');
    store.addWager(1_000);
    expect(store.getState().tier).toBe('silver');
  });

  it('subscribers receive snapshots on wager change', () => {
    const store = createMockVipStore();
    const tiers: string[] = [];
    const unsub = store.subscribe((s) => tiers.push(s.tier));
    store.addWager(VIP_TIER_THRESHOLDS.silver);
    store.addWager(VIP_TIER_THRESHOLDS.gold - VIP_TIER_THRESHOLDS.silver);
    unsub();
    expect(tiers).toEqual(['silver', 'gold']);
  });

  it('ignores zero / negative / NaN wagers', () => {
    const store = createMockVipStore({ lifetimeWager: 1_000 });
    store.addWager(0);
    store.addWager(-5);
    store.addWager(Number.NaN);
    expect(store.getState().lifetimeWager).toBe(1_000);
  });
});
