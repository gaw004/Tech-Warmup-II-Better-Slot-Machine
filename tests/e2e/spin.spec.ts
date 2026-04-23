import { expect, test } from '@playwright/test';

import { clearAndGoto, readBalance, spinButton, waitForReelsToLand } from './helpers';

// Spin mechanics: click deducts totalBet, grid populates with 15 tiles, and
// the 2-second cooldown blocks overlapping spins (§12.2). P23 owns the
// cooldown clock in the absence of P11.

test.describe('spin', () => {
  test.beforeEach(async ({ page }) => {
    await clearAndGoto(page);
  });

  test('clicking spin deducts 25 CC and populates the 5×3 grid', async ({ page }) => {
    expect(await readBalance(page)).toBe(10_000);

    await spinButton(page).click();
    await waitForReelsToLand(page);

    const after = await readBalance(page);
    // The 25 CC stake is deducted atomically; a win on the same spin may lift
    // the final balance above 9975 but never below it.
    expect(after).toBeGreaterThanOrEqual(10_000 - 25);

    const tiles = page.getByRole('group', { name: 'Reel grid' }).getByRole('listitem');
    await expect(tiles).toHaveCount(15);
  });

  test('spin button disables during the spin and re-enables after cooldown', async ({ page }) => {
    const spin = spinButton(page);
    await spin.click();

    // Disabled immediately (isSpinning=true) and for the full cooldown window.
    await expect(spin).toBeDisabled();
    // Playwright's retrying expect will poll until enabled; 5s ceiling is
    // well above the 2s cooldown + reel animation.
    await expect(spin).toBeEnabled({ timeout: 5_000 });
  });

  test('rapid-clicking does not stack deductions — cooldown holds', async ({ page }) => {
    const spin = spinButton(page);
    await spin.click();

    // Fire several extra clicks while the button is disabled. `force` bypasses
    // Playwright's actionability gate; the browser still refuses to dispatch
    // onClick on a DOM-disabled button, and GameController's `isSpinning`
    // guard backs that up. If either layer failed, balance would drop past
    // 9975 from compound 25 CC deductions.
    for (let i = 0; i < 5; i++) {
      await spin.click({ force: true }).catch(() => undefined);
    }

    await page.waitForTimeout(2_500);
    expect(await readBalance(page)).toBeGreaterThanOrEqual(10_000 - 25);
  });
});
