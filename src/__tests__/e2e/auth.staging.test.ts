import { expect, test } from '@playwright/test';
import {
  createEphemeralUser,
  deleteEphemeralUser,
  hasStagingAdminEnv,
  uniqueEmail,
} from './helpers/staging-auth';

const registerPassword = 'ValidPassw0rd!';

const signIn = async (page: import('@playwright/test').Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
};

test.describe('Staging real auth flows', () => {
  test.skip(!hasStagingAdminEnv(), 'Staging Supabase admin env is required for this suite');

  test('registers a real user with safe UX outcome', async ({ page }) => {
    const email = uniqueEmail('e2e.register');

    await page.goto('/register');
    await page.getByLabel(/first name/i).fill('E2E');
    await page.getByLabel(/last name/i).fill('Register');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/^password$/i).fill(registerPassword);
    await page.getByLabel(/confirm password/i).fill(registerPassword);
    await page.getByRole('checkbox', { name: /i agree to/i }).check();
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/(login|booking\/vehicle)(\?.*)?$/);
    if (page.url().includes('/login')) {
      await expect(page.getByText(/account created successfully/i)).toBeVisible();
    }
  });

  test('logs in with valid credentials from a confirmed user', async ({ page }) => {
    const user = await createEphemeralUser('user');

    try {
      await signIn(page, user.email, user.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await expect(page.getByRole('button', { name: /e2euser/i })).toBeVisible();
    } finally {
      await deleteEphemeralUser(user.id);
    }
  });

  test('shows safe generic message on invalid credentials', async ({ page }) => {
    await signIn(page, uniqueEmail('e2e.invalid'), 'WrongPass123!');
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});
