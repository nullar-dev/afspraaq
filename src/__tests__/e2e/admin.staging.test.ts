import { expect, test } from '@playwright/test';
import {
  createEphemeralUser,
  deleteEphemeralUser,
  hasStagingAdminEnv,
} from './helpers/staging-auth';

const signIn = async (page: import('@playwright/test').Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
};

test.describe('Staging admin access control', () => {
  test.skip(!hasStagingAdminEnv(), 'Staging admin env vars are required for admin E2E');

  test('non-admin is denied access to /admin', async ({ page }) => {
    const user = await createEphemeralUser('user');

    try {
      await signIn(page, user.email, user.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);

      await page.goto('/admin');
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
    } finally {
      await deleteEphemeralUser(user.id);
    }
  });

  test('admin user can access /admin and load admin UI', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);

      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin(?:#\/profiles)?$/);
      await expect(page.getByText(/profiles/i)).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });
});
