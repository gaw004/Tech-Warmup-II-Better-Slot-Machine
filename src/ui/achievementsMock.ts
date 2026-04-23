import type { Credits } from '../types/economy';
import type {
  AchievementDefinition,
  AchievementsState,
  AchievementsStore,
  Unsubscribe,
} from '../types/stores';

// P21 — interim mock for P09's `AchievementsStore`. The real predicate
// wiring (spin counts, free-spin triggers, etc.) lives in P09; this mock
// exposes the 30-entry catalog and a minimal state container so the P21
// screen can render against the real interface.
//
// When P09 lands:
//   - The catalog below becomes the canonical list consumed by P09 (the
//     store itself is opinion-free about the catalog; it only tracks which
//     IDs are unlocked/claimable).
//   - The mock factory is retired; the demo harness imports
//     `createAchievementsStore` from P09 instead. `AchievementsScreen.tsx`
//     doesn't change.

/**
 * Thirty launch achievements per §14.3. IDs are stable; display copy and
 * reward values can be re-tuned without rewiring the predicate that unlocks
 * each one. The six examples from §14.3 appear first in declaration order so
 * they're easy to locate when cross-referencing the spec.
 */
export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  { id: 'scriptKiddie', name: 'Script Kiddie', description: 'Reach level 5.', rewardCc: 2_500 },
  { id: 'dataRunner', name: 'Data Runner', description: 'Trigger free spins 10 times.', rewardCc: 5_000 },
  { id: 'blackIce', name: 'Black ICE', description: 'Win 5 Heist mini-games.', rewardCc: 7_500 },
  { id: 'fullSend', name: 'Full Send', description: 'Bet max 100 times.', rewardCc: 5_000 },
  { id: 'chromeDome', name: 'Chrome Dome', description: 'Land 5 Chrome Skulls on one spin.', rewardCc: 10_000 },
  { id: 'corpoKiller', name: 'Corpo Killer', description: 'Hit the Mainframe progressive jackpot.', rewardCc: 50_000 },
  { id: 'firstLogin', name: 'Jack In', description: 'Confirm your first daily bonus.', rewardCc: 500 },
  { id: 'sevenDayStreak', name: 'Netrunner', description: 'Complete a seven-day login streak.', rewardCc: 10_000 },
  { id: 'firstCascade', name: 'Chain Exploit', description: 'Resolve a three-step cascade.', rewardCc: 2_000 },
  { id: 'fiveCascade', name: 'Buffer Overflow', description: 'Resolve a five-step cascade.', rewardCc: 10_000 },
  { id: 'wildRespin', name: 'Lockdown', description: 'Trigger a wild respin.', rewardCc: 1_500 },
  { id: 'threeWilds', name: 'Ghost Protocol', description: 'Land three wilds on one spin.', rewardCc: 3_000 },
  { id: 'firstJackpot', name: 'First Blood', description: 'Hit any progressive jackpot.', rewardCc: 10_000 },
  { id: 'allFourJackpots', name: 'Collector', description: 'Hit all four progressive jackpots.', rewardCc: 100_000 },
  { id: 'freeSpinsDeep', name: 'Deep Dive', description: 'Re-trigger free spins twice in one round.', rewardCc: 5_000 },
  { id: 'scatterCentric', name: 'Wavelength', description: 'Land 5 scatters on one spin.', rewardCc: 7_500 },
  { id: 'bigWin', name: 'Windfall', description: 'Land a 50× total-bet win.', rewardCc: 3_000 },
  { id: 'megaWin', name: 'Payday', description: 'Land a 250× total-bet win.', rewardCc: 10_000 },
  { id: 'epicWin', name: 'Exfil', description: 'Land a 1,000× total-bet win.', rewardCc: 25_000 },
  { id: 'perfectHeist', name: 'Clean Run', description: 'Clear a Heist with zero ICE reveals.', rewardCc: 10_000 },
  { id: 'iceSurvivor', name: 'Pain Tolerance', description: 'Take two ICE hits in one Heist and survive.', rewardCc: 2_500 },
  { id: 'spendless', name: 'Bootstrap', description: 'Reach Silver Jack without a purchase.', rewardCc: 5_000 },
  { id: 'nightShift', name: 'Night Shift', description: 'Spin 100 times between midnight and 6am local time.', rewardCc: 2_000 },
  { id: 'steadyHands', name: 'Steady Hands', description: 'Auto-spin 100 consecutively.', rewardCc: 2_000 },
  { id: 'walletWatcher', name: 'Wallet Watcher', description: 'Set a daily spend cap.', rewardCc: 1_500 },
  { id: 'sessionSelf', name: 'Self-Aware', description: 'Enable session reminders.', rewardCc: 1_000 },
  { id: 'thinAir', name: 'Thin Air', description: 'Win on a single-credit line bet.', rewardCc: 500 },
  { id: 'maxBetClub', name: 'Whale Watchers', description: 'Win at max bet ten times.', rewardCc: 5_000 },
  { id: 'volumeTrader', name: 'Volume Trader', description: 'Wager a lifetime total of 1,000,000 CC.', rewardCc: 25_000 },
  { id: 'completionist', name: 'Completionist', description: 'Unlock every other achievement.', rewardCc: 50_000 },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENT_DEFINITIONS.length;

/** Bucket used by the achievements screen. */
export type AchievementBucket = 'claimable' | 'unlocked' | 'locked';

export interface AchievementView {
  definition: AchievementDefinition;
  bucket: AchievementBucket;
}

/**
 * Pure sort: claimable → unlocked → locked. Inside each bucket, definitions
 * keep declaration order so the spec's examples stay together at the top.
 */
export function sortAchievements(
  definitions: readonly AchievementDefinition[],
  state: AchievementsState,
): AchievementView[] {
  const out: AchievementView[] = [];
  for (const def of definitions) {
    out.push({ definition: def, bucket: bucketFor(def.id, state) });
  }
  const rank: Record<AchievementBucket, number> = { claimable: 0, unlocked: 1, locked: 2 };
  return out.sort((a, b) => {
    const diff = rank[a.bucket] - rank[b.bucket];
    if (diff !== 0) return diff;
    return definitions.indexOf(a.definition) - definitions.indexOf(b.definition);
  });
}

export function bucketFor(id: string, state: AchievementsState): AchievementBucket {
  if (state.claimable.has(id)) return 'claimable';
  if (state.unlocked.has(id)) return 'unlocked';
  return 'locked';
}

/** Sum of CC the player is sitting on across every `claimable` achievement. */
export function totalClaimableCc(
  definitions: readonly AchievementDefinition[],
  state: AchievementsState,
): Credits {
  let total = 0;
  for (const def of definitions) {
    if (state.claimable.has(def.id)) total += def.rewardCc;
  }
  return total;
}

export interface CreateMockAchievementsStoreOptions {
  unlocked?: readonly string[];
  claimable?: readonly string[];
}

/** Factory returning an in-memory `AchievementsStore` for demos / tests. */
export function createMockAchievementsStore(
  options: CreateMockAchievementsStoreOptions = {},
): AchievementsStore & {
  addUnlocked(id: string): void;
  markClaimable(id: string): void;
  resetSeed(): void;
} {
  const seed: CreateMockAchievementsStoreOptions = {
    unlocked: options.unlocked ?? [],
    claimable: options.claimable ?? [],
  };
  let unlocked = new Set<string>(seed.unlocked);
  let claimable = new Set<string>(seed.claimable);
  const listeners = new Set<(s: AchievementsState) => void>();

  function getState(): AchievementsState {
    return { unlocked, claimable };
  }

  function emit(): void {
    const snapshot = getState();
    for (const listener of listeners) listener(snapshot);
  }

  function subscribe(cb: (s: AchievementsState) => void): Unsubscribe {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }

  function claimReward(id: string): Credits {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
    if (!def || !claimable.has(id)) return 0;
    claimable = new Set(claimable);
    claimable.delete(id);
    unlocked = new Set(unlocked);
    unlocked.add(id);
    emit();
    return def.rewardCc;
  }

  function addUnlocked(id: string): void {
    unlocked = new Set(unlocked);
    unlocked.add(id);
    claimable = new Set(claimable);
    claimable.add(id);
    emit();
  }

  function markClaimable(id: string): void {
    claimable = new Set(claimable);
    claimable.add(id);
    emit();
  }

  function resetSeed(): void {
    unlocked = new Set<string>(seed.unlocked);
    claimable = new Set<string>(seed.claimable);
    emit();
  }

  return { getState, subscribe, claimReward, addUnlocked, markClaimable, resetSeed };
}
