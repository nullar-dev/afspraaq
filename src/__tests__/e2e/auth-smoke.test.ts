import { expect, test } from '@playwright/test';

test.describe('Auth Routes Smoke', () => {
  test('login page renders primary controls', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login page create-account button navigates to /register', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Create one').click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('register page sign-in button navigates to /login', async ({ page }) => {
    await page.goto('/register');
    await page.getByText(/^Sign in$/).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
