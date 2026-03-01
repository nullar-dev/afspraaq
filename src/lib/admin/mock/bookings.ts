// Mock bookings data generator
// Used by bookings service - 100% mock, ready for replacement

import type { Booking, BookingFilters } from '../services/types';

const services = ['Essential', 'Premium', 'Ultimate'] as const;
const vehicles = ['Sedan', 'SUV', 'Crossover', 'Luxury'] as const;
const statuses = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
const firstNames = [
  'John',
  'Sarah',
  'Mike',
  'Emma',
  'David',
  'Lisa',
  'Chris',
  'Anna',
  'James',
  'Maria',
];
const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
];

const priceMap = {
  Essential: 149,
  Premium: 299,
  Ultimate: 499,
};

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomDate(daysBack = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString().split('T')[0] as string;
}

function randomTime(): string {
  const hours = 9 + Math.floor(Math.random() * 8);
  const minutes = Math.random() > 0.5 ? 0 : 30;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function generateMockBookings(count: number): Booking[] {
  return Array.from({ length: count }, (_, i) => {
    const service = randomItem(services);
    const vehicle = randomItem(vehicles);
    const firstName = firstNames[i % firstNames.length] ?? 'John';
    const lastName = lastNames[i % lastNames.length] ?? 'Smith';
    const basePrice = priceMap[service];
    const vehicleMultiplier = vehicle === 'Luxury' ? 1.5 : vehicle === 'SUV' ? 1.2 : 1;

    return {
      id: `BK-${1000 + i}`,
      customerName: `${firstName} ${lastName}`,
      customerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      customerPhone: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
      service,
      vehicle,
      date: randomDate(),
      time: randomTime(),
      status: randomItem(statuses),
      price: Math.floor(basePrice * vehicleMultiplier),
      notes: Math.random() > 0.7 ? 'Special instructions here' : undefined,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export function filterMockBookings(bookings: Booking[], filters: BookingFilters): Booking[] {
  return bookings.filter(booking => {
    if (filters.status && booking.status !== filters.status) return false;
    if (filters.service && booking.service !== filters.service) return false;
    if (filters.vehicle && booking.vehicle !== filters.vehicle) return false;
    if (filters.dateFrom && booking.date < filters.dateFrom) return false;
    if (filters.dateTo && booking.date > filters.dateTo) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        booking.customerName.toLowerCase().includes(searchLower) ||
        booking.customerEmail.toLowerCase().includes(searchLower) ||
        booking.id.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });
}

export function generateMockBookingStats(): {
  todayCount: number;
  todayRevenue: number;
  weekCount: number;
  weekRevenue: number;
  monthCount: number;
  monthRevenue: number;
  byStatus: Record<Booking['status'], number>;
} {
  const today = generateMockBookings(8);
  const week = generateMockBookings(45);
  const month = generateMockBookings(150);

  return {
    todayCount: today.filter(b => b.status !== 'cancelled').length,
    todayRevenue: today.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.price, 0),
    weekCount: week.filter(b => b.status !== 'cancelled').length,
    weekRevenue: week.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.price, 0),
    monthCount: month.filter(b => b.status !== 'cancelled').length,
    monthRevenue: month.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.price, 0),
    byStatus: {
      pending: month.filter(b => b.status === 'pending').length,
      confirmed: month.filter(b => b.status === 'confirmed').length,
      completed: month.filter(b => b.status === 'completed').length,
      cancelled: month.filter(b => b.status === 'cancelled').length,
    },
  };
}
