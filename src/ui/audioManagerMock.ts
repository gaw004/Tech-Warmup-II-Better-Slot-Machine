// P19 — interim home for the `AudioManager` interface + a silent mock
// implementation. P00 did not publish an `AudioManager` in
// `src/types/stores.ts`, so P19 defines the contract against P20's chunk and
// exposes it here until P20 lands `src/ui/audio.ts` with the real Web Audio
// impl. When that swap happens the interface re-exports from this file can
// forward to P20 with zero call-site churn.
//
// Shape mirrors P20's Contract block in `strategyDocs/ai-prompts.md`:
// `play(cueId)`, `loop(cueId)`, `stop(cueId)`, `setMuted(bool)`, `isMuted()`.
// Mute state persistence (§11.3) is P20's concern — the mock is intentionally
// in-memory so tests and the demo stay deterministic.

/** Canonical cue ids from P20's manifest (§11.3). */
export type AudioCueId =
  | 'spinLoop'
  | 'reelStop'
  | 'winSmall'
  | 'winMedium'
  | 'winBig'
  | 'winMega'
  | 'winEpic'
  | 'jackpotChip'
  | 'jackpotDisk'
  | 'jackpotVault'
  | 'jackpotMainframe'
  | 'buttonClick'
  | 'bgMusic';

/**
 * Subset of P20's `AudioManager` the win overlay depends on. P20's full
 * manager will be a superset; WinOverlay only needs to fire `play(cueId)`,
 * so the interface is intentionally narrow — consumers that need `loop` /
 * `stop` can widen to the full manager when P20 ships.
 */
export interface AudioManager {
  play(cueId: AudioCueId): void;
  loop(cueId: AudioCueId): void;
  stop(cueId: AudioCueId): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

export interface MockAudioManagerLog {
  readonly action: 'play' | 'loop' | 'stop' | 'setMuted';
  readonly cueId?: AudioCueId;
  readonly muted?: boolean;
  readonly at: number;
}

export interface MockAudioManager extends AudioManager {
  /** Ordered list of every call the overlay (or demo) has made. */
  readonly log: readonly MockAudioManagerLog[];
  /** Clears `log` without disturbing mute state — handy between demo clicks. */
  clearLog(): void;
}

export interface CreateMockAudioManagerOptions {
  muted?: boolean;
  now?: () => number;
}

/**
 * In-memory `AudioManager` that records every call. The log is what the demo
 * surfaces to prove P19's "fires the matching audio cue" acceptance bullet,
 * and what tests would inspect once a testing-library lands.
 */
export function createMockAudioManager(
  options: CreateMockAudioManagerOptions = {},
): MockAudioManager {
  let muted = options.muted ?? false;
  const now = options.now ?? (() => Date.now());
  const log: MockAudioManagerLog[] = [];

  const record = (entry: Omit<MockAudioManagerLog, 'at'>): void => {
    log.push({ ...entry, at: now() });
  };

  return {
    get log() {
      return log;
    },
    clearLog() {
      log.length = 0;
    },
    play(cueId) {
      if (muted) return;
      record({ action: 'play', cueId });
    },
    loop(cueId) {
      if (muted) return;
      record({ action: 'loop', cueId });
    },
    stop(cueId) {
      record({ action: 'stop', cueId });
    },
    setMuted(next) {
      muted = next;
      record({ action: 'setMuted', muted: next });
    },
    isMuted() {
      return muted;
    },
  };
}
