import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSearchParams = vi.fn(() => new URLSearchParams());
const mockLogin = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    state: {
      isLoading: false,
      isAuthenticated: false,
      user: null,
    },
  }),
}));

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('renders login form fields', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    render(<LoginPage />);

    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('submits credentials and redirects to booking by default', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockPush).toHaveBeenCalledWith('/booking/vehicle');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('uses safe redirect query param after login', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('redirect=%2Fbooking%2Fschedule'));
    mockLogin.mockResolvedValueOnce(undefined);

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/booking/schedule');
    });
  });

  it('rejects unsafe redirect query param', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('redirect=%2F%2Fevil.com'));
    mockLogin.mockResolvedValueOnce(undefined);

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/booking/vehicle');
    });
  });

  it('shows registration success message from query string', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('registered=true'));

    const { default: LoginPage } = await import('../../app/login/page');
    render(<LoginPage />);

    expect(screen.getByText(/account created successfully/i)).toBeTruthy();
  });

  it('shows auth error on failed login', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid email or password. Please try again.'));

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeTruthy();
    });
  });

  it('shows email verification guidance when account is not confirmed', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Please verify your email before signing in.'));

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'unconfirmed@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/please verify your email before signing in/i)).toBeTruthy();
    });
  });

  it('shows field validation errors when email/password are missing', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    const { container } = render(<LoginPage />);

    const form = container.querySelector('form');
    if (!form) throw new Error('expected login form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/please correct the highlighted fields/i)).toBeTruthy();
      expect(screen.getByText(/email is required/i)).toBeTruthy();
      expect(screen.getByText(/password is required/i)).toBeTruthy();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('falls back to default redirect for disallowed redirect values', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('redirect=%2Fbooking%2Fvehicle%5Cfoo'));
    mockLogin.mockResolvedValueOnce(undefined);

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/booking/vehicle');
    });
  });

  it('handles unavailable localStorage gracefully', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const { default: LoginPage } = await import('../../app/login/page');
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
    getItemSpy.mockRestore();
  });
});
