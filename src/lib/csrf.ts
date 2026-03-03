/**
 * CSRF Protection Library
 * Implements double-submit cookie pattern (2026 best practice)
 * Used by Google, AWS, Meta for state-changing request protection
 */

import { randomBytes, timingSafeEqual } from 'crypto';

export interface CsrfToken {
  token: string;
  expiresAt: number;
  requestCount: number;
}

export interface CsrfConfig {
  rotationIntervalMs: number;
  maxRequestsBeforeRotation: number;
  tokenLength: number;
}

const DEFAULT_CONFIG: CsrfConfig = {
  rotationIntervalMs: 15 * 60 * 1000, // 15 minutes
  maxRequestsBeforeRotation: 50, // Rotate after 50 requests
  tokenLength: 32, // 256 bits
};

/**
 * Generate a cryptographically secure CSRF token
 * Uses CSPRNG via Node.js crypto module
 */
export function generateCsrfToken(config: Partial<CsrfConfig> = {}): CsrfToken {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Generate 32 random bytes (256 bits of entropy)
  const token = randomBytes(fullConfig.tokenLength).toString('hex');

  return {
    token,
    expiresAt: Date.now() + fullConfig.rotationIntervalMs,
    requestCount: 0,
  };
}

/**
 * Validate CSRF token using constant-time comparison
 * Prevents timing attacks
 */
export function validateCsrfToken(headerToken: string, cookieToken: string): boolean {
  // Early return if either token is missing/invalid
  if (!headerToken || !cookieToken) {
    return false;
  }

  if (headerToken.length !== cookieToken.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const headerBuffer = Buffer.from(headerToken, 'utf8');
  const cookieBuffer = Buffer.from(cookieToken, 'utf8');

  try {
    return timingSafeEqual(headerBuffer, cookieBuffer);
  } catch {
    // Buffer length mismatch (shouldn't happen due to early check, but defensive)
    return false;
  }
}

/**
 * Check if token should be rotated
 * Rotate based on time OR request count
 */
export function shouldRotateToken(token: CsrfToken, config: Partial<CsrfConfig> = {}): boolean {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Rotate if expired
  if (Date.now() >= token.expiresAt) {
    return true;
  }

  // Rotate if too many requests
  if (token.requestCount >= fullConfig.maxRequestsBeforeRotation) {
    return true;
  }

  return false;
}

/**
 * Increment request count for token rotation tracking
 */
export function incrementRequestCount(token: CsrfToken): CsrfToken {
  return {
    ...token,
    requestCount: token.requestCount + 1,
  };
}

/**
 * Validate and rotate token if needed
 * Returns validation result and new token (if rotated)
 */
export function validateAndRotateToken(
  headerToken: string,
  cookieToken: CsrfToken | null,
  config: Partial<CsrfConfig> = {}
): {
  valid: boolean;
  shouldRotate: boolean;
  newToken?: CsrfToken;
} {
  if (!cookieToken) {
    return { valid: false, shouldRotate: true };
  }

  // Check if rotation is needed
  const needsRotation = shouldRotateToken(cookieToken, config);

  // Validate token
  const valid = validateCsrfToken(headerToken, cookieToken.token);

  if (!valid) {
    return { valid: false, shouldRotate: true };
  }

  // If rotation needed, generate new token
  if (needsRotation) {
    return {
      valid: true,
      shouldRotate: true,
      newToken: generateCsrfToken(config),
    };
  }

  // Increment request count for next validation
  return {
    valid: true,
    shouldRotate: false,
  };
}

/**
 * CSRF token storage key (cookie name)
 * Uses __Host- prefix to prevent subdomain cookie injection attacks
 * Browser enforces: Secure flag, Path=/, no Domain attribute
 * OWASP 2026 best practice for Double-Submit Cookie pattern
 */
export const CSRF_COOKIE_NAME = '__Host-csrf_token';

/**
 * CSRF header name (custom header for double-submit)
 */
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Check if request method requires CSRF validation
 * Only state-changing methods need protection
 */
export function requiresCsrfValidation(method: string): boolean {
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  return stateChangingMethods.includes(method.toUpperCase());
}
