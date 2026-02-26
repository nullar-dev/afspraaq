import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../../app/page';

// Mock with user logged in
const mockSupabaseWithUser = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
};

vi.mock('../../utils/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should Render the welcome heading', async () => {
    const { container } = render(<Home />);

    await waitFor(() => {
      expect(container.textContent).toContain('Afspraaq');
    });
  });

  it('should show Demo Mode when supabase is null', async () => {
    const { getSupabaseClient } = await import('../../utils/supabase/client');
    vi.mocked(getSupabaseClient).mockReturnValueOnce(null);

    const { container } = render(<Home />);

    await waitFor(() => {
      expect(container.textContent).toContain('Demo Mode');
    });
  });

  it('should show user email when logged in', async () => {
    const { getSupabaseClient } = await import('../../utils/supabase/client');
    vi.mocked(getSupabaseClient).mockReturnValueOnce(mockSupabaseWithUser as any);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeTruthy();
    });
  });

  it('should call signOut when sign out button is clicked', async () => {
    const { getSupabaseClient } = await import('../../utils/supabase/client');
    vi.mocked(getSupabaseClient).mockReturnValueOnce(mockSupabaseWithUser as any);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /sign out/i })[0]).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /sign out/i })[0]);
    });

    expect(mockSupabaseWithUser.auth.signOut).toHaveBeenCalled();
  });

  it('should show Sign In and Get Started when not logged in', async () => {
    const { container } = render(<Home />);

    await waitFor(() => {
      expect(container.textContent).toContain('Sign In');
      expect(container.textContent).toContain('Get Started');
    });
  });
});
