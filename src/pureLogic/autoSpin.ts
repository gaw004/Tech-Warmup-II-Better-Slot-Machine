import type { Credits } from '../types/economy';
import type { SpinOutput } from '../types/spin';
import type { Unsubscribe, WalletStore } from '../types/stores';

// Auto-spin orchestrator (§12.1, §12.2). Framework-free: no React, no DOM, no
// real timers. Tests inject a fake clock.
//
// Flow per tick:
//   1. If cancelled, stop with 'cancelled'.
//   2. wallet.deductStake(totalBet); on false stop with 'insufficientFunds'.
//   3. Call the injected spin fn; its SpinOutput is credited via wallet.creditWin.
//   4. Emit the tick to onTick subscribers.
//   5. Check user stop conditions (balance below, single win above, any bonus
//      trigger, total loss above). If any matches, stop with that reason.
//   6. Otherwise, if spins remain, schedule the next tick exactly 2s later.
//
// The 2-second interval is the regulatory floor (§12.2) and is NOT
// user-adjustable. Turbo mode affects animation skipping only — it does not
// shorten this interval, so turbo is accepted here as a config flag but has
// no effect on timing inside this module.

export const MIN_SPIN_INTERVAL_MS = 2_000;
export const MIN_AUTO_SPINS = 1;
export const MAX_AUTO_SPINS = 100;
export const AUTO_SPIN_PRESETS = [10, 25, 50, 100] as const;

export interface AutoSpinStopConditions {
  balanceBelow?: Credits;
  singleWinAbove?: Credits;
  anyBonusTrigger?: boolean;
  totalLossAbove?: Credits;
}

export interface AutoSpinConfig {
  count: number;
  totalBet: Credits;
  stopConditions?: AutoSpinStopConditions;
  turbo?: boolean;
}

export type AutoSpinStopReason =
  | 'completed'
  | 'cancelled'
  | 'balanceBelow'
  | 'singleWinAbove'
  | 'anyBonusTrigger'
  | 'totalLossAbove'
  | 'insufficientFunds';

export interface AutoSpinTick {
  index: number;
  remaining: number;
  result: SpinOutput;
  stop?: AutoSpinStopReason;
}

export type SpinFn = (totalBet: Credits) => SpinOutput;

export type TimerHandle = unknown;

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

export interface CreateAutoSpinOptions {
  spin: SpinFn;
  wallet: WalletStore;
  clock?: Clock;
}

export interface AutoSpinController {
  start(config: AutoSpinConfig): Promise<AutoSpinStopReason>;
  cancel(): void;
  onTick(listener: (tick: AutoSpinTick) => void): Unsubscribe;
  isRunning(): boolean;
}

export function createAutoSpin(options: CreateAutoSpinOptions): AutoSpinController {
  const { spin, wallet } = options;
  const clock = options.clock ?? defaultClock();

  const listeners = new Set<(tick: AutoSpinTick) => void>();
  let running = false;
  let cancelled = false;
  let pendingHandle: TimerHandle | null = null;
  let finishCurrentRun: ((reason: AutoSpinStopReason) => void) | null = null;

  function onTick(listener: (tick: AutoSpinTick) => void): Unsubscribe {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function emit(tick: AutoSpinTick): void {
    for (const l of listeners) l(tick);
  }

  function cancel(): void {
    if (!running) return;
    cancelled = true;
    if (pendingHandle !== null) {
      clock.clearTimeout(pendingHandle);
      pendingHandle = null;
    }
    // Resolve the run's Promise synchronously so callers can `await` cancel
    // semantics without needing another scheduled tick to drain.
    if (finishCurrentRun) finishCurrentRun('cancelled');
  }

  function isRunning(): boolean {
    return running;
  }

  function start(config: AutoSpinConfig): Promise<AutoSpinStopReason> {
    if (running) {
      return Promise.reject(new Error('Auto-spin already running; cancel before starting a new run.'));
    }
    const count = Math.floor(config.count);
    if (!Number.isFinite(count) || count < MIN_AUTO_SPINS || count > MAX_AUTO_SPINS) {
      return Promise.reject(
        new Error(
          `Auto-spin count must be an integer in [${MIN_AUTO_SPINS}, ${MAX_AUTO_SPINS}]; got ${config.count}.`,
        ),
      );
    }
    if (!Number.isFinite(config.totalBet) || config.totalBet <= 0) {
      return Promise.reject(new Error(`Auto-spin totalBet must be positive; got ${config.totalBet}.`));
    }

    const stops = config.stopConditions ?? {};
    const sessionStartNet = wallet.getState().sessionStats.netChange;

    running = true;
    cancelled = false;
    let completed = 0;

    return new Promise<AutoSpinStopReason>((resolve) => {
      const finish = (reason: AutoSpinStopReason): void => {
        if (!running) return; // already finished — protects against re-entry from cancel()
        running = false;
        pendingHandle = null;
        finishCurrentRun = null;
        resolve(reason);
      };
      finishCurrentRun = finish;

      const runTick = (): void => {
        pendingHandle = null;
        if (cancelled) {
          finish('cancelled');
          return;
        }
        if (!wallet.deductStake(config.totalBet)) {
          finish('insufficientFunds');
          return;
        }

        const result = spin(config.totalBet);
        wallet.creditWin(result.totalWin);

        completed += 1;
        const remaining = count - completed;
        let reason = checkStop(stops, result, wallet, sessionStartNet);
        if (!reason && remaining <= 0) reason = 'completed';
        const tick: AutoSpinTick = { index: completed, remaining, result };
        if (reason) tick.stop = reason;
        emit(tick);

        if (reason) {
          finish(reason);
          return;
        }
        pendingHandle = clock.setTimeout(runTick, MIN_SPIN_INTERVAL_MS);
      };

      // First spin fires immediately; subsequent spins are delayed 2s each.
      runTick();
    });
  }

  return { start, cancel, onTick, isRunning };
}

function checkStop(
  stops: AutoSpinStopConditions,
  result: SpinOutput,
  wallet: WalletStore,
  sessionStartNet: Credits,
): AutoSpinStopReason | undefined {
  if (stops.anyBonusTrigger && hasBonusTrigger(result)) return 'anyBonusTrigger';
  if (stops.singleWinAbove !== undefined && result.totalWin > stops.singleWinAbove) {
    return 'singleWinAbove';
  }
  const s = wallet.getState();
  if (stops.balanceBelow !== undefined && s.balance < stops.balanceBelow) return 'balanceBelow';
  if (stops.totalLossAbove !== undefined) {
    const runLoss = sessionStartNet - s.sessionStats.netChange;
    if (runLoss >= stops.totalLossAbove) return 'totalLossAbove';
  }
  return undefined;
}

function hasBonusTrigger(result: SpinOutput): boolean {
  const t = result.triggers;
  return Boolean(
    (t.freeSpins !== undefined && t.freeSpins > 0) || t.heist || t.wildRespin || t.fixedJackpot,
  );
}

function defaultClock(): Clock {
  return {
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

// Test-only helper. An in-memory clock where time only advances when a test
// calls `advance`. All timers registered via `setTimeout` fire in scheduled
// order as `advance` sweeps through their due times.
export interface FakeClock extends Clock {
  advance(ms: number): void;
  pending(): number;
  currentTime(): number;
}

export function createFakeClock(startAt = 0): FakeClock {
  let current = startAt;
  let nextId = 1;
  const timers = new Map<number, { dueAt: number; fn: () => void }>();

  return {
    now: () => current,
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { dueAt: current + Math.max(0, ms), fn });
      return id;
    },
    clearTimeout: (handle) => {
      timers.delete(handle as number);
    },
    advance(ms: number): void {
      const target = current + ms;
      while (true) {
        let nextId: number | null = null;
        let nextAt = Infinity;
        for (const [id, t] of timers) {
          if (t.dueAt <= target && t.dueAt < nextAt) {
            nextAt = t.dueAt;
            nextId = id;
          }
        }
        if (nextId === null) break;
        const timer = timers.get(nextId)!;
        timers.delete(nextId);
        current = timer.dueAt;
        timer.fn();
      }
      current = target;
    },
    pending: () => timers.size,
    currentTime: () => current,
  };
}
