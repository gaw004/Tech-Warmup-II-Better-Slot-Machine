import { describe, expect, it } from 'vitest';

import { durations } from '../theme/tokens';
import { createMockAudioManager } from '../ui/audioManagerMock';
import {
  SKIPPABLE_TIERS,
  WIN_TIERS,
  WIN_TIER_AUDIO_CUES,
  WIN_TIER_CUTOFFS,
  WIN_TIER_DURATIONS,
  isSkippable,
  winTierFor,
} from '../ui/winTier';

// Pure-helper tests for P19. Render/animation behavior is covered by the
// demo page in dev and by Playwright in P24 — the unit environment stays
// `node` so the suite keeps running in one VM.

describe('WIN_TIERS table', () => {
  it('enumerates the six §11.1 tiers in rendering order', () => {
    expect(WIN_TIERS).toEqual(['none', 'small', 'medium', 'big', 'mega', 'epic']);
  });

  it('declares an audio cue for every tier', () => {
    for (const tier of WIN_TIERS) {
      expect(WIN_TIER_AUDIO_CUES[tier]).toBeTruthy();
    }
  });

  it('maps §11.1 tiers onto P20 cue manifest ids', () => {
    expect(WIN_TIER_AUDIO_CUES.small).toBe('winSmall');
    expect(WIN_TIER_AUDIO_CUES.medium).toBe('winMedium');
    expect(WIN_TIER_AUDIO_CUES.big).toBe('winBig');
    expect(WIN_TIER_AUDIO_CUES.mega).toBe('winMega');
    expect(WIN_TIER_AUDIO_CUES.epic).toBe('winEpic');
  });

  it('keeps the small-win duration under the §11.1 "<1.5s" cap', () => {
    expect(WIN_TIER_DURATIONS.small).toBeLessThan(1_500);
  });

  it('keeps the epic duration inside the §11.1 "6–10 sec" band', () => {
    expect(WIN_TIER_DURATIONS.epic).toBeGreaterThanOrEqual(6_000);
    expect(WIN_TIER_DURATIONS.epic).toBeLessThanOrEqual(10_000);
  });

  it('durations are strictly non-decreasing from small through epic', () => {
    const { small, medium, big, mega, epic } = WIN_TIER_DURATIONS;
    expect(small).toBeLessThanOrEqual(medium);
    expect(medium).toBeLessThanOrEqual(big);
    expect(big).toBeLessThanOrEqual(mega);
    expect(mega).toBeLessThanOrEqual(epic);
  });

  it('sources non-none durations from tokens.durations.winTier', () => {
    expect(WIN_TIER_DURATIONS.small).toBe(durations.winTier.small);
    expect(WIN_TIER_DURATIONS.medium).toBe(durations.winTier.medium);
    expect(WIN_TIER_DURATIONS.big).toBe(durations.winTier.big);
    expect(WIN_TIER_DURATIONS.mega).toBe(durations.winTier.mega);
    expect(WIN_TIER_DURATIONS.epic).toBe(durations.winTier.epic);
  });

  it('marks big / mega / epic as skippable and small / medium / none as not', () => {
    expect(SKIPPABLE_TIERS).toEqual(new Set(['big', 'mega', 'epic']));
    expect(isSkippable('big')).toBe(true);
    expect(isSkippable('mega')).toBe(true);
    expect(isSkippable('epic')).toBe(true);
    expect(isSkippable('medium')).toBe(false);
    expect(isSkippable('small')).toBe(false);
    expect(isSkippable('none')).toBe(false);
  });
});

describe('winTierFor bucketing', () => {
  const bet = 100;

  it('returns `none` for zero-win spins', () => {
    expect(winTierFor(0, bet)).toBe('none');
  });

  it('returns `none` for non-finite or negative inputs', () => {
    expect(winTierFor(Number.NaN, bet)).toBe('none');
    expect(winTierFor(-10, bet)).toBe('none');
    expect(winTierFor(Infinity, bet)).toBe('none');
    expect(winTierFor(50, 0)).toBe('none');
    expect(winTierFor(50, -1)).toBe('none');
  });

  it('buckets each §11.1 bracket correctly', () => {
    // Small: > 0 up to just below 2×.
    expect(winTierFor(1, bet)).toBe('small');
    expect(winTierFor(50, bet)).toBe('small');
    expect(winTierFor(199, bet)).toBe('small');
    // Medium: 2× – just below 10×.
    expect(winTierFor(200, bet)).toBe('medium');
    expect(winTierFor(999, bet)).toBe('medium');
    // Big: 10× – just below 50×.
    expect(winTierFor(1_000, bet)).toBe('big');
    expect(winTierFor(4_999, bet)).toBe('big');
    // Mega: 50× – just below 250×.
    expect(winTierFor(5_000, bet)).toBe('mega');
    expect(winTierFor(24_999, bet)).toBe('mega');
    // Epic / Jackpot: 250×+.
    expect(winTierFor(25_000, bet)).toBe('epic');
    expect(winTierFor(10_000_000, bet)).toBe('epic');
  });

  it('bracket edges follow WIN_TIER_CUTOFFS inclusively on the lower bound', () => {
    // Sanity on the source of truth so any cutoff re-tune stays monotonic.
    const { small, medium, big, mega, epic } = WIN_TIER_CUTOFFS;
    expect(small.maxMultiple).toBe(medium.minMultiple);
    expect(medium.maxMultiple).toBe(big.minMultiple);
    expect(big.maxMultiple).toBe(mega.minMultiple);
    expect(mega.maxMultiple).toBe(epic.minMultiple);
    expect(epic.maxMultiple).toBe(Infinity);
  });

  it('scales with totalBet (a win is tiered by multiple, not by absolute CC)', () => {
    // 1000 CC is epic at 1 CC bet, small at 1000 CC bet.
    expect(winTierFor(1_000, 1)).toBe('epic');
    expect(winTierFor(1_000, 1_000)).toBe('small');
  });
});

describe('createMockAudioManager', () => {
  it('records every play/loop/stop call in order', () => {
    const audio = createMockAudioManager({ now: () => 0 });
    audio.play('winSmall');
    audio.loop('bgMusic');
    audio.stop('bgMusic');
    expect(audio.log.map((l) => [l.action, l.cueId])).toEqual([
      ['play', 'winSmall'],
      ['loop', 'bgMusic'],
      ['stop', 'bgMusic'],
    ]);
  });

  it('respects mute state for play/loop but still records setMuted + stop', () => {
    const audio = createMockAudioManager({ now: () => 0 });
    audio.setMuted(true);
    audio.play('winBig');
    audio.loop('bgMusic');
    audio.stop('bgMusic');
    expect(audio.isMuted()).toBe(true);
    expect(audio.log.map((l) => l.action)).toEqual(['setMuted', 'stop']);
  });

  it('unmuting re-enables recording', () => {
    const audio = createMockAudioManager({ muted: true });
    audio.play('winMega'); // suppressed
    audio.setMuted(false);
    audio.play('winMega');
    expect(audio.log.filter((l) => l.action === 'play').length).toBe(1);
  });

  it('clearLog wipes history without disturbing mute state', () => {
    const audio = createMockAudioManager();
    audio.play('winEpic');
    audio.setMuted(true);
    audio.clearLog();
    expect(audio.log.length).toBe(0);
    expect(audio.isMuted()).toBe(true);
  });
});
