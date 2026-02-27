'use client';

import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { BookingStep, CustomerDetails } from '@/types/booking';
import { addOns } from '@/data/bookingData';

interface BookingState {
  currentStep: BookingStep;
  selectedVehicle: string | null;
  selectedPackage: string | null;
  selectedAddOns: string[];
  selectedDate: Date | null;
  selectedTime: string | null;
  customerDetails: CustomerDetails;
}

type BookingAction =
  | { type: 'SET_STEP'; payload: BookingStep }
  | { type: 'SET_VEHICLE'; payload: string }
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

const ALLOWED_ADDON_IDS = new Set(addOns.map(addOn => addOn.id));

const isCustomerDetailsKey = (key: string): key is keyof CustomerDetails =>
  [
    'firstName',
    'lastName',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'zipCode',
    'specialRequests',
  ].includes(key);

const sanitizeCustomerDetailsPayload = (payload: Partial<CustomerDetails>) => {
  const nextPayload: Partial<CustomerDetails> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (!isCustomerDetailsKey(key)) continue;
    if (typeof value !== 'string') continue;
    switch (key) {
      case 'firstName':
      case 'lastName':
        nextPayload[key] = value.slice(0, 60);
        break;
      case 'email':
        nextPayload[key] = value.trim().toLowerCase().slice(0, 254);
        break;
      case 'phone':
        nextPayload[key] = value.replace(/[^\d()+\-\s]/g, '').slice(0, 25);
        break;
      case 'address':
        nextPayload[key] = value.slice(0, 120);
        break;
      case 'city':
        nextPayload[key] = value.slice(0, 60);
        break;
      case 'state':
        nextPayload[key] = value.slice(0, 30);
        break;
      case 'zipCode':
        nextPayload[key] = value.replace(/[^\d-]/g, '').slice(0, 10);
        break;
      case 'specialRequests':
        nextPayload[key] = value.slice(0, 500);
        break;
      default:
        break;
    }
  }

  return nextPayload;
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
      if (typeof action.payload !== 'string' || action.payload.length === 0) {
        return state;
      }
      if (!ALLOWED_ADDON_IDS.has(action.payload)) {
        return state;
      }
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
      return {
        ...state,
        customerDetails: {
          ...state.customerDetails,
          ...sanitizeCustomerDetailsPayload(action.payload),
        },
      };
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
    if (currentIndex < 0) return;
    if (currentIndex < steps.length - 1) {
      const step = steps[currentIndex + 1];
      if (!step) return;
      dispatch({ type: 'SET_STEP', payload: step });
    }
  };

  const prevStep = () => {
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < 0) return;
    if (currentIndex > 0) {
      const step = steps[currentIndex - 1];
      if (!step) return;
      dispatch({ type: 'SET_STEP', payload: step });
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
