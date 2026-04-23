import { useCallback, useMemo, useRef, useState } from 'react';

import { createMemoryStorage, createWallet } from '../pureLogic/wallet';
import type { BetLevel } from '../types/economy';

import {
  BET_LADDER,
  BottomBar,
  formatCredits,
  useWalletState,
} from './BottomBar';

import styles from './BottomBarDemo.module.css';

// P15 acceptance harness — Storybook-style page that mounts the BottomBar
// against a real in-memory P08 wallet and proves:
//   1. Stepper cycles the full BET_LADDER and disables at both ends.
//   2. Max-bet snaps the line bet to 100 (= 2,500 total) in one tap.
//   3. Total-bet readout math stays correct as the stepper moves.
//   4. Last-win readout + the top-bar balance strip re-render on wallet emits.
//
// The P16 top bar is out of scope for this chunk; the `TopBarStrip` below is a
// minimal stand-in that proves the same `WalletStore` subscription pattern
// keeps balance live-updating. P16 will replace it with the real top bar.

export function BottomBarDemo(): JSX.Element {
  const wallet = useMemo(() => createWallet({ storage: createMemoryStorage() }), []);
  const [log, setLog] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [autoSpinRunning, setAutoSpinRunning] = useState(false);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 8));
  }, []);

  const onSpin = useCallback(() => {
    const state = wallet.getState();
    if (!wallet.deductStake(state.totalBet)) {
      pushLog('spin rejected (insufficient balance)');
      return;
    }
    pushLog(`spin −${formatCredits(state.totalBet)} CC`);
    setIsSpinning(true);
    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      const win = mockWinFor(state.totalBet);
      wallet.creditWin(win);
      pushLog(win > 0 ? `win +${formatCredits(win)} CC` : 'spin settled — no win');
      setIsSpinning(false);
    }, 900);
  }, [wallet, pushLog]);

  const onAutoSpin = useCallback(
    (spins: number) => {
      pushLog(`auto-spin queued: ${spins}`);
      setAutoSpinRunning(true);
      // The demo just flashes the "running" state for a few seconds — the real
      // orchestration lives in P11 and is wired by P23. This page only proves
      // the button swaps to "Stop" correctly and can be cancelled.
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(() => {
        setAutoSpinRunning(false);
        pushLog('auto-spin completed (mock)');
      }, 4000);
    },
    [pushLog],
  );

  const onCancelAutoSpin = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setAutoSpinRunning(false);
    pushLog('auto-spin cancelled');
  }, [pushLog]);

  const cycleBetForward = useCallback(() => {
    const state = wallet.getState();
    const idx = BET_LADDER.indexOf(state.lineBet);
    const next = BET_LADDER[(idx + 1) % BET_LADDER.length]!;
    wallet.setLineBet(next);
  }, [wallet]);

  const creditMockWin = useCallback(() => {
    wallet.creditWin(500);
    pushLog('mock creditWin(500)');
  }, [wallet, pushLog]);

  const resetBalance = useCallback(() => {
    const diff = 10_000 - wallet.getState().balance;
    if (diff > 0) wallet.creditWin(diff);
    if (diff < 0) wallet.deductStake(-diff);
    pushLog('balance reset to 10,000 CC');
  }, [wallet, pushLog]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Data Heist — Bottom Bar Demo</h1>
        <p className={styles.subtitle}>
          P15 acceptance harness · stepper cycles legal bets, max-bet snaps to 100,
          readouts stay live as the wallet emits. Remove once P23 wires in the real
          GameController.
        </p>
      </header>

      <TopBarStrip wallet={wallet} />

      <section className={styles.section} aria-labelledby="bottom-bar-title">
        <h2 id="bottom-bar-title" className={styles.sectionTitle}>
          Bottom bar
        </h2>
        <BottomBar
          wallet={wallet}
          onSpin={onSpin}
          onAutoSpin={onAutoSpin}
          onCancelAutoSpin={onCancelAutoSpin}
          isSpinning={isSpinning}
          autoSpinRunning={autoSpinRunning}
        />
      </section>

      <section className={styles.section} aria-labelledby="scenarios-title">
        <h2 id="scenarios-title" className={styles.sectionTitle}>
          Scenario controls
        </h2>
        <div className={styles.controlRow}>
          <button type="button" className={styles.toggleButton} onClick={cycleBetForward}>
            Cycle line bet (programmatic)
          </button>
          <button type="button" className={styles.toggleButton} onClick={creditMockWin}>
            Simulate win (+500)
          </button>
          <button type="button" className={styles.toggleButton} onClick={resetBalance}>
            Reset balance
          </button>
        </div>
        <pre className={styles.log}>{log.length === 0 ? '(no events yet)' : log.join('\n')}</pre>
      </section>
    </div>
  );
}

function TopBarStrip({ wallet }: { wallet: ReturnType<typeof createWallet> }): JSX.Element {
  const state = useWalletState(wallet);
  return (
    <div className={styles.topBar} aria-label="Top bar (P16 placeholder)">
      <span className={styles.topBarLabel}>Balance</span>
      <span className={styles.topBarValue}>{formatCredits(state.balance)} CC</span>
      <span className={styles.topBarNote}>
        line × 25 = {formatCredits(state.lineBet as BetLevel)} × 25 = {formatCredits(state.totalBet)} CC
      </span>
    </div>
  );
}

function mockWinFor(totalBet: number): number {
  // Rough 3-outcome distribution just for demoing readout state transitions;
  // not tuned for RTP.
  const roll = Math.random();
  if (roll < 0.55) return 0;
  if (roll < 0.9) return Math.round(totalBet * 1.5);
  return Math.round(totalBet * 6);
}
