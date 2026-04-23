import { expect, test } from '@playwright/test';

import { clearAndGoto, readBalance } from './helpers';

// Paytable (§10.3): opens via menu → drawer → Paytable; shows all 13 paying
// symbols with their 3×/4×/5× multiplier headers; closes without disturbing
// balance or bet state.

const PAYING_SYMBOLS = [
  'Cherry',
  'Lime',
  'Watermelon',
  'BAR',
  'Bell',
  'Horseshoe',
  'Clover',
  'Diamond',
  'Neon 7',
  'Katana',
  'Cyber Iris',
  'Chrome Skull',
  'Gold Kanji',
] as const;

test.describe('paytable', () => {
  test('opens from the menu, lists 13 symbols, closes without losing state', async ({ page }) => {
    await clearAndGoto(page);

    // Bump line bet so we can verify state survives the round trip.
    await page.getByRole('button', { name: 'Increase line bet' }).click();
    const stepper = page.getByRole('group', { name: 'Line bet' });
    await expect(stepper.getByText('2', { exact: true })).toBeVisible();
    const balanceBefore = await readBalance(page);

    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Main menu' });
    await drawer.getByRole('button', { name: 'Paytable' }).click();

    // Scope all symbol / header assertions to within the paytable region so
    // ReelGrid's tile labels (which also read "Cherry", "Lime", …) don't
    // trigger strict-mode locator collisions.
    const paytable = page.getByRole('region', { name: 'Paytable' });
    await expect(paytable).toBeVisible();
    await expect(paytable.getByRole('heading', { name: 'Paytable', level: 2 })).toBeVisible();

    await expect(paytable.getByText('3×', { exact: true })).toBeVisible();
    await expect(paytable.getByText('4×', { exact: true })).toBeVisible();
    await expect(paytable.getByText('5×', { exact: true })).toBeVisible();

    for (const name of PAYING_SYMBOLS) {
      await expect(paytable.getByText(name, { exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Return to game' }).click();

    await expect(page.getByRole('group', { name: 'Reel grid' })).toBeVisible();
    await expect(stepper.getByText('2', { exact: true })).toBeVisible();
    expect(await readBalance(page)).toBe(balanceBefore);
  });
});
