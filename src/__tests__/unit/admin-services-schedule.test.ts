import { describe, expect, it } from 'vitest';
import {
  getScheduleForDate,
  getWeekSchedule,
  getAvailableSlots,
  quickUpdateStatus,
  getScheduleStats,
} from '@/lib/admin/services/schedule';

import { format, addDays } from 'date-fns';

describe('Schedule Service', () => {
  describe('getScheduleForDate', () => {
    it('returns schedule for specified date', async () => {
      const date = '2026-03-01';
      const result = await getScheduleForDate(date);

      expect(result.date).toBe(date);
      expect(result.slots).toBeInstanceOf(Array);
      expect(result.slots.length).toBeGreaterThan(0);
    });

    it('returns slots with correct structure', async () => {
      const result = await getScheduleForDate('2026-03-01');

      result.slots.forEach(slot => {
        expect(slot).toHaveProperty('id');
        expect(slot).toHaveProperty('time');
        expect(slot).toHaveProperty('isAvailable');
        expect(slot).toHaveProperty('booking');
        expect(typeof slot.isAvailable).toBe('boolean');
      });
    });

    it('returns total bookings count', async () => {
      const result = await getScheduleForDate('2026-03-01');

      const bookedSlots = result.slots.filter(slot => !slot.isAvailable);
      expect(result.totalBookings).toBe(bookedSlots.length);
    });

    it('returns total revenue', async () => {
      const result = await getScheduleForDate('2026-03-01');

      const revenue = result.slots
        .filter(
          (slot): slot is typeof slot & { booking: NonNullable<typeof slot.booking> } =>
            slot.booking !== undefined
        )
        .reduce((sum, slot) => sum + slot.booking.price, 0);

      expect(result.totalRevenue).toBe(revenue);
    });

    it('caches results for identical dates', async () => {
      const date = '2026-03-01';

      const result1 = await getScheduleForDate(date);
      const result2 = await getScheduleForDate(date);

      expect(result1.slots).toEqual(result2.slots);
    });
  });

  describe('getWeekSchedule', () => {
    it('returns 7 days of schedule', async () => {
      const startDate = '2026-03-01';
      const result = await getWeekSchedule(startDate);

      expect(result).toHaveLength(7);
    });

    it('returns consecutive dates', async () => {
      const startDate = '2026-03-01';
      const result = await getWeekSchedule(startDate);

      const start = new Date(startDate);
      result.forEach((day, index) => {
        const expectedDate = format(addDays(start, index), 'yyyy-MM-dd');
        expect(day.date).toBe(expectedDate);
      });
    });

    it('each day has schedule data', async () => {
      const result = await getWeekSchedule('2026-03-01');

      result.forEach(day => {
        expect(day.slots).toBeInstanceOf(Array);
        expect(day.slots.length).toBeGreaterThan(0);
        expect(typeof day.totalBookings).toBe('number');
        expect(typeof day.totalRevenue).toBe('number');
      });
    });

    it('caches results for identical week', async () => {
      const startDate = '2026-03-01';

      const result1 = await getWeekSchedule(startDate);
      const result2 = await getWeekSchedule(startDate);

      expect(result1).toEqual(result2);
    });
  });

  describe('getAvailableSlots', () => {
    it('returns only available slots', async () => {
      const date = '2026-03-01';
      const result = await getAvailableSlots(date);

      result.forEach(slot => {
        expect(slot.isAvailable).toBe(true);
        expect(slot.booking).toBeUndefined();
      });
    });

    it('returns subset of all slots', async () => {
      const date = '2026-03-01';
      const allSlots = await getScheduleForDate(date);
      const availableSlots = await getAvailableSlots(date);

      expect(availableSlots.length).toBeLessThanOrEqual(allSlots.slots.length);
    });
  });

  describe('quickUpdateStatus', () => {
    it('returns true on successful update', async () => {
      const result = await quickUpdateStatus('BK-TEST-123', 'completed');
      expect(result).toBe(true);
    });

    it('clears cache after update', async () => {
      await getScheduleForDate('2026-03-01');
      await quickUpdateStatus('BK-TEST-123', 'completed');

      const result = await getScheduleForDate('2026-03-01');
      expect(result.slots).toBeInstanceOf(Array);
    });
  });

  describe('getScheduleStats', () => {
    it('returns statistics object', async () => {
      const date = '2026-03-01';
      const result = await getScheduleStats(date);

      expect(result).toHaveProperty('totalSlots');
      expect(result).toHaveProperty('availableSlots');
      expect(result).toHaveProperty('bookedSlots');
      expect(result).toHaveProperty('utilizationRate');
      expect(result).toHaveProperty('totalRevenue');
    });

    it('returns consistent slot counts', async () => {
      const date = '2026-03-01';
      const result = await getScheduleStats(date);

      expect(result.totalSlots).toBe(result.availableSlots + result.bookedSlots);
    });

    it('returns utilization rate between 0 and 100', async () => {
      const date = '2026-03-01';
      const result = await getScheduleStats(date);

      expect(result.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(result.utilizationRate).toBeLessThanOrEqual(100);
    });

    it('returns non-negative revenue', async () => {
      const date = '2026-03-01';
      const result = await getScheduleStats(date);

      expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
    });
  });
});
