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
const STEPS: BookingStep[] = ['vehicle', 'services', 'schedule', 'customer', 'payment'];

const EMAIL_PARTIAL_PATTERN = /^[^\s@]*@?[^\s@]*\.?[^\s@]*$/;
const ZIP_PARTIAL_PATTERN = /^(\d{0,5}|\d{5}-\d{0,4})$/;

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
        {
          const normalized = value.trim().toLowerCase().replace(/\s+/g, '').slice(0, 254);
          if (EMAIL_PARTIAL_PATTERN.test(normalized)) {
            nextPayload[key] = normalized;
          }
        }
        break;
      case 'phone':
        {
          const phone = value.replace(/[^\d()+\-\s]/g, '').slice(0, 25);
          const digitCount = phone.replace(/\D/g, '').length;
          if (digitCount <= 15) {
            nextPayload[key] = phone;
          }
        }
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
        {
          const zip = value.replace(/[^\d-]/g, '').slice(0, 10);
          if (ZIP_PARTIAL_PATTERN.test(zip)) {
            nextPayload[key] = zip;
          }
        }
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
      if (!STEPS.includes(action.payload)) {
        return state;
      }
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

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const goToStep = (step: BookingStep) => {
    if (!STEPS.includes(step)) return;
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const nextStep = () => {
    const currentIndex = STEPS.indexOf(state.currentStep);
    if (currentIndex < 0) return;
    if (currentIndex < STEPS.length - 1) {
      const step = STEPS[currentIndex + 1];
      if (!step) return;
      dispatch({ type: 'SET_STEP', payload: step });
    }
  };

  const prevStep = () => {
    const currentIndex = STEPS.indexOf(state.currentStep);
    if (currentIndex < 0) return;
    if (currentIndex > 0) {
      const step = STEPS[currentIndex - 1];
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
