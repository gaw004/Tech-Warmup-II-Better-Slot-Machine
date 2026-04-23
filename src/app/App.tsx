import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { createRng } from '../pureLogic/rng';

import type { JackpotSnapshot } from '../types/bonus';
import type {
  AchievementDefinition,
  AchievementsState,
  AchievementsStore,
  JackpotCounter,
  WalletStore,
} from '../types/stores';

import { AchievementsScreen } from '../ui/AchievementsScreen';
import { BottomBar } from '../ui/BottomBar';
import { DailyLoginModal } from '../ui/DailyLoginModal';
import { Paytable } from '../ui/Paytable';
import { ReelGrid } from '../ui/ReelGrid';
import { SpinButton } from '../ui/SpinButton';
import { TopBar } from '../ui/TopBar';
import { VipScreen } from '../ui/VipScreen';
import { WinOverlay } from '../ui/WinOverlay';
import { createMockAudioManager } from '../ui/audioManagerMock';
import { createMockDailyBonusStore } from '../ui/dailyBonusMock';
import { createMockVipStore } from '../ui/vipMock';

import {
  createGameController,
  type GameController,
  type GameControllerState,
  TOAST_DURATION_MS,
} from './GameController';

import styles from './App.module.css';

// P23 — top-level shell for the reduced-scope build (P00, P01, P02, P08, P14,
// P15, P16, P19, P21). Wallet is hydrated in main.tsx and passed in as a prop
// so the React tree sees a fully-populated store from its first render (P23
// boot order). Everything else (RNG, controller, static jackpot/daily/ach/vip
// stores, silent audio mock) is instantiated once via useMemo.
//
// Skipped in this scope: onboarding, age gate, cascading, free spins, wild
// respin, heist, real jackpots, progression/VIP/achievements logic, purchase
// store, audio, auto-spin, privacy mode, menu settings/history, event bus.

type Screen = 'paytable' | 'daily' | 'achievements' | 'vip';

interface MenuEntry {
  id: Screen;
  label: string;
  hint: string;
}

const MENU_ENTRIES: readonly MenuEntry[] = [
  { id: 'paytable', label: 'Paytable', hint: 'Symbols · specials · 25 paylines' },
  { id: 'daily', label: 'Daily Bonus', hint: 'Seven-day login reward cycle' },
  { id: 'achievements', label: 'Achievements', hint: 'Fifteen in-theme targets' },
  { id: 'vip', label: 'VIP Status', hint: 'Netrunner tier ladder' },
];

// Hardcoded jackpot values per the P23 brief — no real counter ticks while P07
// is skipped; the snapshot is visual decoration only.
const STATIC_JACKPOT_SNAPSHOT: JackpotSnapshot = {
  chip: 1_250,
  disk: 12_500,
  vault: 125_000,
  mainframe: 1_250_000,
  updatedAt: 0,
};

function createStaticJackpots(): JackpotCounter {
  return {
    getState: () => STATIC_JACKPOT_SNAPSHOT,
    subscribe: () => () => {},
    tick: () => STATIC_JACKPOT_SNAPSHOT,
    hit: () => 0,
    snapshot: () => STATIC_JACKPOT_SNAPSHOT,
  };
}

// Fifteen in-theme achievements per the P23 brief. All start locked — the P09
// predicate wiring that would mark entries unlocked/claimable lives in a
// skipped chunk.
const STATIC_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'jackIn', name: 'Jack In', description: 'Complete your first spin.', rewardCc: 500 },
  { id: 'firstBlood', name: 'First Blood', description: 'Land your first payline win.', rewardCc: 1_000 },
  { id: 'fullSend', name: 'Full Send', description: 'Spin at the maximum line bet.', rewardCc: 2_000 },
  { id: 'neonTrinity', name: 'Neon Trinity', description: 'Line up three Neon 7s on one spin.', rewardCc: 3_000 },
  { id: 'precisionCut', name: 'Precision Cut', description: 'Land a Katana payline win.', rewardCc: 3_000 },
  { id: 'chromeDome', name: 'Chrome Dome', description: 'Land four Chrome Skulls on one spin.', rewardCc: 7_500 },
  { id: 'goldRush', name: 'Gold Rush', description: 'Land Gold Kanji on all five reels.', rewardCc: 25_000 },
  { id: 'fruitLoop', name: 'Fruit Loop', description: 'Win ten low-pay fruit lines.', rewardCc: 1_500 },
  { id: 'centuryClub', name: 'Century Club', description: 'Complete one hundred spins.', rewardCc: 1_000 },
  { id: 'payday', name: 'Payday', description: 'Win 250× your total bet on a single spin.', rewardCc: 10_000 },
  { id: 'exfil', name: 'Exfil', description: 'Win 1,000× your total bet on a single spin.', rewardCc: 25_000 },
  { id: 'wildcard', name: 'Wildcard', description: 'Let a wild substitute on a paying line.', rewardCc: 1_000 },
  { id: 'pinkSignal', name: 'Pink Signal', description: 'Trigger the magenta payline twenty-five times.', rewardCc: 2_500 },
  { id: 'diamondHands', name: 'Diamond Hands', description: 'Hold balance above 50,000 CC for a hundred spins.', rewardCc: 5_000 },
  { id: 'nightShift', name: 'Night Shift', description: 'Complete a hundred spins in one session.', rewardCc: 2_500 },
];

const STATIC_ACHIEVEMENTS_STATE: AchievementsState = {
  unlocked: new Set<string>(),
  claimable: new Set<string>(),
};

function createStaticAchievementsStore(): AchievementsStore {
  return {
    getState: () => STATIC_ACHIEVEMENTS_STATE,
    subscribe: () => () => {},
    claimReward: () => 0,
  };
}

function useControllerState(controller: GameController): GameControllerState {
  return useSyncExternalStore(
    useCallback((cb) => controller.subscribe(cb), [controller]),
    useCallback(() => controller.getState(), [controller]),
    useCallback(() => controller.getState(), [controller]),
  );
}

export interface AppProps {
  wallet: WalletStore;
}

/**
 * Dev-only: when running under `vite dev`, read `?seed=<n>` from
 * `window.location.search` and pin the RNG to it. Enables P24's Playwright
 * specs to force deterministic grids without touching production code —
 * `import.meta.env.DEV` is replaced at build time, so the branch tree-shakes
 * out of production bundles.
 */
function resolveRng() {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get('seed');
    if (seedParam !== null) {
      const seed = Number(seedParam);
      if (Number.isFinite(seed)) return createRng(seed);
    }
  }
  return createRng();
}

export function App({ wallet }: AppProps): JSX.Element {
  const rng = useMemo(() => resolveRng(), []);
  const jackpots = useMemo(() => createStaticJackpots(), []);
  const dailyStore = useMemo(() => createMockDailyBonusStore(), []);
  const achievementsStore = useMemo(() => createStaticAchievementsStore(), []);
  const vipStore = useMemo(() => createMockVipStore({ lifetimeWager: 0 }), []);
  const audio = useMemo(() => createMockAudioManager(), []);
  const controller = useMemo(() => createGameController({ wallet, rng }), [wallet, rng]);

  const state = useControllerState(controller);

  const [activeScreen, setActiveScreen] = useState<Screen | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Drive a periodic re-render while the cooldown ring is winding down so the
  // SpinButton's countdown label/arc animate smoothly. Polls at 100ms —
  // ~20 frames across the 2-second window, well below the 2s cap.
  useEffect(() => {
    const update = (): void => {
      setCooldownRemaining(controller.cooldownRemaining());
    };
    update();
    const id = window.setInterval(update, 100);
    return () => window.clearInterval(id);
  }, [controller, state.cooldownUntil]);

  // Auto-dismiss the insufficient-credits toast so the player isn't stuck
  // looking at a stale pill.
  useEffect(() => {
    if (!state.toast) return;
    const id = window.setTimeout(() => controller.dismissToast(), TOAST_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [state.toast, controller]);

  const onSpin = useCallback(() => controller.spin(), [controller]);
  const onReelsLanded = useCallback(() => controller.notifyReelsLanded(), [controller]);
  const onWinOverlayComplete = useCallback(
    () => controller.dismissWinOverlay(),
    [controller],
  );

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openScreen = useCallback((id: Screen) => {
    setActiveScreen(id);
    setMenuOpen(false);
  }, []);
  const closeScreen = useCallback(() => setActiveScreen(null), []);

  return (
    <div className={styles.root}>
      <TopBar wallet={wallet} jackpots={jackpots} onOpenMenu={openMenu} />

      <main className={styles.stage}>
        <ReelGrid
          grid={state.grid}
          isSpinning={state.isSpinning}
          winningCells={state.winningCells}
          onAnimationComplete={onReelsLanded}
        />
        <SpinButton
          onSpin={onSpin}
          isSpinning={state.isSpinning}
          cooldownRemainingMs={cooldownRemaining}
        />
      </main>

      <BottomBar wallet={wallet} isSpinning={state.isSpinning} />

      {state.toast && (
        <div className={styles.toast} role="status" aria-live="assertive">
          {state.toast.message}
        </div>
      )}

      {state.showWinOverlay && (
        <WinOverlay
          winCredits={state.celebratedWin}
          totalBet={state.celebratedTotalBet}
          audio={audio}
          onComplete={onWinOverlayComplete}
        />
      )}

      {menuOpen && (
        <div className={styles.drawerScrim} role="presentation" onClick={closeMenu}>
          <aside
            className={styles.drawer}
            role="dialog"
            aria-label="Main menu"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Menu</h2>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={closeMenu}
                aria-label="Close menu"
              >
                ×
              </button>
            </header>
            <ul className={styles.drawerList}>
              {MENU_ENTRIES.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={styles.drawerEntry}
                    onClick={() => openScreen(entry.id)}
                  >
                    <span className={styles.drawerEntryLabel}>{entry.label}</span>
                    <span className={styles.drawerEntryHint}>{entry.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {activeScreen && (
        <div className={styles.screenScrim} role="presentation" onClick={closeScreen}>
          <div className={styles.screen} onClick={(e) => e.stopPropagation()}>
            {activeScreen === 'paytable' && <Paytable onClose={closeScreen} />}
            {activeScreen === 'daily' && (
              <DailyLoginModal
                store={dailyStore}
                mode="inline"
                onClose={closeScreen}
              />
            )}
            {activeScreen === 'achievements' && (
              <AchievementsScreen
                store={achievementsStore}
                definitions={STATIC_ACHIEVEMENTS}
                onClose={closeScreen}
              />
            )}
            {activeScreen === 'vip' && <VipScreen store={vipStore} onClose={closeScreen} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
