import type { Credits } from '../types/economy';
import type { JackpotSnapshot, JackpotTier } from '../types/bonus';
import type { JackpotCounter, Unsubscribe } from '../types/stores';

// P16 — interim mock implementation of P07's `JackpotCounter`. Lives in
// `src/ui/` because it is only needed by the top-bar demo until
// `src/pureLogic/jackpots.ts` (currently an empty `export {}`) is filled in.
// Programmed against the `JackpotCounter` interface from `src/types/stores.ts`
// so swapping in the real counter is a one-line import change at the call
// site — no component touches this file.
//
// §7.2 seeds are the starting pool values. §7.3 requires that "Mainframe
// counter ticks noticeably faster than Chip" so all four tiers feel alive
// during the 3-second ticker rotation; the default rates below are tuned for
// demo legibility rather than real economy weighting (that's P07's job).

/** §7.2 starting pool values. Same constant P07 will export from jackpots.ts. */
export const JACKPOT_SEEDS: Record<JackpotTier, Credits> = {
  chip: 1_000,
  disk: 10_000,
  vault: 100_000,
  mainframe: 1_000_000,
};

/** Rotation / display order used by the §10.1 ticker. */
export const TIER_ORDER: readonly JackpotTier[] = ['chip', 'disk', 'vault', 'mainframe'];

/**
 * Default tick rates in credits-per-millisecond. Strictly increasing from
 * Chip to Mainframe so the spec's "ticks at different observable rates"
 * acceptance is trivially satisfied. Real P07 will derive these from the
 * per-bet percentages in §7.2.
 */
export const DEFAULT_JACKPOT_RATES: Record<JackpotTier, number> = {
  chip: 0.5,
  disk: 2,
  vault: 8,
  mainframe: 32,
};

export interface CreateMockJackpotCounterOptions {
  /** Override any subset of the seed pools (tests, replay scenarios). */
  initial?: Partial<JackpotSnapshot>;
  /** Override any subset of the increment rates. */
  rates?: Partial<Record<JackpotTier, number>>;
  /** Clock source — defaults to `Date.now`. Injected in tests. */
  now?: () => number;
}

export function createMockJackpotCounter(
  options: CreateMockJackpotCounterOptions = {},
): JackpotCounter {
  const rates: Record<JackpotTier, number> = { ...DEFAULT_JACKPOT_RATES, ...options.rates };
  const now = options.now ?? (() => Date.now());

  let state: JackpotSnapshot = {
    chip: options.initial?.chip ?? JACKPOT_SEEDS.chip,
    disk: options.initial?.disk ?? JACKPOT_SEEDS.disk,
    vault: options.initial?.vault ?? JACKPOT_SEEDS.vault,
    mainframe: options.initial?.mainframe ?? JACKPOT_SEEDS.mainframe,
    updatedAt: options.initial?.updatedAt ?? now(),
  };

  const listeners = new Set<(s: JackpotSnapshot) => void>();

  function emit(): void {
    for (const listener of listeners) listener(state);
  }

  function tick(nowMs: number): JackpotSnapshot {
    const elapsed = nowMs - state.updatedAt;
    // Early-return the same reference on non-advancing ticks so
    // `useSyncExternalStore` treats it as a no-op and skips the re-render.
    if (elapsed <= 0) return state;
    state = {
      chip: state.chip + elapsed * rates.chip,
      disk: state.disk + elapsed * rates.disk,
      vault: state.vault + elapsed * rates.vault,
      mainframe: state.mainframe + elapsed * rates.mainframe,
      updatedAt: nowMs,
    };
    emit();
    return state;
  }

  function hit(tier: JackpotTier): Credits {
    const amount = state[tier];
    state = { ...state, [tier]: JACKPOT_SEEDS[tier] };
    emit();
    return amount;
  }

  function snapshot(): JackpotSnapshot {
    return state;
  }

  function getState(): JackpotSnapshot {
    return state;
  }

  function subscribe(listener: (s: JackpotSnapshot) => void): Unsubscribe {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { getState, subscribe, tick, hit, snapshot };
}
