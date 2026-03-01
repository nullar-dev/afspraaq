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

test.describe('Admin Customers CRUD', () => {
  test.skip(!hasStagingAdminEnv(), 'Staging admin env vars are required for admin E2E');

  test('admin can view customers list', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/customers');

      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
      await expect(page.getByText('Manage your customer base')).toBeVisible();

      // Check table headers
      await expect(page.getByText('Name')).toBeVisible();
      await expect(page.getByText('Contact')).toBeVisible();
      await expect(page.getByText('Bookings')).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can search customers', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/customers');

      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();

      // Type in search box
      const searchInput = page.getByPlaceholder(/Search by name/i);
      await searchInput.fill('Smith');
      await searchInput.press('Enter');

      // Wait for debounce
      await page.waitForTimeout(400);

      // Search should not error
      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can view customer details', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/customers');

      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();

      // Click view button on first customer
      const viewButton = page.getByTitle('View').first();
      await viewButton.click();

      // Modal should open with customer name
      await expect(page.getByRole('heading').nth(1)).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can open edit customer modal', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await page.goto('/admin/customers');

      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();

      // Click edit button on first customer
      const editButton = page.getByTitle('Edit').first();
      await editButton.click();

      // Modal should open
      await expect(page.getByText('Edit Customer')).toBeVisible();
      await expect(page.getByLabel(/Name/i)).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });
});
