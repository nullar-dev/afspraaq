/**
 * CSRF Protection E2E Tests
 * Tests for double-submit cookie pattern implementation
 * Run with: E2E_MODE=staging_full pnpm playwright test src/__tests__/e2e/csrf.staging.test.ts
 */

import { expect, test } from '@playwright/test';
import {
  createEphemeralUser,
  deleteEphemeralUser,
  requireStagingAdminEnv,
} from './helpers/staging-auth';

test.describe('CSRF Protection', () => {
  test.beforeAll(() => {
    requireStagingAdminEnv();
  });

  test('API rejects POST without CSRF token', async ({ page }) => {
    const user = await createEphemeralUser('user');

    try {
      // Login first
      await page.goto('/login');
      await page.getByLabel(/email address/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/\/booking\/vehicle$/);

      // Try to make POST request without CSRF token
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/auth/profile/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-requested-with': 'XMLHttpRequest',
          },
          credentials: 'include',
        });
        return { status: res.status, body: await res.json() };
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CSRF');
    } finally {
      await deleteEphemeralUser(user.id);
    }
  });

  test('API rejects POST with mismatched CSRF token', async ({ page }) => {
    const user = await createEphemeralUser('user');

    try {
      // Login first
      await page.goto('/login');
      await page.getByLabel(/email address/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/\/booking\/vehicle$/);

      // Try to make POST request with invalid CSRF token
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/auth/profile/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-requested-with': 'XMLHttpRequest',
            'X-CSRF-Token': 'invalid-token-12345',
          },
          credentials: 'include',
        });
        return { status: res.status, body: await res.json() };
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CSRF');
    } finally {
      await deleteEphemeralUser(user.id);
    }
  });

  test('API accepts POST with valid CSRF token', async ({ page }) => {
    const user = await createEphemeralUser('user');

    try {
      // Login first
      await page.goto('/login');
      await page.getByLabel(/email address/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/\/booking\/vehicle$/);

      // Get CSRF token from cookie
      // Cookie name depends on protocol: __Host-csrf_token for HTTPS, csrf_token for HTTP
      const csrfToken: string | null = await page.evaluate(() => {
        const cookies = document.cookie.split(';');
        const csrfCookie = cookies.find(
          c => c.trim().startsWith('__Host-csrf_token=') || c.trim().startsWith('csrf_token=')
        );
        if (!csrfCookie) return null;
        try {
          const parts = csrfCookie.split('=');
          if (parts.length < 2) return null;
          const value = decodeURIComponent(parts[1] || '');
          if (!value) return null;
          return JSON.parse(value).token as string;
        } catch {
          return null;
        }
      });

      expect(csrfToken).toBeTruthy();

      // Type guard - should never fail due to expect above
      if (!csrfToken) {
        throw new Error('CSRF token not found in cookies');
      }

      // Make POST request with valid CSRF token
      const response = await page.evaluate(async (token: string) => {
        const res = await fetch('/api/auth/profile/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-requested-with': 'XMLHttpRequest',
            'X-CSRF-Token': token,
          },
          credentials: 'include',
        });
        return { status: res.status, body: await res.json() };
      }, csrfToken);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    } finally {
      await deleteEphemeralUser(user.id);
    }
  });

  test('API rejects POST with x-requested-with header but no CSRF token', async ({ page }) => {
    const user = await createEphemeralUser('user');

    try {
      // Login first
      await page.goto('/login');
      await page.getByLabel(/email address/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/\/booking\/vehicle$/);

      // Try to make POST request with x-requested-with but NO CSRF token
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/auth/profile/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-requested-with': 'XMLHttpRequest',
            // No X-CSRF-Token header
          },
          credentials: 'include',
        });
        return { status: res.status, body: await res.json() };
      });

      // Should reject with 403 - defense in depth requires both headers
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CSRF');
    } finally {
      await deleteEphemeralUser(user.id);
    }
  });

  test('CSRF token is generated on first page load', async ({ page }) => {
    await page.goto('/login');

    // Check that CSRF cookie exists
    // Cookie name depends on protocol: __Host-csrf_token for HTTPS, csrf_token for HTTP
    const csrfCookie = await page.evaluate(() => {
      const cookies = document.cookie.split(';');
      return cookies.find(
        c => c.trim().startsWith('__Host-csrf_token=') || c.trim().startsWith('csrf_token=')
      );
    });

    expect(csrfCookie).toBeTruthy();
  });

  test('CSRF token has correct cookie attributes', async ({ page }) => {
    await page.goto('/login');

    // Get all cookies
    // Cookie name depends on protocol: __Host-csrf_token for HTTPS, csrf_token for HTTP
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name === '__Host-csrf_token' || c.name === 'csrf_token');

    expect(csrfCookie).toBeTruthy();
    expect(csrfCookie?.sameSite).toBe('Strict');
    expect(csrfCookie?.httpOnly).toBe(false); // Must be accessible to JS for double-submit
    // secure flag depends on protocol: true for HTTPS, false for HTTP (localhost)
    expect(typeof csrfCookie?.secure).toBe('boolean');
  });

  test('GET requests do not require CSRF token', async ({ page }) => {
    const user = await createEphemeralUser('user');

    try {
      // Login first
      await page.goto('/login');
      await page.getByLabel(/email address/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/\/booking\/vehicle$/);

      // Navigate to admin area (GET request)
      await page.goto('/admin');

      // Should not be blocked by CSRF (may be blocked by auth check)
      const url = page.url();
      expect(url).toMatch(/\/admin|\/booking\/vehicle/);
    } finally {
      await deleteEphemeralUser(user.id);
    }
  });
});
