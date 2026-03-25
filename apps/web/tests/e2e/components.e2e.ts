import { test, expect } from '@playwright/test';

test.describe('Vertex IDE UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to be stable
    await page.waitForLoadState('networkidle');
  });

  test('sidebar explorer should render and interact', async ({ page }) => {
    const explorer = page.locator('v-sidebar');
    await expect(explorer).toBeVisible();
    
    // Check for Explorer header
    await expect(page.getByText('Explorer')).toBeVisible();

    // Verify root folder node exists
    const rootNode = page.getByText('web-project');
    await expect(rootNode).toBeVisible({ timeout: 5000 });
    
    // Verify src folder is visible (expanded by default)
    const srcNode = page.getByText('src').first();
    await expect(srcNode).toBeVisible();

    // Verify app folder is visible
    const appNode = page.getByText('app').first();
    await expect(appNode).toBeVisible();
  });

  test('tabs should switch correctly', async ({ page }) => {
    const tabs = page.locator('v-tabs');
    await expect(tabs).toBeVisible();

    // Check for active tab (index.html is active by default)
    const activeTab = tabs.locator('.tab-item-vx.active');
    await expect(activeTab).toContainText('index.html', { timeout: 5000 });
    
    // Find main.ts tab and click it
    const mainTsTab = page.getByText('main.ts').first();
    await mainTsTab.click();
    
    // Verify main.ts is now active
    await expect(tabs.locator('.tab-item-vx.active')).toContainText('main.ts');
  });

  test('bottom panel should switch tabs', async ({ page }) => {
    const bottomPanel = page.locator('v-bottom-panel');
    await expect(bottomPanel).toBeVisible();

    const tabsList = ['PROBLEMS', 'OUTPUT', 'DEBUG CONSOLE', 'TERMINAL'];
    
    for (const tabName of tabsList) {
      const tabButton = bottomPanel.locator('button', { hasText: tabName });
      await tabButton.click();
      // Use toHaveClass to verify active state
      await expect(tabButton).toHaveClass(/active/);
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
