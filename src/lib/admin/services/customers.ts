/**
 * Customers Service - MOCK DATA
 * TODO: Backend Integration Guide for Senior Engineer
 *
 * 1. Replace mock data with Supabase queries
 * 2. Add proper customer profile relationships
 * 3. Add full-text search for customer lookup
 * 4. Consider adding caching with SWR/React Query
 * 5. Add soft delete pattern instead of hard delete
 * 6. Implement customer merge logic for duplicates
 *
 * Example Supabase query:
 * const { data, error } = await supabase
 *   .from('profiles')
 *   .select('*, bookings(count)')
 *   .ilike('name', `%${filters.search}%`)
 *   .order('created_at', { ascending: false })
 *   .range(start, end)
 */

'use server';

import type { Customer, CustomerFilters, CustomerUpdateData, PaginatedResult } from './types';
import { generateMockCustomers, filterMockCustomers } from '../mock/customers';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCacheKey(operation: string, params: CustomerFilters | Record<string, unknown>): string {
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

const defaultFilters: CustomerFilters = {
  search: undefined,
  minBookings: undefined,
  maxBookings: undefined,
  page: undefined,
  limit: undefined,
};

/**
 * Get customers with filtering and pagination
 * @param filters - Optional filters for search, min/max bookings
 * @returns Paginated list of customers
 */
export async function getCustomers(
  filters: Partial<CustomerFilters> = {}
): Promise<PaginatedResult<Customer>> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const mergedFilters: CustomerFilters = { ...defaultFilters, ...filters };
  const cacheKey = getCacheKey('getCustomers', mergedFilters);
  const cached = getCachedData<PaginatedResult<Customer>>(cacheKey);

  if (cached) {
    return cached;
  }

  const mockCustomers = generateMockCustomers(50);
  const filtered = filterMockCustomers(mockCustomers, mergedFilters);

  const page = mergedFilters.page || 1;
  const limit = mergedFilters.limit || 10;
  const start = (page - 1) * limit;
  const end = start + limit;

  const result: PaginatedResult<Customer> = {
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
 * Get a single customer by ID
 * @param id - Customer ID
 * @returns Customer or null if not found
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  await new Promise(resolve => setTimeout(resolve, 200));

  const mockCustomers = generateMockCustomers(1);
  const customer = mockCustomers[0];
  if (!customer) return null;

  return {
    ...customer,
    id,
    avatar: customer.avatar ?? undefined,
    address: customer.address ?? undefined,
  };
}

/**
 * Update a customer
 * @param id - Customer ID
 * @param data - Fields to update
 * @returns Updated customer
 */
export async function updateCustomer(
  id: string,
  data: Partial<CustomerUpdateData>
): Promise<Customer> {
  await new Promise(resolve => setTimeout(resolve, 500));

  cache.clear();

  const mockCustomers = generateMockCustomers(1);
  const customer = mockCustomers[0];
  if (!customer) {
    throw new Error('Failed to generate mock customer');
  }

  // Build updated customer - only override fields that are explicitly provided
  const updated: Customer = {
    ...customer,
    id,
    name: data.name ?? customer.name,
    email: data.email ?? customer.email,
    phone: data.phone ?? customer.phone,
    address: data.address ?? customer.address,
    avatar: customer.avatar,
    totalBookings: customer.totalBookings,
    totalSpent: customer.totalSpent,
    lastBooking: customer.lastBooking,
    joinedAt: customer.joinedAt,
  };

  return updated;
}

/**
 * Delete a customer
 * @param id - Customer ID
 * @returns Success boolean
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  void id; // parameter used in future implementation
  await new Promise(resolve => setTimeout(resolve, 400));

  cache.clear();

  return true;
}

/**
 * Get customer booking history
 * @param id - Customer ID
 * @returns Array of booking IDs (to be fetched separately)
 */
export async function getCustomerBookings(id: string): Promise<string[]> {
  void id; // parameter used in future implementation
  await new Promise(resolve => setTimeout(resolve, 200));

  return Array.from({ length: Math.floor(Math.random() * 8) + 1 }, (_, i) => String(1000 + i));
}

/**
 * Get customer statistics
 * @returns Aggregated customer stats
 */
export async function getCustomerStats(): Promise<{
  total: number;
  newThisMonth: number;
  activeThisMonth: number;
  topCustomers: Array<{ id: string; name: string; totalSpent: number }>;
}> {
  await new Promise(resolve => setTimeout(resolve, 250));

  const customers = generateMockCustomers(50);

  return {
    total: customers.length,
    newThisMonth: Math.floor(customers.length * 0.15),
    activeThisMonth: Math.floor(customers.length * 0.6),
    topCustomers: customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map(c => ({ id: c.id, name: c.name, totalSpent: c.totalSpent })),
  };
}
