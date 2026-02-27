import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BookingStepper from '@/components/BookingStepper';
import { BookingProvider, useBooking } from '@/context/BookingContext';

function StepperHarness() {
  const { state, dispatch } = useBooking();

  return (
    <div>
      <div data-testid="current-step">{state.currentStep}</div>
      <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'customer' })}>
        set-customer
      </button>
      <BookingStepper />
    </div>
  );
}

describe('BookingStepper', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('allows navigating to completed/current steps and blocks upcoming steps', () => {
    render(
      <BookingProvider>
        <StepperHarness />
      </BookingProvider>
    );

    expect(screen.getByTestId('current-step').textContent).toBe('vehicle');

    const paymentButton = screen.getAllByRole('button', { name: /payment/i })[0];
    expect(paymentButton).toBeDefined();
    if (!paymentButton) throw new Error('Payment step button was not found');
    fireEvent.click(paymentButton);
    expect(screen.getByTestId('current-step').textContent).toBe('vehicle');

    fireEvent.click(screen.getByText('set-customer'));
    expect(screen.getByTestId('current-step').textContent).toBe('customer');

    const vehicleButton = screen.getAllByRole('button', { name: /vehicle/i })[0];
    expect(vehicleButton).toBeDefined();
    if (!vehicleButton) throw new Error('Vehicle step button was not found');
    fireEvent.click(vehicleButton);
    expect(screen.getByTestId('current-step').textContent).toBe('vehicle');
  });
});
