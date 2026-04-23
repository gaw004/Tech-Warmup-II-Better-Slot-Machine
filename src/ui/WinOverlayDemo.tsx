import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { formatCredits } from './BottomBar';
import { WinOverlay } from './WinOverlay';
import { createMockAudioManager } from './audioManagerMock';
import {
  WIN_TIERS,
  WIN_TIER_AUDIO_CUES,
  WIN_TIER_DURATIONS,
  isSkippable,
  type WinTier,
} from './winTier';

import styles from './WinOverlayDemo.module.css';

// P19 acceptance harness — Storybook-style matrix that runs one button per
// tier through `WinOverlay` end-to-end. Proves every bullet in P19's
// Acceptance block:
//   1. Each of the six tiers ({none, small, medium, big, mega, epic}) has a
//      dedicated button and the overlay reads the tier from {winCredits,
//      totalBet}, not from a prop.
//   2. The matching animation fires (visual — confirm in the browser).
//   3. The matching audio cue is recorded in the mock `AudioManager` log
//      and surfaced in the on-page console.
//   4. Tap-to-skip works on big / mega / epic (click the overlay itself).
//   5. Small wins resolve in <1.5s (durations.winTier.small = 500ms).
//   6. Epic climbs for 6–10s (durations.winTier.epic = 8000ms).
//   7. The overlay is cosmetic — the "Totally unblocked" counter in the
//      panel below continues to increment while the overlay is shown.

const TOTAL_BET = 100;

/**
 * Canonical credit amount per tier — chosen to sit comfortably inside each
 * §11.1 bracket so a one-multiplier-off edit to `winTier.ts` still puts every
 * demo click in the intended tier.
 */
const TIER_CREDITS: Record<WinTier, number> = {
  none: 0,
  small: 150, // 1.5× bet → small
  medium: 500, // 5× bet → medium
  big: 3_000, // 30× bet → big
  mega: 15_000, // 150× bet → mega
  epic: 75_000, // 750× bet → epic / jackpot
};

interface CelebrationRequest {
  id: number;
  tier: WinTier;
  winCredits: number;
}

export function WinOverlayDemo(): JSX.Element {
  const audio = useMemo(() => createMockAudioManager(), []);
  const [request, setRequest] = useState<CelebrationRequest | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [unblockedTicks, setUnblockedTicks] = useState(0);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 8));
  }, []);

  const trigger = useCallback(
    (tier: WinTier) => {
      const req: CelebrationRequest = {
        id: Date.now(),
        tier,
        winCredits: TIER_CREDITS[tier],
      };
      setRequest(req);
      pushLog(
        `▶ ${tier.padEnd(6)} · ${formatCredits(req.winCredits)} CC · cue=${WIN_TIER_AUDIO_CUES[tier]} · ${
          WIN_TIER_DURATIONS[tier]
        }ms${isSkippable(tier) ? ' · skippable' : ''}`,
      );
    },
    [pushLog],
  );

  const handleComplete = useCallback(() => {
    setRequest((prev) => {
      if (!prev) return prev;
      pushLog(`◼ ${prev.tier} · completed`);
      return null;
    });
  }, [pushLog]);

  // Proves the overlay doesn't block the underlying game loop — this counter
  // ticks every 250ms regardless of whether an overlay is mounted.
  const tickUnblocked = useCallback(() => {
    setUnblockedTicks((n) => n + 1);
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Data Heist — Win Overlay Demo</h1>
        <p className={styles.subtitle}>
          P19 acceptance matrix · one button per §11.1 tier. Total bet is fixed
          at {formatCredits(TOTAL_BET)} CC so the credit amounts map directly
          onto the §11.1 multiplier brackets.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="tiers-title">
        <h2 id="tiers-title" className={styles.sectionTitle}>
          Tier matrix
        </h2>
        <div className={styles.grid}>
          {WIN_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              className={`${styles.tierButton} ${styles[`tierButton_${tier}`] ?? ''}`.trim()}
              onClick={() => trigger(tier)}
            >
              <span className={styles.tierName}>{tier}</span>
              <span className={styles.tierCredits}>
                {formatCredits(TIER_CREDITS[tier])} CC
              </span>
              <span className={styles.tierMeta}>
                {WIN_TIER_DURATIONS[tier]}ms · {WIN_TIER_AUDIO_CUES[tier]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="stage-title">
        <h2 id="stage-title" className={styles.sectionTitle}>
          Overlay stage
        </h2>
        <div className={styles.stage}>
          <div className={styles.gameSim}>
            <span className={styles.gameLabel}>Reel grid (placeholder)</span>
            <span className={styles.gameDetail}>
              this panel represents the P14 reel grid — the overlay mounts on
              top. The counter below ticks every 250ms; watch it keep moving
              while a big+ celebration is on screen to confirm the overlay is
              non-blocking.
            </span>
            <UnblockedTicker value={unblockedTicks} onTick={tickUnblocked} />
          </div>
          {request && (
            <WinOverlay
              key={request.id}
              winCredits={request.winCredits}
              totalBet={TOTAL_BET}
              audio={audio}
              onComplete={handleComplete}
            />
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="audio-title">
        <h2 id="audio-title" className={styles.sectionTitle}>
          Audio + event log
        </h2>
        <pre className={styles.log}>
          {log.length === 0 ? '(no triggers yet — click a tier button)' : log.join('\n')}
        </pre>
        <pre className={styles.log}>
          {audio.log.length === 0
            ? '(audio manager idle)'
            : audio.log
                .slice(-8)
                .map((entry) =>
                  entry.action === 'play'
                    ? `♪ play ${entry.cueId}`
                    : entry.action === 'setMuted'
                      ? `muted=${entry.muted ? 'true' : 'false'}`
                      : `${entry.action} ${entry.cueId ?? ''}`.trim(),
                )
                .reverse()
                .join('\n')}
        </pre>
      </section>
    </div>
  );
}

interface UnblockedTickerProps {
  value: number;
  onTick: () => void;
}

/**
 * Tiny self-ticking counter — the demo uses it as proof-by-example that the
 * overlay does not block the underlying React tree. Lives inline because it's
 * demo-only; the real P14 reel grid doesn't need this.
 */
function UnblockedTicker({ value, onTick }: UnblockedTickerProps): JSX.Element {
  useInterval(onTick, 250);
  return (
    <span className={styles.ticker}>
      unblocked ticks: <strong>{value}</strong>
    </span>
  );
}

function useInterval(cb: () => void, delayMs: number): void {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    const id = setInterval(() => cbRef.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
