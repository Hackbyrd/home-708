import { expect, test } from '@playwright/test';

test('keeps representative architectural views stable', async ({ page }) => {
  test.setTimeout(120_000);
  const failedResponses: string[] = [];
  page.on('response', async (response) => {
    if (response.status() < 400) return;
    failedResponses.push(`${response.status()} ${response.url()}: ${await response.text().catch(() => '')}`);
  });
  await page.addInitScript(() => {
    let seed = 0x5eed1234;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
  });
  await page.goto('/');
  const viewport = page.locator('.scene-viewport');
  await expect(page.locator('canvas[data-scene="city-home"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.loading-state')).toHaveCount(0, { timeout: 60_000 });
  expect(failedResponses).toEqual([]);
  await expect(page.locator('.error-overlay')).toHaveCount(0);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const debug = (window as typeof window & {
      CH?: {
        stop(): void;
        renderOnce(): void;
        view(position: [number, number, number], target: [number, number, number]): void;
      };
    }).CH;
    debug?.stop();
    debug?.view([46, 52, -52], [-15.8, 13, 24.85]);
    debug?.renderOnce();
  });
  await expect(viewport).toHaveScreenshot('exterior-day.png', { animations: 'disabled' });

  await page.getByRole('button', { name: 'Evening' }).click();
  await page.evaluate(() => (window as typeof window & { CH?: { renderOnce(): void } }).CH?.renderOnce());
  await expect(viewport).toHaveScreenshot('exterior-evening.png', { animations: 'disabled' });

  await page.getByRole('button', { name: /02 Main/ }).click();
  await page.evaluate(() => (window as typeof window & { CH?: { renderOnce(): void } }).CH?.renderOnce());
  await expect(viewport).toHaveScreenshot('main-floor.png', { animations: 'disabled' });

  await page.getByRole('button', { name: /03 Upper/ }).click();
  await page.evaluate(() => (window as typeof window & { CH?: { renderOnce(): void } }).CH?.renderOnce());
  await expect(viewport).toHaveScreenshot('upper-floor.png', { animations: 'disabled' });

  await page.getByRole('button', { name: /04 Pent/ }).click();
  await page.evaluate(() => (window as typeof window & { CH?: { renderOnce(): void } }).CH?.renderOnce());
  await expect(viewport).toHaveScreenshot('penthouse-floor.png', { animations: 'disabled' });

  await page.getByRole('button', { name: 'Fall', exact: true }).click();
  await page.getByRole('button', { name: /All/ }).click();
  await page.evaluate(() => (window as typeof window & { CH?: { renderOnce(): void } }).CH?.renderOnce());
  await expect(viewport).toHaveScreenshot('fall-exterior.png', { animations: 'disabled' });
  await expect(page.locator('.error-overlay')).toHaveCount(0);
});
