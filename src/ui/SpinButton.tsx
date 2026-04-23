import type { CSSProperties } from 'react';

import styles from './SpinButton.module.css';

// P14 — dominant `#C8FF00` spin trigger per §10.1. The button is a dumb
// presentational control: it never starts a timer itself. P23's GameController
// owns the spin lifecycle and passes `isSpinning` and `cooldownRemainingMs`
// down; this component simply reflects them and calls `onSpin` when tapped.

const COOLDOWN_RADIUS = 60;
const COOLDOWN_CIRCUMFERENCE = 2 * Math.PI * COOLDOWN_RADIUS;

export interface SpinButtonProps {
  onSpin: () => void;
  /** External disabled flag — insufficient balance, age gate open, etc. */
  disabled?: boolean;
  /** True while the reels are still rolling. Dims the button and swaps label. */
  isSpinning?: boolean;
  /**
   * Milliseconds remaining on P11's 2s minimum spin interval (§12.2). When
   * > 0, the button is disabled and the label shows a 0.1s-resolution
   * countdown. Must not be user-adjustable.
   */
  cooldownRemainingMs?: number;
  /** Override the default "SPIN" label (e.g. localisation). */
  label?: string;
  /** Style overrides for sizing inside tight layouts. */
  style?: CSSProperties;
}

/**
 * The primary spin control. Renders a circular `#C8FF00` button; disabled and
 * countdown-labelled while a spin or cooldown is in-flight.
 */
export function SpinButton({
  onSpin,
  disabled,
  isSpinning,
  cooldownRemainingMs,
  label = 'Spin',
  style,
}: SpinButtonProps): JSX.Element {
  const cooldown = Math.max(0, cooldownRemainingMs ?? 0);
  const cooling = cooldown > 0;
  const busy = Boolean(isSpinning);
  const isDisabled = Boolean(disabled) || cooling || busy;

  const { primary, secondary } = labelFor({ label, busy, cooling, cooldown });

  return (
    <button
      type="button"
      className={styles.button}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={busy}
      aria-label={`${label}${busy ? ' (spinning)' : cooling ? ` (ready in ${(cooldown / 1000).toFixed(1)} seconds)` : ''}`}
      onClick={() => {
        if (isDisabled) return;
        onSpin();
      }}
      style={style}
    >
      <span className={styles.label}>
        <span className={styles.labelPrimary}>{primary}</span>
        {secondary && <span className={styles.labelSecondary}>{secondary}</span>}
      </span>
      {cooling && <CooldownRing remainingMs={cooldown} />}
    </button>
  );
}

interface CooldownRingProps {
  remainingMs: number;
}

const COOLDOWN_FULL_MS = 2000;

function CooldownRing({ remainingMs }: CooldownRingProps): JSX.Element {
  const progress = Math.min(1, Math.max(0, 1 - remainingMs / COOLDOWN_FULL_MS));
  const dashOffset = COOLDOWN_CIRCUMFERENCE * (1 - progress);
  return (
    <svg className={styles.cooldownRing} viewBox="0 0 128 128" aria-hidden="true">
      <circle className={styles.cooldownRingTrack} cx={64} cy={64} r={COOLDOWN_RADIUS} />
      <circle
        className={styles.cooldownRingArc}
        cx={64}
        cy={64}
        r={COOLDOWN_RADIUS}
        strokeDasharray={COOLDOWN_CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}

interface LabelInputs {
  label: string;
  busy: boolean;
  cooling: boolean;
  cooldown: number;
}

/**
 * Pure helper computing the primary/secondary label text shown on the button
 * for each state. Exported for unit testing without rendering.
 */
export function labelFor({ label, busy, cooling, cooldown }: LabelInputs): {
  primary: string;
  secondary?: string;
} {
  if (busy) return { primary: 'Spin', secondary: 'Rolling' };
  if (cooling) return { primary: `${(cooldown / 1000).toFixed(1)}s`, secondary: 'Cooldown' };
  return { primary: label };
}
