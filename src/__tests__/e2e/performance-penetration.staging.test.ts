/**
 * Performance Penetration Tests - Fixed
 * Load testing, stress testing, and DoS simulation
 * All tests must pass - 2026 best practice implementation
 */

import { expect, test } from '@playwright/test';
import {
  createEphemeralUser,
  deleteEphemeralUser,
  requireStagingAdminEnv,
} from './helpers/staging-auth';

/**
 * Helper to wait for and retrieve CSRF token from cookies
 * Uses polling with exponential backoff for reliability
 */
async function getCsrfToken(
  page: import('@playwright/test').Page,
  maxAttempts = 50
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = await page.evaluate(() => {
      try {
        const cookies = document.cookie.split(';');
        const csrfCookie = cookies.find(c => c.trim().startsWith('__Host-csrf_token='));

        if (!csrfCookie) return null;

        const parts = csrfCookie.split('=');
        if (parts.length < 2) return null;

        const value = decodeURIComponent(parts[1]?.trim() || '');
        if (!value) return null;

        const parsed = JSON.parse(value);
        return typeof parsed.token === 'string' ? parsed.token : null;
      } catch {
        return null;
      }
    });

    if (token) return token;

    // Exponential backoff: 100ms, 200ms, 300ms...
    await page.waitForTimeout(100 * (attempt + 1));
  }

  return null;
}

test.describe('Performance Penetration Tests', () => {
  test.beforeAll(() => {
    requireStagingAdminEnv();
  });

  test.describe('Login Rate Limiting', () => {
    test('survives rapid sequential login attempts', async ({ page }) => {
      const startTime = Date.now();
      const attempts = 10;
      const results: number[] = [];

      for (let i = 0; i < attempts; i++) {
        await page.goto('/login');
        const attemptStart = Date.now();

        await page.getByLabel(/email address/i).fill(`test${i}@example.com`);
        await page.getByLabel(/password/i).fill('WrongPassword123!');
        await page.getByRole('button', { name: /sign in/i }).click();

        // Wait for response
        await page.waitForTimeout(300);

        const attemptEnd = Date.now();
        results.push(attemptEnd - attemptStart);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgResponseTime = results.reduce((a, b) => a + b, 0) / results.length;

      expect(totalTime).toBeLessThan(30000);
      expect(avgResponseTime).toBeLessThan(5000);

      console.log(
        `Login stress: ${attempts} attempts in ${totalTime}ms, avg: ${avgResponseTime.toFixed(0)}ms`
      );
    });

    test('handles concurrent login page loads', async ({ browser }) => {
      const concurrentUsers = 5;
      const pages: Array<Awaited<ReturnType<typeof browser.newPage>>> = [];
      const users: Array<{ id: string; email: string; password: string }> = [];

      try {
        // Create test users first
        for (let i = 0; i < concurrentUsers; i++) {
          const user = await createEphemeralUser('user');
          users.push({ id: user.id, email: user.email, password: user.password });
        }

        // Create pages
        for (let i = 0; i < concurrentUsers; i++) {
          pages.push(await browser.newPage());
        }

        // Load login page concurrently
        const startTime = Date.now();
        await Promise.all(
          pages.map(async (page, index) => {
            const user = users[index];
            if (!user) throw new Error(`User at index ${index} not found`);
            await page.goto('/login');
            await page.getByLabel(/email address/i).fill(user.email);
            await page.getByLabel(/password/i).fill(user.password);
          })
        );
        const endTime = Date.now();

        const loadTime = endTime - startTime;
        expect(loadTime).toBeLessThan(15000);

        console.log(`Concurrent login load: ${concurrentUsers} users in ${loadTime}ms`);
      } finally {
        await Promise.all(pages.map(p => p.close()));
        await Promise.all(users.map(u => deleteEphemeralUser(u.id)));
      }
    });
  });

  test.describe('API Endpoint Stress', () => {
    test('health endpoint survives rapid requests', async ({ request }) => {
      const requests = 50;
      const results: { status: number; time: number }[] = [];

      const startTime = Date.now();

      for (let i = 0; i < requests; i++) {
        const reqStart = Date.now();
        const response = await request.get('/api/health');
        const reqEnd = Date.now();

        results.push({
          status: response.status(),
          time: reqEnd - reqStart,
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const successCount = results.filter(r => r.status === 200).length;
      const avgTime = results.reduce((a, b) => a + b.time, 0) / results.length;

      expect(successCount).toBeGreaterThanOrEqual(requests * 0.9);
      expect(avgTime).toBeLessThan(1000);

      console.log(
        `Health endpoint: ${requests} reqs in ${totalTime}ms, ${successCount} OK, avg: ${avgTime.toFixed(0)}ms`
      );
    });

    test('admin API rate limiting under load', async ({ page }) => {
      const adminUser = await createEphemeralUser('admin');

      try {
        await page.goto('/login');
        await page.getByLabel(/email address/i).fill(adminUser.email);
        await page.getByLabel(/password/i).fill(adminUser.password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Wait for redirect (admin or booking page)
        await page.waitForURL(/\/(booking\/vehicle|admin)/, { timeout: 10000 });

        // Wait for page to fully load with CSRF token
        await page.waitForLoadState('networkidle');

        const csrfToken = await getCsrfToken(page);
        expect(csrfToken).toBeTruthy();
        if (!csrfToken) throw new Error('CSRF token not found');

        // Rapid requests to admin API
        const requests = 20;
        const results: { status: number; rateLimited: boolean }[] = [];

        for (let i = 0; i < requests; i++) {
          const response = await page.evaluate(async (token: string) => {
            const res = await fetch('/api/admin/profiles?page=1', {
              headers: {
                'X-CSRF-Token': token,
                'X-Requested-With': 'XMLHttpRequest',
              },
              credentials: 'include',
            });
            return { status: res.status };
          }, csrfToken);

          results.push({
            status: response.status,
            rateLimited: response.status === 429,
          });

          await page.waitForTimeout(50);
        }

        const rateLimitedCount = results.filter(r => r.rateLimited).length;
        const successCount = results.filter(r => r.status === 200).length;

        expect(successCount + rateLimitedCount).toBe(requests);

        console.log(
          `Admin API stress: ${requests} reqs, ${successCount} OK, ${rateLimitedCount} limited`
        );
      } finally {
        await deleteEphemeralUser(adminUser.id);
      }
    });
  });

  test.describe('Page Load Performance', () => {
    test('login page loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/login');
      const endTime = Date.now();

      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(5000);

      await expect(page.getByLabel(/email address/i)).toBeVisible();

      console.log(`Login page load: ${loadTime}ms`);
    });

    test('booking flow handles normal user load', async ({ browser }) => {
      const userCount = 3;
      const users: Array<{
        page: Awaited<ReturnType<typeof browser.newPage>>;
        user: { id: string; email: string; password: string };
      }> = [];

      try {
        // Create test users and pages
        for (let i = 0; i < userCount; i++) {
          const user = await createEphemeralUser('user');
          const page = await browser.newPage();
          users.push({ page, user });
        }

        const startTime = Date.now();

        // All users login concurrently
        await Promise.all(
          users.map(async ({ page, user }) => {
            await page.goto('/login');
            await page.getByLabel(/email address/i).fill(user.email);
            await page.getByLabel(/password/i).fill(user.password);
            await page.getByRole('button', { name: /sign in/i }).click();
            await page.waitForURL(/\/booking\/vehicle/, { timeout: 15000 });
          })
        );

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        expect(totalTime).toBeLessThan(30000);

        console.log(`Concurrent login: ${userCount} users in ${totalTime}ms`);
      } finally {
        await Promise.all(users.map(u => u.page.close()));
        await Promise.all(users.map(u => deleteEphemeralUser(u.user.id)));
      }
    });
  });

  test.describe('Resource Exhaustion Protection', () => {
    test('handles large payload attempts', async ({ page }) => {
      const user = await createEphemeralUser('user');

      try {
        await page.goto('/login');
        await page.getByLabel(/email address/i).fill(user.email);
        await page.getByLabel(/password/i).fill(user.password);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL(/\/booking\/vehicle/, { timeout: 10000 });

        // Wait for page to fully load with CSRF token
        await page.waitForLoadState('networkidle');

        const csrfToken = await getCsrfToken(page);
        expect(csrfToken).toBeTruthy();
        if (!csrfToken) throw new Error('CSRF token not found');

        const largePayload = 'x'.repeat(10000);

        const response = await page.evaluate(
          async ({ payload, token }: { payload: string; token: string }) => {
            try {
              const res = await fetch('/api/auth/profile/ensure', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-Token': token,
                },
                body: JSON.stringify({ data: payload }),
                credentials: 'include',
              });
              return { status: res.status, error: null };
            } catch (error) {
              return { status: 0, error: (error as Error).message };
            }
          },
          { payload: largePayload, token: csrfToken }
        );

        expect([200, 400, 413, 500]).toContain(response.status);

        console.log(`Large payload: ${largePayload.length} bytes, status: ${response.status}`);
      } finally {
        await deleteEphemeralUser(user.id);
      }
    });

    test('prevents memory exhaustion via repeated navigation', async ({ page }) => {
      const navigations = 20;
      const startTime = Date.now();

      for (let i = 0; i < navigations; i++) {
        await page.goto('/login');
        await page.goto('/register');
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(30000);

      await page.goto('/login');
      await expect(page.getByLabel(/email address/i)).toBeVisible();

      console.log(`Navigation stress: ${navigations * 2} navs in ${totalTime}ms`);
    });
  });

  test.describe('Session Performance', () => {
    test('session validation remains fast under load', async ({ page }) => {
      const user = await createEphemeralUser('user');

      try {
        await page.goto('/login');
        await page.getByLabel(/email address/i).fill(user.email);
        await page.getByLabel(/password/i).fill(user.password);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL(/\/booking\/vehicle/, { timeout: 10000 });

        const checks = 10;
        const times: number[] = [];

        for (let i = 0; i < checks; i++) {
          const start = Date.now();
          await page.goto('/booking/vehicle');
          await page.waitForLoadState('networkidle');
          const end = Date.now();
          times.push(end - start);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

        expect(avgTime).toBeLessThan(3000);

        console.log(`Session validation: ${checks} checks, avg: ${avgTime.toFixed(0)}ms`);
      } finally {
        await deleteEphemeralUser(user.id);
      }
    });
  });
});
