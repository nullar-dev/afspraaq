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

test.describe('Admin Bookings CRUD', () => {
  test.beforeAll(() => {
    requireStagingAdminEnv();
  });

  test('admin can view bookings list', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/bookings');

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();
      await expect(page.getByText('Manage all customer appointments')).toBeVisible();

      // Check table headers
      await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Service' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can filter bookings by status', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/bookings');

      await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

      // Select status filter
      const statusSelect = page.getByRole('combobox').first();
      await statusSelect.selectOption('confirmed');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify filter applied - dropdown should show selected value
      await expect(page.getByRole('combobox').first()).toHaveValue('confirmed');
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can search bookings', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/bookings');

      await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

      // Type in search box
      const searchInput = page.getByPlaceholder(/Search by customer/i);
      await searchInput.fill('test');
      await searchInput.press('Enter');

      // Wait for debounce
      await page.waitForTimeout(400);

      // Search should not error
      await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can view booking details', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/bookings');

      await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

      // Click view button on first booking
      const viewButton = page.getByTitle('View').first();
      await viewButton.click();

      // Modal should open
      await expect(page.getByText(/Booking BK-/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can open edit booking modal', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/bookings');

      await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

      // Click edit button on first booking
      const editButton = page.getByTitle('Edit').first();
      await editButton.click();

      // Modal should open
      await expect(page.getByText('Edit Booking')).toBeVisible();
      await expect(page.getByText('Current Status')).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });

  test('admin can open delete confirmation modal', async ({ page }) => {
    const adminUser = await createEphemeralUser('admin');

    try {
      await signIn(page, adminUser.email, adminUser.password);
      await expect(page).toHaveURL(/\/booking\/vehicle$/);
      await page.goto('/admin/bookings');

      await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

      // Click delete button on first booking
      const deleteButton = page.getByTitle('Delete').first();
      await deleteButton.click();

      // Modal should open
      await expect(page.getByRole('heading', { name: 'Delete Booking' })).toBeVisible();
      await expect(page.getByText(/Are you sure you want to delete/i)).toBeVisible();
    } finally {
      await deleteEphemeralUser(adminUser.id);
    }
  });
});
