import { describe, expect, it } from 'vitest';

import {
  DEFAULT_JACKPOT_RATES,
  JACKPOT_SEEDS,
  TIER_ORDER,
  createMockJackpotCounter,
} from '../ui/jackpotCounterMock';
import {
  TICKER_DWELL_MS,
  TICKER_ORDER,
  TIER_LABELS,
  activeTierAt,
} from '../ui/TopBar';

// Pure-helper tests for P16. Rendering is covered by the demo page in dev and
// by Playwright in P24 — the test file stays in the `node` environment so the
// module boundary matches the rest of the suite.

describe('mock JackpotCounter: seeds & order', () => {
  it('JACKPOT_SEEDS matches the §7.2 starting pool sizes', () => {
    expect(JACKPOT_SEEDS).toEqual({
      chip: 1_000,
      disk: 10_000,
      vault: 100_000,
      mainframe: 1_000_000,
    });
  });

  it('TIER_ORDER / TICKER_ORDER match the §10.1 rotation order', () => {
    expect(TIER_ORDER).toEqual(['chip', 'disk', 'vault', 'mainframe']);
    expect(TICKER_ORDER).toEqual(TIER_ORDER);
  });

  it('default rates tick Mainframe fastest and Chip slowest (§7.3)', () => {
    const { chip, disk, vault, mainframe } = DEFAULT_JACKPOT_RATES;
    expect(chip).toBeLessThan(disk);
    expect(disk).toBeLessThan(vault);
    expect(vault).toBeLessThan(mainframe);
  });

  it('TIER_LABELS covers every tier the ticker rotates through', () => {
    for (const tier of TICKER_ORDER) {
      expect(TIER_LABELS[tier]).toBeTruthy();
    }
  });
});

describe('mock JackpotCounter: tick / hit / subscribe', () => {
  it('snapshot starts at the §7.2 seeds when no initial is provided', () => {
    const counter = createMockJackpotCounter({ now: () => 0 });
    expect(counter.snapshot()).toMatchObject(JACKPOT_SEEDS);
  });

  it('getState and snapshot return the same reference', () => {
    const counter = createMockJackpotCounter({ now: () => 0 });
    expect(counter.getState()).toBe(counter.snapshot());
  });

  it('tick advances all four tiers proportionally to elapsed time', () => {
    const counter = createMockJackpotCounter({ now: () => 0 });
    const next = counter.tick(1_000);
    expect(next.chip).toBeCloseTo(JACKPOT_SEEDS.chip + 1000 * DEFAULT_JACKPOT_RATES.chip);
    expect(next.disk).toBeCloseTo(JACKPOT_SEEDS.disk + 1000 * DEFAULT_JACKPOT_RATES.disk);
    expect(next.vault).toBeCloseTo(JACKPOT_SEEDS.vault + 1000 * DEFAULT_JACKPOT_RATES.vault);
    expect(next.mainframe).toBeCloseTo(
      JACKPOT_SEEDS.mainframe + 1000 * DEFAULT_JACKPOT_RATES.mainframe,
    );
    expect(next.updatedAt).toBe(1_000);
  });

  it('mainframe delta per tick is strictly larger than chip delta', () => {
    const counter = createMockJackpotCounter({ now: () => 0 });
    const before = counter.snapshot();
    const next = counter.tick(1_000);
    const chipDelta = next.chip - before.chip;
    const mainframeDelta = next.mainframe - before.mainframe;
    expect(mainframeDelta).toBeGreaterThan(chipDelta);
  });

  it('tick with non-advancing nowMs is a no-op and returns the same reference', () => {
    const counter = createMockJackpotCounter({ now: () => 1_000 });
    const before = counter.snapshot();
    const next = counter.tick(500);
    expect(next).toBe(before);
  });

  it('hit(tier) returns the previous amount and resets only that tier', () => {
    const counter = createMockJackpotCounter({ now: () => 0 });
    counter.tick(10_000);
    const before = counter.snapshot();
    const prize = counter.hit('vault');
    expect(prize).toBe(before.vault);
    const after = counter.snapshot();
    expect(after.vault).toBe(JACKPOT_SEEDS.vault);
    expect(after.chip).toBe(before.chip);
    expect(after.disk).toBe(before.disk);
    expect(after.mainframe).toBe(before.mainframe);
  });

  it('subscribers fire on every tick and hit; unsubscribe stops them', () => {
    const counter = createMockJackpotCounter({ now: () => 0 });
    let emissions = 0;
    const unsub = counter.subscribe(() => {
      emissions += 1;
    });
    counter.tick(100);
    counter.tick(200);
    counter.hit('chip');
    unsub();
    counter.tick(300); // must not count
    expect(emissions).toBe(3);
  });

  it('accepts a partial initial snapshot and partial rate override', () => {
    const counter = createMockJackpotCounter({
      now: () => 0,
      initial: { mainframe: 5_000_000 },
      rates: { chip: 10 },
    });
    expect(counter.snapshot().mainframe).toBe(5_000_000);
    const next = counter.tick(1_000);
    expect(next.chip).toBe(JACKPOT_SEEDS.chip + 10_000);
  });
});

describe('TopBar: activeTierAt rotation', () => {
  it('shows the first tier for the full first dwell period', () => {
    expect(activeTierAt(0, 0)).toBe('chip');
    expect(activeTierAt(TICKER_DWELL_MS - 1, 0)).toBe('chip');
  });

  it('advances one tier per dwell period and wraps around the order', () => {
    const start = 1_000_000;
    for (let i = 0; i < 12; i++) {
      const now = start + i * TICKER_DWELL_MS;
      expect(activeTierAt(now, start)).toBe(TICKER_ORDER[i % TICKER_ORDER.length]);
    }
  });

  it('treats nowMs before startMs as the first tier (no negative indexing)', () => {
    expect(activeTierAt(500, 1_000)).toBe('chip');
  });

  it('respects a custom dwellMs', () => {
    const dwell = 500;
    expect(activeTierAt(0, 0, dwell)).toBe('chip');
    expect(activeTierAt(dwell, 0, dwell)).toBe('disk');
    expect(activeTierAt(dwell * 3, 0, dwell)).toBe('mainframe');
    expect(activeTierAt(dwell * 4, 0, dwell)).toBe('chip');
  });
});
