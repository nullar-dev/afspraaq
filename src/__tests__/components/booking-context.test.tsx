import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BookingProvider, useBooking } from '@/context/BookingContext';

function BookingHarness() {
  const { state, dispatch, goToStep, nextStep, prevStep } = useBooking();

  return (
    <div>
      <div data-testid="step">{state.currentStep}</div>
      <div data-testid="vehicle">{state.selectedVehicle ?? 'none'}</div>
      <div data-testid="package">{state.selectedPackage ?? 'none'}</div>
      <div data-testid="addons">{state.selectedAddOns.join(',') || 'none'}</div>
      <div data-testid="time">{state.selectedTime ?? 'none'}</div>
      <button onClick={() => goToStep('services')}>go-services</button>
      <button onClick={() => nextStep()}>next</button>
      <button onClick={() => prevStep()}>prev</button>
      <button onClick={() => dispatch({ type: 'SET_VEHICLE', payload: 'sedan' })}>vehicle</button>
      <button onClick={() => dispatch({ type: 'SET_PACKAGE', payload: 'premium' })}>package</button>
      <button onClick={() => dispatch({ type: 'TOGGLE_ADDON', payload: 'wheel-coating' })}>
        addon
      </button>
      <button onClick={() => dispatch({ type: 'SET_DATE', payload: new Date('2026-03-10') })}>
        date
      </button>
      <button onClick={() => dispatch({ type: 'SET_TIME', payload: '10:00 AM' })}>time</button>
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
        customer
      </button>
      <button
        onClick={() =>
          dispatch({
            type: 'SET_PAYMENT_DETAILS',
            payload: {
              cardNumber: '4111111111111111',
              expiryDate: '12/28',
              cvv: '123',
              cardholderName: 'JANE DOE',
            },
          })
        }
      >
        payment
      </button>
      <button onClick={() => dispatch({ type: 'RESET_BOOKING' })}>reset</button>
    </div>
  );
}

describe('BookingContext', () => {
  it('supports step navigation and state updates', () => {
    render(
      <BookingProvider>
        <BookingHarness />
      </BookingProvider>
    );

    expect(screen.getByTestId('step').textContent).toBe('vehicle');

    fireEvent.click(screen.getByText('go-services'));
    expect(screen.getByTestId('step').textContent).toBe('services');

    fireEvent.click(screen.getByText('next'));
    expect(screen.getByTestId('step').textContent).toBe('schedule');

    fireEvent.click(screen.getByText('prev'));
    expect(screen.getByTestId('step').textContent).toBe('services');

    fireEvent.click(screen.getByText('vehicle'));
    fireEvent.click(screen.getByText('package'));
    fireEvent.click(screen.getByText('addon'));
    fireEvent.click(screen.getByText('addon'));
    fireEvent.click(screen.getByText('time'));
    fireEvent.click(screen.getByText('date'));
    fireEvent.click(screen.getByText('customer'));
    fireEvent.click(screen.getByText('payment'));

    expect(screen.getByTestId('vehicle').textContent).toBe('sedan');
    expect(screen.getByTestId('package').textContent).toBe('premium');
    expect(screen.getByTestId('addons').textContent).toBe('none');
    expect(screen.getByTestId('time').textContent).toBe('10:00 AM');

    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('step').textContent).toBe('vehicle');
    expect(screen.getByTestId('vehicle').textContent).toBe('none');
  });

  it('throws if useBooking is used without provider', () => {
    const NoProvider = () => {
      useBooking();
      return null;
    };

    expect(() => render(<NoProvider />)).toThrow(
      'useBooking must be used within a BookingProvider'
    );
  });
});
