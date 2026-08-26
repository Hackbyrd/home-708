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
  const assertView = async (name: string) => {
    if (process.platform === 'darwin') {
      await expect(viewport).toHaveScreenshot(name, { animations: 'disabled' });
    } else {
      await viewport.screenshot({ animations: 'disabled' });
    }
  };

  await page.evaluate(() => {
    const debug = (window as typeof window & { CH?: DebugApi }).CH;
    debug?.stop();
  });
  await setView([46, 52, -52], [-15.8, 13, 24.85]);
  await assertView('exterior-day.png');

  await page.getByRole('button', { name: 'Evening' }).click();
  await page.evaluate(() => (window as typeof window & { CH?: { renderOnce(): void } }).CH?.renderOnce());
  await assertView('exterior-evening.png');

  await page.getByRole('button', { name: 'Day' }).click();
  await page.getByRole('button', { name: /01 Ground/ }).click();
  await setView([20, 58, -42], [-15, 2.5, 28]);
  await assertView('ground-floor.png');
  await setView([-25, 52, -2], [-15, 2.5, 10]);
  await assertView('ground-office-media.png');
  await setView([-22, 52, 41], [-12, 2.5, 31]);
  await assertView('ground-gallery-studio.png');

  await page.getByRole('button', { name: /02 Main/ }).click();
  await setView([20, 68, -42], [-15, 12.5, 28]);
  await assertView('main-floor.png');
  await setView([-25, 62, -1], [-15, 12.5, 11]);
  await assertView('main-kitchen-dining.png');
  await setView([-30, 62, 50], [-20, 12.5, 40]);
  await assertView('main-great-sun.png');

  await page.getByRole('button', { name: /03 Upper/ }).click();
  await setView([20, 78, -42], [-15, 22.5, 28]);
  await assertView('upper-floor.png');
  await setView([-24, 72, -1], [-14, 22.5, 12]);
  await assertView('upper-bedrooms-laundry.png');
  await setView([-30, 72, 50], [-20, 22.5, 40]);
  await assertView('upper-owner-suite.png');

  await page.getByRole('button', { name: /04 Pent/ }).click();
  await setView([20, 88, -42], [-15, 32.5, 28]);
  await assertView('penthouse-floor.png');
  await setView([-25, 82, -1], [-15, 32.5, 11]);
  await assertView('penthouse-loft-bedroom.png');
  await setView([-25, 82, 52], [-15, 32.5, 40]);
  await assertView('penthouse-terraces.png');

  await page.getByRole('button', { name: 'Fall', exact: true }).click();
  await page.getByRole('button', { name: /All/ }).click();
  await page.evaluate(() => (window as typeof window & { CH?: DebugApi }).CH?.renderOnce());
  await assertView('fall-exterior.png');
  await expect(page.locator('.error-overlay')).toHaveCount(0);
});
