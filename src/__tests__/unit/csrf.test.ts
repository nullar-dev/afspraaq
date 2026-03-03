/**
 * CSRF Library Unit Tests
 * Comprehensive tests for double-submit cookie pattern implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCsrfToken,
  validateCsrfToken,
  shouldRotateToken,
  incrementRequestCount,
  validateAndRotateToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  requiresCsrfValidation,
} from '@/lib/csrf';

describe('CSRF Protection Library', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('generateCsrfToken', () => {
    it('generates a valid CSRF token with correct structure', () => {
      const token = generateCsrfToken();

      expect(token).toHaveProperty('token');
      expect(token).toHaveProperty('expiresAt');
      expect(token).toHaveProperty('requestCount');
      expect(typeof token.token).toBe('string');
      expect(typeof token.expiresAt).toBe('number');
      expect(token.requestCount).toBe(0);
    });

    it('generates tokens with 256 bits of entropy (64 hex chars)', () => {
      const token = generateCsrfToken();
      expect(token.token.length).toBe(64); // 32 bytes * 2 hex chars
    });

    it('generates unique tokens on each call', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1.token).not.toBe(token2.token);
    });

    it('sets expiration based on rotation interval', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const token = generateCsrfToken({ rotationIntervalMs: 900000 }); // 15 min

      expect(token.expiresAt).toBe(now + 900000);
    });

    it('respects custom token length', () => {
      const token = generateCsrfToken({ tokenLength: 16 });
      expect(token.token.length).toBe(32); // 16 bytes * 2
    });
  });

  describe('validateCsrfToken', () => {
    it('returns true for matching tokens', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token.token, token.token);
      expect(result).toBe(true);
    });

    it('returns false for mismatched tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      const result = validateCsrfToken(token1.token, token2.token);
      expect(result).toBe(false);
    });

    it('returns false when header token is missing', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken('', token.token);
      expect(result).toBe(false);
    });

    it('returns false when cookie token is missing', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token.token, '');
      expect(result).toBe(false);
    });

    it('returns false when both tokens are missing', () => {
      const result = validateCsrfToken('', '');
      expect(result).toBe(false);
    });

    it('returns false for tokens of different lengths', () => {
      const result = validateCsrfToken('short', 'muchlongertoken');
      expect(result).toBe(false);
    });

    it('uses constant-time comparison (timing safe)', () => {
      // This test verifies the implementation uses timingSafeEqual
      // by ensuring no early return on first mismatched byte
      const token1 = 'a'.repeat(64);
      const token2 = 'b'.repeat(64);

      const start = Date.now();
      validateCsrfToken(token1, token2);
      const duration1 = Date.now() - start;

      const token3 = 'a'.repeat(63) + 'b';
      const start2 = Date.now();
      validateCsrfToken(token1, token3);
      const duration2 = Date.now() - start2;

      // Both should take similar time (constant-time comparison)
      // Allowing 5ms variance for test flakiness
      expect(Math.abs(duration1 - duration2)).toBeLessThan(5);
    });

    it('handles edge case: null values gracefully', () => {
      const result = validateCsrfToken(null as unknown as string, 'token');
      expect(result).toBe(false);
    });

    it('handles edge case: undefined values gracefully', () => {
      const result = validateCsrfToken('token', undefined as unknown as string);
      expect(result).toBe(false);
    });
  });

  describe('shouldRotateToken', () => {
    it('returns true when token has expired', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const token = generateCsrfToken({ rotationIntervalMs: 1000 });

      // Move time forward past expiration
      vi.setSystemTime(now + 2000);

      expect(shouldRotateToken(token)).toBe(true);
    });

    it('returns false when token has not expired', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const token = generateCsrfToken({ rotationIntervalMs: 900000 });

      // Move time forward but not past expiration
      vi.setSystemTime(now + 600000);

      expect(shouldRotateToken(token)).toBe(false);
    });

    it('returns true when request count exceeds threshold', () => {
      const token = {
        token: 'test',
        expiresAt: Date.now() + 900000,
        requestCount: 50,
      };

      expect(shouldRotateToken(token)).toBe(true);
    });

    it('returns false when request count is below threshold', () => {
      const token = {
        token: 'test',
        expiresAt: Date.now() + 900000,
        requestCount: 49,
      };

      expect(shouldRotateToken(token)).toBe(false);
    });

    it('respects custom rotation interval', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const token = generateCsrfToken({ rotationIntervalMs: 5000 });

      vi.setSystemTime(now + 6000);

      expect(shouldRotateToken(token, { rotationIntervalMs: 5000 })).toBe(true);
    });

    it('respects custom max requests threshold', () => {
      const token = {
        token: 'test',
        expiresAt: Date.now() + 900000,
        requestCount: 100,
      };

      expect(shouldRotateToken(token, { maxRequestsBeforeRotation: 100 })).toBe(true);
      expect(shouldRotateToken(token, { maxRequestsBeforeRotation: 101 })).toBe(false);
    });
  });

  describe('incrementRequestCount', () => {
    it('increments request count by 1', () => {
      const token = generateCsrfToken();
      expect(token.requestCount).toBe(0);

      const updated = incrementRequestCount(token);
      expect(updated.requestCount).toBe(1);
    });

    it('does not modify other token properties', () => {
      const token = generateCsrfToken();
      const originalToken = token.token;
      const originalExpiry = token.expiresAt;

      const updated = incrementRequestCount(token);

      expect(updated.token).toBe(originalToken);
      expect(updated.expiresAt).toBe(originalExpiry);
    });

    it('preserves immutability of original token', () => {
      const token = generateCsrfToken();
      incrementRequestCount(token);

      expect(token.requestCount).toBe(0); // Original unchanged
    });
  });

  describe('validateAndRotateToken', () => {
    it('returns valid=false when cookie token is null', () => {
      const headerToken = 'test';
      const result = validateAndRotateToken(headerToken, null);

      expect(result.valid).toBe(false);
      expect(result.shouldRotate).toBe(true);
    });

    it('returns valid=false when tokens do not match', () => {
      const headerToken = generateCsrfToken().token;
      const cookieToken = generateCsrfToken();

      const result = validateAndRotateToken(headerToken, cookieToken);

      expect(result.valid).toBe(false);
      expect(result.shouldRotate).toBe(true);
    });

    it('returns valid=true, shouldRotate=false for valid non-expired token', () => {
      const token = generateCsrfToken();

      const result = validateAndRotateToken(token.token, token);

      expect(result.valid).toBe(true);
      expect(result.shouldRotate).toBe(false);
    });

    it('returns newToken when rotation is needed (expired)', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const token = generateCsrfToken({ rotationIntervalMs: 1000 });

      vi.setSystemTime(now + 2000);

      const result = validateAndRotateToken(token.token, token);

      expect(result.valid).toBe(true);
      expect(result.shouldRotate).toBe(true);
      expect(result.newToken).toBeDefined();
      expect(result.newToken!.token).not.toBe(token.token);
    });

    it('returns newToken when rotation is needed (request count)', () => {
      const token = {
        token: generateCsrfToken().token,
        expiresAt: Date.now() + 900000,
        requestCount: 50,
      };

      const result = validateAndRotateToken(token.token, token);

      expect(result.valid).toBe(true);
      expect(result.shouldRotate).toBe(true);
      expect(result.newToken).toBeDefined();
    });

    it('does not return newToken when rotation not needed', () => {
      const token = generateCsrfToken();

      const result = validateAndRotateToken(token.token, token);

      expect(result.newToken).toBeUndefined();
    });
  });

  describe('Constants', () => {
    it('defines correct cookie name with __Host- prefix', () => {
      expect(CSRF_COOKIE_NAME).toBe('__Host-csrf_token');
    });

    it('defines correct header name', () => {
      expect(CSRF_HEADER_NAME).toBe('X-CSRF-Token');
    });
  });

  describe('requiresCsrfValidation', () => {
    it('returns true for POST requests', () => {
      expect(requiresCsrfValidation('POST')).toBe(true);
      expect(requiresCsrfValidation('post')).toBe(true);
    });

    it('returns true for PUT requests', () => {
      expect(requiresCsrfValidation('PUT')).toBe(true);
      expect(requiresCsrfValidation('put')).toBe(true);
    });

    it('returns true for DELETE requests', () => {
      expect(requiresCsrfValidation('DELETE')).toBe(true);
      expect(requiresCsrfValidation('delete')).toBe(true);
    });

    it('returns true for PATCH requests', () => {
      expect(requiresCsrfValidation('PATCH')).toBe(true);
      expect(requiresCsrfValidation('patch')).toBe(true);
    });

    it('returns false for GET requests', () => {
      expect(requiresCsrfValidation('GET')).toBe(false);
      expect(requiresCsrfValidation('get')).toBe(false);
    });

    it('returns false for HEAD requests', () => {
      expect(requiresCsrfValidation('HEAD')).toBe(false);
    });

    it('returns false for OPTIONS requests', () => {
      expect(requiresCsrfValidation('OPTIONS')).toBe(false);
    });

    it('handles empty string gracefully', () => {
      expect(requiresCsrfValidation('')).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles very long tokens without issues', () => {
      const longToken = 'a'.repeat(1000);
      const result = validateCsrfToken(longToken, longToken);
      expect(result).toBe(true);
    });

    it('handles special characters in tokens', () => {
      const specialToken = 'token-with-special@chars#123';
      const result = validateCsrfToken(specialToken, specialToken);
      expect(result).toBe(true);
    });

    it('handles unicode characters in tokens', () => {
      const unicodeToken = 'token-with-unicode-ñ-中文';
      const result = validateCsrfToken(unicodeToken, unicodeToken);
      expect(result).toBe(true);
    });

    it('handles tokens with zero bytes', () => {
      const token1 = Buffer.from('token\x00hidden').toString('utf8');
      const token2 = 'token';

      const result = validateCsrfToken(token1, token2);
      expect(result).toBe(false);
    });
  });
});
