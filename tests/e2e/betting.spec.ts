import { expect, test } from '@playwright/test';

import { clearAndGoto, spinButton } from './helpers';

// Bet controls (§9.2): the stepper cycles [1, 2, 5, 10, 25, 50, 100] and
// disables at each end; Max Bet snaps to 100 (total bet 2,500); all three
// controls lock while a spin is in flight.

const BET_LADDER = [1, 2, 5, 10, 25, 50, 100] as const;

test.describe('betting', () => {
  test.beforeEach(async ({ page }) => {
    await clearAndGoto(page);
  });

  test('+ cycles through every ladder step and disables at 100', async ({ page }) => {
    const up = page.getByRole('button', { name: 'Increase line bet' });
    const stepper = page.getByRole('group', { name: 'Line bet' });

    // Start confirmed at 1, then walk 2 → … → 100.
    await expect(stepper.getByText('1', { exact: true })).toBeVisible();
    for (let i = 1; i < BET_LADDER.length; i++) {
      await up.click();
      await expect(stepper.getByText(String(BET_LADDER[i]), { exact: true })).toBeVisible();
    }
    await expect(up).toBeDisabled();
  });

  test('− cycles back down to 1 and disables at the bottom', async ({ page }) => {
    await page.getByRole('button', { name: /Max bet/ }).click();
    const stepper = page.getByRole('group', { name: 'Line bet' });
    await expect(stepper.getByText('100', { exact: true })).toBeVisible();

    const down = page.getByRole('button', { name: 'Decrease line bet' });
    for (let i = BET_LADDER.length - 2; i >= 0; i--) {
      await down.click();
      await expect(stepper.getByText(String(BET_LADDER[i]), { exact: true })).toBeVisible();
    }
    await expect(down).toBeDisabled();
  });

  test('Max Bet snaps line bet to 100 and total bet to 2,500', async ({ page }) => {
    await page.getByRole('button', { name: /Max bet/ }).click();

    const stepper = page.getByRole('group', { name: 'Line bet' });
    await expect(stepper.getByText('100', { exact: true })).toBeVisible();

    await expect(page.getByLabel('Total bet')).toContainText('2,500');
  });

  test('stepper and Max Bet are disabled while a spin is in flight', async ({ page }) => {
    await spinButton(page).click();

    await expect(page.getByRole('button', { name: 'Increase line bet' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Decrease line bet' })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Max bet/ })).toBeDisabled();
  });
});
