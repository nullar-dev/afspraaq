import { expect, test } from '@playwright/test';

test.describe('Production-safe auth/access smoke', () => {
  test('login and register pages render and cross-link', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    // Wait for Suspense to resolve and content to load
    await page.waitForLoadState('networkidle');
    // Wait for the actual content (not just the Suspense fallback)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/register$/);

    await page.getByText(/^Sign in$/).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('protected routes redirect unauthenticated users to login with safe redirect', async ({
    page,
  }) => {
    await page.goto('/booking/vehicle');
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    if (page.url().includes('redirect=')) {
      await expect(page.url()).toContain('redirect=%2Fbooking%2Fvehicle');
    }

    await page.goto('/booking/vehicle?redirect=https://evil.example');
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    if (page.url().includes('redirect=')) {
      await expect(page.url()).toContain('redirect=%2Fbooking%2Fvehicle');
    }
  });

  test('admin route redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    if (page.url().includes('redirect=')) {
      await expect(page.url()).toContain('redirect=%2Fadmin');
    }
  });
});
