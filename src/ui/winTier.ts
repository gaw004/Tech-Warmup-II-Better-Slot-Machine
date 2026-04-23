import type { Credits } from '../types/economy';
import { durations } from '../theme/tokens';
import type { AudioCueId } from './audioManagerMock';

// P19 — pure tier resolver for the §11.1 "Tiered Win Celebrations" table.
// Lives outside the React component so the branching can be unit-tested in
// the `node` vitest environment alongside the rest of the suite. `WinOverlay`
// imports `winTierFor`, `WIN_TIER_DURATIONS`, and `WIN_TIER_AUDIO_CUES`; the
// demo harness and P23's GameController only need `winTierFor` to decide
// when to mount the overlay.

/** Every celebration tier per §11.1. `'none'` is the no-win settle. */
export type WinTier = 'none' | 'small' | 'medium' | 'big' | 'mega' | 'epic';

/** Rendering order / storybook iteration order. */
export const WIN_TIERS: readonly WinTier[] = [
  'none',
  'small',
  'medium',
  'big',
  'mega',
  'epic',
];

/**
 * §11.1 win-size brackets expressed in multiples of total bet. A bracket is
 * `[minMultipleInclusive, maxMultipleExclusive]`; the last bracket's upper
 * bound is `Infinity` to capture Epic / Jackpot.
 *
 * The spec's "Small" row reads `0.5× – 2× bet`; wins between `0+` and `0.5×`
 * still render the Small celebration here because the game should never
 * settle on a literal zero credit-count roll up — "None" is reserved for
 * strictly zero-win spins (matching the "Brief reel settle" cell).
 */
export const WIN_TIER_CUTOFFS: Record<Exclude<WinTier, 'none'>, {
  minMultiple: number;
  maxMultiple: number;
}> = {
  small: { minMultiple: 0, maxMultiple: 2 },
  medium: { minMultiple: 2, maxMultiple: 10 },
  big: { minMultiple: 10, maxMultiple: 50 },
  mega: { minMultiple: 50, maxMultiple: 250 },
  epic: { minMultiple: 250, maxMultiple: Infinity },
};

/**
 * Celebration dwell time per tier. `'none'` is ~200ms (brief settle only);
 * the rest mirror `tokens.durations.winTier` so tuning the palette updates
 * every downstream timer in one place. Epic stays inside the §11.1 "6–10 sec"
 * range.
 */
export const WIN_TIER_DURATIONS: Record<WinTier, number> = {
  none: 200,
  small: durations.winTier.small,
  medium: durations.winTier.medium,
  big: durations.winTier.big,
  mega: durations.winTier.mega,
  epic: durations.winTier.epic,
};

/**
 * Audio cue fired on overlay mount. Maps onto P20's cue manifest
 * (`winSmall` … `winEpic`); `'none'` reuses `reelStop` as its soft settle
 * click per §11.1's "Soft settle click" row. P20 will ship the real samples;
 * these IDs are the contract P19 types against.
 */
export const WIN_TIER_AUDIO_CUES: Record<WinTier, AudioCueId> = {
  none: 'reelStop',
  small: 'winSmall',
  medium: 'winMedium',
  big: 'winBig',
  mega: 'winMega',
  epic: 'winEpic',
};

/** Tiers that support tap-to-skip per §11.1 last paragraph ("big wins"). */
export const SKIPPABLE_TIERS: ReadonlySet<WinTier> = new Set(['big', 'mega', 'epic']);

/** True when `tier` can be dismissed early by tapping the overlay. */
export function isSkippable(tier: WinTier): boolean {
  return SKIPPABLE_TIERS.has(tier);
}

/**
 * Pure tier resolver. `winCredits <= 0` or `totalBet <= 0` both collapse to
 * `'none'`; otherwise the multiple is bucketed against `WIN_TIER_CUTOFFS`.
 */
export function winTierFor(winCredits: Credits, totalBet: Credits): WinTier {
  if (!Number.isFinite(winCredits) || winCredits <= 0) return 'none';
  if (!Number.isFinite(totalBet) || totalBet <= 0) return 'none';
  const multiple = winCredits / totalBet;
  if (multiple >= WIN_TIER_CUTOFFS.epic.minMultiple) return 'epic';
  if (multiple >= WIN_TIER_CUTOFFS.mega.minMultiple) return 'mega';
  if (multiple >= WIN_TIER_CUTOFFS.big.minMultiple) return 'big';
  if (multiple >= WIN_TIER_CUTOFFS.medium.minMultiple) return 'medium';
  return 'small';
}
