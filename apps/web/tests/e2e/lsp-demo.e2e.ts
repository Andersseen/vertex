import { test, expect } from '@playwright/test';

test('LSP demo page loads with editor', async ({ page }) => {
  await page.goto('/lsp-demo');

  await expect(page).toHaveTitle(/Vertex IDE/);
  await expect(page.locator('text=TypeScript LSP Demo')).toBeVisible();

  const editor = page.locator('v-editor');
  await expect(editor).toBeVisible();

  // The editor should contain the demo TypeScript code
  const editorHost = editor.locator('.editor__host');
  await expect(editorHost).toBeVisible();
});

test('LSP badge is visible for TypeScript files', async ({ page }) => {
  await page.goto('/lsp-demo');

  const lspBadge = page.locator('text=LSP');
  await expect(lspBadge).toBeVisible();
});
