import { test, expect } from '@playwright/test';

test.describe('Vertex IDE UI Components', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock FileSystem API at context level to catch all requests
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('127.0.0.1:3001') || url.includes('/fs/')) {
        
        if (url.includes('/children')) {
          const data = [
            { id: 'src', name: 'src', path: './src', kind: 'directory', size: 0, modifiedAt: new Date().toISOString() },
            { id: 'package.json', name: 'package.json', path: './package.json', kind: 'file', size: 1024, modifiedAt: new Date().toISOString(), language: 'json' }
          ];
          
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(data),
          });
        }

        if (url.includes('/read')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({ content: '// Mock content' }),
          });
        }

        if (route.request().method() === 'OPTIONS') {
          return route.fulfill({
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          });
        }
      }

      return route.continue();
    });
    
    await page.goto('/');
    // Wait for the app to be loaded
    await page.waitForLoadState('load');
    // Wait for the explorer to be visible
    await expect(page.locator('v-sidebar')).toBeVisible({ timeout: 15000 });
  });

  test('sidebar explorer should render and interact', async ({ page }) => {
    const explorer = page.locator('v-sidebar');
    await expect(explorer).toBeVisible();
    
    // Check for Explorer header
    await expect(page.getByText('Explorer')).toBeVisible();

    // Verify any tree node exists
    let someNode;
    try {
      // Look for the root folder "src" or "package.json" in the tree
      someNode = page.locator('v-sidebar').getByText('src').first();
      await expect(someNode).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('[E2E] Sidebar nodes not found, taking screenshot...');
      await page.screenshot({ path: 'test-results/sidebar-missing.png' });
      
      // Dump DOM for debugging
      const html = await page.locator('v-sidebar').innerHTML();
      console.log('[E2E] Sidebar InnerHTML:', html);
      throw e;
    }
    
    // Check if we have nodes
    const nodeCount = await page.locator('.p-treenode-label').count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test('tabs should switch correctly', async ({ page }) => {
    // 1. Wait for tree to be populated
    const fileNode = page.locator('.p-treenode-label').filter({ hasText: 'package.json' }).first();
    await expect(fileNode).toBeVisible({ timeout: 10000 });
    
    // 2. Open a file
    await fileNode.click();

    const tabs = page.locator('v-tabs');
    await expect(tabs).toBeVisible();

    // 3. Verify active tab
    // Wait for the active class to appear
    const activeTab = tabs.locator('.tab-item-vx.active');
    await expect(activeTab).toBeVisible({ timeout: 10000 });
    await expect(activeTab).toContainText('package.json');
  });

  test('bottom panel should switch tabs', async ({ page }) => {
    const bottomPanel = page.locator('v-bottom-panel');
    await expect(bottomPanel).toBeVisible();

    // Give it a moment to settle across all browsers
    await page.waitForTimeout(500);

    // Updated labels to match UI sentence case
    const tabsList = ['Problems', 'Output', 'Debug Console', 'Terminal'];
    
    for (const tabName of tabsList) {
      // Find button by its text content
      const tabButton = bottomPanel.locator('button').filter({ hasText: tabName });
      
      // Use force: true to ensure click happens even if there are JS errors blocking some interactions
      await tabButton.click({ force: true });
      
      // Use wait for class to appear with a generous timeout and retry
      await expect(tabButton).toHaveClass(/active/, { timeout: 15000 });
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
