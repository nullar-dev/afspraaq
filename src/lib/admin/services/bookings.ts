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

import type { Booking, BookingFilters, BookingUpdateData, PaginatedResult } from './types';
import {
  generateMockBookings,
  generateMockBookingStats,
  filterMockBookings,
} from '../mock/bookings';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCacheKey(operation: string, params: BookingFilters | Record<string, unknown>): string {
  return `${operation}:${JSON.stringify(params)}`;
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
  cache.set(key, { data, timestamp: Date.now() });
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

  const mergedFilters: BookingFilters = { ...defaultFilters, ...filters };
  const cacheKey = getCacheKey('getBookings', mergedFilters);
  const cached = getCachedData<PaginatedResult<Booking>>(cacheKey);

  if (cached) {
    return cached;
  }

  // TODO: Replace with Supabase query
  // const start = ((filters.page || 1) - 1) * (filters.limit || 10);
  // const end = start + (filters.limit || 10) - 1;

  const mockBookings = generateMockBookings(50);
  const filtered = filterMockBookings(mockBookings, mergedFilters);

  const page = mergedFilters.page || 1;
  const limit = mergedFilters.limit || 10;
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

  // TODO: Replace with Supabase query
  // const { data, error } = await supabase
  //   .from('bookings')
  //   .select('*')
  //   .eq('id', id)
  //   .single()

  const mockBookings = generateMockBookings(1);
  const booking = mockBookings[0];
  if (!booking) return null;

  return {
    ...booking,
    id,
    notes: booking.notes ?? undefined,
  };
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

  // TODO: Replace with Supabase update
  // const { data: updated, error } = await supabase
  //   .from('bookings')
  //   .update({ ...data, updated_at: new Date().toISOString() })
  //   .eq('id', id)
  //   .select()
  //   .single()

  // Invalidate related caches
  cache.clear();

  const mockBookings = generateMockBookings(1);
  const booking = mockBookings[0];
  if (!booking) {
    throw new Error('Failed to generate mock booking');
  }

  // Build updated booking - only override fields that are explicitly provided
  const updated: Booking = {
    ...booking,
    id,
    status: data.status ?? booking.status,
    date: data.date ?? booking.date,
    time: data.time ?? booking.time,
    service: data.service ?? booking.service,
    vehicle: data.vehicle ?? booking.vehicle,
    notes: data.notes ?? booking.notes,
    price: data.price ?? booking.price,
    updatedAt: new Date().toISOString(),
  };

  return updated;
}

/**
 * Delete a booking
 * @param id - Booking ID
 * @returns Success boolean
 */
export async function deleteBooking(id: string): Promise<boolean> {
  void id; // parameter used in future implementation
  await new Promise(resolve => setTimeout(resolve, 400));

  // TODO: Replace with Supabase delete
  // const { error } = await supabase
  //   .from('bookings')
  //   .delete()
  //   .eq('id', id)

  // Invalidate related caches
  cache.clear();

  return true;
}

/**
 * Get booking statistics
 * @returns Aggregated booking stats
 */
export async function getBookingStats(): Promise<{
  todayCount: number;
  todayRevenue: number;
  weekCount: number;
  weekRevenue: number;
  monthCount: number;
  monthRevenue: number;
  byStatus: Record<Booking['status'], number>;
}> {
  await new Promise(resolve => setTimeout(resolve, 250));

  // TODO: Replace with Supabase aggregation query
  // Consider using Supabase's group_by or count

  return generateMockBookingStats();
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
    'Price',
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
    b.price,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
