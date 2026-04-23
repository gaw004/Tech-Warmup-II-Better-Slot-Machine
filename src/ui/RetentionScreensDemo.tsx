import { useCallback, useMemo, useState } from 'react';

import type { Credits } from '../types/economy';
import type { DailyBonusReward } from '../types/stores';

import { formatCredits } from './BottomBar';
import { Paytable } from './Paytable';
import { DailyLoginModal } from './DailyLoginModal';
import { AchievementsScreen } from './AchievementsScreen';
import { VipScreen } from './VipScreen';
import { createMockDailyBonusStore } from './dailyBonusMock';
import {
  ACHIEVEMENT_DEFINITIONS,
  createMockAchievementsStore,
} from './achievementsMock';
import {
  VIP_TIER_ORDER,
  VIP_TIER_THRESHOLDS,
  createMockVipStore,
} from './vipMock';

import styles from './RetentionScreensDemo.module.css';

// P21 acceptance harness — single-page demo that mounts all four screens
// (Paytable, DailyLoginModal, AchievementsScreen, VipScreen) against
// interface-typed mocks. Proves:
//   1. Each screen renders a representative state.
//   2. Claiming / advancing / wagering updates the state live via the
//      `Observable`-based store contracts from P00.
//   3. Navigating between screens (the tab row) does not tear down the
//      stores — balance, wager, and unlocked-achievement state persist.
//   4. The Paytable is non-modal: selecting "Paytable + reels" lays it next
//      to a placeholder reel panel so both are visible at once.

type TabId = 'paytable' | 'daily' | 'achievements' | 'vip';

interface TabDef {
  id: TabId;
  label: string;
  hint: string;
}

const TABS: readonly TabDef[] = [
  { id: 'paytable', label: 'Paytable', hint: '§10.3 · symbols, specials, 25 lines' },
  { id: 'daily', label: 'Daily Bonus', hint: '§14.1 · 7-day cycle, claim flow' },
  { id: 'achievements', label: 'Achievements', hint: '§14.3 · 30 entries, claimable bounty' },
  { id: 'vip', label: 'VIP Status', hint: '§14.4 · five tiers, promotion ladder' },
];

export function RetentionScreensDemo(): JSX.Element {
  const dailyStore = useMemo(
    () => createMockDailyBonusStore({ lastClaimTs: null, streakDay: 1 }),
    [],
  );
  const achievementsStore = useMemo(
    () =>
      createMockAchievementsStore({
        unlocked: ['firstLogin'],
        claimable: ['scriptKiddie', 'firstCascade', 'wildRespin'],
      }),
    [],
  );
  const vipStore = useMemo(() => createMockVipStore({ lifetimeWager: 120_000 }), []);

  const [activeTab, setActiveTab] = useState<TabId>('paytable');
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [ccBounty, setCcBounty] = useState<Credits>(0);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 10));
  }, []);

  const onClaimDaily = useCallback(
    (reward: DailyBonusReward) => {
      pushLog(
        `daily · claimed day ${reward.day} · +${formatCredits(reward.cc)} CC${
          reward.freeSpins ? ` · +${reward.freeSpins} free spins` : ''
        }${reward.heistEntry ? ' · Heist entry' : ''}`,
      );
      setCcBounty((v) => v + reward.cc);
    },
    [pushLog],
  );

  const onClaimAchievement = useCallback(
    (id: string, reward: Credits) => {
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
      pushLog(`achievement · ${def?.name ?? id} · +${formatCredits(reward)} CC`);
      setCcBounty((v) => v + reward);
    },
    [pushLog],
  );

  const bumpWager = useCallback(
    (amount: Credits) => {
      vipStore.addWager(amount);
      pushLog(`vip · +${formatCredits(amount)} wagered`);
    },
    [vipStore, pushLog],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Data Heist — Retention Screens Demo</h1>
        <p className={styles.subtitle}>
          P21 acceptance harness · navigates between the four §10.3 / §14 screens
          against interface-typed mocks. Hand-in balance persists across tabs so
          claimed rewards and bumped wagers stay visible.
        </p>
      </header>

      <nav className={styles.tabs} aria-label="Screens">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`.trim()}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            <span className={styles.tabHint}>{tab.hint}</span>
          </button>
        ))}
      </nav>

      <section className={styles.stage}>
        {activeTab === 'paytable' && (
          <>
            <div className={styles.stageControls}>
              <label className={styles.control}>
                <span>Highlight payline</span>
                <select
                  value={highlightedLine ?? ''}
                  onChange={(e) =>
                    setHighlightedLine(e.target.value === '' ? null : Number(e.target.value))
                  }
                >
                  <option value="">none</option>
                  {Array.from({ length: 25 }, (_, i) => (
                    <option key={i} value={i}>
                      Line {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.reelStandIn} aria-hidden="true">
                <span>Reel grid (placeholder)</span>
                <span>§10.3 says the paytable stays non-modal so reels remain visible.</span>
              </div>
            </div>
            <Paytable
              highlightedLineIndex={highlightedLine}
              onClose={() => pushLog('paytable · close requested')}
            />
          </>
        )}

        {activeTab === 'daily' && (
          <>
            <div className={styles.stageControls}>
              <button
                type="button"
                className={styles.utility}
                onClick={() => {
                  dailyStore.reset();
                  pushLog('daily · reset to day 1 · no previous claim');
                }}
              >
                Reset streak
              </button>
              <button
                type="button"
                className={styles.utility}
                onClick={() => {
                  dailyStore.advanceCalendarDay();
                  pushLog('daily · advanced clock one day');
                }}
              >
                Advance a day
              </button>
            </div>
            <DailyLoginModal
              store={dailyStore}
              mode="inline"
              onClaim={onClaimDaily}
              onClose={() => pushLog('daily · dismissed')}
            />
          </>
        )}

        {activeTab === 'achievements' && (
          <>
            <div className={styles.stageControls}>
              <button
                type="button"
                className={styles.utility}
                onClick={() => {
                  achievementsStore.markClaimable('dataRunner');
                  pushLog('achievements · Data Runner → claimable');
                }}
              >
                Unlock "Data Runner"
              </button>
              <button
                type="button"
                className={styles.utility}
                onClick={() => {
                  achievementsStore.markClaimable('chromeDome');
                  pushLog('achievements · Chrome Dome → claimable');
                }}
              >
                Unlock "Chrome Dome"
              </button>
              <button
                type="button"
                className={styles.utility}
                onClick={() => {
                  achievementsStore.resetSeed();
                  pushLog('achievements · reset to seed state');
                }}
              >
                Reset
              </button>
            </div>
            <AchievementsScreen
              store={achievementsStore}
              onClaim={onClaimAchievement}
              onClose={() => pushLog('achievements · dismissed')}
            />
          </>
        )}

        {activeTab === 'vip' && (
          <>
            <div className={styles.stageControls}>
              {[5_000, 50_000, 250_000, 1_000_000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={styles.utility}
                  onClick={() => bumpWager(amount)}
                >
                  +{formatCredits(amount)} wagered
                </button>
              ))}
              <button
                type="button"
                className={styles.utility}
                onClick={() => {
                  vipStore.setLifetimeWager(0);
                  pushLog('vip · wiped lifetime wager');
                }}
              >
                Reset
              </button>
            </div>
            <VipScreen
              store={vipStore}
              onClose={() => pushLog('vip · dismissed')}
            />
          </>
        )}
      </section>

      <section className={styles.sidebars}>
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Cross-screen state</h3>
          <dl className={styles.stateList}>
            <div>
              <dt>Credits claimed this session</dt>
              <dd>{formatCredits(ccBounty)} CC</dd>
            </div>
            <div>
              <dt>Thresholds</dt>
              <dd className={styles.thresholdList}>
                {VIP_TIER_ORDER.map((tier) => (
                  <span key={tier}>
                    {tier}: {formatCredits(VIP_TIER_THRESHOLDS[tier])}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Event log</h3>
          <pre className={styles.log}>
            {log.length === 0
              ? '(no events yet — try the controls above)'
              : log.join('\n')}
          </pre>
        </div>
      </section>
    </div>
  );
}
