// Shared types for admin services
// 100% mock - ready for real data integration later
// Note: exactOptionalPropertyTypes is enabled in tsconfig, so optional fields use explicit | undefined

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | undefined;
  service: 'Essential' | 'Premium' | 'Ultimate';
  vehicle: 'Sedan' | 'SUV' | 'Crossover' | 'Luxury';
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  priceCents: number;
  notes: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpentCents: number;
  lastBooking: string;
  joinedAt: string;
  avatar: string | undefined;
  address:
    | {
        street: string | undefined;
        city: string | undefined;
        zip: string | undefined;
      }
    | undefined;
}

export interface ScheduleSlot {
  id: string;
  time: string;
  booking: Booking | undefined;
  isAvailable: boolean;
}

export interface ScheduleDay {
  date: string;
  slots: ScheduleSlot[];
  totalBookings: number;
  totalRevenueCents: number;
}

// Filter types - all fields explicitly allow undefined for exactOptionalPropertyTypes compatibility
export interface BookingFilters {
  status: Booking['status'] | undefined;
  service: Booking['service'] | undefined;
  vehicle: Booking['vehicle'] | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  search: string | undefined;
  page: number | undefined;
  limit: number | undefined;
}

export interface CustomerFilters {
  search: string | undefined;
  minBookings: number | undefined;
  maxBookings: number | undefined;
  page: number | undefined;
  limit: number | undefined;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Update types - all fields explicitly allow undefined
export interface BookingUpdateData {
  status: Booking['status'] | undefined;
  date: string | undefined;
  time: string | undefined;
  service: Booking['service'] | undefined;
  vehicle: Booking['vehicle'] | undefined;
  notes: string | undefined;
  priceCents: number | undefined;
}

export interface BookingCreateData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  service: Booking['service'];
  vehicle: Booking['vehicle'];
  date: string;
  time: string;
  status?: Booking['status'];
  notes?: string;
  priceCents?: number;
}

export interface CustomerUpdateData {
  name: string | undefined;
  email: string | undefined;
  phone: string | undefined;
  address: Customer['address'];
}

export interface RevenueStats {
  totalCents: number;
  changeCents: number;
  trend: Array<{ date: string; valueCents: number }>;
}

export interface BookingStats {
  total: number;
  change: number;
  byStatus: Record<Booking['status'], number>;
  byService: Record<Booking['service'], number>;
  byVehicle: Record<Booking['vehicle'], number>;
}

export interface CustomerStats {
  total: number;
  change: number;
  newThisMonth: number;
  retentionRate: number;
}
