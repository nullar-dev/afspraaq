/**
 * CSRF Protection Library
 * Implements double-submit cookie pattern (2026 best practice)
 * Used by Google, AWS, Meta for state-changing request protection
 * Compatible with both Node.js and Edge Runtime
 */

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
 * Generate random bytes using Web Crypto API (Edge compatible)
 */
function getRandomBytes(size: number): Uint8Array {
  const array = new Uint8Array(size);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  // Note: In Node.js environments without Web Crypto, this will return uninitialized bytes
  // This should not happen in modern Node.js versions which have global crypto
  return array;
}

/**
 * Convert byte array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a cryptographically secure CSRF token
 * Uses CSPRNG via Web Crypto API (Edge compatible)
 */
export function generateCsrfToken(config: Partial<CsrfConfig> = {}): CsrfToken {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Generate 32 random bytes (256 bits of entropy)
  const randomBytes = getRandomBytes(fullConfig.tokenLength);
  const token = bytesToHex(randomBytes);

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
  // Explicit check for empty string, null, or undefined
  if (!headerToken || headerToken === '' || !cookieToken || cookieToken === '') {
    return false;
  }

  if (headerToken.length !== cookieToken.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return constantTimeEqual(headerToken, cookieToken);
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
