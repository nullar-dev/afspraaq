import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import InvestmentSummary from '@/components/InvestmentSummary';
import { BookingProvider, useBooking } from '@/context/BookingContext';

function SeedState() {
  const { dispatch } = useBooking();

  return (
    <>
      <button onClick={() => dispatch({ type: 'SET_VEHICLE', payload: 'sedan' })}>
        set-vehicle
      </button>
      <button onClick={() => dispatch({ type: 'SET_PACKAGE', payload: 'premium' })}>
        set-package
      </button>
      <button onClick={() => dispatch({ type: 'TOGGLE_ADDON', payload: 'wheel-coating' })}>
        set-addon
      </button>
      <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'customer' })}>set-step</button>
      <button
        onClick={() =>
          dispatch({
            type: 'SET_CUSTOMER_DETAILS',
            payload: { firstName: 'A', lastName: 'B', email: 'x@y.com', phone: '123' },
          })
        }
      >
        set-customer
      </button>
    </>
  );
}

function StepControls() {
  const { dispatch } = useBooking();
  return (
    <div>
      <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'vehicle' })}>
        step-vehicle
      </button>
      <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'services' })}>
        step-services
      </button>
      <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'schedule' })}>
        step-schedule
      </button>
      <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'customer' })}>
        step-customer
      </button>
      <button onClick={() => dispatch({ type: 'SET_STEP', payload: 'payment' })}>
        step-payment
      </button>
      <button onClick={() => dispatch({ type: 'SET_VEHICLE', payload: 'sedan' })}>
        has-vehicle
      </button>
      <button onClick={() => dispatch({ type: 'SET_PACKAGE', payload: 'premium' })}>
        has-package
      </button>
      <button onClick={() => dispatch({ type: 'SET_DATE', payload: new Date(2026, 2, 15) })}>
        has-date
      </button>
      <button onClick={() => dispatch({ type: 'SET_TIME', payload: '9:00 AM' })}>has-time</button>
      <button
        onClick={() =>
          dispatch({
            type: 'SET_CUSTOMER_DETAILS',
            payload: {
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane@example.com',
              phone: '123',
            },
          })
        }
      >
        has-customer
      </button>
    </div>
  );
}

describe('InvestmentSummary', () => {
  it('shows empty state then selected items and proceed button', () => {
    render(
      <BookingProvider>
        <SeedState />
        <InvestmentSummary />
      </BookingProvider>
    );

    expect(screen.getByText(/no items selected/i)).toBeTruthy();

    fireEvent.click(screen.getByText('set-vehicle'));
    fireEvent.click(screen.getByText('set-package'));
    fireEvent.click(screen.getByText('set-addon'));
    fireEvent.click(screen.getByText('set-step'));
    fireEvent.click(screen.getByText('set-customer'));

    expect(screen.getByText(/small \(sedan\)/i)).toBeTruthy();
    expect(screen.getByText(/premium detail/i)).toBeTruthy();
    expect(screen.getByText(/wheel ceramic coating/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /proceed to payment/i })).toBeEnabled();
  });

  it('covers step button text and canProceed branches', () => {
    render(
      <BookingProvider>
        <StepControls />
        <InvestmentSummary />
      </BookingProvider>
    );

    fireEvent.click(screen.getByText('step-vehicle'));
    expect(screen.getByRole('button', { name: /proceed to services/i })).toBeDisabled();
    fireEvent.click(screen.getByText('has-vehicle'));
    expect(screen.getByRole('button', { name: /proceed to services/i })).toBeEnabled();

    fireEvent.click(screen.getByText('step-services'));
    expect(screen.getByRole('button', { name: /proceed to schedule/i })).toBeDisabled();
    fireEvent.click(screen.getByText('has-package'));
    expect(screen.getByRole('button', { name: /proceed to schedule/i })).toBeEnabled();

    fireEvent.click(screen.getByText('step-schedule'));
    expect(screen.getByRole('button', { name: /proceed to details/i })).toBeDisabled();
    fireEvent.click(screen.getByText('has-date'));
    fireEvent.click(screen.getByText('has-time'));
    expect(screen.getByRole('button', { name: /proceed to details/i })).toBeEnabled();

    fireEvent.click(screen.getByText('step-customer'));
    expect(screen.getByRole('button', { name: /proceed to payment/i })).toBeDisabled();
    fireEvent.click(screen.getByText('has-customer'));
    expect(screen.getByRole('button', { name: /proceed to payment/i })).toBeEnabled();

    fireEvent.click(screen.getByText('step-payment'));
    expect(screen.queryByRole('button', { name: /complete booking/i })).toBeNull();
  });
});
