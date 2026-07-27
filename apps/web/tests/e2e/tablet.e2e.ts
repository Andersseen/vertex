import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 1024, height: 768 },
  hasTouch: true,
});

test('workbench keeps a usable tablet viewport baseline', async ({ page }) => {
  await page.goto('/editor');

  const layout = page.locator('v-main-layout');
  await expect(layout).toBeVisible();
  await expect(page.locator('v-editor')).toBeVisible();

  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
  expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.innerHeight);

  const searchFontSize = await page.locator('.vx-search-input').evaluate(
    (element) => getComputedStyle(element).fontSize,
  );
  expect(Number.parseFloat(searchFontSize)).toBeGreaterThanOrEqual(16);
});
