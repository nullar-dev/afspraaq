import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const mockGetSupabaseClient = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  getSupabaseClient: () => mockGetSupabaseClient(),
}));

function AuthHarness() {
  const { state, login, register, logout, loginWithOAuth } = useAuth();
  const [message, setMessage] = React.useState('');

  return (
    <div>
      <div data-testid="auth-state">{state.isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="loading">{state.isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="email">{state.user?.email ?? 'none'}</div>
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
            await loginWithOAuth('google');
          } catch {
            // expected in test
          }
        }}
      >
        oauth
      </button>
      <div data-testid="message">{message}</div>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signOut: mockSignOut,
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
  });

  it('maps Supabase error branches for login and register', async () => {
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('boom')),
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
  });
});
