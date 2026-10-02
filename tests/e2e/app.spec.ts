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

test('opens the reference photos and blueprint viewer', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.locator('canvas[data-scene="city-home"]')).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() =>
    (window as typeof window & { CH?: { stop(): void } }).CH?.stop(),
  );

  await page.getByRole('button', { name: /Photos & blueprint/ }).click();
  const dialog = page.getByRole('dialog', { name: /Photos & blueprint/ });
  await expect(dialog).toBeVisible();
  const tiles = dialog.locator('.photo-tile');
  await expect.poll(() => tiles.count()).toBeGreaterThanOrEqual(27);
  const firstSrc = await tiles.first().locator('img').getAttribute('src');
  expect(firstSrc).toBeTruthy();
  const photo = await request.get(new URL(firstSrc!, page.url()).toString());
  expect(photo.status()).toBe(200);
  expect(photo.headers()['content-type']).toContain('image/webp');

  await tiles.first().click();
  await expect(page.locator('.lightbox img')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lightbox figcaption small')).toHaveText('2 / 27');
  await page.keyboard.press('Escape');
  await expect(page.locator('.lightbox')).toHaveCount(0);
  await expect(dialog).toBeVisible();

  await dialog.getByRole('tab', { name: 'Blueprint' }).click();
  const frame = dialog.locator('iframe.blueprint-frame');
  await expect(frame).toBeVisible();
  const pdfSrc = await frame.getAttribute('src');
  expect(pdfSrc).toMatch(/\.pdf$/);
  const pdf = await request.get(new URL(pdfSrc!, page.url()).toString());
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
