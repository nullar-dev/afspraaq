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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const sessionExpiryTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionWarningTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionCountdownIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
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
      await fetch('/api/auth/profile/ensure', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
    } catch {
      // Profile repair is best-effort and must not block auth UX.
    }
  }, []);

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection', event.reason);
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
        setState({ ...initialState, isLoading: false });
        clearSessionTimers();
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error(mapAuthError(error.message, 'login'));
    }
  };

  const loginWithOAuth = async (provider: 'google' | 'microsoft' | 'apple') => {
    void provider;
    throw new Error('OAuth sign-in is coming soon.');
  };

  const register = async (data: RegisterData): Promise<RegisterResult> => {
    if (!supabase) throw new Error('Registration is unavailable.');

    setState(prev => ({ ...prev, isLoading: true }));

    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
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
    await supabase.auth.signOut();
    setState({ ...initialState, isLoading: false });
  };

  const extendSession = async () => {
    if (!supabase) throw new Error('Session extension is unavailable.');
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error('Unable to extend session right now.');
    }
    scheduleSessionWarnings(data.session?.expires_at);
    setState(prev => ({
      ...prev,
      showSessionExpiryWarning: false,
    }));
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
