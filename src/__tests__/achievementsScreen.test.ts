import { describe, expect, it } from 'vitest';

import {
  ACHIEVEMENT_COUNT,
  ACHIEVEMENT_DEFINITIONS,
  bucketFor,
  createMockAchievementsStore,
  sortAchievements,
  totalClaimableCc,
} from '../ui/achievementsMock';

// Pure-helper tests for the P21 achievements screen. Covers the §14.3
// acceptance bullet (≥30 achievements), bucket sort order, and the store's
// claim-reward contract.

describe('ACHIEVEMENT_DEFINITIONS catalog', () => {
  it('satisfies §14.3 "roughly 30 achievements"', () => {
    expect(ACHIEVEMENT_COUNT).toBeGreaterThanOrEqual(30);
  });

  it('front-loads the six §14.3 examples', () => {
    const first6 = ACHIEVEMENT_DEFINITIONS.slice(0, 6).map((a) => a.id);
    expect(first6).toEqual([
      'scriptKiddie',
      'dataRunner',
      'blackIce',
      'fullSend',
      'chromeDome',
      'corpoKiller',
    ]);
  });

  it('uses unique IDs', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each entry rewards a positive CC amount', () => {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(def.rewardCc).toBeGreaterThan(0);
    }
  });
});

describe('bucketFor / sortAchievements', () => {
  const state = {
    unlocked: new Set(['firstLogin', 'wildRespin']),
    claimable: new Set(['scriptKiddie', 'dataRunner']),
  };

  it('classifies claimable > unlocked > locked', () => {
    expect(bucketFor('scriptKiddie', state)).toBe('claimable');
    expect(bucketFor('dataRunner', state)).toBe('claimable');
    expect(bucketFor('firstLogin', state)).toBe('unlocked');
    expect(bucketFor('wildRespin', state)).toBe('unlocked');
    expect(bucketFor('blackIce', state)).toBe('locked');
  });

  it('sorts claimable first, then unlocked, then locked', () => {
    const rows = sortAchievements(ACHIEVEMENT_DEFINITIONS, state);
    const buckets = rows.map((r) => r.bucket);
    expect(buckets.slice(0, 2)).toEqual(['claimable', 'claimable']);
    // Find the last index of each bucket.
    const lastClaimable = buckets.lastIndexOf('claimable');
    const firstUnlocked = buckets.indexOf('unlocked');
    const lastUnlocked = buckets.lastIndexOf('unlocked');
    const firstLocked = buckets.indexOf('locked');
    expect(firstUnlocked).toBeGreaterThan(lastClaimable);
    expect(firstLocked).toBeGreaterThan(lastUnlocked);
  });

  it('preserves declaration order inside each bucket', () => {
    const rows = sortAchievements(ACHIEVEMENT_DEFINITIONS, state);
    const claimable = rows.filter((r) => r.bucket === 'claimable').map((r) => r.definition.id);
    expect(claimable).toEqual(['scriptKiddie', 'dataRunner']);
  });
});

describe('totalClaimableCc', () => {
  it('sums CC across only the claimable ids', () => {
    const state = {
      unlocked: new Set(['firstLogin']),
      claimable: new Set(['scriptKiddie', 'firstCascade']),
    };
    const expected =
      ACHIEVEMENT_DEFINITIONS.find((a) => a.id === 'scriptKiddie')!.rewardCc +
      ACHIEVEMENT_DEFINITIONS.find((a) => a.id === 'firstCascade')!.rewardCc;
    expect(totalClaimableCc(ACHIEVEMENT_DEFINITIONS, state)).toBe(expected);
  });
});

describe('createMockAchievementsStore', () => {
  it('claimReward pays once and flips the entry to unlocked', () => {
    const store = createMockAchievementsStore({ claimable: ['scriptKiddie'] });
    const reward = store.claimReward('scriptKiddie');
    expect(reward).toBeGreaterThan(0);
    const state = store.getState();
    expect(state.claimable.has('scriptKiddie')).toBe(false);
    expect(state.unlocked.has('scriptKiddie')).toBe(true);
    // Second claim pays zero.
    expect(store.claimReward('scriptKiddie')).toBe(0);
  });

  it('unknown ids pay zero and do not change state', () => {
    const store = createMockAchievementsStore();
    const before = store.getState();
    expect(store.claimReward('nope')).toBe(0);
    const after = store.getState();
    expect(after.unlocked.size).toBe(before.unlocked.size);
    expect(after.claimable.size).toBe(before.claimable.size);
  });

  it('notifies subscribers on claim', () => {
    const store = createMockAchievementsStore({ claimable: ['scriptKiddie'] });
    let calls = 0;
    const unsub = store.subscribe(() => {
      calls++;
    });
    store.claimReward('scriptKiddie');
    unsub();
    expect(calls).toBe(1);
  });
});
