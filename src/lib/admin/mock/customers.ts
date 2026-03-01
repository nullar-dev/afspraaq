// Mock customers data generator
// Used by customers service - 100% mock, ready for replacement

import type { Customer } from '../services/types';

import type { CustomerFilters } from '../services/types';

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

function randomDate(daysBack = 365): string {
  if (!Number.isFinite(daysBack) || daysBack < 0) {
    daysBack = 0;
  }

  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString().split('T')[0] as string;
}

function randomPhone(): string {
  return `+1 (555) ${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
}

export function generateMockCustomers(count: number): Customer[] {
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  const safeCount = Math.min(Math.floor(count), 1000);

  return Array.from({ length: safeCount }, (_, i) => {
    const firstName = firstNames[i % firstNames.length] ?? 'John';
    const lastName = lastNames[i % lastNames.length] ?? 'Smith';
    const bookings = Math.floor(Math.random() * 8) + 1;

    return {
      id: `CUST-${1000 + i}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      phone: randomPhone(),
      totalBookings: bookings,
      totalSpentCents: bookings * (150 + Math.floor(Math.random() * 300)) * 100,
      lastBooking: randomDate(30),
      joinedAt: new Date(
        Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000
      ).toISOString(),
      avatar: undefined,
      address: undefined,
    };
  });
}

export function filterMockCustomers(customers: Customer[], filters?: CustomerFilters): Customer[] {
  if (!filters) {
    return customers;
  }

  return customers.filter(customer => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.id.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filters.minBookings !== undefined && customer.totalBookings < filters.minBookings) {
      return false;
    }

    if (filters.maxBookings !== undefined && customer.totalBookings > filters.maxBookings) {
      return false;
    }

    return true;
  });
}
