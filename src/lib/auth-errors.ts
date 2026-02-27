export const mapAuthError = (message: string, mode: 'login' | 'register') => {
  if (!message || typeof message !== 'string') {
    return 'An error occurred. Please try again.';
  }

  const normalized = message.toLowerCase();

  if (normalized.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (mode === 'login') {
    if (
      normalized.includes('invalid login credentials') ||
      normalized.includes('invalid credentials')
    ) {
      return 'Invalid email or password. Please try again.';
    }
    return 'Unable to sign in. Please try again.';
  }

  if (normalized.includes('password')) {
    return 'Password does not meet requirements.';
  }

  return 'Unable to create account. Please try again later.';
};
