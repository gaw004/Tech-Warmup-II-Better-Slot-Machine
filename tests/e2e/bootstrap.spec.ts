import { expect, test } from '@playwright/test';

import { clearAndGoto, readBalance, spinButton } from './helpers';

// Reduced-scope acceptance: the app mounts directly with no age gate / no
// onboarding (P12 and the onboarding modal are deferred). Starting balance is
// 10,000 CC and bet controls default to line bet 1 / total bet 25.

test.describe('bootstrap', () => {
  test.beforeEach(async ({ page }) => {
    await clearAndGoto(page);
  });

  test('reel grid mounts without gating and balance reads 10,000 CC', async ({ page }) => {
    await expect(page.getByRole('group', { name: 'Reel grid' })).toBeVisible();
    expect(await readBalance(page)).toBe(10_000);
  });

  test('bottom bar initial state is line bet 1, total bet 25', async ({ page }) => {
    const stepper = page.getByRole('group', { name: 'Line bet' });
    await expect(stepper).toBeVisible();
    await expect(stepper.getByText('1', { exact: true })).toBeVisible();

    const totalBet = page.getByLabel('Total bet');
    await expect(totalBet).toBeVisible();
    await expect(totalBet).toContainText('1 × 25 lines');
  });

  test('spin button is immediately enabled (no gating to dismiss)', async ({ page }) => {
    await expect(spinButton(page)).toBeEnabled();
  });
});
