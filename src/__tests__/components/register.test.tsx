import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockRegister = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    state: {
      isLoading: false,
      isAuthenticated: false,
      user: null,
    },
  }),
}));

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'Jane');
  await user.type(screen.getByLabelText(/last name/i), 'Doe');
  await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
  await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
  await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
}

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form', async () => {
    const { default: RegisterPage } = await import('../../app/register/page');
    render(<RegisterPage />);

    expect(screen.getByLabelText(/first name/i)).toBeTruthy();
    expect(screen.getByLabelText(/last name/i)).toBeTruthy();
    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/confirm password/i)).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /i agree to the terms/i })).toBeTruthy();
  });

  it('shows password mismatch validation', async () => {
    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Mismatch123!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeTruthy();
    });
  });

  it('registers and redirects to login when email verification is required', async () => {
    mockRegister.mockResolvedValueOnce({ requiresEmailVerification: true });

    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(mockPush).toHaveBeenCalledWith('/login?registered=true');
    });
  });

  it('registers and redirects to booking when session is returned', async () => {
    mockRegister.mockResolvedValueOnce({ requiresEmailVerification: false });

    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/booking/vehicle');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows error when register fails', async () => {
    mockRegister.mockRejectedValueOnce(
      new Error('Unable to create account. Please try again later.')
    );

    const { default: RegisterPage } = await import('../../app/register/page');
    const user = userEvent.setup();
    render(<RegisterPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to create account/i)).toBeTruthy();
    });
  });
});
