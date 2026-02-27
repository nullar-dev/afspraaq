import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockUseSearchParams = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
  useSearchParams: () => mockUseSearchParams(),
}));

const mockGetSupabaseClient = vi.fn();
const mockSignInWithPassword = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockResolvedValue(undefined);
    mockRefresh.mockResolvedValue(undefined);
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        signInWithPassword: mockSignInWithPassword.mockResolvedValue({ error: null }),
      },
    });
  });

  it('should render login form', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('should show welcome heading', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    render(<LoginPage />);
    expect(screen.getByText(/welcome back/i)).toBeTruthy();
  });

  it('should have register link', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /create one/i })).toBeTruthy();
  });

  it('should update email state on input', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should update password state on input', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'password123');

    expect(passwordInput).toHaveValue('password123');
  });

  it('should call signInWithPassword on submit', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should show error on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeTruthy();
    });
  });

  it('should show custom error for too many requests', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'Too many requests' },
    });

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many attempts/i)).toBeTruthy();
    });
  });

  it('should disable button while loading', async () => {
    mockSignInWithPassword.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    );

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeTruthy();
  });

  it('should show error when supabase is not available', async () => {
    mockGetSupabaseClient.mockReturnValueOnce(null);

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/authentication is not available/i)).toBeTruthy();
    });
  });

  it('should show generic error for unknown errors', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'Network error' },
    });

    const { default: LoginPage } = await import('../../app/login/page');
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to sign in/i)).toBeTruthy();
    });
  });

  it('should render fallback with loading spinner', async () => {
    const { LoginFormFallback } = await import('../../app/login/page');
    render(<LoginFormFallback />);
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should show success message when registered=true', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('registered=true'));

    const { default: LoginPage } = await import('../../app/login/page');
    render(<LoginPage />);

    expect(screen.getByText(/account created successfully/i)).toBeTruthy();
  });

  it('should not show success message when registered is not set', async () => {
    const { default: LoginPage } = await import('../../app/login/page');
    const { container } = render(<LoginPage />);

    expect(container.textContent).not.toContain('account created successfully');
  });
});
