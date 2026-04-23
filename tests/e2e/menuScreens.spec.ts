import { expect, test, type Page } from '@playwright/test';

import { clearAndGoto } from './helpers';

// The three non-paytable P21 screens (Daily Bonus, Achievements, VIP).
// Per the P23 brief, each consumes hardcoded mock data (P09 / P10 deferred).
// These specs verify each screen mounts, shows something recognisable from
// its mock, and closes cleanly — no assertions on dynamic values.

async function openScreen(page: Page, entry: string): Promise<void> {
  await page.getByRole('button', { name: 'Open menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Main menu' });
  await drawer.getByRole('button', { name: entry }).click();
}

test.describe('menu screens', () => {
  test.beforeEach(async ({ page }) => {
    await clearAndGoto(page);
  });

  test('Daily Bonus mounts with seven-day calendar and closes', async ({ page }) => {
    await openScreen(page, 'Daily Bonus');

    await expect(page.getByRole('heading', { name: 'Daily Payload' })).toBeVisible();
    // DailyLoginModal renders a Day 1 cell on a fresh mock.
    await expect(page.getByText('Day 1').first()).toBeVisible();

    await page.getByRole('button', { name: 'Dismiss daily bonus' }).click();
    await expect(page.getByRole('group', { name: 'Reel grid' })).toBeVisible();
  });

  test('Achievements mounts with at least one in-theme entry and closes', async ({ page }) => {
    await openScreen(page, 'Achievements');

    await expect(page.getByRole('heading', { name: 'Achievements' })).toBeVisible();
    // Two of the 15 static entries from App.tsx's STATIC_ACHIEVEMENTS.
    await expect(page.getByText('Jack In', { exact: true })).toBeVisible();
    await expect(page.getByText('Full Send', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Return', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Reel grid' })).toBeVisible();
  });

  test('VIP mounts at Bronze tier and closes', async ({ page }) => {
    await openScreen(page, 'VIP Status');

    await expect(page.getByRole('heading', { name: 'Netrunner Status' })).toBeVisible();
    // lifetimeWager=0 → Bronze Jack tier.
    await expect(page.getByText('Bronze Jack').first()).toBeVisible();

    await page.getByRole('button', { name: 'Return', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Reel grid' })).toBeVisible();
  });
});
