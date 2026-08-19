import { expect, test } from '@playwright/test';

test('loads the 3D home and saves edits without authentication', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /The City Home/i })).toBeVisible();
  await expect(page.locator('canvas[data-scene="city-home"]')).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() =>
    (window as typeof window & { CH?: { stop(): void } }).CH?.stop(),
  );
  await expect(page.getByRole('button', { name: 'Evening' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit layout/ })).toBeVisible();
  await expect(page.locator('.error-overlay')).toHaveCount(0);

  await page.getByRole('button', { name: 'Fall', exact: true }).click();
  await page.getByLabel('Halloween mode').check();
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { CH?: { getAudioMode(): string } }).CH?.getAudioMode(),
  )).toBe('halloween');

  await page.getByRole('button', { name: 'Winter', exact: true }).click();
  await page.getByLabel('Christmas mode').check();
  await expect(page.getByLabel('Snowing')).toBeChecked();
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { CH?: { getAudioMode(): string } }).CH?.getAudioMode(),
  )).toBe('xmas');

  await page.getByRole('button', { name: /Edit layout/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText(/saved/i);
  await page.reload();
  await expect(page.getByRole('button', { name: /Edit layout/ })).toBeVisible({ timeout: 60_000 });
});

test('exports, imports, and resets browser-local JSON layouts', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.locator('canvas[data-scene="city-home"]')).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() =>
    (window as typeof window & { CH?: { stop(): void } }).CH?.stop(),
  );

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('city-home-layout.json');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'imported-layout.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      version: 2,
      name: 'Imported layout',
      edits: {},
      added: [],
      rooms: { Kitchen: { floor: 'oakFloor' } },
      walls: {},
    })),
  });
  await expect(page.locator('.save-state')).toHaveText(/dirty/i);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const saved = localStorage.getItem('cityhome-layout-v2');
    return saved ? JSON.parse(saved).rooms : null;
  })).toEqual({});
});
