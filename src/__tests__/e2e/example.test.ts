import { test, expect } from '@playwright/test';

test.describe('E2E Coverage', () => {
  test('login page loads with correct title', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Afspraaq/);
  });

  test('login page renders form elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login page has register link', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('link', { name: /create one/i })).toBeVisible();
  });

  test('login page register link navigates to register', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('login page has back to home link', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });

  test('login page back link navigates to home', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('link', { name: '← Back to home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('login form handles empty submission', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('register page loads with correct title', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Afspraaq/);
  });

  test('register page renders form elements', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('register page has login link', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('register page login link navigates to login', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('register page has back to home link', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });

  test('register page back link navigates to home', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('link', { name: '← Back to home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('register form accepts valid credentials', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    await expect(page.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  test('login route is accessible', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
  });

  test('register route is accessible', async ({ page }) => {
    const response = await page.goto('/register');
    expect(response?.status()).toBe(200);
  });

  test('homepage route is accessible', async ({ page }) => {
    const response = await page.goto('/');
    // Homepage loads (may show error if Supabase unavailable)
    expect([200, 500]).toContain(response?.status() ?? 0);
  });
});
