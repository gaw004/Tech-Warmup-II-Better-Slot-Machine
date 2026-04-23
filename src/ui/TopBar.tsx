import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import type { Credits } from '../types/economy';
import type { JackpotSnapshot, JackpotTier } from '../types/bonus';
import type { JackpotCounter, WalletStore } from '../types/stores';

import { formatCredits, useWalletState } from './BottomBar';

import styles from './TopBar.module.css';

// P16 — top bar: balance (left) · scrolling 4-tier jackpot ticker (center) ·
// menu button (right), per §10.1. Programmed purely against the `WalletStore`
// and `JackpotCounter` interfaces from P00's `src/types/stores.ts` — the demo
// feeds in the P08 wallet and the P16 mock `JackpotCounter`; P23 will swap in
// P07's real counter without touching this file.
//
// This component is purely presentational. It does NOT drive `counter.tick()`
// — that's the job of whoever owns the game loop (the demo harness below
// P07's real counter once it lands). The bar only subscribes via
// `useSyncExternalStore` and renders whatever the current snapshot says.

/** Rotation order of the ticker (§10.1 — chip → disk → vault → mainframe). */
export const TICKER_ORDER: readonly JackpotTier[] = ['chip', 'disk', 'vault', 'mainframe'];

/** Dwell time per tier on the ticker (§10.1 — 3-second rotation). */
export const TICKER_DWELL_MS = 3_000;

/** Display labels for each tier (§7.2 table). */
export const TIER_LABELS: Record<JackpotTier, string> = {
  chip: 'Chip',
  disk: 'Disk',
  vault: 'Vault',
  mainframe: 'Mainframe',
};

/**
 * Which tier the ticker should display at `nowMs`, given rotation started at
 * `startMs`. Pure so the rotation cadence stays testable without timers.
 */
export function activeTierAt(
  nowMs: number,
  startMs: number,
  dwellMs: number = TICKER_DWELL_MS,
  order: readonly JackpotTier[] = TICKER_ORDER,
): JackpotTier {
  const elapsed = Math.max(0, nowMs - startMs);
  const idx = Math.floor(elapsed / dwellMs) % order.length;
  return order[idx]!;
}

export interface TopBarProps {
  wallet: WalletStore;
  jackpots: JackpotCounter;
  /** Fired when the user taps the menu button. P22 wires this to its drawer. */
  onOpenMenu: () => void;
  /** Override ticker cadence (demo harness / E2E). */
  dwellMs?: number;
  /** Override tier order (rarely needed — mostly here for Storybook). */
  tierOrder?: readonly JackpotTier[];
  style?: CSSProperties;
  ariaLabel?: string;
}

/**
 * Top-bar composite. Subscribes to `wallet` and `jackpots` and rotates the
 * ticker tier every `dwellMs`.
 */
export function TopBar({
  wallet,
  jackpots,
  onOpenMenu,
  dwellMs = TICKER_DWELL_MS,
  tierOrder = TICKER_ORDER,
  style,
  ariaLabel = 'Game header',
}: TopBarProps): JSX.Element {
  const walletState = useWalletState(wallet);
  const snapshot = useJackpotSnapshot(jackpots);
  const tier = useRotatingTier(tierOrder, dwellMs);

  return (
    <header className={styles.bar} aria-label={ariaLabel} style={style}>
      <BalancePanel balance={walletState.balance} />
      <JackpotTicker tier={tier} value={snapshot[tier]} tierOrder={tierOrder} />
      <MenuButton onOpen={onOpenMenu} />
    </header>
  );
}

/** Subscription hook for the jackpot counter (mirrors P15's `useWalletState`). */
export function useJackpotSnapshot(counter: JackpotCounter): JackpotSnapshot {
  return useSyncExternalStore(
    useCallback((cb) => counter.subscribe(cb), [counter]),
    useCallback(() => counter.getState(), [counter]),
    useCallback(() => counter.getState(), [counter]),
  );
}

/**
 * Tracks the currently-displayed tier, rotating every `dwellMs`. Polls at
 * `dwellMs / 6` so visual rotation stays aligned with the pure `activeTierAt`
 * formula even if a render is skipped (tab backgrounding, long rAF frame).
 */
export function useRotatingTier(
  order: readonly JackpotTier[],
  dwellMs: number,
): JackpotTier {
  const startRef = useRef<number | null>(null);
  if (startRef.current === null) startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const [tier, setTier] = useState<JackpotTier>(order[0]!);

  useEffect(() => {
    let cancelled = false;
    const start = startRef.current ?? 0;
    const read = (): number =>
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    function advance(): void {
      if (cancelled) return;
      setTier(activeTierAt(read(), start, dwellMs, order));
    }
    advance();
    const intervalMs = Math.max(50, Math.floor(dwellMs / 6));
    const id = setInterval(advance, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [order, dwellMs]);

  return tier;
}

export interface BalancePanelProps {
  balance: Credits;
}

/** Balance readout (§10.1 left). §10.2 US #1: always visible. */
export function BalancePanel({ balance }: BalancePanelProps): JSX.Element {
  return (
    <div className={styles.balance} aria-label="Balance" aria-live="polite">
      <span className={styles.balanceLabel}>Balance</span>
      <span className={styles.balanceValue}>
        {formatCredits(balance)}
        <span className={styles.balanceUnit}>CC</span>
      </span>
    </div>
  );
}

export interface JackpotTickerProps {
  tier: JackpotTier;
  value: Credits;
  tierOrder?: readonly JackpotTier[];
}

/**
 * Jackpot ticker (§10.1 center). Shows the active tier's label and current
 * value; the value visibly counts up as the parent subscribes to `tick()`
 * updates from the counter.
 */
export function JackpotTicker({
  tier,
  value,
  tierOrder = TICKER_ORDER,
}: JackpotTickerProps): JSX.Element {
  return (
    <div className={styles.ticker} role="group" aria-label="Progressive jackpots">
      <span className={styles.tickerLabel} key={`${tier}-label`}>
        {TIER_LABELS[tier]} Jackpot
      </span>
      <span className={styles.tickerValue} key={`${tier}-value`} aria-live="polite">
        {formatCredits(value)}
        <span className={styles.tickerUnit}>CC</span>
      </span>
      <ul className={styles.tickerDots} aria-hidden="true">
        {tierOrder.map((t) => (
          <li
            key={t}
            className={`${styles.tickerDot} ${t === tier ? styles.tickerDotActive : ''}`.trim()}
          />
        ))}
      </ul>
    </div>
  );
}

export interface MenuButtonProps {
  onOpen: () => void;
  label?: string;
}

/** Menu button (§10.1 right). Hamburger glyph + label. */
export function MenuButton({ onOpen, label = 'Menu' }: MenuButtonProps): JSX.Element {
  return (
    <button type="button" className={styles.menu} onClick={onOpen} aria-label={`Open ${label.toLowerCase()}`}>
      <span className={styles.menuIcon} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className={styles.menuLabel}>{label}</span>
    </button>
  );
}
