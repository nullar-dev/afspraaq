/**
 * CSRF API Helpers Unit Tests
 * Tests for CSRF validation in API routes
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { validateApiCsrfToken, withCsrfProtection, hasValidCsrfToken } from '@/lib/csrf-api';
import { generateCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

// Helper to create mock request
function createMockRequest(
  method: string = 'POST',
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
): NextRequest {
  const url = new URL('http://localhost:3000/api/test');

  return {
    method,
    headers: {
      get: (name: string) => headers[name] || null,
    } as unknown as Headers,
    cookies: {
      get: (name: string) => ({
        name,
        value: cookies[name],
      }),
    } as unknown as NextRequest['cookies'],
    url: url.toString(),
  } as unknown as NextRequest;
}

describe('CSRF API Helpers', () => {
  describe('validateApiCsrfToken', () => {
    it('returns valid for GET requests (no CSRF required)', () => {
      const request = createMockRequest('GET');
      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(true);
    });

    it('returns valid for HEAD requests (no CSRF required)', () => {
      const request = createMockRequest('HEAD');
      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(true);
    });

    it('returns invalid when header token is missing', () => {
      const token = generateCsrfToken();
      const request = createMockRequest(
        'POST',
        {},
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token),
        }
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.status).toBe(403);
      }
    });

    it('returns invalid when cookie token is missing', () => {
      const token = generateCsrfToken();
      const request = createMockRequest(
        'POST',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {}
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.status).toBe(403);
      }
    });

    it('returns invalid when tokens do not match', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      const request = createMockRequest(
        'POST',
        {
          [CSRF_HEADER_NAME]: token1.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token2),
        }
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.status).toBe(403);
      }
    });

    it('returns valid when tokens match', () => {
      const token = generateCsrfToken();

      const request = createMockRequest(
        'POST',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token),
        }
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(true);
    });

    it('handles malformed cookie gracefully', () => {
      const token = generateCsrfToken();

      const request = createMockRequest(
        'POST',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {
          [CSRF_COOKIE_NAME]: 'invalid-json',
        }
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(false);
    });

    it('handles cookie without token property', () => {
      const token = generateCsrfToken();

      const request = createMockRequest(
        'POST',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify({ expiresAt: Date.now() }),
        }
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(false);
    });

    it('validates PUT requests', () => {
      const token = generateCsrfToken();

      const request = createMockRequest(
        'PUT',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token),
        }
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(true);
    });

    it('validates DELETE requests', () => {
      const token = generateCsrfToken();

      const request = createMockRequest(
        'DELETE',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token),
        }
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(true);
    });

    it('validates PATCH requests', () => {
      const token = generateCsrfToken();

      const request = createMockRequest(
        'PATCH',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token),
        }
      );

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(true);
    });

    it('returns 403 status code on validation failure', () => {
      const request = createMockRequest('POST', {}, {});

      const result = validateApiCsrfToken(request);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.response.status).toBe(403);

        // Check for error body (would need to parse response)
        // For now, just verify it's a NextResponse
        expect(result.response).toBeDefined();
      }
    });
  });

  describe('withCsrfProtection', () => {
    it('calls handler when CSRF is valid', async () => {
      const token = generateCsrfToken();
      const mockHandler = vi.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const request = createMockRequest(
        'POST',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token),
        }
      );

      const protectedHandler = withCsrfProtection(mockHandler);
      await protectedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it('returns 403 without calling handler when CSRF is invalid', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ status: 200 });

      const request = createMockRequest('POST', {}, {});

      const protectedHandler = withCsrfProtection(mockHandler);
      const response = await protectedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('skips validation for GET requests', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ status: 200 });

      const request = createMockRequest('GET', {}, {});

      const protectedHandler = withCsrfProtection(mockHandler);
      await protectedHandler(request);

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('hasValidCsrfToken', () => {
    it('returns true for matching tokens', () => {
      const token = generateCsrfToken();

      const request = createMockRequest(
        'POST',
        {
          [CSRF_HEADER_NAME]: token.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token),
        }
      );

      expect(hasValidCsrfToken(request)).toBe(true);
    });

    it('returns false for mismatched tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      const request = createMockRequest(
        'POST',
        {
          [CSRF_HEADER_NAME]: token1.token,
        },
        {
          [CSRF_COOKIE_NAME]: JSON.stringify(token2),
        }
      );

      expect(hasValidCsrfToken(request)).toBe(false);
    });

    it('returns false when tokens are missing', () => {
      const request = createMockRequest('POST', {}, {});

      expect(hasValidCsrfToken(request)).toBe(false);
    });

    it('returns true for GET requests regardless of tokens', () => {
      const request = createMockRequest('GET', {}, {});

      expect(hasValidCsrfToken(request)).toBe(true);
    });
  });
});
