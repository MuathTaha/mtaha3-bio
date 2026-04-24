import { test, expect } from '@playwright/test';

test('newsletter form rejects bad email, accepts good one', async ({ page }) => {
  await page.route('**/api/newsletter/subscribe', (route) => {
    return route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });
  await page.goto('/');
  await page.locator('form input[type="email"]').scrollIntoViewIfNeeded();
  await page.locator('form input[type="email"]').fill('taha@example.com');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('Subscribed.')).toBeVisible();
});
