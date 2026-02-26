import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}));

// Mock Supabase client utility
const mockGetSupabaseClient = vi.fn();
const mockSignUp = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockResolvedValue(undefined);
    mockRefresh.mockResolvedValue(undefined);
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        signUp: mockSignUp.mockResolvedValue({ error: null }),
      },
    });
  });

  it('should render registration form', async () => {
    const { default: RegisterPage } = await import('../../app/register/page');
    render(<RegisterPage />);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/confirm password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy();
  });

  it('should show create account heading', async () => {
    const { default: RegisterPage } = await import('../../app/register/page');
    render(<RegisterPage />);
    expect(screen.getByRole('heading', { name: /create account/i })).toBeTruthy();
  });

  it('should have login link', async () => {
    const { default: RegisterPage } = await import('../../app/register/page');
    render(<RegisterPage />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeTruthy();
  });

  it('should validate password match', async () => {
    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeTruthy();
    });
  });

  it('should validate minimum password length', async () => {
    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least/i)).toBeTruthy();
    });
  });

  it('should call signUp on valid submission', async () => {
    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/login?registered=true');
    });
  });

  it('should disable button while loading', async () => {
    mockSignUp.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    );

    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByRole('button', { name: /creating/i })).toBeTruthy();
  });

  it('should show password error message', async () => {
    mockSignUp.mockResolvedValueOnce({
      error: { message: 'Password does not meet requirements' },
    });

    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/password does not meet/i)).toBeTruthy();
    });
  });

  it('should show email error message', async () => {
    mockSignUp.mockResolvedValueOnce({
      error: { message: 'Invalid email format' },
    });

    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeTruthy();
    });
  });

  it('should show generic error message', async () => {
    mockSignUp.mockResolvedValueOnce({
      error: { message: 'Some random error' },
    });

    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to create account/i)).toBeTruthy();
    });
  });
});
