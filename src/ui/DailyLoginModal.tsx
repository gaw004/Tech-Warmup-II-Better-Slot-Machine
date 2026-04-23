import { useCallback, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import type { DailyBonusReward, DailyBonusState, DailyBonusStore } from '../types/stores';

import { formatCredits } from './BottomBar';
import {
  DAILY_CYCLE_LENGTH,
  DAILY_REWARDS,
  formatTimeUntilNextClaim,
  rewardForDay,
} from './dailyBonusMock';

import styles from './DailyLoginModal.module.css';

// P21 — Daily login modal. Consumes P10's `DailyBonusStore` (stub mocked in
// `./dailyBonusMock.ts` until P10 lands). Renders the §14.1 seven-day cycle
// as a calendar strip with each day's reward, the current streak position,
// and a single CLAIM affordance that glows when `state.canClaim`.
//
// §14.1 "missing a day does not reset; picks up where you left off" — the
// component doesn't re-implement the eligibility rule; it trusts the store's
// `canClaim` flag.
//
// Modal by default: the root overlays the whole viewport on top of a scrim.
// Hosts that want to embed inline can pass `mode="inline"` to drop the scrim
// and the dismissal behavior.

export type DailyLoginMode = 'modal' | 'inline';

export interface DailyLoginModalProps {
  store: DailyBonusStore;
  onClose?: () => void;
  /** Notified after a successful claim so the host can credit the wallet. */
  onClaim?: (reward: DailyBonusReward) => void;
  mode?: DailyLoginMode;
  /** Clock injection for tests / storybook — defaults to `Date.now`. */
  now?: () => number;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function DailyLoginModal({
  store,
  onClose,
  onClaim,
  mode = 'modal',
  now = () => Date.now(),
  style,
  ariaLabel = 'Daily login bonus',
}: DailyLoginModalProps): JSX.Element {
  const state = useDailyBonusState(store);

  const handleClaim = useCallback(() => {
    const reward = store.claim();
    if (reward && onClaim) onClaim(reward);
  }, [store, onClaim]);

  const timeUntilNext =
    !state.canClaim && state.lastClaimTs !== null
      ? formatTimeUntilNextClaim(now())
      : null;

  const content = (
    <section
      className={`${styles.panel} ${mode === 'modal' ? styles.panelModal : ''}`.trim()}
      role="dialog"
      aria-modal={mode === 'modal'}
      aria-label={ariaLabel}
      style={style}
    >
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Daily Payload</h2>
          <p className={styles.subtitle}>
            Seven-day rotation · streak survives missed days · jackpot on day 7.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Dismiss daily bonus"
          >
            ×
          </button>
        )}
      </header>

      <ol className={styles.calendar} aria-label="Daily reward calendar">
        {Array.from({ length: DAILY_CYCLE_LENGTH }, (_, i) => i + 1).map((day) => (
          <DailyCell
            key={day}
            day={day}
            reward={DAILY_REWARDS[day]!}
            isCurrent={day === state.streakDay}
            isClaimableNow={day === state.streakDay && state.canClaim}
            isPast={day < state.streakDay}
          />
        ))}
      </ol>

      <div className={styles.footer}>
        <div className={styles.todayCard}>
          <span className={styles.todayLabel}>Day {state.streakDay} payload</span>
          <span className={styles.todayValue}>
            {formatCredits(state.todaysReward.cc)} CC
          </span>
          <span className={styles.todayExtras}>{summarizeExtras(state.todaysReward)}</span>
        </div>
        <button
          type="button"
          className={`${styles.claimButton} ${
            state.canClaim ? styles.claimButtonActive : ''
          }`.trim()}
          onClick={handleClaim}
          disabled={!state.canClaim}
          aria-live="polite"
        >
          {state.canClaim
            ? 'Claim payload'
            : timeUntilNext
              ? `Next in ${timeUntilNext}`
              : 'Already claimed'}
        </button>
      </div>
    </section>
  );

  if (mode === 'inline') return content;

  return (
    <div className={styles.root} role="presentation" onClick={onClose}>
      <div className={styles.stop} onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

/** Subscription hook mirroring P15 / P16's pattern. */
export function useDailyBonusState(store: DailyBonusStore): DailyBonusState {
  return useSyncExternalStore(
    useCallback((cb) => store.subscribe(cb), [store]),
    useCallback(() => store.getState(), [store]),
    useCallback(() => store.getState(), [store]),
  );
}

interface DailyCellProps {
  day: number;
  reward: DailyBonusReward;
  isCurrent: boolean;
  isClaimableNow: boolean;
  isPast: boolean;
}

function DailyCell({
  day,
  reward,
  isCurrent,
  isClaimableNow,
  isPast,
}: DailyCellProps): JSX.Element {
  return (
    <li
      className={[
        styles.cell,
        isCurrent ? styles.cellCurrent : '',
        isClaimableNow ? styles.cellClaimable : '',
        isPast ? styles.cellPast : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <span className={styles.cellDay}>Day {day}</span>
      <span className={styles.cellValue}>
        {formatCredits(reward.cc)}
        <span className={styles.cellUnit}>CC</span>
      </span>
      <span className={styles.cellBonus}>{summarizeExtras(reward) || ' '}</span>
    </li>
  );
}

/** One-line label for a reward's non-CC bonuses (free spins / heist entry). */
export function summarizeExtras(reward: DailyBonusReward): string {
  const parts: string[] = [];
  if (reward.freeSpins) parts.push(`${reward.freeSpins} free spins`);
  if (reward.heistEntry) parts.push('Heist entry');
  return parts.join(' · ');
}

/** Fallback export — also used by the same-day "preview" panel. */
export function previewRewardForDay(day: number): DailyBonusReward {
  return rewardForDay(day);
}
