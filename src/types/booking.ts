export type VehicleType = 'sedan' | 'crossover' | 'suv' | 'luxury';

export interface Vehicle {
  id: VehicleType;
  name: string;
  subtitle: string;
  price: number;
  description: string;
  image: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  recommended?: boolean;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  specialRequests: string;
}

export type BookingStep = 'vehicle' | 'services' | 'schedule' | 'customer' | 'payment';

export interface BookingState {
  currentStep: BookingStep;
  selectedVehicle: VehicleType | null;
  selectedPackage: string | null;
  selectedAddOns: string[];
  selectedDate: Date | null;
  selectedTime: string | null;
  customerDetails: CustomerDetails;
}
