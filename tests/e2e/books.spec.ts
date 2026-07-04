import { test, expect } from '@playwright/test';

// Requires seeded dataset: one book per status, with the read book's title
// ending in "Book" (e.g. "Read Book") so the hover overlay test can locate it.

test.describe('/books', () => {
  test('renders the books page with read tab active by default', async ({ page }) => {
    await page.goto('/books');
    await expect(page.getByRole('heading', { name: 'Books' })).toBeVisible();
    const readTab = page.getByRole('button', { name: /^Read \(/ });
    await expect(readTab).toHaveAttribute('aria-current', 'page');
  });

  test('switches tab via URL state', async ({ page }) => {
    await page.goto('/books');
    await page.getByRole('button', { name: /^Reading/ }).click();
    await expect(page).toHaveURL(/\/books\?status=reading/);
    await expect(page.getByRole('button', { name: /^Reading/ })).toHaveAttribute('aria-current', 'page');
  });

  test('deep-links to want tab via ?status=want', async ({ page }) => {
    await page.goto('/books?status=want');
    await expect(page.getByRole('button', { name: /^Want to Read/ })).toHaveAttribute('aria-current', 'page');
  });

  test('book cover reveals title on hover', async ({ page }) => {
    await page.goto('/books?status=read');
    const firstCover = page.locator('ul.grid > li').first();
    await firstCover.hover();
    await expect(firstCover.getByText(/Book$/)).toBeVisible();
  });
});
