import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';

import type { Credits } from '../types/economy';

import { formatCredits } from './BottomBar';
import type { AudioManager } from './audioManagerMock';
import {
  WIN_TIER_AUDIO_CUES,
  WIN_TIER_DURATIONS,
  isSkippable,
  winTierFor,
  type WinTier,
} from './winTier';

import styles from './WinOverlay.module.css';

// P19 — tiered win celebration overlay per §11.1 + §11.3. Single component
// that owns both the visual tier selection and the audio-cue fire-and-forget
// call into P20's `AudioManager`. Kept deliberately thin: no game state, no
// payline diagram, no wallet access — the orchestrator (P23 GameController)
// mounts this with `{ winCredits, totalBet }` after evaluation and unmounts
// it once `onComplete` fires.
//
// Non-blocking contract:
// - The backdrop is `pointer-events: none` for every tier so the game loop
//   continues to receive input underneath — the overlay is cosmetic.
// - Skippable tiers (big/mega/epic, §11.1 last paragraph) expose a full-
//   surface tap-to-skip button with `pointer-events: auto`. The rest of the
//   reel grid remains blocked only under that single button.
// - `'none'` renders nothing and immediately schedules `onComplete` on the
//   next tick so callers can treat every spin the same way.
//
// Timing contract:
// - Per §11.1 small wins resolve in <1.5s — `WIN_TIER_DURATIONS.small` is
//   500ms (≤ 1500 by construction; keep under the token cap if it ever grows).
// - Epic counter climbs for 6–10 sec — token set to 8000ms, within range.
// - The counter roll-up duration matches the celebration duration (minus a
//   short hold at the end so the final number is legible).

const COUNTER_HOLD_MS = 400;

export interface WinOverlayProps {
  /** Total credits awarded on the spin being celebrated. */
  winCredits: Credits;
  /** Total bet that produced the win — used to bucket tier via §11.1. */
  totalBet: Credits;
  /** P20 audio manager (or any `AudioManager`-shaped mock). */
  audio: AudioManager;
  /**
   * Called when the celebration finishes — either after the tier's full
   * duration, or immediately on tap-to-skip for big+ tiers. P23 unmounts the
   * overlay in response.
   */
  onComplete: () => void;
  /**
   * Inverted control point: if `true`, the celebration holds its last frame
   * instead of calling `onComplete`. Mostly here for the demo so we can
   * visually park the overlay while the operator reviews it.
   */
  pausedForReview?: boolean;
  style?: CSSProperties;
  /** Accessibility label override. Defaults to the tier-specific copy. */
  ariaLabel?: string;
}

/** Display copy per tier (§11.1 "Visual" column). */
const TIER_HEADLINE: Record<WinTier, string> = {
  none: '',
  small: 'Nice Pull',
  medium: 'Score',
  big: 'BIG WIN',
  mega: 'MEGA WIN',
  epic: 'EPIC WIN',
};

/** Short subhead under the big headlines — theme flavor only. */
const TIER_SUBHEAD: Record<WinTier, string> = {
  none: '',
  small: 'credits routed',
  medium: 'payline traced · bonus yield',
  big: 'signal locked — payout secured',
  mega: 'mainframe rattled — extraction clean',
  epic: 'jackpot protocol · matrix unlocked',
};

/**
 * Top-level overlay. Picks tier, renders the matching animation layer,
 * drives the counter roll-up, and fires the audio cue exactly once on mount.
 */
export function WinOverlay({
  winCredits,
  totalBet,
  audio,
  onComplete,
  pausedForReview = false,
  style,
  ariaLabel,
}: WinOverlayProps): JSX.Element | null {
  const tier = useMemo(() => winTierFor(winCredits, totalBet), [winCredits, totalBet]);
  const durationMs = WIN_TIER_DURATIONS[tier];
  const [displayedCredits, setDisplayedCredits] = useState<Credits>(0);
  const completedRef = useRef(false);

  const fireComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Fire the audio cue once on mount for this tier. Deliberately not in the
  // same effect as the timer so remounts caused by credits/bet churn don't
  // replay the cue — the cue is tied to the overlay's identity.
  useEffect(() => {
    audio.play(WIN_TIER_AUDIO_CUES[tier]);
    // We intentionally want this to fire once per mount regardless of later
    // tier recomputations; dependencies include `tier` so a hot-swap of
    // winCredits that crosses a bracket does replay the correct cue.
  }, [audio, tier]);

  // Counter roll-up. `'none'` skips the climb entirely.
  useEffect(() => {
    if (tier === 'none' || winCredits <= 0) {
      setDisplayedCredits(0);
      return;
    }
    if (pausedForReview) return;
    let raf = 0;
    const rollDuration = Math.max(200, durationMs - COUNTER_HOLD_MS);
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / rollDuration);
      const eased = easeOutCubic(t);
      setDisplayedCredits(Math.round(winCredits * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tier, winCredits, durationMs, pausedForReview]);

  // Lifetime timer — schedule `onComplete` when the celebration runs out.
  useEffect(() => {
    if (pausedForReview) return;
    if (tier === 'none') {
      // A zero-win settle resolves on the next microtask so P23 can treat
      // every spin the same — mount, await onComplete, unmount.
      const id = setTimeout(fireComplete, WIN_TIER_DURATIONS.none);
      return () => clearTimeout(id);
    }
    const id = setTimeout(fireComplete, durationMs);
    return () => clearTimeout(id);
  }, [tier, durationMs, fireComplete, pausedForReview]);

  if (tier === 'none') return null;

  const skippable = isSkippable(tier);
  const label = ariaLabel ?? `${TIER_HEADLINE[tier]} celebration`;

  return (
    <div
      className={`${styles.root} ${styles[`tier_${tier}`]}`}
      data-tier={tier}
      role="status"
      aria-live="polite"
      aria-label={label}
      style={style}
    >
      <TierVisualLayer tier={tier} />
      <div className={styles.content}>
        <span className={styles.headline}>{TIER_HEADLINE[tier]}</span>
        <span className={styles.counter} aria-live="polite">
          <span className={styles.counterValue}>{formatCredits(displayedCredits)}</span>
          <span className={styles.counterUnit}>CC</span>
        </span>
        <span className={styles.subhead}>{TIER_SUBHEAD[tier]}</span>
      </div>
      {skippable && (
        <button
          type="button"
          className={styles.skip}
          onClick={fireComplete}
          aria-label={`Skip ${TIER_HEADLINE[tier]} celebration`}
        >
          <span className={styles.skipHint}>Tap to skip</span>
        </button>
      )}
    </div>
  );
}

/**
 * Per-tier animated background. Each tier layers a distinct visual so the
 * §11.1 table reads 1:1 in code — keeps CSS changes localised.
 */
function TierVisualLayer({ tier }: { tier: Exclude<WinTier, 'none'> }): JSX.Element {
  switch (tier) {
    case 'small':
      return <div className={styles.smallGlow} aria-hidden="true" />;
    case 'medium':
      return (
        <svg
          className={styles.mediumTrace}
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 10 L30 4 L50 16 L70 4 L100 10" />
        </svg>
      );
    case 'big':
      return (
        <div className={styles.bigPulse} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      );
    case 'mega':
      return (
        <div className={styles.megaCinematic} aria-hidden="true">
          <div className={styles.megaFlash} />
          <div className={styles.megaZoom} />
        </div>
      );
    case 'epic':
      return (
        <div className={styles.epicScene} aria-hidden="true">
          <MatrixRain />
          <div className={styles.vaultDoor}>
            <span className={styles.vaultLeaf} />
            <span className={styles.vaultLeaf} />
          </div>
        </div>
      );
  }
}

/**
 * CSS-only matrix code rain — eight columns with staggered animations so the
 * footprint stays small. Characters come from a seeded set so the effect is
 * deterministic across renders (no RNG drift between parent re-renders).
 */
function MatrixRain(): JSX.Element {
  const columns = useMemo(() => {
    const glyphs = 'Ｈ７＃Ｚ＊Ｋ＄Ｍ：＞／Ｇ'.split('');
    return Array.from({ length: 8 }, (_, col) => ({
      col,
      delayMs: col * 120,
      chars: Array.from({ length: 14 }, (_, row) => glyphs[(col * 3 + row) % glyphs.length]!),
    }));
  }, []);
  return (
    <div className={styles.matrix}>
      {columns.map((c) => (
        <span key={c.col} className={styles.matrixColumn} style={{ animationDelay: `${c.delayMs}ms` }}>
          {c.chars.map((g, i) => (
            <span key={i} className={styles.matrixGlyph}>
              {g}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
