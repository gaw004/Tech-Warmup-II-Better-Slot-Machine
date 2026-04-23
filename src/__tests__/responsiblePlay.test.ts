import { describe, it, expect } from 'vitest';

import {
  DEFAULT_REMINDER_INTERVAL_MIN,
  HIGH_BET_SESSION_LOSS_THRESHOLD,
  HIGH_BET_THRESHOLD,
  __RESPONSIBLE_PLAY_STORAGE_KEY,
  createMemoryStorage,
  createResponsiblePlay,
  type ResponsiblePlayEvent,
} from '../pureLogic/responsiblePlay';

describe('responsiblePlay: initial state', () => {
  it('defaults reminder interval on, soft caps off, high-bet confirm on (§12.2)', () => {
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => 0 });
    const s = rp.getState();
    expect(s.reminderIntervalMin).toBe(DEFAULT_REMINDER_INTERVAL_MIN);
    expect(s.dailyPlaytimeCapMin).toBeNull();
    expect(s.dailySpendCap).toBeNull();
    expect(s.highBetConfirmEnabled).toBe(true);
    expect(s.sessionStartedAt).toBe(0);
  });
});

describe('responsiblePlay: high-bet confirmation (§12.2)', () => {
  it('emits highBetConfirmRequest only when bet > 500 AND session loss > 50,000', () => {
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => 0 });
    const events: ResponsiblePlayEvent[] = [];
    rp.onEvent((e) => events.push(e));

    // Below both thresholds: no event.
    expect(rp.checkHighBet(500, 50_000)).toBe(false);
    expect(events).toHaveLength(0);

    // Loss threshold met but bet at the boundary: no event (strict >).
    expect(rp.checkHighBet(500, 60_000)).toBe(false);
    expect(events).toHaveLength(0);

    // Bet above threshold but session loss at the boundary: no event.
    expect(rp.checkHighBet(600, 50_000)).toBe(false);
    expect(events).toHaveLength(0);

    // Both above threshold: fires.
    expect(rp.checkHighBet(600, 50_001)).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'highBetConfirmRequest', bet: 600 });

    // Threshold constants exposed for external spec parity.
    expect(HIGH_BET_THRESHOLD).toBe(500);
    expect(HIGH_BET_SESSION_LOSS_THRESHOLD).toBe(50_000);
  });

  it('is suppressed when highBetConfirmEnabled is false', () => {
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => 0 });
    const events: ResponsiblePlayEvent[] = [];
    rp.onEvent((e) => events.push(e));

    rp.setHighBetConfirmEnabled(false);
    expect(rp.checkHighBet(1_000, 100_000)).toBe(false);
    expect(events).toHaveLength(0);
  });
});

describe('responsiblePlay: session-time reminders', () => {
  it('fires at the configured interval and resets the timer', () => {
    let now = 0;
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => now });
    const events: ResponsiblePlayEvent[] = [];
    rp.onEvent((e) => events.push(e));
    rp.setReminderInterval(30);

    now = 29 * 60_000;
    rp.tick(now);
    expect(events).toHaveLength(0);

    now = 30 * 60_000;
    rp.tick(now);
    expect(events.filter((e) => e.type === 'sessionTimeReminder')).toHaveLength(1);

    now = 59 * 60_000;
    rp.tick(now);
    expect(events.filter((e) => e.type === 'sessionTimeReminder')).toHaveLength(1);

    now = 60 * 60_000;
    rp.tick(now);
    expect(events.filter((e) => e.type === 'sessionTimeReminder')).toHaveLength(2);
  });

  it('does not fire when reminder is off (null)', () => {
    let now = 0;
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => now });
    const events: ResponsiblePlayEvent[] = [];
    rp.onEvent((e) => events.push(e));
    rp.setReminderInterval(null);

    for (let i = 1; i <= 5; i++) {
      now = i * 60 * 60_000;
      rp.tick(now);
    }
    expect(events).toHaveLength(0);
  });

  it('rejects invalid reminder intervals', () => {
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => 0 });
    expect(() => rp.setReminderInterval(45)).toThrow();
    expect(() => rp.setReminderInterval(0)).toThrow();
  });
});

describe('responsiblePlay: daily caps', () => {
  it('emits dailyPlaytimeCapReached once per day on cap crossing', () => {
    let now = 0;
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => now });
    const events: ResponsiblePlayEvent[] = [];
    rp.onEvent((e) => events.push(e));
    rp.setDailyPlaytimeCap(30);

    now = 20 * 60_000;
    rp.tick(now);
    expect(events.filter((e) => e.type === 'dailyPlaytimeCapReached')).toHaveLength(0);

    now = 30 * 60_000;
    rp.tick(now);
    const capEvents = events.filter((e) => e.type === 'dailyPlaytimeCapReached');
    expect(capEvents).toHaveLength(1);

    now = 45 * 60_000;
    rp.tick(now);
    expect(events.filter((e) => e.type === 'dailyPlaytimeCapReached')).toHaveLength(1);
  });

  it('canSpend returns false when spending would exceed the daily cap', () => {
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => 0 });
    rp.setDailySpendCap(100);
    expect(rp.canSpend(50)).toBe(true);
    rp.recordSpendDelta(60);
    expect(rp.canSpend(50)).toBe(false);
    expect(rp.canSpend(40)).toBe(true);
  });

  it('emits dailySpendCapReached once per day when spend crosses cap', () => {
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => 0 });
    const events: ResponsiblePlayEvent[] = [];
    rp.onEvent((e) => events.push(e));
    rp.setDailySpendCap(100);

    rp.recordSpendDelta(50);
    expect(events.filter((e) => e.type === 'dailySpendCapReached')).toHaveLength(0);
    rp.recordSpendDelta(60);
    expect(events.filter((e) => e.type === 'dailySpendCapReached')).toHaveLength(1);
    rp.recordSpendDelta(10);
    expect(events.filter((e) => e.type === 'dailySpendCapReached')).toHaveLength(1);
  });

  it('resets daily counters on calendar-day rollover', () => {
    let now = 0;
    const rp = createResponsiblePlay({ storage: createMemoryStorage(), now: () => now });
    rp.setDailySpendCap(100);
    rp.recordSpendDelta(80);
    expect(rp.getState().dailySpend).toBe(80);

    now = 24 * 60 * 60 * 1000 + 1;
    rp.recordSpendDelta(10);
    expect(rp.getState().dailySpend).toBe(10);
  });
});

describe('responsiblePlay: localStorage persistence', () => {
  it('persists user-chosen settings across reloads', () => {
    const storage = createMemoryStorage();
    const first = createResponsiblePlay({ storage, now: () => 0 });
    first.setReminderInterval(15);
    first.setDailyPlaytimeCap(120);
    first.setDailySpendCap(500);
    first.setHighBetConfirmEnabled(false);

    const reloaded = createResponsiblePlay({ storage, now: () => 0 });
    const s = reloaded.getState();
    expect(s.reminderIntervalMin).toBe(15);
    expect(s.dailyPlaytimeCapMin).toBe(120);
    expect(s.dailySpendCap).toBe(500);
    expect(s.highBetConfirmEnabled).toBe(false);
  });

  it('falls back to defaults on corrupt JSON', () => {
    const storage = createMemoryStorage({ [__RESPONSIBLE_PLAY_STORAGE_KEY]: '{not valid' });
    const rp = createResponsiblePlay({ storage, now: () => 0 });
    expect(rp.getState().reminderIntervalMin).toBe(DEFAULT_REMINDER_INTERVAL_MIN);
    expect(rp.getState().highBetConfirmEnabled).toBe(true);
  });

  it('works with storage === null', () => {
    const rp = createResponsiblePlay({ storage: null, now: () => 0 });
    rp.setReminderInterval(15);
    expect(rp.getState().reminderIntervalMin).toBe(15);
  });
});
