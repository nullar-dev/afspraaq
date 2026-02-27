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
      <button onClick={() => dispatch({ type: 'SET_VEHICLE', payload: 'vehicle-sedan' })}>
        vehicle
      </button>
      <button onClick={() => dispatch({ type: 'SET_PACKAGE', payload: 'premium' })}>package</button>
      <button onClick={() => dispatch({ type: 'TOGGLE_ADDON', payload: 'wheel-coating' })}>
        addon
      </button>
      <button onClick={() => dispatch({ type: 'TOGGLE_ADDON', payload: '' })}>addon-invalid</button>
      <button onClick={() => dispatch({ type: 'SET_DATE', payload: new Date(2026, 2, 10) })}>
        date
      </button>
      <button onClick={() => dispatch({ type: 'SET_TIME', payload: '10:00 AM' })}>time</button>
      <button onClick={() => goToStep('not-a-step' as never)}>go-invalid</button>
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
    fireEvent.click(screen.getByText('addon-invalid'));
    fireEvent.click(screen.getByText('addon'));
    fireEvent.click(screen.getByText('time'));
    fireEvent.click(screen.getByText('date'));
    fireEvent.click(screen.getByText('customer'));
    expect(screen.getByTestId('vehicle').textContent).toBe('vehicle-sedan');
    expect(screen.getByTestId('package').textContent).toBe('premium');
    expect(screen.getByTestId('addons').textContent).toBe('none');
    expect(screen.getByTestId('time').textContent).toBe('10:00 AM');

    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('step').textContent).toBe('vehicle');
    expect(screen.getByTestId('vehicle').textContent).toBe('none');

    fireEvent.click(screen.getByText('go-invalid'));
    expect(screen.getByTestId('step').textContent).toBe('vehicle');
    fireEvent.click(screen.getByText('next'));
    expect(screen.getByTestId('step').textContent).toBe('services');
    fireEvent.click(screen.getByText('prev'));
    expect(screen.getByTestId('step').textContent).toBe('vehicle');
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
