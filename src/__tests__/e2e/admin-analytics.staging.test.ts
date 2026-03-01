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

test.describe('Admin Analytics Page', () => {
  test.skip(!hasStagingAdminEnv(), 'Staging admin env vars are required for admin E2E');

  test('admin can view analytics page', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/analytics');

      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
      await expect(page.getByText('Track your business performance')).toBeVisible();

      // Check for stats cards
      await expect(page.getByText(/Today.*Revenue/i)).toBeVisible();
      await expect(page.getByText(/This Week/i)).toBeVisible();
      await expect(page.getByText(/This Month/i)).toBeVisible();
      await expect(page.getByText(/Active Customers/i)).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can see charts', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/analytics');

      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();

      // Check for chart headings
      await expect(page.getByText('Revenue Trend (30 Days)')).toBeVisible();
      await expect(page.getByText('Booking Status Distribution')).toBeVisible();
      await expect(page.getByText('Weekly Bookings')).toBeVisible();
      await expect(page.getByText('Service Performance')).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('export report button is present', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/analytics');

      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();

      const exportButton = page.getByRole('button', { name: /Export Report/i });
      await expect(exportButton).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });
});
