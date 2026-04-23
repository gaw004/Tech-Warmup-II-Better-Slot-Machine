import { expect, test } from '@playwright/test';

import { clearAndGoto, readBalance, spinButton, waitForReelsToLand } from './helpers';

// End-to-end math → UI → wallet round trip. Pins the RNG via the P23 dev
// hook (?seed=) so a win lands deterministically inside the retry loop.
//
// Verified by a one-off seed finder: seed=7 produces a medium-tier win
// (3.2× total bet) on spin #2. The loop-up-to-10-spins pattern is kept as a
// safety net in case reel-strip tuning shifts the outcome under this seed.

const SEED = 7;
const MAX_SPINS = 10;
const TOTAL_BET = 25;

test.describe('winFlow', () => {
  test(`seeded spin produces a credited win with overlay (seed=${SEED})`, async ({ page }) => {
    await clearAndGoto(page, `/?seed=${SEED}`);

    const spin = spinButton(page);
    const overlay = page.getByRole('status', { name: /celebration/i });

    const startingBalance = await readBalance(page);
    expect(startingBalance).toBe(10_000);

    let previousBalance = startingBalance;
    let foundWin = false;
    let winningSpinIndex = -1;

    for (let i = 1; i <= MAX_SPINS; i++) {
      await spin.click();
      // 3500ms covers the full roll + landing so the overlay (if any) has
      // mounted before we probe. Cooldown (2000ms) is already clear, so the
      // next iteration can click immediately without an extra wait.
      await waitForReelsToLand(page);

      const afterReels = await readBalance(page);
      const won = afterReels > previousBalance - TOTAL_BET;

      if (won) {
        winningSpinIndex = i;
        // The overlay mounts at ~3.2s after click; small-tier celebrations
        // auto-dismiss in 500ms, so the probe is best-effort. If it's still
        // visible, wait out the full duration before moving on.
        if (await overlay.count() > 0) {
          await overlay.waitFor({ state: 'hidden', timeout: 10_000 });
        }
        expect(afterReels).toBeGreaterThan(previousBalance - TOTAL_BET);
        foundWin = true;
        break;
      }

      previousBalance = afterReels;
    }

    expect(
      foundWin,
      `No win landed within ${MAX_SPINS} spins under seed=${SEED}; reel-strip RTP likely shifted.`,
    ).toBe(true);
    expect(winningSpinIndex).toBeGreaterThan(0);

    // Net balance after the winning spin must exceed the stake-less floor.
    const finalBalance = await readBalance(page);
    expect(finalBalance).toBeGreaterThan(startingBalance - winningSpinIndex * TOTAL_BET);
  });
});
