/**
 * Bookings Service - MOCK DATA
 * TODO: Backend Integration Guide for Senior Engineer
 *
 * 1. Replace mock data with Supabase queries
 * 2. Add pagination support at DB level
 * 3. Add full-text search using Supabase's full text search
 * 4. Consider adding react-hook-form + zod for form validation in edit forms
 * 5. Add error handling with proper error messages
 * 6. Add optimistic updates for better UX
 *
 * Example Supabase query:
 * const { data, error, count } = await supabase
 *   .from('bookings')
 *   .select('*', { count: 'exact' })
 *   .eq('status', filters.status)
 *   .ilike('customer_name', `%${filters.search}%`)
 *   .order('created_at', { ascending: false })
 *   .range(start, end)
 */

'use server';

import type {
  Booking,
  BookingCreateData,
  BookingFilters,
  BookingUpdateData,
  PaginatedResult,
} from './types';
import {
  generateMockBookings,
  generateMockBookingStats,
  filterMockBookings,
} from '../mock/bookings';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 1000;

const VALID_STATUSES: Booking['status'][] = ['pending', 'confirmed', 'completed', 'cancelled'];
const VALID_SERVICES: Booking['service'][] = ['Essential', 'Premium', 'Ultimate'];
const VALID_VEHICLES: Booking['vehicle'][] = ['Sedan', 'SUV', 'Crossover', 'Luxury'];

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
let bookingsStore = generateMockBookings(150);

function getCacheKey(operation: string, params: BookingFilters | Record<string, unknown>): string {
  const normalized = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `${operation}:${JSON.stringify(normalized)}`;
}

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  cleanupExpiredCache();
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, { data, timestamp: Date.now() });
}

function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp >= CACHE_DURATION) {
      cache.delete(key);
    }
  }
}

function assertValidBookingId(id: string): void {
  if (!/^BK-[A-Za-z0-9-]+$/.test(id)) {
    throw new Error('Invalid booking ID format');
  }
}

function sanitizeFilters(filters: Partial<BookingFilters>): BookingFilters {
  const status = VALID_STATUSES.includes(filters.status as Booking['status'])
    ? (filters.status as Booking['status'])
    : undefined;
  const service = VALID_SERVICES.includes(filters.service as Booking['service'])
    ? (filters.service as Booking['service'])
    : undefined;
  const vehicle = VALID_VEHICLES.includes(filters.vehicle as Booking['vehicle'])
    ? (filters.vehicle as Booking['vehicle'])
    : undefined;

  const pageCandidate = Number(filters.page);
  const limitCandidate = Number(filters.limit);
  const page = Number.isInteger(pageCandidate) && pageCandidate > 0 ? pageCandidate : DEFAULT_PAGE;
  const limit =
    Number.isInteger(limitCandidate) && limitCandidate > 0
      ? Math.min(limitCandidate, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const search = filters.search?.trim() ? filters.search.trim() : undefined;

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const dateFrom =
    filters.dateFrom && datePattern.test(filters.dateFrom) ? filters.dateFrom : undefined;
  const dateTo = filters.dateTo && datePattern.test(filters.dateTo) ? filters.dateTo : undefined;

  return {
    ...defaultFilters,
    status,
    service,
    vehicle,
    search,
    page,
    limit,
    dateFrom,
    dateTo,
  };
}

function findBookingById(id: string): Booking | null {
  return bookingsStore.find(booking => booking.id === id) ?? null;
}

function validateUpdateData(data: Partial<BookingUpdateData>): void {
  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    throw new Error('Invalid booking status');
  }
  if (data.service !== undefined && !VALID_SERVICES.includes(data.service)) {
    throw new Error('Invalid booking service');
  }
  if (data.vehicle !== undefined && !VALID_VEHICLES.includes(data.vehicle)) {
    throw new Error('Invalid booking vehicle');
  }
  if (
    data.priceCents !== undefined &&
    (!Number.isInteger(data.priceCents) || data.priceCents < 0)
  ) {
    throw new Error('Invalid booking price');
  }
}

function invalidateAllCaches(): void {
  cache.clear();
}

function nextBookingId(): string {
  const ids = bookingsStore
    .map(booking => Number.parseInt(booking.id.replace('BK-', ''), 10))
    .filter(value => Number.isInteger(value));
  const maxId = ids.length > 0 ? Math.max(...ids) : 999;
  return `BK-${maxId + 1}`;
}

const defaultFilters: BookingFilters = {
  status: undefined,
  service: undefined,
  vehicle: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  search: undefined,
  page: undefined,
  limit: undefined,
};

/**
 * Get bookings with filtering and pagination
 * @param filters - Optional filters for status, service, search, etc.
 * @returns Paginated list of bookings
 */
export async function getBookings(
  filters: Partial<BookingFilters> = {}
): Promise<PaginatedResult<Booking>> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const mergedFilters = sanitizeFilters(filters);
  const cacheKey = getCacheKey('getBookings', mergedFilters);
  const cached = getCachedData<PaginatedResult<Booking>>(cacheKey);

  if (cached) {
    return cached;
  }

  // TODO: Replace with Supabase query
  // const start = ((filters.page || 1) - 1) * (filters.limit || 10);
  // const end = start + (filters.limit || 10) - 1;

  const filtered = filterMockBookings(bookingsStore, mergedFilters);

  const page = mergedFilters.page || DEFAULT_PAGE;
  const limit = mergedFilters.limit || DEFAULT_LIMIT;
  const start = (page - 1) * limit;
  const end = start + limit;

  const result: PaginatedResult<Booking> = {
    data: filtered.slice(start, end),
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
  };

  setCachedData(cacheKey, result);
  return result;
}

/**
 * Get a single booking by ID
 * @param id - Booking ID
 * @returns Booking or null if not found
 */
export async function getBookingById(id: string): Promise<Booking | null> {
  await new Promise(resolve => setTimeout(resolve, 200));

  assertValidBookingId(id);
  return findBookingById(id);
}

/**
 * Update a booking
 * @param id - Booking ID
 * @param data - Fields to update
 * @returns Updated booking
 */
export async function updateBooking(
  id: string,
  data: Partial<BookingUpdateData>
): Promise<Booking> {
  await new Promise(resolve => setTimeout(resolve, 500));

  assertValidBookingId(id);
  validateUpdateData(data);

  const booking = findBookingById(id);
  if (!booking) {
    throw new Error('Booking not found');
  }

  const updated: Booking = {
    ...booking,
    status: data.status ?? booking.status,
    date: data.date ?? booking.date,
    time: data.time ?? booking.time,
    service: data.service ?? booking.service,
    vehicle: data.vehicle ?? booking.vehicle,
    notes: data.notes ?? booking.notes,
    priceCents: data.priceCents ?? booking.priceCents,
    updatedAt: new Date().toISOString(),
  };

  bookingsStore = bookingsStore.map(item => (item.id === id ? updated : item));
  invalidateAllCaches();

  return updated;
}

export async function createBooking(data: BookingCreateData): Promise<Booking> {
  await new Promise(resolve => setTimeout(resolve, 450));

  const trimmedName = data.customerName.trim();
  const trimmedEmail = data.customerEmail.trim();

  if (!trimmedName) {
    throw new Error('Customer name is required');
  }
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    throw new Error('Valid customer email is required');
  }
  if (!VALID_SERVICES.includes(data.service)) {
    throw new Error('Invalid booking service');
  }
  if (!VALID_VEHICLES.includes(data.vehicle)) {
    throw new Error('Invalid booking vehicle');
  }

  const status = data.status && VALID_STATUSES.includes(data.status) ? data.status : 'pending';
  const createdAt = new Date().toISOString();

  const booking: Booking = {
    id: nextBookingId(),
    customerName: trimmedName,
    customerEmail: trimmedEmail,
    customerPhone: data.customerPhone?.trim() || undefined,
    service: data.service,
    vehicle: data.vehicle,
    date: data.date,
    time: data.time,
    status,
    priceCents: data.priceCents ?? 0,
    notes: data.notes?.trim() || undefined,
    createdAt,
    updatedAt: createdAt,
  };

  bookingsStore = [booking, ...bookingsStore];
  invalidateAllCaches();

  return booking;
}

/**
 * Delete a booking
 * @param id - Booking ID
 * @returns Success boolean
 */
export async function deleteBooking(id: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 400));

  assertValidBookingId(id);

  const initialLength = bookingsStore.length;
  bookingsStore = bookingsStore.filter(booking => booking.id !== id);

  if (bookingsStore.length === initialLength) {
    return false;
  }

  invalidateAllCaches();
  return true;
}

/**
 * Get booking statistics
 * @returns Aggregated booking stats
 */
export async function getBookingStats(): Promise<{
  todayCount: number;
  todayRevenueCents: number;
  weekCount: number;
  weekRevenueCents: number;
  monthCount: number;
  monthRevenueCents: number;
  byStatus: Record<Booking['status'], number>;
}> {
  await new Promise(resolve => setTimeout(resolve, 250));

  const stats = generateMockBookingStats();
  const byStatus = bookingsStore.reduce<Record<Booking['status'], number>>(
    (acc, booking) => {
      acc[booking.status] += 1;
      return acc;
    },
    { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
  );

  return {
    ...stats,
    byStatus,
  };
}

export async function getRevenueTrend(
  days = 30
): Promise<Array<{ date: string; valueCents: number }>> {
  const safeDays = Number.isInteger(days) && days > 0 ? Math.min(days, 365) : 30;
  await new Promise(resolve => setTimeout(resolve, 200));

  const trend = new Map<string, number>();
  for (let i = safeDays - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0] as string;
    trend.set(key, 0);
  }

  for (const booking of bookingsStore) {
    if (!trend.has(booking.date) || booking.status === 'cancelled') {
      continue;
    }
    trend.set(booking.date, (trend.get(booking.date) ?? 0) + booking.priceCents);
  }

  return Array.from(trend.entries()).map(([date, valueCents]) => ({ date, valueCents }));
}

/**
 * Export bookings to CSV format
 * @param filters - Filters for export
 * @returns CSV string content
 */
export async function exportBookingsToCSV(filters: Partial<BookingFilters> = {}): Promise<string> {
  const { data: bookings } = await getBookings({ ...filters, limit: 1000, page: 1 });

  const headers = [
    'ID',
    'Customer',
    'Email',
    'Service',
    'Vehicle',
    'Date',
    'Time',
    'Status',
    'Price (USD)',
  ];

  const rows = bookings.map(b => [
    b.id,
    b.customerName,
    b.customerEmail,
    b.service,
    b.vehicle,
    b.date,
    b.time,
    b.status,
    (b.priceCents / 100).toFixed(2),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
