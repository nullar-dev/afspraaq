import { expect, test } from '@playwright/test';

test.describe('Staging access control', () => {
  test('unauthenticated users are redirected from protected routes', async ({ page }) => {
    await page.goto('/booking/services');
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.url()).toContain('redirect=%2Fbooking%2Fservices');
  });

  test('unsafe redirect query is not propagated', async ({ page }) => {
    await page.goto('/booking/services?redirect=//evil.example');
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.url()).toContain('redirect=%2Fbooking%2Fservices');
  });
});
