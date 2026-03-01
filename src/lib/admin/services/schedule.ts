/**
 * Schedule Service - MOCK DATA
 * TODO: Backend Integration Guide for Senior Engineer
 *
 * 1. Replace mock data with Supabase queries
 * 2. Consider using calendar/time-slot tables in Supabase
 * 3. Add real-time subscriptions for booking changes
 * 4. Implement availability logic based on business hours
 * 5. Add conflict detection for overlapping bookings
 *
 * Example Supabase query:
 * const { data, error } = await supabase
 *   .from('bookings')
 *   .select('*')
 *   .eq('date', date)
 *   .neq('status', 'cancelled')
 *   .order('time')
 */

'use server';

import type { ScheduleDay, ScheduleSlot, Booking } from './types';
import { generateMockScheduleDay, generateMockWeekSchedule } from '../mock/schedule';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCacheKey(operation: string, params: Record<string, unknown>): string {
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

/**
 * Get schedule for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @returns Schedule day with slots and bookings
 */
export async function getScheduleForDate(date: string): Promise<ScheduleDay> {
  await new Promise(resolve => setTimeout(resolve, 250));

  const cacheKey = getCacheKey('getScheduleForDate', { date });
  const cached = getCachedData<ScheduleDay>(cacheKey);

  if (cached) {
    return cached;
  }

  const result = generateMockScheduleDay(date);
  setCachedData(cacheKey, result);
  return result;
}

/**
 * Get schedule for a week starting from a date
 * @param startDate - Start date in YYYY-MM-DD format
 * @returns Array of schedule days
 */
export async function getWeekSchedule(startDate: string): Promise<ScheduleDay[]> {
  await new Promise(resolve => setTimeout(resolve, 400));

  const cacheKey = getCacheKey('getWeekSchedule', { startDate });
  const cached = getCachedData<ScheduleDay[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const result = generateMockWeekSchedule(startDate);
  setCachedData(cacheKey, result);
  return result;
}

/**
 * Get available time slots for a date
 * @param date - Date in YYYY-MM-DD format
 * @returns Array of available slots
 */
export async function getAvailableSlots(date: string): Promise<ScheduleSlot[]> {
  const schedule = await getScheduleForDate(date);
  return schedule.slots.filter(slot => slot.isAvailable);
}

/**
 * Quick update booking status from schedule
 * @param bookingId - Booking ID
 * @param status - New status
 * @returns Success boolean
 */
export async function quickUpdateStatus(
  bookingId: string,
  status: Booking['status']
): Promise<boolean> {
  void bookingId; // parameter used in future implementation
  void status; // parameter used in future implementation
  await new Promise(resolve => setTimeout(resolve, 300));

  // TODO: Replace with Supabase update
  // const { error } = await supabase
  //   .from('bookings')
  //   .update({ status, updated_at: new Date().toISOString() })
  //   .eq('id', bookingId)

  // Invalidate cache
  cache.clear();

  return true;
}

/**
 * Get schedule statistics
 * @param date - Date in YYYY-MM-DD format
 * @returns Schedule stats for the day
 */
export async function getScheduleStats(date: string): Promise<{
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  utilizationRate: number;
  totalRevenue: number;
}> {
  const schedule = await getScheduleForDate(date);

  const totalSlots = schedule.slots.length;
  const bookedSlots = schedule.slots.filter(slot => slot.booking).length;
  const availableSlots = totalSlots - bookedSlots;

  return {
    totalSlots,
    availableSlots,
    bookedSlots,
    utilizationRate: Math.round((bookedSlots / totalSlots) * 100),
    totalRevenue: schedule.totalRevenue,
  };
}
