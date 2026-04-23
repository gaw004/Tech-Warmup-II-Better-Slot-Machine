import type { Credits, VipTier } from '../types/economy';
import type { Unsubscribe, VipState, VipStore } from '../types/stores';

// P21 — interim mock for P09's `VipStore`. Holds the canonical tier ladder,
// threshold CCs, and per-tier perk copy used by the VIP screen. When P09
// lands, these constants stay here as UI-layer copy OR move into
// `src/pureLogic/vip.ts` if P09 needs them for its own promotion logic —
// either way, `VipScreen.tsx` pulls them through the `VipStore` interface
// and its optional `perksBy` prop, so the swap is localized.

/** Tier display order, lowest → highest (§14.4). */
export const VIP_TIER_ORDER: readonly VipTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'chromeJack',
];

/** Display labels with the in-theme "Jack" suffix (§14.4). */
export const VIP_TIER_LABELS: Record<VipTier, string> = {
  bronze: 'Bronze Jack',
  silver: 'Silver Jack',
  gold: 'Gold Jack',
  platinum: 'Platinum Jack',
  chromeJack: 'Chrome Jack',
};

/**
 * Lifetime-wager thresholds. Bronze starts at 0; every other tier requires
 * cumulative wagering to promote. Values are illustrative and will be tuned
 * in P09 alongside XP and daily-bonus multipliers.
 */
export const VIP_TIER_THRESHOLDS: Record<VipTier, Credits> = {
  bronze: 0,
  silver: 50_000,
  gold: 250_000,
  platinum: 1_000_000,
  chromeJack: 5_000_000,
};

export interface VipPerks {
  dailyMultiplier: number;
  packBonusPct: number;
  themes: readonly string[];
  summary: string;
}

/** Per-tier perks copy. Matches §14.4's four-bullet list of benefits. */
export const VIP_TIER_PERKS: Record<VipTier, VipPerks> = {
  bronze: {
    dailyMultiplier: 1,
    packBonusPct: 0,
    themes: ['Neon Night (default)'],
    summary: 'Starter tier — standard daily bonus, no pack uplift.',
  },
  silver: {
    dailyMultiplier: 1.25,
    packBonusPct: 5,
    themes: ['Neon Night', 'Silver Static'],
    summary: 'First promotion — 1.25× daily bonus and +5% on every purchase pack.',
  },
  gold: {
    dailyMultiplier: 1.5,
    packBonusPct: 10,
    themes: ['Neon Night', 'Silver Static', 'Gold Glitch'],
    summary: '1.5× daily · +10% packs · Gold Glitch reel theme unlocked.',
  },
  platinum: {
    dailyMultiplier: 2,
    packBonusPct: 15,
    themes: ['Neon Night', 'Silver Static', 'Gold Glitch', 'Platinum Protocol'],
    summary: '2× daily · +15% packs · Platinum Protocol theme · priority events.',
  },
  chromeJack: {
    dailyMultiplier: 3,
    packBonusPct: 25,
    themes: [
      'Neon Night',
      'Silver Static',
      'Gold Glitch',
      'Platinum Protocol',
      'Chrome Jack Supreme',
    ],
    summary: 'Apex — 3× daily · +25% packs · all themes · invitational events.',
  },
};

/** Pure helper: which tier applies at this lifetime wager. */
export function vipTierForLifetimeWager(wager: Credits): VipTier {
  let result: VipTier = 'bronze';
  for (const tier of VIP_TIER_ORDER) {
    if (wager >= VIP_TIER_THRESHOLDS[tier]) result = tier;
  }
  return result;
}

/** Returns the next tier above `tier`, or `null` if already at the top. */
export function nextVipTier(tier: VipTier): VipTier | null {
  const idx = VIP_TIER_ORDER.indexOf(tier);
  if (idx < 0 || idx >= VIP_TIER_ORDER.length - 1) return null;
  return VIP_TIER_ORDER[idx + 1]!;
}

export interface VipProgress {
  tier: VipTier;
  next: VipTier | null;
  lifetimeWager: Credits;
  /** `[0..1]` fraction of progress toward `next` (1 when at the cap). */
  progressToNext: number;
  /** CC still required to promote; `0` at the cap. */
  creditsToNext: Credits;
}

/** Pure progress calculator. Top tier returns `progressToNext = 1`. */
export function calculateVipProgress(wager: Credits): VipProgress {
  const tier = vipTierForLifetimeWager(wager);
  const next = nextVipTier(tier);
  if (next === null) {
    return {
      tier,
      next: null,
      lifetimeWager: wager,
      progressToNext: 1,
      creditsToNext: 0,
    };
  }
  const base = VIP_TIER_THRESHOLDS[tier];
  const target = VIP_TIER_THRESHOLDS[next];
  const span = Math.max(1, target - base);
  const progressed = Math.max(0, wager - base);
  const progressToNext = Math.min(1, progressed / span);
  return {
    tier,
    next,
    lifetimeWager: wager,
    progressToNext,
    creditsToNext: Math.max(0, target - wager),
  };
}

export interface CreateMockVipStoreOptions {
  lifetimeWager?: Credits;
}

/** Factory returning an in-memory `VipStore` for demos / tests. */
export function createMockVipStore(
  options: CreateMockVipStoreOptions = {},
): VipStore & { setLifetimeWager(amount: Credits): void } {
  let state: VipState = resolve(options.lifetimeWager ?? 0);
  const listeners = new Set<(s: VipState) => void>();

  function resolve(lifetimeWager: Credits): VipState {
    return { lifetimeWager, tier: vipTierForLifetimeWager(lifetimeWager) };
  }

  function emit(): void {
    for (const listener of listeners) listener(state);
  }

  function getState(): VipState {
    return state;
  }

  function subscribe(cb: (s: VipState) => void): Unsubscribe {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }

  function addWager(amount: Credits): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    state = resolve(state.lifetimeWager + amount);
    emit();
  }

  function setLifetimeWager(amount: Credits): void {
    state = resolve(Math.max(0, amount));
    emit();
  }

  return { getState, subscribe, addWager, setLifetimeWager };
}
