import { useCallback, useEffect, useMemo, useState } from 'react';

import { createMemoryStorage, createWallet } from '../pureLogic/wallet';
import type { JackpotTier } from '../types/bonus';

import { TIER_LABELS, TopBar } from './TopBar';
import { createMockJackpotCounter } from './jackpotCounterMock';
import { formatCredits } from './BottomBar';

import styles from './TopBarDemo.module.css';

// P16 acceptance harness — mounts TopBar against a real P08 wallet and the
// interim mock `JackpotCounter`. Proves all three acceptance checks:
//   1. All four tiers show in rotation (Chip → Disk → Vault → Mainframe).
//   2. Values tick up visibly (rAF loop drives `jackpots.tick()` each frame,
//      the TopBar subscribes and re-renders).
//   3. The menu button opens a placeholder drawer (P22 owns the real drawer).
//
// Once P07's real jackpot counter lands, the `createMockJackpotCounter`
// import swaps for `createJackpotCounter` from `pureLogic/jackpots` and this
// page can be deleted — P23 will own the top-level wire-up.

const PLACEHOLDER_MENU_ENTRIES = [
  'Paytable',
  'Settings',
  'History',
  'Help',
  'Privacy Mode',
  'Daily Bonus',
  'VIP Status',
  'Responsible Play',
] as const;

export function TopBarDemo(): JSX.Element {
  const wallet = useMemo(() => createWallet({ storage: createMemoryStorage() }), []);
  const jackpots = useMemo(() => createMockJackpotCounter(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 8));
  }, []);

  // Drive the mock counter on rAF so the ticker values visibly climb. P07's
  // real counter will own this loop; the TopBar component itself never calls
  // `tick()` — it only subscribes.
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const step = (): void => {
      if (cancelled) return;
      jackpots.tick(performance.now());
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [jackpots]);

  const creditMockWin = useCallback(() => {
    wallet.creditWin(2_500);
    pushLog('credit +2,500 CC');
  }, [wallet, pushLog]);

  const deductMockSpin = useCallback(() => {
    const state = wallet.getState();
    if (!wallet.deductStake(state.totalBet)) {
      pushLog('deduct rejected (insufficient balance)');
      return;
    }
    pushLog(`deduct −${formatCredits(state.totalBet)} CC`);
  }, [wallet, pushLog]);

  const hitTier = useCallback(
    (tier: JackpotTier) => {
      const prize = jackpots.hit(tier);
      wallet.creditWin(prize);
      pushLog(`${TIER_LABELS[tier]} jackpot hit: +${formatCredits(prize)} CC`);
    },
    [jackpots, wallet, pushLog],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Data Heist — Top Bar Demo</h1>
        <p className={styles.subtitle}>
          P16 acceptance harness · balance updates live, jackpot ticker rotates
          Chip → Disk → Vault → Mainframe every 3s, menu opens a placeholder
          drawer. Remove once P23 wires in the real GameController.
        </p>
      </header>

      <TopBar
        wallet={wallet}
        jackpots={jackpots}
        onOpenMenu={() => {
          setMenuOpen(true);
          pushLog('menu opened');
        }}
      />

      <section className={styles.section} aria-labelledby="scenarios-title">
        <h2 id="scenarios-title" className={styles.sectionTitle}>
          Scenario controls
        </h2>
        <div className={styles.controlRow}>
          <button type="button" className={styles.button} onClick={creditMockWin}>
            Credit +2,500 CC
          </button>
          <button type="button" className={styles.button} onClick={deductMockSpin}>
            Deduct one spin
          </button>
          {(['chip', 'disk', 'vault', 'mainframe'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              className={styles.button}
              onClick={() => hitTier(tier)}
            >
              Hit {TIER_LABELS[tier]}
            </button>
          ))}
        </div>
        <pre className={styles.log}>
          {log.length === 0 ? '(no events yet)' : log.join('\n')}
        </pre>
      </section>

      <PlaceholderDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

interface PlaceholderDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Stand-in drawer for P22. Visible long enough to prove the menu button wires
 * through to a real overlay; real navigation, settings, privacy, etc. land in
 * P22.
 */
function PlaceholderDrawer({ open, onClose }: PlaceholderDrawerProps): JSX.Element | null {
  if (!open) return null;
  return (
    <div className={styles.drawerBackdrop} role="presentation" onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Menu (P22 placeholder)"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Menu</h2>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </header>
        <nav className={styles.drawerNav} aria-label="Menu entries">
          {PLACEHOLDER_MENU_ENTRIES.map((entry) => (
            <button key={entry} type="button" className={styles.drawerItem} disabled>
              {entry}
            </button>
          ))}
        </nav>
        <footer className={styles.drawerFooter}>
          Placeholder — P22 owns the real drawer.
        </footer>
      </aside>
    </div>
  );
}
