import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import type { VipTier } from '../types/economy';
import type { VipState, VipStore } from '../types/stores';

import { formatCredits } from './BottomBar';
import {
  VIP_TIER_LABELS,
  VIP_TIER_ORDER,
  VIP_TIER_PERKS,
  VIP_TIER_THRESHOLDS,
  calculateVipProgress,
  type VipPerks,
} from './vipMock';

import styles from './VipScreen.module.css';

// P21 — VIP status screen. §14.4 asks for current-tier display, progress to
// the next tier, and perk copy per tier. All derivations go through pure
// helpers in `./vipMock.ts` so swapping in P09's real `VipStore` is a
// one-line change at the call site.
//
// Perks come from a `perksBy` prop so the Layer-1 `vip.ts` (P09) can own the
// canonical perks table once it lands; the default uses the mock's table.

export interface VipScreenProps {
  store: VipStore;
  /** Override the mock's perks table (P09 will own the real one). */
  perksBy?: Record<VipTier, VipPerks>;
  onClose?: () => void;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function VipScreen({
  store,
  perksBy = VIP_TIER_PERKS,
  onClose,
  style,
  ariaLabel = 'VIP status',
}: VipScreenProps): JSX.Element {
  const state = useVipState(store);
  const progress = useMemo(() => calculateVipProgress(state.lifetimeWager), [state.lifetimeWager]);

  return (
    <section className={styles.root} aria-label={ariaLabel} style={style}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Netrunner Status</h2>
          <p className={styles.subtitle}>
            Lifetime wager promotes you through five chrome ranks. Higher tiers unlock
            multipliers, pack bonuses, and exclusive reel themes.
          </p>
        </div>
        {onClose && (
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Return">
            Back
          </button>
        )}
      </header>

      <section className={styles.currentCard} aria-label="Current tier">
        <span className={styles.currentLabel}>Current tier</span>
        <span className={`${styles.currentTier} ${styles[`tier_${state.tier}`]}`}>
          {VIP_TIER_LABELS[state.tier]}
        </span>
        <span className={styles.currentWager}>
          {formatCredits(state.lifetimeWager)} CC lifetime wagered
        </span>
        <VipProgressBar progress={progress} />
      </section>

      <ol className={styles.ladder} aria-label="Tier ladder">
        {VIP_TIER_ORDER.map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            perks={perksBy[tier]}
            isCurrent={tier === state.tier}
            isAchieved={VIP_TIER_THRESHOLDS[tier] <= state.lifetimeWager}
          />
        ))}
      </ol>
    </section>
  );
}

export function useVipState(store: VipStore): VipState {
  return useSyncExternalStore(
    useCallback((cb) => store.subscribe(cb), [store]),
    useCallback(() => store.getState(), [store]),
    useCallback(() => store.getState(), [store]),
  );
}

interface VipProgressBarProps {
  progress: ReturnType<typeof calculateVipProgress>;
}

function VipProgressBar({ progress }: VipProgressBarProps): JSX.Element {
  const pct = Math.round(progress.progressToNext * 100);
  const hint =
    progress.next === null
      ? 'Apex tier — no further promotions available.'
      : `${formatCredits(progress.creditsToNext)} CC to ${VIP_TIER_LABELS[progress.next]}`;
  return (
    <div
      className={styles.progressWrap}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={hint}
    >
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${
            progress.next === null ? styles.progressFillMax : ''
          }`.trim()}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={styles.progressHint}>{hint}</div>
    </div>
  );
}

interface TierCardProps {
  tier: VipTier;
  perks: VipPerks;
  isCurrent: boolean;
  isAchieved: boolean;
}

function TierCard({ tier, perks, isCurrent, isAchieved }: TierCardProps): JSX.Element {
  return (
    <li
      className={[
        styles.tierCard,
        styles[`tierCard_${tier}`],
        isCurrent ? styles.tierCardCurrent : '',
        isAchieved ? styles.tierCardAchieved : styles.tierCardLocked,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className={styles.tierHead}>
        <span className={styles.tierName}>{VIP_TIER_LABELS[tier]}</span>
        <span className={styles.tierThreshold}>
          {formatCredits(VIP_TIER_THRESHOLDS[tier])} CC wagered
        </span>
      </header>
      <p className={styles.tierSummary}>{perks.summary}</p>
      <dl className={styles.perkGrid}>
        <div className={styles.perkCell}>
          <dt>Daily bonus</dt>
          <dd>{perks.dailyMultiplier}×</dd>
        </div>
        <div className={styles.perkCell}>
          <dt>Pack bonus</dt>
          <dd>+{perks.packBonusPct}%</dd>
        </div>
        <div className={styles.perkCell}>
          <dt>Reel themes</dt>
          <dd>{perks.themes.length}</dd>
        </div>
      </dl>
    </li>
  );
}
