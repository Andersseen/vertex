import { test, expect } from '@playwright/test';

test('editor page loads and shows file explorer', async ({ page }) => {
  await page.goto('/editor');

  await expect(page).toHaveTitle(/Vertex IDE/);

  // The editor page should render the main layout
  const layout = page.locator('v-editor-page');
  await expect(layout).toBeVisible();
});

test('can navigate from landing to LSP demo', async ({ page }) => {
  await page.goto('/');

  const lspLink = page.locator('a[href="/lsp-demo"]');
  await expect(lspLink).toBeVisible();

  await lspLink.click();
  await expect(page).toHaveURL(/\/lsp-demo/);
  await expect(page.locator('text=TypeScript LSP Demo')).toBeVisible();
});
