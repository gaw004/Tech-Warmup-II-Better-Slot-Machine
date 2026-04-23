import type { Credits } from '../types/economy';
import type {
  Observable,
  ResponsiblePlayState,
  ResponsiblePlayStore,
  Unsubscribe,
} from '../types/stores';

// Responsible-play controls (§12.2). Separate from the auto-spin orchestrator
// because its concerns are cross-cutting: the player's bet, session loss, and
// playtime matter whether or not auto-spin is running.
//
// Scope of this module:
//   - Session-time reminders (15/30/60/120 min, or off).
//   - Daily play-time soft cap (30/60/120/240 min; emits once per day on hit).
//   - Daily spend soft cap (user-entered CC value; emits once per day on hit).
//   - High-bet confirmation prompt: bet > 500 CC AND session loss > 50,000 CC.
//     Emitted as `{ type: 'highBetConfirmRequest', bet }` on this module's
//     event bus. P23's GameController subscribes and forwards to the shared
//     `GameEvent` channel, then owns the modal + the confirm/cancel reply
//     path. P11 renders nothing.
//
// Persistence keys: only the user's chosen settings + today's counters.
// Session-scoped fields (sessionStartedAt, last-reminder-at) are rebuilt per
// app open.

export const HIGH_BET_THRESHOLD: Credits = 500;
export const HIGH_BET_SESSION_LOSS_THRESHOLD: Credits = 50_000;
export const VALID_REMINDER_INTERVALS_MIN = [15, 30, 60, 120] as const;
export const VALID_PLAYTIME_CAPS_MIN = [30, 60, 120, 240] as const;
export const DEFAULT_REMINDER_INTERVAL_MIN = 60;
export const DEFAULT_HIGH_BET_CONFIRM_ENABLED = true;

// Separate from P00's GameEvent because session reminders / cap hits are
// local to this module (the UI binds directly). Only `highBetConfirmRequest`
// is defined here with the same shape as in `src/types/events.ts`, and the
// GameController lifts it onto the shared GameEvent bus.
export type ResponsiblePlayEvent =
  | { type: 'highBetConfirmRequest'; bet: Credits }
  | { type: 'sessionTimeReminder'; elapsedMin: number }
  | { type: 'dailyPlaytimeCapReached'; capMin: number }
  | { type: 'dailySpendCapReached'; cap: Credits };

export interface ResponsiblePlayOrchestrator
  extends ResponsiblePlayStore,
    Observable<ResponsiblePlayState> {
  checkHighBet(bet: Credits, sessionLoss: Credits): boolean;
  tick(nowMs: number): void;
  canSpend(cc: Credits): boolean;
  onEvent(listener: (event: ResponsiblePlayEvent) => void): Unsubscribe;
}

export interface ResponsiblePlayStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CreateResponsiblePlayOptions {
  storage?: ResponsiblePlayStorage | null;
  now?: () => number;
}

interface PersistedState {
  reminderIntervalMin: number | null;
  dailyPlaytimeCapMin: number | null;
  dailySpendCap: Credits | null;
  highBetConfirmEnabled: boolean;
  dayAnchor: number;
  dailyPlaytimeMin: number;
  dailySpend: Credits;
  playtimeCapEmittedDay: number | null;
  spendCapEmittedDay: number | null;
}

const STORAGE_KEY = 'dataheist.responsiblePlay.v1';
const MS_PER_MIN = 60_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function createResponsiblePlay(
  options: CreateResponsiblePlayOptions = {},
): ResponsiblePlayOrchestrator {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const now = options.now ?? (() => Date.now());

  const persisted = loadPersisted(storage);
  const sessionStartedAt = now();
  const anchor = persisted?.dayAnchor ?? dayOf(sessionStartedAt);

  const inner: PersistedState & { sessionStartedAt: number; lastTickMs: number; lastReminderMs: number } = {
    reminderIntervalMin: persisted?.reminderIntervalMin ?? DEFAULT_REMINDER_INTERVAL_MIN,
    dailyPlaytimeCapMin: persisted?.dailyPlaytimeCapMin ?? null,
    dailySpendCap: persisted?.dailySpendCap ?? null,
    highBetConfirmEnabled: persisted?.highBetConfirmEnabled ?? DEFAULT_HIGH_BET_CONFIRM_ENABLED,
    dayAnchor: anchor,
    dailyPlaytimeMin: persisted?.dailyPlaytimeMin ?? 0,
    dailySpend: persisted?.dailySpend ?? 0,
    playtimeCapEmittedDay: persisted?.playtimeCapEmittedDay ?? null,
    spendCapEmittedDay: persisted?.spendCapEmittedDay ?? null,
    sessionStartedAt,
    lastTickMs: sessionStartedAt,
    lastReminderMs: sessionStartedAt,
  };

  const stateListeners = new Set<(s: ResponsiblePlayState) => void>();
  const eventListeners = new Set<(e: ResponsiblePlayEvent) => void>();

  function snapshot(): ResponsiblePlayState {
    return {
      sessionStartedAt: inner.sessionStartedAt,
      reminderIntervalMin: inner.reminderIntervalMin,
      dailyPlaytimeMin: inner.dailyPlaytimeMin,
      dailyPlaytimeCapMin: inner.dailyPlaytimeCapMin,
      dailySpend: inner.dailySpend,
      dailySpendCap: inner.dailySpendCap,
      highBetConfirmEnabled: inner.highBetConfirmEnabled,
    };
  }

  function emitState(): void {
    const s = snapshot();
    for (const l of stateListeners) l(s);
  }

  function emitEvent(event: ResponsiblePlayEvent): void {
    for (const l of eventListeners) l(event);
  }

  function persist(): void {
    if (!storage) return;
    try {
      const snap: PersistedState = {
        reminderIntervalMin: inner.reminderIntervalMin,
        dailyPlaytimeCapMin: inner.dailyPlaytimeCapMin,
        dailySpendCap: inner.dailySpendCap,
        highBetConfirmEnabled: inner.highBetConfirmEnabled,
        dayAnchor: inner.dayAnchor,
        dailyPlaytimeMin: inner.dailyPlaytimeMin,
        dailySpend: inner.dailySpend,
        playtimeCapEmittedDay: inner.playtimeCapEmittedDay,
        spendCapEmittedDay: inner.spendCapEmittedDay,
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch {
      // localStorage may be quota-exceeded, disabled, or private-mode Safari —
      // persistence is best-effort; in-memory state remains authoritative.
    }
  }

  function rolloverIfNewDay(nowMs: number): void {
    const today = dayOf(nowMs);
    if (today !== inner.dayAnchor) {
      inner.dayAnchor = today;
      inner.dailyPlaytimeMin = 0;
      inner.dailySpend = 0;
      inner.playtimeCapEmittedDay = null;
      inner.spendCapEmittedDay = null;
    }
  }

  function setReminderInterval(minutes: number | null): void {
    if (minutes !== null && !VALID_REMINDER_INTERVALS_MIN.includes(minutes as 15 | 30 | 60 | 120)) {
      throw new Error(
        `Illegal reminder interval: ${minutes}. Must be one of ${VALID_REMINDER_INTERVALS_MIN.join(
          ', ',
        )} or null.`,
      );
    }
    inner.reminderIntervalMin = minutes;
    inner.lastReminderMs = now();
    persist();
    emitState();
  }

  function setDailyPlaytimeCap(minutes: number | null): void {
    if (minutes !== null && !VALID_PLAYTIME_CAPS_MIN.includes(minutes as 30 | 60 | 120 | 240)) {
      throw new Error(
        `Illegal playtime cap: ${minutes}. Must be one of ${VALID_PLAYTIME_CAPS_MIN.join(
          ', ',
        )} or null.`,
      );
    }
    inner.dailyPlaytimeCapMin = minutes;
    persist();
    emitState();
  }

  function setDailySpendCap(cc: Credits | null): void {
    if (cc !== null && (!Number.isFinite(cc) || cc < 0)) {
      throw new Error(`Illegal daily spend cap: ${cc}. Must be a non-negative number or null.`);
    }
    inner.dailySpendCap = cc;
    persist();
    emitState();
  }

  function setHighBetConfirmEnabled(enabled: boolean): void {
    inner.highBetConfirmEnabled = enabled;
    persist();
    emitState();
  }

  function recordSpendDelta(cc: Credits): void {
    if (!Number.isFinite(cc)) return;
    rolloverIfNewDay(now());
    inner.dailySpend = Math.max(0, inner.dailySpend + cc);
    if (
      inner.dailySpendCap !== null &&
      inner.dailySpend >= inner.dailySpendCap &&
      inner.spendCapEmittedDay !== inner.dayAnchor
    ) {
      inner.spendCapEmittedDay = inner.dayAnchor;
      emitEvent({ type: 'dailySpendCapReached', cap: inner.dailySpendCap });
    }
    persist();
    emitState();
  }

  function tick(nowMs: number): void {
    rolloverIfNewDay(nowMs);
    const deltaMs = Math.max(0, nowMs - inner.lastTickMs);
    inner.lastTickMs = nowMs;
    inner.dailyPlaytimeMin += deltaMs / MS_PER_MIN;

    if (
      inner.reminderIntervalMin !== null &&
      nowMs - inner.lastReminderMs >= inner.reminderIntervalMin * MS_PER_MIN
    ) {
      const elapsedMin = Math.round((nowMs - inner.sessionStartedAt) / MS_PER_MIN);
      inner.lastReminderMs = nowMs;
      emitEvent({ type: 'sessionTimeReminder', elapsedMin });
    }

    if (
      inner.dailyPlaytimeCapMin !== null &&
      inner.dailyPlaytimeMin >= inner.dailyPlaytimeCapMin &&
      inner.playtimeCapEmittedDay !== inner.dayAnchor
    ) {
      inner.playtimeCapEmittedDay = inner.dayAnchor;
      emitEvent({ type: 'dailyPlaytimeCapReached', capMin: inner.dailyPlaytimeCapMin });
    }

    persist();
    emitState();
  }

  function canSpend(cc: Credits): boolean {
    if (inner.dailySpendCap === null) return true;
    rolloverIfNewDay(now());
    return inner.dailySpend + cc <= inner.dailySpendCap;
  }

  function checkHighBet(bet: Credits, sessionLoss: Credits): boolean {
    if (!inner.highBetConfirmEnabled) return false;
    if (bet <= HIGH_BET_THRESHOLD) return false;
    if (sessionLoss <= HIGH_BET_SESSION_LOSS_THRESHOLD) return false;
    emitEvent({ type: 'highBetConfirmRequest', bet });
    return true;
  }

  function getState(): ResponsiblePlayState {
    return snapshot();
  }

  function subscribe(listener: (s: ResponsiblePlayState) => void): Unsubscribe {
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }

  function onEvent(listener: (e: ResponsiblePlayEvent) => void): Unsubscribe {
    eventListeners.add(listener);
    return () => {
      eventListeners.delete(listener);
    };
  }

  return {
    getState,
    subscribe,
    onEvent,
    setReminderInterval,
    setDailyPlaytimeCap,
    setDailySpendCap,
    setHighBetConfirmEnabled,
    recordSpendDelta,
    checkHighBet,
    tick,
    canSpend,
  };
}

function dayOf(ms: number): number {
  return Math.floor(ms / MS_PER_DAY);
}

function defaultStorage(): ResponsiblePlayStorage | null {
  const g = globalThis as { localStorage?: ResponsiblePlayStorage };
  return g.localStorage ?? null;
}

function loadPersisted(storage: ResponsiblePlayStorage | null): PersistedState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (typeof parsed.highBetConfirmEnabled !== 'boolean') return null;
    return {
      reminderIntervalMin: coerceNullable(parsed.reminderIntervalMin),
      dailyPlaytimeCapMin: coerceNullable(parsed.dailyPlaytimeCapMin),
      dailySpendCap: coerceNullable(parsed.dailySpendCap),
      highBetConfirmEnabled: parsed.highBetConfirmEnabled,
      dayAnchor: typeof parsed.dayAnchor === 'number' ? parsed.dayAnchor : dayOf(Date.now()),
      dailyPlaytimeMin: Math.max(0, Number(parsed.dailyPlaytimeMin) || 0),
      dailySpend: Math.max(0, Number(parsed.dailySpend) || 0),
      playtimeCapEmittedDay: coerceNullable(parsed.playtimeCapEmittedDay),
      spendCapEmittedDay: coerceNullable(parsed.spendCapEmittedDay),
    };
  } catch {
    return null;
  }
}

function coerceNullable(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

// Test-only helper matching the pattern used in wallet.ts.
export function createMemoryStorage(initial?: Record<string, string>): ResponsiblePlayStorage {
  const map = new Map<string, string>(initial ? Object.entries(initial) : []);
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

export const __RESPONSIBLE_PLAY_STORAGE_KEY = STORAGE_KEY;
