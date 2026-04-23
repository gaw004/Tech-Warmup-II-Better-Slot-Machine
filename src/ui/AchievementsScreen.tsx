import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import type { Credits } from '../types/economy';
import type {
  AchievementDefinition,
  AchievementsState,
  AchievementsStore,
} from '../types/stores';

import { formatCredits } from './BottomBar';
import {
  ACHIEVEMENT_DEFINITIONS as DEFAULT_DEFINITIONS,
  sortAchievements,
  totalClaimableCc,
  type AchievementBucket,
  type AchievementView,
} from './achievementsMock';

import styles from './AchievementsScreen.module.css';

// P21 — Achievements screen. §14.3 asks for ≥30 achievements; the canonical
// list lives in `./achievementsMock.ts` and is imported by default so hosts
// only need to hand in a store. Callers that want a trimmed list (e.g. a
// featured strip) can override `definitions`.
//
// The screen is pure presentation: bucket + sort are done by
// `sortAchievements`, the store decides unlocked/claimable membership, and
// `onClaim` fires a side-effecting `store.claimReward` on the user's tap.
// CC-crediting on claim is the host's responsibility (wired through
// `onClaim` — typically the host passes the returned amount to P08's
// `wallet.creditWin`).

export interface AchievementsScreenProps {
  store: AchievementsStore;
  /** Override the catalog; defaults to the 30-entry launch list. */
  definitions?: readonly AchievementDefinition[];
  /** Fires after `store.claimReward`; receives the CC amount the store paid. */
  onClaim?: (achievementId: string, reward: Credits) => void;
  onClose?: () => void;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function AchievementsScreen({
  store,
  definitions = DEFAULT_DEFINITIONS,
  onClaim,
  onClose,
  style,
  ariaLabel = 'Achievements',
}: AchievementsScreenProps): JSX.Element {
  const state = useAchievementsState(store);
  const rows = useMemo(() => sortAchievements(definitions, state), [definitions, state]);
  const counts = useMemo(() => bucketCounts(rows), [rows]);
  const bounty = useMemo(
    () => totalClaimableCc(definitions, state),
    [definitions, state],
  );

  const handleClaim = useCallback(
    (id: string) => {
      const reward = store.claimReward(id);
      if (reward > 0 && onClaim) onClaim(id, reward);
    },
    [store, onClaim],
  );

  return (
    <section className={styles.root} aria-label={ariaLabel} style={style}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Achievements</h2>
          <p className={styles.subtitle}>
            {counts.unlocked + counts.claimable}/{rows.length} unlocked ·{' '}
            {counts.claimable} waiting to claim · {formatCredits(bounty)} CC in bounty.
          </p>
        </div>
        {onClose && (
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Return">
            Back
          </button>
        )}
      </header>

      <dl className={styles.summary} aria-label="Achievement summary">
        <SummaryStat label="Claimable" value={counts.claimable} tone="claimable" />
        <SummaryStat label="Unlocked" value={counts.unlocked} tone="unlocked" />
        <SummaryStat label="Locked" value={counts.locked} tone="locked" />
      </dl>

      <ul className={styles.list} aria-label="Achievement list">
        {rows.map((row) => (
          <AchievementRow key={row.definition.id} view={row} onClaim={handleClaim} />
        ))}
      </ul>
    </section>
  );
}

/** Subscription hook for the achievements store. */
export function useAchievementsState(store: AchievementsStore): AchievementsState {
  return useSyncExternalStore(
    useCallback((cb) => store.subscribe(cb), [store]),
    useCallback(() => store.getState(), [store]),
    useCallback(() => store.getState(), [store]),
  );
}

/** Counts views per bucket. Exported for tests. */
export function bucketCounts(rows: readonly AchievementView[]): Record<AchievementBucket, number> {
  const out: Record<AchievementBucket, number> = { claimable: 0, unlocked: 0, locked: 0 };
  for (const row of rows) out[row.bucket] += 1;
  return out;
}

interface SummaryStatProps {
  label: string;
  value: number;
  tone: AchievementBucket;
}

function SummaryStat({ label, value, tone }: SummaryStatProps): JSX.Element {
  return (
    <div className={`${styles.stat} ${styles[`stat_${tone}`]}`}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>{value}</dd>
    </div>
  );
}

interface AchievementRowProps {
  view: AchievementView;
  onClaim: (id: string) => void;
}

function AchievementRow({ view, onClaim }: AchievementRowProps): JSX.Element {
  const { definition, bucket } = view;
  return (
    <li
      className={`${styles.row} ${styles[`row_${bucket}`]}`}
      data-bucket={bucket}
    >
      <div className={styles.rowMain}>
        <span className={styles.rowBadge} aria-hidden="true">
          {bucket === 'locked' ? '◌' : bucket === 'claimable' ? '◆' : '✓'}
        </span>
        <div className={styles.rowText}>
          <span className={styles.rowName}>{definition.name}</span>
          <span className={styles.rowDescription}>{definition.description}</span>
        </div>
      </div>
      <div className={styles.rowSide}>
        <span className={styles.rowReward}>
          {formatCredits(definition.rewardCc)}
          <span className={styles.rowRewardUnit}>CC</span>
        </span>
        {bucket === 'claimable' ? (
          <button
            type="button"
            className={styles.claimButton}
            onClick={() => onClaim(definition.id)}
          >
            Claim
          </button>
        ) : (
          <span className={styles.rowStatus}>
            {bucket === 'unlocked' ? 'Unlocked' : 'Locked'}
          </span>
        )}
      </div>
    </li>
  );
}
