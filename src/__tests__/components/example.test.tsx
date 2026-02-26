import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Home from '../../app/page';

// Mock Supabase client utility
vi.mock('../../utils/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the welcome heading', async () => {
    const { container } = render(<Home />);

    // Wait for loading to finish
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(container.textContent).toContain('Afspraaq');
  });
});
