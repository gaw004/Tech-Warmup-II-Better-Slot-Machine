import { expect, test } from '@playwright/test';

import { clearAndGoto } from './helpers';

// Top-bar jackpot ticker. P07 is deferred, so values are hardcoded decorative
// constants — this spec verifies only that the 3-second rotation visits all
// four tier labels within a 15-second observation window. It does NOT assert
// any count-up or tick behaviour because none exists in this scope.

const TIERS = ['Chip', 'Disk', 'Vault', 'Mainframe'] as const;
const DWELL_MS = 3_000;
// Four dwell cycles + margin. The 100ms sampling cadence below polls ~150×.
const OBSERVATION_MS = DWELL_MS * 4 + 3_000;
const SAMPLE_MS = 100;

test.describe('top bar ticker', () => {
  test('rotates through all four jackpot tiers within a 15-second window', async ({ page }) => {
    await clearAndGoto(page);

    const ticker = page.getByRole('group', { name: 'Progressive jackpots' });
    await expect(ticker).toBeVisible();

    const seen = new Set<string>();
    const deadline = Date.now() + OBSERVATION_MS;

    while (Date.now() < deadline && seen.size < TIERS.length) {
      const text = (await ticker.textContent()) ?? '';
      for (const tier of TIERS) {
        if (text.includes(`${tier} Jackpot`)) seen.add(tier);
      }
      if (seen.size === TIERS.length) break;
      await page.waitForTimeout(SAMPLE_MS);
    }

    expect([...seen].sort()).toEqual([...TIERS].sort());
  });
});
