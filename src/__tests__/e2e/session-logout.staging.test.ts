import { expect, test } from '@playwright/test';
import {
  createEphemeralUser,
  deleteEphemeralUser,
  requireStagingAdminEnv,
} from './helpers/staging-auth';

const login = async (page: import('@playwright/test').Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/booking\/vehicle$/);
};

test.describe('Staging session and logout', () => {
  test.beforeAll(() => {
    requireStagingAdminEnv();
  });

  test('session persists after reload, logout redirects, and protected routes lock again', async ({
    page,
  }) => {
    const user = await createEphemeralUser('user');

    try {
      await login(page, user.email, user.password);
      await expect(page.getByRole('button', { name: /e2euser/i })).toBeVisible();

      await page.reload();
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await expect(page.getByRole('button', { name: /e2euser/i })).toBeVisible();

      await page.getByRole('button', { name: /e2euser/i }).click();
      await page.getByRole('menuitem', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/\/login$/);

      await page.goto('/booking/vehicle');
      await expect(page).toHaveURL(/\/login(\?.*)?$/);
      await expect(page.url()).toContain('redirect=%2Fbooking%2Fvehicle');
    } finally {
      await deleteEphemeralUser(user.id);
    }
  });
});
