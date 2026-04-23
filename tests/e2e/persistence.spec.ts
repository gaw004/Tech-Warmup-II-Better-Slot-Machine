import { expect, test } from '@playwright/test';

import { clearAndGoto, readBalance, spinButton, waitForReelsToLand } from './helpers';

// Persistence: P08 wallet writes balance and line bet to localStorage on
// every commit. Reloading the page must rehydrate both — this spec exercises
// the localStorage round trip through the full UI.

test.describe('persistence', () => {
  test('balance and line bet survive a page reload', async ({ page }) => {
    await clearAndGoto(page);

    // Step the line bet up twice: 1 → 2 → 5.
    await page.getByRole('button', { name: 'Increase line bet' }).click();
    await page.getByRole('button', { name: 'Increase line bet' }).click();
    const stepper = page.getByRole('group', { name: 'Line bet' });
    await expect(stepper.getByText('5', { exact: true })).toBeVisible();

    // Spin once so balance moves off the default 10,000.
    await spinButton(page).click();
    await waitForReelsToLand(page);

    const balanceAfterSpin = await readBalance(page);

    await page.reload();

    await expect(page.getByRole('group', { name: 'Line bet' }).getByText('5', { exact: true })).toBeVisible();
    expect(await readBalance(page)).toBe(balanceAfterSpin);
  });
});
