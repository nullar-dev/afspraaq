'use client';

import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/utils/supabase/client';
import { mapAuthError } from '@/lib/auth-errors';
import { fetchWithTimeout } from '@/lib/http';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showSessionExpiryWarning: boolean;
  sessionSecondsRemaining: number | null;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface RegisterResult {
  requiresEmailVerification: boolean;
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (_provider: 'google' | 'microsoft' | 'apple') => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  extendSession: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  showSessionExpiryWarning: false,
  sessionSecondsRemaining: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(user: SupabaseUser | null): User | null {
  if (!user) return null;

  const firstName =
    typeof user.user_metadata?.first_name === 'string' ? user.user_metadata.first_name : '';
  const lastName =
    typeof user.user_metadata?.last_name === 'string' ? user.user_metadata.last_name : '';

  return {
    id: user.id,
    email: user.email ?? '',
    firstName: firstName || 'User',
    lastName,
  };
}

/**
 * Get CSRF token from cookie for double-submit pattern
 * Returns null if cookie not found or invalid
 * SECURITY: Logs errors for security monitoring without exposing sensitive data
 */
function getCsrfTokenFromCookie(): string | null {
  try {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`));

    if (!csrfCookie) {
      // SECURITY: Log missing CSRF token - potential configuration issue or attack
      console.warn('[SECURITY] CSRF token cookie not found');
      return null;
    }

    // SECURITY: Use indexOf + slice instead of split to handle values containing '='
    const equalsIndex = csrfCookie.indexOf('=');
    if (equalsIndex === -1) {
      console.error('[SECURITY] Malformed CSRF cookie - no equals sign');
      return null;
    }

    const cookieValue = decodeURIComponent(csrfCookie.slice(equalsIndex + 1).trim());
    if (!cookieValue) {
      console.error('[SECURITY] Empty CSRF cookie value');
      return null;
    }

    const parsed = JSON.parse(cookieValue);

    // SECURITY: Validate token structure to prevent injection attacks
    if (!parsed || typeof parsed !== 'object') {
      console.error('[SECURITY] CSRF cookie parsed to non-object');
      return null;
    }

    if (typeof parsed.token !== 'string' || parsed.token.length === 0) {
      console.error('[SECURITY] CSRF token missing or invalid type');
      return null;
    }

    // Validate token format (64 hex characters for 32-byte token)
    if (!/^[a-f0-9]{64}$/i.test(parsed.token)) {
      console.error('[SECURITY] CSRF token has invalid format');
      return null;
    }

    return parsed.token;
  } catch (error) {
    // SECURITY: Log error details for monitoring without exposing token content
    // Check for URIError specifically - malformed URL encoding should not cause silent failure
    if (error instanceof URIError) {
      console.error('[SECURITY] Malformed URL encoding in CSRF cookie - possible tampering');
      return null;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SECURITY] Failed to parse CSRF token:', errorMessage);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const sessionExpiryTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionWarningTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionCountdownIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const isExtendingSessionRef = React.useRef(false);
  const [state, setState] = useState<AuthState>({
    ...initialState,
    isLoading: !!supabase,
  });

  const clearSessionTimers = useCallback(() => {
    if (sessionExpiryTimeoutRef.current) clearTimeout(sessionExpiryTimeoutRef.current);
    if (sessionWarningTimeoutRef.current) clearTimeout(sessionWarningTimeoutRef.current);
    if (sessionCountdownIntervalRef.current) clearInterval(sessionCountdownIntervalRef.current);
    sessionExpiryTimeoutRef.current = null;
    sessionWarningTimeoutRef.current = null;
    sessionCountdownIntervalRef.current = null;
  }, []);

  const scheduleSessionWarnings = useCallback(
    (expiresAt: number | null | undefined) => {
      clearSessionTimers();
      if (!expiresAt) return;

      const expiresAtMs = expiresAt * 1000;
      const warningLeadMs = 5 * 60 * 1000;
      const now = Date.now();
      const warningAt = expiresAtMs - warningLeadMs;

      if (expiresAtMs <= now) {
        setState(prev => ({
          ...prev,
          showSessionExpiryWarning: false,
          sessionSecondsRemaining: null,
        }));
        return;
      }

      const startWarning = () => {
        const updateRemaining = () => {
          const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
          setState(prev => ({
            ...prev,
            showSessionExpiryWarning: true,
            sessionSecondsRemaining: remainingSeconds,
          }));
        };
        updateRemaining();
        sessionCountdownIntervalRef.current = setInterval(updateRemaining, 1000);
      };

      if (warningAt <= now) {
        startWarning();
      } else {
        sessionWarningTimeoutRef.current = setTimeout(startWarning, warningAt - now);
      }

      sessionExpiryTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          showSessionExpiryWarning: false,
          sessionSecondsRemaining: null,
        }));
      }, expiresAtMs - now);
    },
    [clearSessionTimers]
  );

  const ensureProfileRow = useCallback(async () => {
    try {
      // Get CSRF token for double-submit pattern
      const csrfToken = getCsrfTokenFromCookie();
      const headers: Record<string, string> = {
        'x-requested-with': 'XMLHttpRequest',
      };

      // Include CSRF token if available
      if (csrfToken) {
        headers[CSRF_HEADER_NAME] = csrfToken;
      } else {
        // SECURITY: Log warning when proceeding without CSRF protection
        // This can happen on first page load before middleware sets the cookie
        console.warn('[SECURITY] Proceeding without CSRF token - request may fail');
      }

      const response = await fetchWithTimeout(
        '/api/auth/profile/ensure',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers,
        },
        10_000
      );

      // Handle CSRF errors specifically
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data.error?.includes('CSRF')) {
          // SECURITY: CSRF failures must propagate error to caller
          // Silent failures leave users unaware their action failed for security reasons
          console.error('[SECURITY] CSRF validation failed - token expired or invalid');
          throw new Error('CSRF token expired - please refresh and try again');
        }
      }

      if (!response.ok) {
        console.warn('Profile ensure request failed', { status: response.status });
      }
    } catch {
      // Profile repair is best-effort and must not block auth UX.
    }
  }, []);

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error ? event.reason.message : 'unknown';
      console.error('Unhandled promise rejection', { message });
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const syncUser = async () => {
      try {
        let session: Session | null = null;
        if ('getSession' in supabase.auth && typeof supabase.auth.getSession === 'function') {
          const sessionResult = await supabase.auth.getSession();
          session = sessionResult.data.session;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        const authUser = toAuthUser(user);
        setState({
          user: authUser,
          isAuthenticated: !!authUser,
          isLoading: false,
          showSessionExpiryWarning: false,
          sessionSecondsRemaining: null,
        });
        scheduleSessionWarnings(session?.expires_at);
        if (authUser) {
          void ensureProfileRow();
        }
      } catch {
        if (!mounted) return;
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      const authUser = toAuthUser(session?.user ?? null);
      setState({
        user: authUser,
        isAuthenticated: !!authUser,
        isLoading: false,
        showSessionExpiryWarning: false,
        sessionSecondsRemaining: null,
      });
      scheduleSessionWarnings(session?.expires_at);
      if (authUser) {
        void ensureProfileRow();
      } else {
        clearSessionTimers();
      }
    });

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      void syncUser();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncUser();
      }
    };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      clearSessionTimers();
      subscription.unsubscribe();
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [supabase, scheduleSessionWarnings, ensureProfileRow, clearSessionTimers]);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Authentication is unavailable.');

    setState(prev => ({ ...prev, isLoading: true }));

    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error(mapAuthError(error.message, 'login'));
    }
  };

  const loginWithOAuth = async (_provider: 'google' | 'microsoft' | 'apple') => {
    void _provider;
    throw new Error('OAuth sign-in is not available.');
  };

  const register = async (data: RegisterData): Promise<RegisterResult> => {
    if (!supabase) throw new Error('Registration is unavailable.');

    const normalizedEmail = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error('Unable to create account. Please try again later.');
    }
    const normalizedFirstName = data.firstName.trim();
    const normalizedLastName = data.lastName.trim();

    setState(prev => ({ ...prev, isLoading: true }));

    const { data: result, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: data.password,
      options: {
        data: {
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
        },
      },
    });

    if (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error(mapAuthError(error.message, 'register'));
    }

    const requiresEmailVerification = !result.session;
    setState(prev => ({ ...prev, isLoading: false }));

    return { requiresEmailVerification };
  };

  const logout = async () => {
    if (!supabase) return;
    clearSessionTimers();
    let firstError: unknown = null;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      firstError = error;
      const message = error instanceof Error ? error.message : 'unknown';
      console.warn('Primary sign-out request failed; retrying once', { message });

      try {
        await supabase.auth.signOut();
      } catch (retryError) {
        const retryMessage = retryError instanceof Error ? retryError.message : 'unknown';
        console.error('Sign-out retry failed', { message: retryMessage });
      }
    } finally {
      setState({ ...initialState, isLoading: false });
      if (firstError) {
        // Ensure auth-dependent cached views do not survive failed remote sign-out.
        try {
          sessionStorage.removeItem('rememberedEmail');
        } catch {
          // Storage can be unavailable in privacy mode.
        }
      }
    }
  };

  const extendSession = async () => {
    if (!supabase) throw new Error('Session extension is unavailable.');
    if (isExtendingSessionRef.current) return;
    isExtendingSessionRef.current = true;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw new Error('Unable to extend session right now.');
      }
      scheduleSessionWarnings(data.session?.expires_at);
      setState(prev => ({
        ...prev,
        showSessionExpiryWarning: false,
      }));
    } finally {
      isExtendingSessionRef.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{ state, login, loginWithOAuth, register, logout, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
