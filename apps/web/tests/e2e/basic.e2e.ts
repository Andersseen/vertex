import { test, expect } from '@playwright/test';

test('basic IDE layout loads', async ({ page }) => {
  await page.goto('/');
  
  // Check main container exists
  await expect(page.locator('app-root')).toBeVisible();
  
  // Check title
  await expect(page).toHaveTitle(/Vertex IDE/);
});

test('can navigate to main sections', async ({ page }) => {
  await page.goto('/');
  
  // Look for main landing content
  const mainContent = page.locator('v-landing');
  await expect(mainContent).toBeVisible();
});

test('responsive design works', async ({ page }) => {
  await page.goto('/');
  
  // Test desktop size
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(page.locator('app-root')).toBeVisible();
  
  // Test mobile size
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('app-root')).toBeVisible();
});
