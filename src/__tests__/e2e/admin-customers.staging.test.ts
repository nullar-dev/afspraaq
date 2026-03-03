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

test.describe('Admin Customers CRUD', () => {
  test.beforeAll(() => {
    requireStagingAdminEnv();
  });

  test('admin can view customers list', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/customers');

      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
      await expect(page.getByText('Manage your customer base')).toBeVisible();

      // Check table headers
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Contact' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Bookings' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can search customers', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/customers');

      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();

      // Type in search box
      const searchInput = page.getByPlaceholder(/Search by name/i);
      await searchInput.fill('Smith');
      await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('Smith');

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
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/customers');

      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();

      // Click view button on first customer
      const firstRow = page.locator('tbody tr').first();
      const expectedName = (
        await firstRow.locator('td').first().locator('p').first().textContent()
      )?.trim();

      // SECURITY FIX: Validate name before using it in assertion
      if (!expectedName) {
        throw new Error('Customer name not found in table');
      }

      const viewButton = page.getByTitle('View').first();
      await viewButton.click();

      // Modal should open with customer name
      await expect(page.getByRole('heading', { name: expectedName }).first()).toBeVisible();
      await expect(page.getByText(/Email/i).first()).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can open edit customer modal', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/customers');

      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();

      // Click edit button on first customer
      const editButton = page.getByTitle('Edit').first();
      await editButton.click();

      // Modal should open
      await expect(page.getByRole('heading', { name: 'Edit Customer' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });
});
