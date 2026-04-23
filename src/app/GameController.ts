import { evaluate } from '../pureLogic/evaluate';
import { PAYLINES, type Payline } from '../pureLogic/paylines';
import { spinReels } from '../pureLogic/reels';
import type { Rng } from '../pureLogic/rng';
import { durations } from '../theme/tokens';
import type { Credits } from '../types/economy';
import type { LineWin, SymbolGrid } from '../types/spin';
import type { Unsubscribe, WalletStore } from '../types/stores';

// P23 — GameController orchestrates a single spin for the reduced-scope build
// (P00, P01, P02, P08, P14, P15, P16, P19, P21). No cascading, no bonus modes,
// no event bus — triggers from evaluate() are intentionally discarded because
// the chunks that consume them (P03–P07, P09–P13, P17–P22) are skipped.
//
// Spin order per the P23 brief:
//   1. 2-second cooldown check (inline; P11 is skipped).
//   2. wallet.deductStake(totalBet). On failure, emit an "Insufficient credits"
//      toast and abort the spin.
//   3. spinReels(rng) from P01 → grid.
//   4. evaluate(grid, lineBet, totalBet) from P02 → wins.
//   5. wallet.creditWin(totalWin) if totalWin > 0.
//   6. Push grid + winning cells to subscribers so P14's ReelGrid renders.
//   7. After reels land, surface P19's WinOverlay when totalWin > 0.

export interface WinningCell {
  reel: number;
  row: number;
}

export interface ControllerToast {
  id: number;
  message: string;
}

/** Default idle grid shown before the first spin. */
export const IDLE_GRID: SymbolGrid = [
  ['cherry', 'lime', 'watermelon'],
  ['bell', 'bar', 'horseshoe'],
  ['clover', 'diamond', 'neon7'],
  ['katana', 'cyberIris', 'chromeSkull'],
  ['goldKanji', 'wild', 'scatter'],
];

/** Minimum gap between the start of two spins (§12.2). */
export const SPIN_COOLDOWN_MS = 2_000;

/**
 * Rolling phase duration. Controller flips `isSpinning` false after this
 * elapses; ReelGrid then runs its staggered landing animation and fires
 * `onAnimationComplete` (which is wired to `notifyReelsLanded`). Sourced from
 * the shared tokens so the demo harness and the game loop stay in sync.
 */
export const SPIN_ROLL_DURATION_MS = durations.reelSpin;

/** Toast auto-dismiss duration, used by the App shell. */
export const TOAST_DURATION_MS = 3_000;

export interface GameControllerState {
  grid: SymbolGrid;
  isSpinning: boolean;
  winningCells: readonly WinningCell[];
  celebratedWin: Credits;
  celebratedTotalBet: Credits;
  showWinOverlay: boolean;
  cooldownUntil: number;
  toast: ControllerToast | null;
}

export interface GameController {
  getState(): GameControllerState;
  subscribe(listener: (state: GameControllerState) => void): Unsubscribe;
  spin(): void;
  notifyReelsLanded(): void;
  dismissWinOverlay(): void;
  dismissToast(): void;
  cooldownRemaining(nowMs?: number): number;
}

export interface GameControllerOptions {
  wallet: WalletStore;
  rng: Rng;
  now?: () => number;
}

export function createGameController(options: GameControllerOptions): GameController {
  const { wallet, rng } = options;
  const now = options.now ?? (() => Date.now());
  let toastCounter = 0;
  let pendingWin: { credits: Credits; totalBet: Credits } | null = null;

  let state: GameControllerState = {
    grid: IDLE_GRID,
    isSpinning: false,
    winningCells: [],
    celebratedWin: 0,
    celebratedTotalBet: 0,
    showWinOverlay: false,
    cooldownUntil: 0,
    toast: null,
  };

  const listeners = new Set<(s: GameControllerState) => void>();

  function emit(): void {
    for (const listener of listeners) listener(state);
  }

  function commit(partial: Partial<GameControllerState>): void {
    state = { ...state, ...partial };
    emit();
  }

  function cooldownRemaining(nowMs?: number): number {
    return Math.max(0, state.cooldownUntil - (nowMs ?? now()));
  }

  function spin(): void {
    if (state.isSpinning) return;
    const t = now();
    if (t < state.cooldownUntil) return;

    const { totalBet, lineBet } = wallet.getState();
    if (!wallet.deductStake(totalBet)) {
      toastCounter += 1;
      commit({ toast: { id: toastCounter, message: 'Insufficient credits' } });
      return;
    }

    const grid = spinReels(rng);
    const result = evaluate(grid, lineBet, totalBet);

    if (result.totalWin > 0) {
      wallet.creditWin(result.totalWin);
    }

    pendingWin = result.totalWin > 0 ? { credits: result.totalWin, totalBet } : null;

    commit({
      grid,
      isSpinning: true,
      winningCells: winningCellsFromWins(result.wins),
      showWinOverlay: false,
      cooldownUntil: t + SPIN_COOLDOWN_MS,
      toast: null,
    });

    // End of the rolling phase → flip `isSpinning` off so ReelGrid's useEffect
    // runs the staggered landing animation. Without this, reels roll forever
    // and `onAnimationComplete` never fires.
    setTimeout(() => {
      if (state.isSpinning) commit({ isSpinning: false });
    }, SPIN_ROLL_DURATION_MS);
  }

  function notifyReelsLanded(): void {
    // Fired by ReelGrid's `onAnimationComplete` after the staggered landing
    // finishes. At this point `isSpinning` has already been false for ~900ms
    // (flipped by the rolling timer). Mount the win overlay if we have one.
    const nextWin = pendingWin;
    if (!nextWin) return;
    pendingWin = null;
    commit({
      celebratedWin: nextWin.credits,
      celebratedTotalBet: nextWin.totalBet,
      showWinOverlay: true,
    });
  }

  function dismissWinOverlay(): void {
    if (!state.showWinOverlay) return;
    commit({ showWinOverlay: false });
  }

  function dismissToast(): void {
    if (!state.toast) return;
    commit({ toast: null });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    spin,
    notifyReelsLanded,
    dismissWinOverlay,
    dismissToast,
    cooldownRemaining,
  };
}

/**
 * Flattens a list of payline wins into the unique cell positions those lines
 * cover. Exported for tests so payline→cell mapping stays verifiable without
 * rendering the grid.
 */
export function winningCellsFromWins(wins: readonly LineWin[]): readonly WinningCell[] {
  const cells: WinningCell[] = [];
  const seen = new Set<string>();
  for (const win of wins) {
    const line = PAYLINES[win.lineIndex] as Payline | undefined;
    if (!line) continue;
    for (let reel = 0; reel < win.count; reel++) {
      const row = line[reel]!;
      const key = `${reel}:${row}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push({ reel, row });
    }
  }
  return cells;
}
