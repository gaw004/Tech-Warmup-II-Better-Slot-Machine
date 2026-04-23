import type { Credits } from '../types/economy';
import type {
  DailyBonusReward,
  DailyBonusState,
  DailyBonusStore,
  Unsubscribe,
} from '../types/stores';

// P21 — interim mock for P10's `DailyBonusStore`. Lives in `src/ui/` because
// P10 has not landed yet (`src/pureLogic/dailyBonus.ts` does not exist in
// this branch); the mock mirrors the §14.1 seven-day reward schedule so the
// P21 screens can be demo'd and tested independently.
//
// Swap-in rule: when P10 lands, `src/ui/DailyLoginModal.tsx` already takes a
// `DailyBonusStore` — no call-site change is needed, only the factory used
// inside the demo harness.

/** §14.1 reward table, keyed by calendar day (1..7). */
export const DAILY_REWARDS: Record<number, DailyBonusReward> = {
  1: { day: 1, cc: 1_000 },
  2: { day: 2, cc: 2_000 },
  3: { day: 3, cc: 3_000, freeSpins: 5 },
  4: { day: 4, cc: 5_000 },
  5: { day: 5, cc: 7_500 },
  6: { day: 6, cc: 10_000, freeSpins: 10 },
  7: { day: 7, cc: 25_000, heistEntry: true },
};

export const DAILY_CYCLE_LENGTH = 7;

/** One calendar day in milliseconds — exported so tests can fast-forward. */
export const MS_PER_DAY = 24 * 60 * 60 * 1_000;

/**
 * Pure helper: which streak day should display given the previous claim
 * timestamp and previous streak position. Missing days do not reset (§14.1);
 * we simply re-show the next unclaimed slot.
 */
export function nextStreakDay(previousDay: number): number {
  if (!Number.isFinite(previousDay) || previousDay < 0) return 1;
  const normalized = Math.floor(previousDay);
  if (normalized >= DAILY_CYCLE_LENGTH) return 1;
  return Math.max(1, normalized + 1);
}

/** Returns the reward payload for a given day (1..7). */
export function rewardForDay(day: number): DailyBonusReward {
  const normalized = ((Math.floor(day) - 1 + DAILY_CYCLE_LENGTH) % DAILY_CYCLE_LENGTH) + 1;
  const reward = DAILY_REWARDS[normalized];
  if (!reward) throw new Error(`no reward defined for day ${day}`);
  return reward;
}

/**
 * Pure eligibility check: the player can claim again once a new calendar
 * day has elapsed since the last claim. `null` lastClaim → always claimable.
 */
export function canClaimAt(lastClaimTs: number | null, nowMs: number): boolean {
  if (lastClaimTs === null) return true;
  return new Date(nowMs).toDateString() !== new Date(lastClaimTs).toDateString();
}

/** Human-readable "next claim in HH:MM" string; used by the disabled state. */
export function formatTimeUntilNextClaim(nowMs: number): string {
  const nextMidnight = new Date(nowMs);
  nextMidnight.setHours(24, 0, 0, 0);
  const remainingMs = Math.max(0, nextMidnight.getTime() - nowMs);
  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export interface CreateMockDailyBonusStoreOptions {
  lastClaimTs?: number | null;
  streakDay?: number;
  now?: () => number;
}

/** Factory that returns an in-memory `DailyBonusStore` for demos / tests. */
export function createMockDailyBonusStore(
  options: CreateMockDailyBonusStoreOptions = {},
): DailyBonusStore & { advanceCalendarDay(): void; reset(): void } {
  const now = options.now ?? (() => Date.now());
  let lastClaimTs: number | null = options.lastClaimTs ?? null;
  let streakDay: number = options.streakDay ?? 1;
  const listeners = new Set<(s: DailyBonusState) => void>();

  function buildState(): DailyBonusState {
    const reward = rewardForDay(streakDay);
    return {
      lastClaimTs,
      streakDay,
      canClaim: canClaimAt(lastClaimTs, now()),
      todaysReward: reward,
    };
  }

  let snapshot = buildState();

  function emit(): void {
    snapshot = buildState();
    for (const listener of listeners) listener(snapshot);
  }

  function subscribe(cb: (s: DailyBonusState) => void): Unsubscribe {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }

  function getState(): DailyBonusState {
    // `useSyncExternalStore` invokes `getSnapshot` on every render and treats
    // a new reference as a state change — which would loop infinitely if we
    // rebuilt unconditionally. Rebuild, compare structurally, and keep the
    // previous reference when nothing materially changed.
    const fresh = buildState();
    if (areStatesEqual(snapshot, fresh)) return snapshot;
    snapshot = fresh;
    return snapshot;
  }

  function claim(): DailyBonusReward | null {
    if (!canClaimAt(lastClaimTs, now())) return null;
    const reward = rewardForDay(streakDay);
    lastClaimTs = now();
    streakDay = nextStreakDay(streakDay);
    emit();
    return reward;
  }

  function advanceCalendarDay(): void {
    if (lastClaimTs !== null) lastClaimTs -= MS_PER_DAY;
    emit();
  }

  function reset(): void {
    lastClaimTs = null;
    streakDay = 1;
    emit();
  }

  return { getState, subscribe, claim, advanceCalendarDay, reset };
}

/** Aggregate CC across the entire 7-day cycle — used by the demo strip. */
export function cycleTotalCc(): Credits {
  return Object.values(DAILY_REWARDS).reduce((sum, r) => sum + r.cc, 0);
}

function areRewardsEqual(a: DailyBonusReward, b: DailyBonusReward): boolean {
  return (
    a.day === b.day &&
    a.cc === b.cc &&
    a.freeSpins === b.freeSpins &&
    a.heistEntry === b.heistEntry
  );
}

function areStatesEqual(a: DailyBonusState, b: DailyBonusState): boolean {
  return (
    a.lastClaimTs === b.lastClaimTs &&
    a.streakDay === b.streakDay &&
    a.canClaim === b.canClaim &&
    areRewardsEqual(a.todaysReward, b.todaysReward)
  );
}
