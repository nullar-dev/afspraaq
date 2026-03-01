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
const MAX_CACHE_SIZE = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const cache = new Map<string, { data: unknown; timestamp: number }>();
const customerCacheIndex = new Map<string, Set<string>>();
let customersStore = generateMockCustomers(50);
const customerBookings = new Map<string, string[]>();

for (const customer of customersStore) {
  customerBookings.set(
    customer.id,
    Array.from({ length: customer.totalBookings }, (_, index) => `BK-${1000 + index}`)
  );
}

function getCacheKey(operation: string, params: CustomerFilters | Record<string, unknown>): string {
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

function indexCacheKeyByCustomers(key: string, customers: Customer[]): void {
  for (const customer of customers) {
    const keys = customerCacheIndex.get(customer.id) ?? new Set<string>();
    keys.add(key);
    customerCacheIndex.set(customer.id, keys);
  }
}

function invalidateCustomerCaches(customerId: string): void {
  const keys = customerCacheIndex.get(customerId);
  if (!keys) {
    return;
  }

  for (const key of keys) {
    cache.delete(key);
  }

  customerCacheIndex.delete(customerId);
}

function sanitizeFilters(filters: Partial<CustomerFilters>): CustomerFilters {
  const minBookings =
    Number.isInteger(filters.minBookings) && (filters.minBookings ?? 0) >= 0
      ? (filters.minBookings as number)
      : undefined;
  const maxBookings =
    Number.isInteger(filters.maxBookings) && (filters.maxBookings ?? 0) >= 0
      ? (filters.maxBookings as number)
      : undefined;

  const pageCandidate = Number(filters.page);
  const limitCandidate = Number(filters.limit);

  return {
    ...defaultFilters,
    search: filters.search?.trim() || undefined,
    minBookings,
    maxBookings,
    page: Number.isInteger(pageCandidate) && pageCandidate > 0 ? pageCandidate : DEFAULT_PAGE,
    limit:
      Number.isInteger(limitCandidate) && limitCandidate > 0
        ? Math.min(limitCandidate, MAX_LIMIT)
        : DEFAULT_LIMIT,
  };
}

function findCustomerById(id: string): Customer | null {
  return customersStore.find(customer => customer.id === id) ?? null;
}

function assertValidCustomerId(id: string): void {
  if (!/^CUST-[A-Za-z0-9-]+$/.test(id)) {
    throw new Error('Invalid customer ID format');
  }
}

function validateCustomerUpdate(data: Partial<CustomerUpdateData>): void {
  if (data.email !== undefined && data.email.trim() !== '' && !data.email.includes('@')) {
    throw new Error('Invalid customer email');
  }
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

  const mergedFilters = sanitizeFilters(filters);
  const cacheKey = getCacheKey('getCustomers', mergedFilters);
  const cached = getCachedData<PaginatedResult<Customer>>(cacheKey);

  if (cached) {
    return cached;
  }

  const filtered = filterMockCustomers(customersStore, mergedFilters);

  const page = mergedFilters.page || DEFAULT_PAGE;
  const limit = mergedFilters.limit || DEFAULT_LIMIT;
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
  indexCacheKeyByCustomers(cacheKey, result.data);
  return result;
}

/**
 * Get a single customer by ID
 * @param id - Customer ID
 * @returns Customer or null if not found
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  await new Promise(resolve => setTimeout(resolve, 200));

  assertValidCustomerId(id);
  return findCustomerById(id);
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

  assertValidCustomerId(id);
  validateCustomerUpdate(data);

  const customer = findCustomerById(id);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const updated: Customer = {
    ...customer,
    name: data.name?.trim() || customer.name,
    email: data.email?.trim() || customer.email,
    phone: data.phone?.trim() || customer.phone,
    address: data.address ?? customer.address,
  };

  customersStore = customersStore.map(item => (item.id === id ? updated : item));
  invalidateCustomerCaches(id);

  return updated;
}

/**
 * Delete a customer
 * @param id - Customer ID
 * @returns Success boolean
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 400));

  assertValidCustomerId(id);

  const before = customersStore.length;
  customersStore = customersStore.filter(customer => customer.id !== id);

  if (customersStore.length === before) {
    return false;
  }

  customerBookings.delete(id);
  invalidateCustomerCaches(id);

  return true;
}

/**
 * Get customer booking history
 * @param id - Customer ID
 * @returns Array of booking IDs (to be fetched separately)
 */
export async function getCustomerBookings(id: string): Promise<string[]> {
  await new Promise(resolve => setTimeout(resolve, 200));

  assertValidCustomerId(id);

  if (!findCustomerById(id)) {
    return [];
  }

  return customerBookings.get(id) ?? [];
}

/**
 * Get customer statistics
 * @returns Aggregated customer stats
 */
export async function getCustomerStats(): Promise<{
  total: number;
  newThisMonth: number;
  activeThisMonth: number;
  topCustomers: Array<{ id: string; name: string; totalSpentCents: number }>;
}> {
  await new Promise(resolve => setTimeout(resolve, 250));

  const customers = [...customersStore];

  return {
    total: customers.length,
    newThisMonth: Math.floor(customers.length * 0.15),
    activeThisMonth: Math.floor(customers.length * 0.6),
    topCustomers: customers
      .sort((a, b) => b.totalSpentCents - a.totalSpentCents)
      .slice(0, 5)
      .map(c => ({ id: c.id, name: c.name, totalSpentCents: c.totalSpentCents })),
  };
}
