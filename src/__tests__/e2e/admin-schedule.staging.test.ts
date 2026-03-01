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

test.describe('Admin Schedule Page', () => {
  test.skip(!hasStagingAdminEnv(), 'Staging admin env vars are required for admin E2E');

  test('admin can view schedule page', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/schedule');

      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
      await expect(page.getByText('Manage appointments')).toBeVisible();

      // Check for day/week toggle
      await expect(page.getByRole('button', { name: 'Day' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Week' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can switch between day and week views', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/schedule');

      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();

      // Click week view
      await page.getByRole('button', { name: 'Week' }).click();

      // Should show week grid
      await expect(page.locator('.grid-cols-7')).toBeVisible();

      // Click day view
      await page.getByRole('button', { name: 'Day' }).click();

      // Should show day schedule
      await expect(page.getByText(/AM|PM/)).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can navigate dates', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/schedule');

      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();

      // Click previous day
      const prevButton = page
        .locator('button')
        .filter({ has: page.locator('svg') })
        .first();
      await prevButton.click();

      // Page should update without error
      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });
});
