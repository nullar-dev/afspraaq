import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const mockGetSupabaseClient = vi.fn();
const mockFetchWithTimeout = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  getSupabaseClient: () => mockGetSupabaseClient(),
}));

vi.mock('@/lib/http', () => ({
  fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args),
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

function AuthHarness() {
  const { state, login, register, logout, loginWithOAuth, extendSession } = useAuth();
  const [message, setMessage] = React.useState('');

  return (
    <div>
      <div data-testid="auth-state">{state.isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="loading">{state.isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="email">{state.user?.email ?? 'none'}</div>
      <div data-testid="warning">{state.showSessionExpiryWarning ? 'yes' : 'no'}</div>
      <div data-testid="remaining">{state.sessionSecondsRemaining ?? 'none'}</div>
      <button onClick={() => login('test@example.com', 'Password123!')}>login</button>
      <button
        onClick={async () => {
          try {
            await login('test@example.com', 'wrong');
            setMessage('ok');
          } catch {
            setMessage('login-error');
          }
        }}
      >
        login-fail
      </button>
      <button
        onClick={() =>
          register({
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'test@example.com',
            password: 'Password123!',
          })
        }
      >
        register
      </button>
      <button onClick={() => logout()}>logout</button>
      <button
        onClick={async () => {
          try {
            await register({
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'test@example.com',
              password: 'Password123!',
            });
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'register-error');
          }
        }}
      >
        register-fail
      </button>
      <button
        onClick={async () => {
          try {
            await register({
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'invalid-email',
              password: 'Password123!',
            });
            setMessage('ok');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'register-error');
          }
        }}
      >
        register-invalid-email
      </button>
      <button
        onClick={async () => {
          try {
            await loginWithOAuth('google');
          } catch {
            // expected in test
          }
        }}
      >
        oauth
      </button>
      <button onClick={() => extendSession()}>extend-session</button>
      <button
        onClick={async () => {
          try {
            await extendSession();
            setMessage('extended');
          } catch {
            setMessage('extend-error');
          }
        }}
      >
        extend-fail
      </button>
      <div data-testid="message">{message}</div>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchWithTimeout.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles missing Supabase client gracefully', async () => {
    mockGetSupabaseClient.mockReturnValueOnce(null);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(screen.getByTestId('auth-state').textContent).toBe('no');
  });

  it('rejects auth actions when Supabase client is unavailable', async () => {
    mockGetSupabaseClient.mockReturnValueOnce(null);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('login-fail'));
    await waitFor(() => {
      expect(screen.getByTestId('message').textContent).toBe('login-error');
    });

    fireEvent.click(screen.getByText('register-fail'));
    await waitFor(() => {
      expect(screen.getByTestId('message').textContent).toBe('Registration is unavailable.');
    });

    fireEvent.click(screen.getByText('extend-fail'));
    await waitFor(() => {
      expect(screen.getByTestId('message').textContent).toBe('extend-error');
    });

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('no');
    });
  });

  it('throws when useAuth is called outside provider', () => {
    function OutsideProviderHarness() {
      useAuth();
      return <div>outside</div>;
    }

    expect(() => render(<OutsideProviderHarness />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('loads user, supports login/register/logout, and reacts to auth events', async () => {
    let authCallback:
      | ((
          event: string,
          session: {
            user: { id: string; email: string; user_metadata?: Record<string, unknown> };
          } | null
        ) => void)
      | undefined;

    const mockGetUser = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          user: {
            id: 'u1',
            email: 'initial@example.com',
            user_metadata: { first_name: 'Initial', last_name: 'User' },
          },
        },
      })
      .mockResolvedValue({ data: { user: null } });

    const mockSignInWithPassword = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } });

    const mockSignUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    const mockRefreshSession = vi
      .fn()
      .mockResolvedValue({ data: { session: { expires_at: null } } });

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: null } } }),
        getUser: mockGetUser,
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signOut: mockSignOut,
        refreshSession: mockRefreshSession,
        onAuthStateChange: (cb: typeof authCallback) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
      expect(screen.getByTestId('email').textContent).toBe('initial@example.com');
    });

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    fireEvent.click(screen.getByText('login-fail'));
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByText('register'));
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.getByTestId('auth-state').textContent).toBe('no');
    });

    act(() => {
      authCallback?.('SIGNED_IN', {
        user: {
          id: 'u2',
          email: 'callback@example.com',
          user_metadata: { first_name: 'Callback', last_name: 'User' },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('email').textContent).toBe('callback@example.com');
    });

    fireEvent.click(screen.getByText('oauth'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
    });

    fireEvent.click(screen.getByText('extend-session'));
    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalled();
    });
  });

  it('covers timer and ensure-profile branches with warning/session events', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let authCallback:
      | ((
          event: string,
          session: {
            user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
            expires_at?: number;
          } | null
        ) => void)
      | undefined;

    mockFetchWithTimeout.mockResolvedValueOnce({ ok: false, status: 500 });
    const nowSeconds = Math.floor(Date.now() / 1000);

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { expires_at: nowSeconds + 3600 } },
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', email: undefined, user_metadata: {} } },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: null } } }),
        onAuthStateChange: vi.fn((cb: typeof authCallback) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
      expect(screen.getByTestId('email').textContent).toBe('');
    });
    expect(warnSpy).toHaveBeenCalledWith('Profile ensure request failed', { status: 500 });

    act(() => {
      authCallback?.('SIGNED_IN', {
        user: { id: 'u2', user_metadata: {} },
        expires_at: nowSeconds - 60,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('warning').textContent).toBe('no');
    });

    act(() => {
      authCallback?.('SIGNED_IN', {
        user: { id: 'u3', user_metadata: {} },
        expires_at: nowSeconds + 10 * 60,
      });
    });

    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
    });

    warnSpy.mockRestore();
  });

  it('logs both unhandled rejection variants', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSupabaseClient.mockReturnValueOnce(null);

    const { unmount } = render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    act(() => {
      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: 'x' })
      );
      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.resolve(),
          reason: new Error('boom'),
        })
      );
    });

    expect(errorSpy).toHaveBeenCalledWith('Unhandled promise rejection', { message: 'unknown' });
    expect(errorSpy).toHaveBeenCalledWith('Unhandled promise rejection', { message: 'boom' });
    unmount();
    errorSpy.mockRestore();
  });

  it('guards state updates when component is unmounted before async completion', async () => {
    let authCallback:
      | ((event: string, session: { user: { id: string; email: string } } | null) => void)
      | undefined;
    const getUserDeferred = deferred<{ data: { user: { id: string; email: string } } }>();
    const getSessionDeferred = deferred<{ data: { session: { expires_at: number } | null } }>();

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockReturnValue(getSessionDeferred.promise),
        getUser: vi.fn().mockReturnValue(getUserDeferred.promise),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn((cb: typeof authCallback) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
      },
    });

    const { unmount } = render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    unmount();
    await act(async () => {
      getSessionDeferred.resolve({ data: { session: null } });
      getUserDeferred.resolve({ data: { user: { id: 'u1', email: 'u1@example.com' } } });
      await Promise.resolve();
    });

    act(() => {
      authCallback?.('SIGNED_IN', { user: { id: 'u2', email: 'u2@example.com' } });
    });
  });

  it('covers catch branch with mounted false and signOut retry error logging', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const getUserDeferred = deferred<never>();
    const getSessionDeferred = deferred<{ data: { session: null } }>();

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockReturnValue(getSessionDeferred.promise),
        getUser: vi.fn().mockReturnValue(getUserDeferred.promise),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi
          .fn()
          .mockRejectedValueOnce('first failure')
          .mockRejectedValueOnce('second failure'),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    });

    const { unmount } = render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    unmount();
    await act(async () => {
      getSessionDeferred.resolve({ data: { session: null } });
      getUserDeferred.reject(new Error('late failure'));
      await Promise.resolve();
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );
    fireEvent.click(screen.getByText('logout'));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Primary sign-out request failed; retrying once', {
        message: 'unknown',
      });
      expect(errorSpy).toHaveBeenCalledWith('Sign-out retry failed', { message: 'unknown' });
    });
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('maps Supabase error branches for login and register', async () => {
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('boom')),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInWithPassword: vi
          .fn()
          .mockResolvedValueOnce({ error: { message: 'Too many requests' } })
          .mockResolvedValueOnce({ error: { message: 'Some network error' } }),
        signUp: vi
          .fn()
          .mockResolvedValueOnce({ data: null, error: { message: 'Too many requests' } })
          .mockResolvedValueOnce({ data: null, error: { message: 'Password weak' } })
          .mockResolvedValueOnce({ data: null, error: { message: 'User already registered' } })
          .mockResolvedValueOnce({ data: null, error: { message: 'Invalid email format' } })
          .mockResolvedValueOnce({ data: null, error: { message: 'other' } }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('login-fail'));
    await waitFor(() => expect(screen.getByTestId('message').textContent).toBe('login-error'));

    fireEvent.click(screen.getByText('login-fail'));
    await waitFor(() => expect(screen.getByTestId('message').textContent).toBe('login-error'));

    fireEvent.click(screen.getByText('register-fail'));
    await waitFor(() =>
      expect(screen.getByTestId('message').textContent).toContain('Too many attempts')
    );

    fireEvent.click(screen.getByText('register-fail'));
    await waitFor(() =>
      expect(screen.getByTestId('message').textContent).toContain('Password does not meet')
    );

    fireEvent.click(screen.getByText('register-fail'));
    await waitFor(() =>
      expect(screen.getByTestId('message').textContent).toContain('Unable to create account')
    );

    fireEvent.click(screen.getByText('register-fail'));
    await waitFor(() =>
      expect(screen.getByTestId('message').textContent).toContain('Unable to create account')
    );

    fireEvent.click(screen.getByText('register-fail'));
    await waitFor(() =>
      expect(screen.getByTestId('message').textContent).toContain('Unable to create account')
    );

    fireEvent.click(screen.getByText('register-invalid-email'));
    await waitFor(() =>
      expect(screen.getByTestId('message').textContent).toContain('Unable to create account')
    );
  });

  it('falls back when getSession is unavailable and handles extend session failure', async () => {
    const mockRefreshSession = vi.fn().mockResolvedValueOnce({ error: { message: 'boom' } });

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        // Intentionally omit getSession to cover fallback branch.
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'u1', email: 'fallback@example.com', user_metadata: { first_name: 'F' } },
          },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: mockRefreshSession,
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
      expect(screen.getByTestId('email').textContent).toBe('fallback@example.com');
    });

    fireEvent.click(screen.getByText('extend-fail'));
    await waitFor(() => {
      expect(screen.getByTestId('message').textContent).toBe('extend-error');
      expect(mockRefreshSession).toHaveBeenCalled();
    });
  });

  it('retries remote sign-out once and still clears local auth state', async () => {
    const mockSignOut = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary network issue'))
      .mockResolvedValueOnce({ error: null });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: null } } }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'u-retry', email: 'retry@example.com', user_metadata: { first_name: 'R' } },
          },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: mockSignOut,
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
    });

    fireEvent.click(screen.getByText('logout'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('auth-state').textContent).toBe('no');
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('shows session warning for near-expiry callback and clears auth state on SIGNED_OUT', async () => {
    let authCallback:
      | ((
          event: string,
          session: { user: { id: string; email: string }; expires_at?: number } | null
        ) => void)
      | undefined;

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: null } } }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u3', email: 'timer@example.com', user_metadata: {} } },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: null } } }),
        onAuthStateChange: vi.fn((cb: typeof authCallback) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
    });

    act(() => {
      authCallback?.('SIGNED_IN', {
        user: { id: 'u3', email: 'timer@example.com' },
        expires_at: Math.floor((Date.now() + 4 * 60 * 1000) / 1000),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('warning').textContent).toBe('yes');
    });

    act(() => {
      authCallback?.('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('no');
      expect(screen.getByTestId('warning').textContent).toBe('no');
    });
  });

  it('returns early if extendSession is already in progress', async () => {
    const refreshDeferred = deferred<{ data: { session: { expires_at: null } }; error?: never }>();
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: null } } }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u3', email: 'timer@example.com', user_metadata: {} } },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockReturnValue(refreshDeferred.promise),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('yes'));

    fireEvent.click(screen.getByText('extend-session'));
    fireEvent.click(screen.getByText('extend-session'));

    await act(async () => {
      refreshDeferred.resolve({ data: { session: { expires_at: null } } });
      await Promise.resolve();
    });

    // Second click should no-op while first is in-flight.
    expect(mockGetSupabaseClient().auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('logs retry sign-out error message from Error instances', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: null } } }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u-retry-error', email: 'retry@example.com', user_metadata: {} } },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi
          .fn()
          .mockRejectedValueOnce(new Error('first-error'))
          .mockRejectedValueOnce(new Error('retry-error')),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('yes'));

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Primary sign-out request failed; retrying once', {
        message: 'first-error',
      });
      expect(errorSpy).toHaveBeenCalledWith('Sign-out retry failed', { message: 'retry-error' });
    });

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('executes session-expiry timeout callback when session reaches expiry', async () => {
    vi.useFakeTimers();
    const intervalSpy = vi
      .spyOn(global, 'setInterval')
      .mockReturnValue(1 as unknown as NodeJS.Timeout);
    const now = Date.now();
    vi.setSystemTime(now);

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { expires_at: Math.floor((now + 1200) / 1000) } },
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u-expire', email: 'expire@example.com', user_metadata: {} } },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(screen.getByTestId('warning').textContent).toBe('no');
    expect(screen.getByTestId('remaining').textContent).toBe('none');
    intervalSpy.mockRestore();
  });
});
