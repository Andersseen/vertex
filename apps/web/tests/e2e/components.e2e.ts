import { test, expect } from '@playwright/test';

test.describe('Vertex IDE UI Components', () => {
  test.beforeEach(async ({ page }) => {
    // Start from a clean slate so a previously-registered service worker or
    // persisted session cannot influence the mocked filesystem state.
    await page.goto('about:blank');
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return;
      const unregister = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      };
      const clearCaches = async () => {
        if (!('caches' in window)) return;
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      };
      await Promise.all([unregister(), clearCaches()]);
      sessionStorage.clear();
      localStorage.clear();
    });

    // Prevent the production service worker from registering during tests.
    await page.route('**/sw.js', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'text/plain',
        body: 'Service worker disabled in tests',
      }),
    );

    // Mock the filesystem sidecar so the editor renders a predictable tree.
    await page.route('http://127.0.0.1:3001/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/fs/children')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
          body: JSON.stringify([
            {
              id: 'src',
              name: 'src',
              path: './src',
              kind: 'directory',
              size: 0,
              modifiedAt: new Date().toISOString(),
            },
            {
              id: 'package.json',
              name: 'package.json',
              path: './package.json',
              kind: 'file',
              size: 1024,
              modifiedAt: new Date().toISOString(),
              language: 'json',
            },
          ]),
        });
      }

      if (url.includes('/fs/read')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
          body: JSON.stringify({ content: '// Mock content' }),
        });
      }

      if (url.includes('/fs/workspace')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
          body: JSON.stringify({ path: '/mock/workspace' }),
        });
      }

      if (method === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      return route.continue();
    });

    await page.goto('/editor');
    await page.waitForLoadState('load');
    await expect(page.locator('v-sidebar')).toBeVisible({ timeout: 15000 });

    // Wait for the mocked tree to be populated so every test starts from a
    // known-good state.
    const fileNode = page
      .locator('.ide-tree-item__label')
      .filter({ hasText: 'package.json' })
      .first();
    await expect(fileNode).toBeVisible({ timeout: 15000 });
  });

  test('sidebar explorer should render and interact', async ({ page }) => {
    const explorer = page.locator('v-sidebar');
    await expect(explorer).toBeVisible();

    // Check for Explorer header
    await expect(page.getByText('Explorer')).toBeVisible();

    // Verify the mocked file node exists
    const fileNode = page
      .locator('.ide-tree-item__label')
      .filter({ hasText: 'package.json' })
      .first();
    await expect(fileNode).toBeVisible();

    // Check that we have nodes
    const nodeCount = await page.locator('.ide-tree-item__label').count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test('tabs should switch correctly', async ({ page }) => {
    // 1. Wait for tree to be populated
    const fileNode = page
      .locator('.ide-tree-item__label')
      .filter({ hasText: 'package.json' })
      .first();
    await expect(fileNode).toBeVisible({ timeout: 15000 });

    // 2. Open a file
    await fileNode.click();

    const tabs = page.locator('v-tabs');
    await expect(tabs).toBeVisible();

    // 3. Verify active tab
    const activeTab = tabs.locator('.tabs__item--active');
    await expect(activeTab).toBeVisible({ timeout: 15000 });
    await expect(activeTab).toContainText('package.json');
  });

  test('bottom panel should switch tabs', async ({ page }) => {
    const bottomPanel = page.locator('v-bottom-panel');
    await expect(bottomPanel).toBeVisible({ timeout: 20000 });

    // Give it a moment to settle
    await page.waitForTimeout(1000);

    const tabsList = [
      { name: 'Problems' },
      { name: 'Output' },
      { name: 'Debug Console' },
      { name: 'Terminal' },
    ];

    for (const tab of tabsList) {
      const tabButton = bottomPanel.getByRole('tab', { name: tab.name });

      await tabButton.click();

      // Wait for the active class to appear
      await expect(tabButton).toHaveClass(/ide-tabs__trigger--active/, { timeout: 10000 });

      // Verification of content visibility
      if (tab.name === 'Problems') {
        await expect(
          page
            .locator('.bottom-panel__problem')
            .first()
            .or(
              page
                .locator('.bottom-panel__console-item')
                .filter({ hasText: 'No problems detected' }),
            ),
        ).toBeVisible();
      }
    }
  });

  test('layout should have no gaps between panels', async ({ page }) => {
    const sidebar = page.locator('v-sidebar');
    const editorArea = page.locator('[editor]');

    await expect(sidebar).toBeVisible();
    await expect(editorArea).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const editorBox = await editorArea.boundingBox();

    if (sidebarBox && editorBox) {
      const gap = editorBox.x - (sidebarBox.x + sidebarBox.width);
      // Gutter is 4px, allowing some buffer
      expect(gap).toBeLessThanOrEqual(15);
      expect(gap).toBeGreaterThanOrEqual(0);
    }
  });
});
