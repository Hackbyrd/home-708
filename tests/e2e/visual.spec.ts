import { expect, test } from '@playwright/test';

type DebugApi = {
  stop(): void;
  renderOnce(): void;
  view(position: [number, number, number], target: [number, number, number]): void;
};

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
  const setView = async (
    position: [number, number, number],
    target: [number, number, number],
  ) => {
    await page.evaluate(({ position, target }) => {
      const debug = (window as typeof window & { CH?: DebugApi }).CH;
      debug?.view(position, target);
      debug?.renderOnce();
    }, { position, target });
  };

  await page.evaluate(() => {
    const debug = (window as typeof window & { CH?: DebugApi }).CH;
    debug?.stop();
  });
  await setView([46, 52, -52], [-15.8, 13, 24.85]);
  await expect(viewport).toHaveScreenshot('exterior-day.png', { animations: 'disabled' });

  await page.getByRole('button', { name: 'Evening' }).click();
  await page.evaluate(() => (window as typeof window & { CH?: { renderOnce(): void } }).CH?.renderOnce());
  await expect(viewport).toHaveScreenshot('exterior-evening.png', { animations: 'disabled' });

  await page.getByRole('button', { name: 'Day' }).click();
  await page.getByRole('button', { name: /01 Ground/ }).click();
  await setView([20, 58, -42], [-15, 2.5, 28]);
  await expect(viewport).toHaveScreenshot('ground-floor.png', { animations: 'disabled' });
  await setView([-25, 52, -2], [-15, 2.5, 10]);
  await expect(viewport).toHaveScreenshot('ground-office-media.png', { animations: 'disabled' });
  await setView([-22, 52, 41], [-12, 2.5, 31]);
  await expect(viewport).toHaveScreenshot('ground-gallery-studio.png', { animations: 'disabled' });

  await page.getByRole('button', { name: /02 Main/ }).click();
  await setView([20, 68, -42], [-15, 12.5, 28]);
  await expect(viewport).toHaveScreenshot('main-floor.png', { animations: 'disabled' });
  await setView([-25, 62, -1], [-15, 12.5, 11]);
  await expect(viewport).toHaveScreenshot('main-kitchen-dining.png', { animations: 'disabled' });
  await setView([-30, 62, 50], [-20, 12.5, 40]);
  await expect(viewport).toHaveScreenshot('main-great-sun.png', { animations: 'disabled' });

  await page.getByRole('button', { name: /03 Upper/ }).click();
  await setView([20, 78, -42], [-15, 22.5, 28]);
  await expect(viewport).toHaveScreenshot('upper-floor.png', { animations: 'disabled' });
  await setView([-24, 72, -1], [-14, 22.5, 12]);
  await expect(viewport).toHaveScreenshot('upper-bedrooms-laundry.png', { animations: 'disabled' });
  await setView([-30, 72, 50], [-20, 22.5, 40]);
  await expect(viewport).toHaveScreenshot('upper-owner-suite.png', { animations: 'disabled' });

  await page.getByRole('button', { name: /04 Pent/ }).click();
  await setView([20, 88, -42], [-15, 32.5, 28]);
  await expect(viewport).toHaveScreenshot('penthouse-floor.png', { animations: 'disabled' });
  await setView([-25, 82, -1], [-15, 32.5, 11]);
  await expect(viewport).toHaveScreenshot('penthouse-loft-bedroom.png', { animations: 'disabled' });
  await setView([-25, 82, 52], [-15, 32.5, 40]);
  await expect(viewport).toHaveScreenshot('penthouse-terraces.png', { animations: 'disabled' });

  await page.getByRole('button', { name: 'Fall', exact: true }).click();
  await page.getByRole('button', { name: /All/ }).click();
  await page.evaluate(() => (window as typeof window & { CH?: DebugApi }).CH?.renderOnce());
  await expect(viewport).toHaveScreenshot('fall-exterior.png', { animations: 'disabled' });
  await expect(page.locator('.error-overlay')).toHaveCount(0);
});
