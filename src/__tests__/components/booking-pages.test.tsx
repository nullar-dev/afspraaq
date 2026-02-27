import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BookingProvider, useBooking } from '@/context/BookingContext';
import VehiclePage from '@/app/booking/vehicle/page';
import ServicesPage from '@/app/booking/services/page';
import SchedulePage from '@/app/booking/schedule/page';
import CustomerPage from '@/app/booking/customer/page';
import PaymentPage from '@/app/booking/payment/page';

const mockPush = vi.fn();

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <div role="img" aria-label={props.alt ?? ''} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

function renderWithBooking(ui: React.ReactNode) {
  return render(<BookingProvider>{ui}</BookingProvider>);
}

function SeededPaymentPage() {
  const { dispatch } = useBooking();

  return (
    <>
      <button onClick={() => dispatch({ type: 'SET_VEHICLE', payload: 'vehicle-sedan' })}>
        seed-vehicle
      </button>
      <button onClick={() => dispatch({ type: 'SET_PACKAGE', payload: 'premium' })}>
        seed-package
      </button>
      <button onClick={() => dispatch({ type: 'TOGGLE_ADDON', payload: 'wheel-coating' })}>
        seed-addon
      </button>
      <button onClick={() => dispatch({ type: 'SET_DATE', payload: new Date(2026, 2, 15) })}>
        seed-date
      </button>
      <button onClick={() => dispatch({ type: 'SET_TIME', payload: '10:00 AM' })}>seed-time</button>
      <PaymentPage />
    </>
  );
}

describe('Booking Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 'GC-0123456789ABCDEF0123456789ABCDEF' }),
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders vehicle page and selects vehicle', () => {
    renderWithBooking(<VehiclePage />);

    expect(screen.getByText(/select your vehicle/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/small \(sedan\)/i));
    expect(screen.getByText(/gold standard guarantee/i)).toBeTruthy();
  });

  it('renders services page, selects package and toggles addon', () => {
    renderWithBooking(<ServicesPage />);

    fireEvent.click(screen.getByText(/premium detail/i));
    fireEvent.click(screen.getByText(/wheel ceramic coating/i));
    expect(screen.getByText(/enhance your detail/i)).toBeTruthy();
  });

  it('renders schedule page and selects date/time', async () => {
    renderWithBooking(<SchedulePage />);

    const selectableDayButton = screen
      .getAllByRole('button')
      .find(button => /^\d+$/.test(button.textContent ?? '') && !button.hasAttribute('disabled'));
    expect(selectableDayButton).toBeDefined();
    fireEvent.click(selectableDayButton!);
    fireEvent.click(screen.getByRole('button', { name: '10:00 AM' }));

    await waitFor(() => {
      expect(screen.getByText(/your selection/i)).toBeTruthy();
      expect(screen.getAllByText('10:00 AM').length).toBeGreaterThan(0);
    });
  });

  it('renders customer details page and updates fields', () => {
    renderWithBooking(<CustomerPage />);

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: 'Main St' } });
    fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: 'NYC' } });
    fireEvent.change(screen.getByLabelText(/^state$/i), { target: { value: 'NY' } });
    fireEvent.change(screen.getByLabelText(/zip code/i), { target: { value: '10001' } });
    fireEvent.change(screen.getByPlaceholderText(/any specific concerns/i), {
      target: { value: 'No fragrance' },
    });

    expect(screen.getByDisplayValue('Jane')).toBeTruthy();
    expect(screen.getByDisplayValue('No fragrance')).toBeTruthy();
    expect(screen.getByText(/your information is secure/i)).toBeTruthy();
  });

  it('sanitizes customer details input lengths and characters', () => {
    renderWithBooking(<CustomerPage />);

    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: 'abc12345<script>alert(1)</script>' },
    });
    expect((screen.getByLabelText(/phone number/i) as HTMLInputElement).value).toBe('12345(1)');

    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: '10001-1234A' },
    });
    expect((screen.getByLabelText(/zip code/i) as HTMLInputElement).value).toBe('10001-1234');

    const longSpecialRequest = 'x'.repeat(700);
    fireEvent.change(screen.getByPlaceholderText(/any specific concerns/i), {
      target: { value: longSpecialRequest },
    });
    expect(
      (screen.getByPlaceholderText(/any specific concerns/i) as HTMLTextAreaElement).value
    ).toHaveLength(500);
    expect(screen.getByText('500/500')).toBeTruthy();
  });

  it('renders payment page and completes mock booking flow', async () => {
    vi.useFakeTimers();
    renderWithBooking(<SeededPaymentPage />);

    fireEvent.click(screen.getByText('seed-vehicle'));
    fireEvent.click(screen.getByText('seed-package'));
    fireEvent.click(screen.getByText('seed-addon'));
    fireEvent.click(screen.getByText('seed-date'));
    fireEvent.click(screen.getByText('seed-time'));

    fireEvent.change(screen.getByLabelText(/card number/i), {
      target: { value: '4111111111111111' },
    });
    fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '1228' } });
    fireEvent.change(screen.getByLabelText(/cvv/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/cardholder name/i), { target: { value: 'jane doe' } });

    const activeButton = screen
      .getAllByRole('button', { name: /complete booking/i })
      .find(button => !button.hasAttribute('disabled'));
    expect(activeButton).toBeDefined();
    fireEvent.click(activeButton!);

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(screen.getByText(/booking confirmed/i)).toBeTruthy();
    expect(screen.getByText(/confirmation number/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /book another vehicle/i }));
    expect(mockPush).toHaveBeenCalledWith('/booking/vehicle');
  });

  it('prevents submit for expired card and shows retryable error on API failure', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')));
    renderWithBooking(<SeededPaymentPage />);

    fireEvent.click(screen.getByText('seed-vehicle'));
    fireEvent.click(screen.getByText('seed-package'));
    fireEvent.click(screen.getByText('seed-date'));
    fireEvent.click(screen.getByText('seed-time'));

    fireEvent.change(screen.getByLabelText(/card number/i), {
      target: { value: '4111111111111111' },
    });
    fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '0120' } });
    fireEvent.change(screen.getByLabelText(/cvv/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/cardholder name/i), { target: { value: 'jane doe' } });

    const invalidButton = screen
      .getAllByRole('button', { name: /complete booking/i })
      .find(button => !button.hasAttribute('disabled'));
    expect(invalidButton).toBeUndefined();

    fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '1229' } });
    const activeButton = screen
      .getAllByRole('button', { name: /complete booking/i })
      .find(button => !button.hasAttribute('disabled'));
    expect(activeButton).toBeDefined();
    fireEvent.click(activeButton!);

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(screen.queryByText(/booking confirmed/i)).toBeNull();
    expect(screen.getByText(/unable to confirm booking right now/i)).toBeTruthy();
  });
});
