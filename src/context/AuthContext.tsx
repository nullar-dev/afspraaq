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
 */
function getCsrfTokenFromCookie(): string | null {
  try {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`));

    if (!csrfCookie) return null;

    const parts = csrfCookie.split('=');
    if (parts.length < 2) return null;

    const cookieValue = decodeURIComponent(parts[1] || '');
    if (!cookieValue) return null;

    const parsed = JSON.parse(cookieValue);
    return parsed.token || null;
  } catch {
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
          console.warn('CSRF validation failed - token may be expired, will retry on next request');
          return;
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
