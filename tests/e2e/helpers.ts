import type { Locator, Page } from '@playwright/test';

// Shared utilities for the P24 Playwright suite. All helpers are pure wrappers
// around `page` — no state, no globals — so specs stay independent per the
// brief's "no shared state between test files" rule.

/**
 * Navigate to `path`, wipe localStorage, and reload so the P08 wallet hydrates
 * fresh. Use this in every `test.beforeEach` (or at the top of a test that
 * wants a clean slate). The initial `goto` is required because `localStorage`
 * can only be cleared from inside the origin's execution context.
 */
export async function clearAndGoto(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/**
 * Reads the `Balance` aria-labelled element in the top bar and returns the
 * integer credit amount. Strips the "Balance" prefix, the "CC" suffix, and
 * thousands separators inserted by `formatCredits`.
 */
export async function readBalance(page: Page): Promise<number> {
  const text = await page.getByLabel('Balance').textContent();
  if (!text) throw new Error('Balance element has no text content');
  return Number(text.replace(/[^0-9]/g, ''));
}

/**
 * Default wait used after clicking Spin. Timing breakdown:
 *   • 0ms         click fires → GameController.spin() → isSpinning=true
 *   • 2000ms      rolling phase ends → controller flips isSpinning=false
 *   • ~2900ms     last reel lands (stagger: 180ms × 4 reels after reel 0)
 *   • ~3160ms     ReelGrid calls onAnimationComplete → notifyReelsLanded
 *                 → WinOverlay mounts (if totalWin > 0)
 * 3500ms leaves margin for slow CI runners. Cooldown (2000ms) is long past
 * by the time this returns, so callers can click the next spin immediately.
 */
export async function waitForReelsToLand(page: Page): Promise<void> {
  await page.waitForTimeout(3_500);
}

/**
 * Locator for the primary Spin button. Uses `/^Spin/` to disambiguate from
 * the bottom bar's "Auto-spin presets" button — Playwright's default `name`
 * matching is substring, which would collide on "Spin" ⊂ "Auto-spin".
 * SpinButton's accessible name is "Spin", "Spin (spinning)", or
 * "Spin (ready in X.X seconds)" depending on state; the regex covers all
 * three while excluding "Auto-spin presets".
 */
export function spinButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Spin/ });
}
