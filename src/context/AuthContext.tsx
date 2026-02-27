'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/utils/supabase/client';

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
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
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
  const [state, setState] = useState<AuthState>({
    ...initialState,
    isLoading: !!supabase,
  });

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        const authUser = toAuthUser(user);
        setState({
          user: authUser,
          isAuthenticated: !!authUser,
          isLoading: false,
        });
      } catch {
        if (!mounted) return;
        setState({ ...initialState, isLoading: false });
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      const authUser = toAuthUser(session?.user ?? null);
      setState({
        user: authUser,
        isAuthenticated: !!authUser,
        isLoading: false,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Authentication is unavailable.');

    setState(prev => ({ ...prev, isLoading: true }));

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      const message = error.message.toLowerCase();
      if (
        message.includes('invalid login credentials') ||
        message.includes('invalid credentials')
      ) {
        throw new Error('Invalid email or password. Please try again.');
      }
      if (message.includes('too many requests')) {
        throw new Error('Too many attempts. Please wait a moment and try again.');
      }
      throw new Error('Unable to sign in. Please try again.');
    }
  };

  const loginWithOAuth = async (_provider: 'google' | 'microsoft' | 'apple') => {
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
      const message = error.message.toLowerCase();
      if (message.includes('too many requests')) {
        throw new Error('Too many attempts. Please wait a moment and try again.');
      }
      if (message.includes('password')) {
        throw new Error('Password does not meet requirements.');
      }
      throw new Error('Unable to create account. Please try again later.');
    }

    const requiresEmailVerification = !result.session;

    if (requiresEmailVerification) {
      setState(prev => ({ ...prev, isLoading: false }));
    }

    return { requiresEmailVerification };
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setState({ ...initialState, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ state, login, loginWithOAuth, register, logout }}>
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
