export const mapAuthError = (message: string, mode: 'login' | 'register') => {
  if (!message || typeof message !== 'string') {
    return mode === 'login'
      ? 'Unable to sign in right now. Please try again later.'
      : 'Unable to create account. Please try again later.';
  }

  const normalized = message.toLowerCase();

  if (
    normalized.includes('too many requests') ||
    normalized.includes('too many attempts') ||
    normalized.includes('rate limit')
  ) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (mode === 'login') {
    if (normalized.includes('email_not_confirmed') || normalized.includes('email not confirmed')) {
      return 'Please verify your email before signing in.';
    }
    if (
      normalized.includes('invalid login credentials') ||
      normalized.includes('invalid credentials') ||
      normalized.includes('invalid email or password')
    ) {
      return 'Invalid email or password.';
    }
    return 'Unable to sign in right now. Please try again later.';
  }

  if (normalized.includes('password does not meet') || normalized.includes('password')) {
    return 'Password does not meet requirements.';
  }

  return 'Unable to create account. Please try again later.';
};
