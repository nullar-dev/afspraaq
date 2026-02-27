'use client';

import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { BookingStep, VehicleType, CustomerDetails } from '@/types/booking';

interface BookingState {
  currentStep: BookingStep;
  selectedVehicle: VehicleType | null;
  selectedPackage: string | null;
  selectedAddOns: string[];
  selectedDate: Date | null;
  selectedTime: string | null;
  customerDetails: CustomerDetails;
}

type BookingAction =
  | { type: 'SET_STEP'; payload: BookingStep }
  | { type: 'SET_VEHICLE'; payload: VehicleType }
  | { type: 'SET_PACKAGE'; payload: string }
  | { type: 'TOGGLE_ADDON'; payload: string }
  | { type: 'SET_DATE'; payload: Date }
  | { type: 'SET_TIME'; payload: string }
  | { type: 'SET_CUSTOMER_DETAILS'; payload: Partial<CustomerDetails> }
  | { type: 'RESET_BOOKING' };

const initialState: BookingState = {
  currentStep: 'vehicle',
  selectedVehicle: null,
  selectedPackage: null,
  selectedAddOns: [],
  selectedDate: null,
  selectedTime: null,
  customerDetails: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    specialRequests: '',
  },
};

const bookingReducer = (state: BookingState, action: BookingAction): BookingState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_VEHICLE':
      return { ...state, selectedVehicle: action.payload };
    case 'SET_PACKAGE':
      return { ...state, selectedPackage: action.payload };
    case 'TOGGLE_ADDON':
      return {
        ...state,
        selectedAddOns: state.selectedAddOns.includes(action.payload)
          ? state.selectedAddOns.filter(id => id !== action.payload)
          : [...state.selectedAddOns, action.payload],
      };
    case 'SET_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_TIME':
      return { ...state, selectedTime: action.payload };
    case 'SET_CUSTOMER_DETAILS':
      return { ...state, customerDetails: { ...state.customerDetails, ...action.payload } };
    case 'RESET_BOOKING':
      return initialState;
    default:
      return state;
  }
};

interface BookingContextType {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
  goToStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const steps: BookingStep[] = ['vehicle', 'services', 'schedule', 'customer', 'payment'];

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const goToStep = (step: BookingStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const nextStep = () => {
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < steps.length - 1) {
      dispatch({ type: 'SET_STEP', payload: steps[currentIndex + 1] });
    }
  };

  const prevStep = () => {
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      dispatch({ type: 'SET_STEP', payload: steps[currentIndex - 1] });
    }
  };

  return (
    <BookingContext.Provider value={{ state, dispatch, goToStep, nextStep, prevStep }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
