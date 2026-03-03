import { expect, test } from '@playwright/test';
import {
  createEphemeralUser,
  deleteEphemeralUser,
  requireStagingAdminEnv,
} from './helpers/staging-auth';

const signIn = async (page: import('@playwright/test').Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
};

test.describe('Admin Schedule Page', () => {
  test.beforeAll(() => {
    requireStagingAdminEnv();
  });

  test('admin can view schedule page', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/schedule');

      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
      await expect(page.getByText('Manage appointments')).toBeVisible();

      // Check for day/week toggle (use exact match to avoid matching "Today")
      await expect(page.getByRole('button', { name: 'Day', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Week', exact: true })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can switch between day and week views', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/schedule');

      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();

      // Click week view (use exact match to avoid matching "Today")
      await page.getByRole('button', { name: 'Week', exact: true }).click();

      // Should show week grid
      await expect(page.locator('.grid-cols-7')).toBeVisible();

      // Click day view
      await page.getByRole('button', { name: 'Day', exact: true }).click();

      // Should show day schedule (check for first time slot)
      await expect(page.getByText(/\d{2}:\d{2} (AM|PM)/).first()).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can navigate dates', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/schedule');

      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();

      // Click previous day button - target the first visible button with ChevronLeft icon
      // Filter out hidden sidebar buttons by checking visibility
      const prevButton = page
        .locator('button')
        .filter({
          has: page.locator(
            'svg[class*="lucide"][class*="chevron-left"], svg[data-lucide="chevron-left"]'
          ),
        })
        .filter({ hasNot: page.locator('[aria-label*="sidebar"], [aria-label*="menu"]') })
        .first();
      await prevButton.click();

      // Page should update without error
      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });
});
