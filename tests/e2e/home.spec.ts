import { test, expect } from '@playwright/test';

test('home page renders nav and at least one post', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('@MTAHA3')).toBeVisible();
  await expect(page.getByText('Recent writing')).toBeVisible();
  // Assuming seed post from Task 5 is published
  await expect(page.locator('article').first()).toBeVisible();
});
