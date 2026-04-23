import type { BetLevel, Credits, PackId, SessionStats } from '../types/economy';
import type { Unsubscribe, WalletState, WalletStore } from '../types/stores';

// Framework-free wallet store for balance, bet, last win, and session-running
// stats. Implements `WalletStore` from P00's shared store interfaces so UI
// chunks (P14, P15) can bind against the interface and swap in this concrete
// implementation with no code changes.
//
// §9.1 — starting balance on first install is 10,000 CC; balance persists
// across app reloads.
// §9.2 — legal line bets are exactly [1, 2, 5, 10, 25, 50, 100]; total bet is
// always line bet × 25 (25 fixed paylines). Derived bounds: MIN_TOTAL_BET=25,
// MAX_TOTAL_BET=2500.
//
// sessionStats deliberately resets on every `createWallet` call: a "session"
// is an app open, and the UI renders net-change-this-session, not lifetime
// totals. The persisted fields are the durable-across-sessions ones (balance,
// line bet, last win).

export const BET_LEVELS: readonly BetLevel[] = [1, 2, 5, 10, 25, 50, 100];
export const PAYLINE_COUNT = 25;
export const MIN_TOTAL_BET: Credits = BET_LEVELS[0]! * PAYLINE_COUNT; // 25
export const MAX_TOTAL_BET: Credits = BET_LEVELS[BET_LEVELS.length - 1]! * PAYLINE_COUNT; // 2500
export const STARTING_BALANCE: Credits = 10_000;

// Pack CC values mirror §9.3. P17 owns the purchase UI and pricing presentation;
// P08 owns the effect on the balance. Keeping the CC table here makes
// `addPurchase(packId)` self-contained — the service layer passes only the id.
export const PACK_CREDITS: Record<PackId, Credits> = {
  starter: 10_000,
  small: 60_000,
  medium: 130_000,
  large: 300_000,
  mega: 850_000,
  whale: 2_000_000,
};

const STORAGE_KEY = 'dataheist.wallet.v1';

// Shape of the persisted-durable portion of wallet state. Session stats are
// excluded deliberately (see file header).
interface PersistedWallet {
  balance: Credits;
  lineBet: BetLevel;
  lastWin: Credits;
}

// Minimal subset of the Web Storage API we need. Tests inject an in-memory
// version; production uses `globalThis.localStorage`. The pureLogic layer
// forbids React/DOM imports, but a duck-typed Storage parameter is a plain
// interface — not a browser import — and is the blessed bridge for the
// persistence use case.
export interface WalletStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CreateWalletOptions {
  storage?: WalletStorage | null;
  now?: () => number;
}

export function createWallet(options: CreateWalletOptions = {}): WalletStore {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const now = options.now ?? (() => Date.now());

  const persisted = loadPersisted(storage);
  let state: WalletState = {
    balance: persisted?.balance ?? STARTING_BALANCE,
    lineBet: persisted?.lineBet ?? 1,
    totalBet: (persisted?.lineBet ?? 1) * PAYLINE_COUNT,
    lastWin: persisted?.lastWin ?? 0,
    sessionStats: freshSessionStats(now()),
  };

  const listeners = new Set<(s: WalletState) => void>();

  function emit(): void {
    for (const listener of listeners) listener(state);
  }

  function commit(next: WalletState): void {
    state = next;
    persist(storage, {
      balance: state.balance,
      lineBet: state.lineBet,
      lastWin: state.lastWin,
    });
    emit();
  }

  function setLineBet(level: BetLevel): void {
    if (!BET_LEVELS.includes(level)) {
      throw new Error(`Illegal bet level: ${level}. Must be one of ${BET_LEVELS.join(', ')}.`);
    }
    if (state.lineBet === level) return;
    commit({ ...state, lineBet: level, totalBet: level * PAYLINE_COUNT });
  }

  function maxBet(): void {
    setLineBet(BET_LEVELS[BET_LEVELS.length - 1]!);
  }

  function deductStake(totalBet: Credits): boolean {
    if (totalBet <= 0 || totalBet > state.balance) return false;
    commit({
      ...state,
      balance: state.balance - totalBet,
      sessionStats: {
        ...state.sessionStats,
        spins: state.sessionStats.spins + 1,
        wagered: state.sessionStats.wagered + totalBet,
        netChange: state.sessionStats.netChange - totalBet,
      },
    });
    return true;
  }

  function creditWin(amount: Credits): void {
    if (amount <= 0) {
      // A zero-win spin still updates lastWin so the UI can clear the readout.
      if (state.lastWin !== 0) commit({ ...state, lastWin: 0 });
      return;
    }
    commit({
      ...state,
      balance: state.balance + amount,
      lastWin: amount,
      sessionStats: {
        ...state.sessionStats,
        won: state.sessionStats.won + amount,
        netChange: state.sessionStats.netChange + amount,
      },
    });
  }

  function addPurchase(packId: PackId): void {
    const cc = PACK_CREDITS[packId];
    commit({ ...state, balance: state.balance + cc });
  }

  function getState(): WalletState {
    return state;
  }

  function subscribe(listener: (s: WalletState) => void): Unsubscribe {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { getState, subscribe, setLineBet, maxBet, deductStake, creditWin, addPurchase };
}

function freshSessionStats(startedAt: number): SessionStats {
  return { spins: 0, wagered: 0, won: 0, netChange: 0, startedAt };
}

function defaultStorage(): WalletStorage | null {
  const g = globalThis as { localStorage?: WalletStorage };
  return g.localStorage ?? null;
}

function loadPersisted(storage: WalletStorage | null): PersistedWallet | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedWallet>;
    if (
      typeof parsed.balance !== 'number' ||
      typeof parsed.lastWin !== 'number' ||
      !BET_LEVELS.includes(parsed.lineBet as BetLevel)
    ) {
      return null;
    }
    return {
      balance: Math.max(0, parsed.balance),
      lineBet: parsed.lineBet as BetLevel,
      lastWin: Math.max(0, parsed.lastWin),
    };
  } catch {
    return null;
  }
}

function persist(storage: WalletStorage | null, snapshot: PersistedWallet): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota exceeded, storage disabled, or private-mode Safari — swallow.
    // Persistence is best-effort; in-memory state remains authoritative for
    // the current session.
  }
}

// Test-only helper: build an in-memory storage that satisfies WalletStorage.
// Exported because several unit tests need to simulate a cross-session reload
// by handing the same backing map to two consecutive createWallet calls.
export function createMemoryStorage(initial?: Record<string, string>): WalletStorage {
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

export const __WALLET_STORAGE_KEY = STORAGE_KEY;
