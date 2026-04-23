import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import type { BetLevel, Credits } from '../types/economy';
import type { WalletState, WalletStore } from '../types/stores';

import styles from './BottomBar.module.css';

// P15 — bottom bar: bet controls (stepper + max), total-bet readout, last-win
// readout, and auto-spin entry point. Consumes P08's wallet via the
// `WalletStore` interface from P00 so the UI is interchangeable between the
// real pureLogic wallet and any typed mock.
//
// Layering: the bar is presentational. It reads wallet state via
// `useSyncExternalStore` and dispatches wallet actions through the interface;
// the actual spin/auto-spin orchestration lives in P23's GameController, which
// will own `onSpin` / `onAutoSpin` callbacks passed in as props.
//
// §10.2 UX constraints this component satisfies:
//  • Current bet always clearly displayed (total-bet readout, center).
//  • Bet adjustment is never more than one tap deep (stepper + max-bet live
//    directly in the bar — no nested menus).
//  • Balance is NOT rendered here; it lives in the top bar (P16). The bar
//    subscribes to the wallet so total-bet and last-win stay in sync with
//    whichever preset the top-bar displays.

/** Legal line-bet ladder, mirrors P08's `BET_LEVELS` (§9.2). */
export const BET_LADDER: readonly BetLevel[] = [1, 2, 5, 10, 25, 50, 100];
/** 25 fixed paylines (§3) — total bet is always `lineBet × PAYLINE_COUNT`. */
export const PAYLINE_COUNT = 25;
/** Default auto-spin presets surfaced by `AutoSpinButton` (§12.1). */
export const DEFAULT_AUTO_SPIN_PRESETS: readonly number[] = [10, 25, 50, 100];

const MAX_LINE_BET: BetLevel = BET_LADDER[BET_LADDER.length - 1]!;

export type StepDirection = 'up' | 'down';

/**
 * Pure cycle helper: returns the next bet level in `direction` from `current`,
 * or `null` if stepping further would leave the ladder. Exported for unit
 * tests so stepper boundary logic stays testable without a DOM.
 */
export function nextLineBet(current: BetLevel, direction: StepDirection): BetLevel | null {
  const idx = BET_LADDER.indexOf(current);
  if (idx < 0) return null;
  const nextIdx = direction === 'up' ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= BET_LADDER.length) return null;
  return BET_LADDER[nextIdx]!;
}

/** True when the stepper can move `direction` from `current`. */
export function canStep(current: BetLevel, direction: StepDirection): boolean {
  return nextLineBet(current, direction) !== null;
}

/** Credits formatter shared by the readouts. Keeps zero as "0" (not "0 CC"). */
export function formatCredits(n: Credits): string {
  return Math.round(n).toLocaleString('en-US');
}

export interface BottomBarProps {
  wallet: WalletStore;
  /** P23's spin trigger. Disabled while `isSpinning` is true or the bar is locked. */
  onSpin?: () => void;
  /** Called when the user picks an auto-spin preset. P23 wires this to P11. */
  onAutoSpin?: (spins: number) => void;
  /**
   * True while the reels are mid-roll. Disables the stepper, max-bet, and
   * auto-spin button — §10.2 forbids changing the bet mid-spin.
   */
  isSpinning?: boolean;
  /**
   * True while an auto-spin run is already in flight. Swaps `AutoSpinButton`
   * into a "Stop" affordance calling `onCancelAutoSpin`.
   */
  autoSpinRunning?: boolean;
  onCancelAutoSpin?: () => void;
  /** Override the default [10, 25, 50, 100] preset set. */
  autoSpinPresets?: readonly number[];
  style?: CSSProperties;
  ariaLabel?: string;
}

/**
 * Bottom-bar composite: bet stepper + total-bet readout + last-win readout +
 * max-bet + auto-spin. Subscribes to `wallet` and re-renders on any emission.
 */
export function BottomBar({
  wallet,
  onSpin,
  onAutoSpin,
  isSpinning = false,
  autoSpinRunning = false,
  onCancelAutoSpin,
  autoSpinPresets = DEFAULT_AUTO_SPIN_PRESETS,
  style,
  ariaLabel = 'Bet controls',
}: BottomBarProps): JSX.Element {
  const state = useWalletState(wallet);
  const locked = isSpinning || autoSpinRunning;

  const onStep = useCallback(
    (direction: StepDirection) => {
      const next = nextLineBet(state.lineBet, direction);
      if (next === null) return;
      wallet.setLineBet(next);
    },
    [wallet, state.lineBet],
  );

  const onMaxBet = useCallback(() => {
    wallet.maxBet();
  }, [wallet]);

  return (
    <section className={styles.bar} aria-label={ariaLabel} style={style}>
      <LineBetStepper lineBet={state.lineBet} onStep={onStep} disabled={locked} />
      <TotalBetReadout totalBet={state.totalBet} lineBet={state.lineBet} />
      <div className={styles.spinSlot}>
        {onSpin && (
          <button
            type="button"
            className={styles.spinInline}
            onClick={onSpin}
            disabled={locked}
            aria-label="Spin"
          >
            Spin
          </button>
        )}
      </div>
      <LastWinReadout lastWin={state.lastWin} />
      <MaxBetButton
        lineBet={state.lineBet}
        disabled={locked || state.lineBet === MAX_LINE_BET}
        onMaxBet={onMaxBet}
      />
      <AutoSpinButton
        presets={autoSpinPresets}
        running={autoSpinRunning}
        disabled={isSpinning}
        onPick={onAutoSpin}
        onCancel={onCancelAutoSpin}
      />
    </section>
  );
}

/**
 * Reusable subscription: returns the current wallet state and re-renders the
 * calling component whenever the wallet emits. Isolated so the rest of P15
 * (and later P16's top bar) can share the same hook without re-implementing
 * `useSyncExternalStore` boilerplate.
 */
export function useWalletState(wallet: WalletStore): WalletState {
  return useSyncExternalStore(
    useCallback((cb) => wallet.subscribe(cb), [wallet]),
    useCallback(() => wallet.getState(), [wallet]),
    useCallback(() => wallet.getState(), [wallet]),
  );
}

export interface LineBetStepperProps {
  lineBet: BetLevel;
  onStep: (direction: StepDirection) => void;
  disabled?: boolean;
}

/** − / + control cycling BET_LADDER; each end disables its own arrow. */
export function LineBetStepper({ lineBet, onStep, disabled }: LineBetStepperProps): JSX.Element {
  const canDown = !disabled && canStep(lineBet, 'down');
  const canUp = !disabled && canStep(lineBet, 'up');
  return (
    <div className={styles.stepper} role="group" aria-label="Line bet">
      <button
        type="button"
        className={styles.stepperButton}
        onClick={() => onStep('down')}
        disabled={!canDown}
        aria-label="Decrease line bet"
      >
        −
      </button>
      <div className={styles.stepperValue} aria-live="polite">
        <span className={styles.stepperLabel}>Line</span>
        <span className={styles.stepperAmount}>{formatCredits(lineBet)}</span>
      </div>
      <button
        type="button"
        className={styles.stepperButton}
        onClick={() => onStep('up')}
        disabled={!canUp}
        aria-label="Increase line bet"
      >
        +
      </button>
    </div>
  );
}

export interface TotalBetReadoutProps {
  totalBet: Credits;
  lineBet: BetLevel;
}

/** Shows the active total bet; derived from lineBet × 25 in the wallet. */
export function TotalBetReadout({ totalBet, lineBet }: TotalBetReadoutProps): JSX.Element {
  return (
    <div className={styles.readout} aria-label="Total bet">
      <span className={styles.readoutLabel}>Total Bet</span>
      <span className={styles.readoutValue}>
        {formatCredits(totalBet)}
        <span className={styles.readoutUnit}>CC</span>
      </span>
      <span className={styles.readoutNote}>
        {formatCredits(lineBet)} × {PAYLINE_COUNT} lines
      </span>
    </div>
  );
}

export interface LastWinReadoutProps {
  lastWin: Credits;
}

/** Last-win readout; politely announces updates so screen readers hear wins. */
export function LastWinReadout({ lastWin }: LastWinReadoutProps): JSX.Element {
  const pulsing = lastWin > 0;
  return (
    <div
      className={`${styles.readout} ${pulsing ? styles.readoutWin : ''}`.trim()}
      aria-live="polite"
      aria-label="Last win"
    >
      <span className={styles.readoutLabel}>Last Win</span>
      <span className={styles.readoutValue}>
        {formatCredits(lastWin)}
        <span className={styles.readoutUnit}>CC</span>
      </span>
    </div>
  );
}

export interface MaxBetButtonProps {
  lineBet: BetLevel;
  disabled?: boolean;
  onMaxBet: () => void;
}

/** One-tap jump to line bet 100 (= total bet 2,500), §9.2 maximum. */
export function MaxBetButton({ lineBet, disabled, onMaxBet }: MaxBetButtonProps): JSX.Element {
  const atMax = lineBet === MAX_LINE_BET;
  return (
    <button
      type="button"
      className={`${styles.maxBet} ${atMax ? styles.maxBetActive : ''}`.trim()}
      onClick={onMaxBet}
      disabled={disabled}
      aria-label={`Max bet (${MAX_LINE_BET * PAYLINE_COUNT} CC total)`}
      aria-pressed={atMax}
    >
      <span className={styles.maxBetLabel}>Max</span>
      <span className={styles.maxBetAmount}>
        {formatCredits(MAX_LINE_BET * PAYLINE_COUNT)} CC
      </span>
    </button>
  );
}

export interface AutoSpinButtonProps {
  presets: readonly number[];
  running: boolean;
  disabled?: boolean;
  onPick?: (spins: number) => void;
  onCancel?: () => void;
}

/**
 * Opens a preset popover ([10, 25, 50, 100] by default). When an auto-spin run
 * is already live, becomes a single-tap "Stop" button instead.
 */
export function AutoSpinButton({
  presets,
  running,
  disabled,
  onPick,
  onCancel,
}: AutoSpinButtonProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (running) {
    return (
      <button
        type="button"
        className={`${styles.autoSpin} ${styles.autoSpinStop}`}
        onClick={onCancel}
        disabled={disabled}
        aria-label="Stop auto-spin"
      >
        <span className={styles.autoSpinLabel}>Stop</span>
        <span className={styles.autoSpinHint}>Auto</span>
      </button>
    );
  }

  return (
    <div className={styles.autoSpinRoot} ref={rootRef}>
      <button
        type="button"
        className={styles.autoSpin}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Auto-spin presets"
      >
        <span className={styles.autoSpinLabel}>Auto</span>
        <span className={styles.autoSpinHint}>▾</span>
      </button>
      {open && (
        <ul className={styles.autoSpinMenu} role="menu">
          {presets.map((count) => (
            <li key={count} role="none">
              <button
                type="button"
                role="menuitem"
                className={styles.autoSpinMenuItem}
                onClick={() => {
                  setOpen(false);
                  onPick?.(count);
                }}
              >
                {count} spins
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Hook-friendly helper for parent components that want to mirror balance
 * changes for glow / toast effects. Returns `{ delta, key }` where `delta` is
 * the balance change since the last tick and `key` increments on every change
 * so downstream animations can remount.
 */
export function useBalanceDelta(wallet: WalletStore): { delta: Credits; key: number } {
  const state = useWalletState(wallet);
  const previous = useRef<Credits>(state.balance);
  const keyRef = useRef(0);
  const delta = useMemo(() => {
    const d = state.balance - previous.current;
    if (d !== 0) {
      previous.current = state.balance;
      keyRef.current += 1;
    }
    return d;
  }, [state.balance]);
  return { delta, key: keyRef.current };
}
