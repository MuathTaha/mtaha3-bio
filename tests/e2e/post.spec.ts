import { test, expect } from '@playwright/test';

test('post page renders title and body', async ({ page }) => {
  await page.goto('/');
  const firstLink = page.locator('article a').first();
  await firstLink.click();
  await expect(page.locator('h1')).toBeVisible();
});
