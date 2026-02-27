import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookingLayout from '@/app/booking/layout';
import BookingStepper from '@/components/BookingStepper';
import Header from '@/components/Header';
import InvestmentSummary from '@/components/InvestmentSummary';
import { BookingProvider } from '@/context/BookingContext';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    state: {
      user: { firstName: 'Jane' },
      isAuthenticated: true,
      isLoading: false,
    },
    logout: mockLogout,
  }),
}));

describe('Booking shell components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders booking layout scaffold', () => {
    render(
      <BookingLayout>
        <div>Booking Content</div>
      </BookingLayout>
    );

    expect(screen.getByText('Booking Content')).toBeTruthy();
    expect(screen.getByText(/investment summary/i)).toBeTruthy();
  });

  it('renders header and supports sign out action', async () => {
    render(<Header />);

    fireEvent.click(screen.getByText(/sign out/i));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('opens mobile menu and renders nav links', () => {
    render(<Header />);
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(menuButton);
    expect(screen.getAllByText('Support').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(1);
  });

  it('renders stepper and summary within booking provider', () => {
    render(
      <BookingProvider>
        <BookingStepper />
        <InvestmentSummary />
      </BookingProvider>
    );

    expect(screen.getByText(/booking process/i)).toBeTruthy();
    expect(screen.getByText(/total investment/i)).toBeTruthy();
  });
});
