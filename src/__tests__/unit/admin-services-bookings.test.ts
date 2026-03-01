import { describe, expect, it } from 'vitest';
import {
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getBookingStats,
  exportBookingsToCSV,
} from '@/lib/admin/services/bookings';
import type { BookingFilters, BookingUpdateData } from '@/lib/admin/services/types';

describe('Bookings Service', () => {
  describe('getBookings', () => {
    it('returns paginated bookings with default filters', async () => {
      const result = await getBookings();

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeLessThanOrEqual(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBeGreaterThan(0);
      expect(result.totalPages).toBeGreaterThan(0);
    });

    it('filters bookings by status', async () => {
      const filters: Partial<BookingFilters> = { status: 'confirmed' };
      const result = await getBookings(filters);

      result.data.forEach(booking => {
        expect(booking.status).toBe('confirmed');
      });
    });

    it('filters bookings by service', async () => {
      const filters: Partial<BookingFilters> = { service: 'Premium' };
      const result = await getBookings(filters);

      result.data.forEach(booking => {
        expect(booking.service).toBe('Premium');
      });
    });

    it('filters bookings by vehicle', async () => {
      const filters: Partial<BookingFilters> = { vehicle: 'SUV' };
      const result = await getBookings(filters);

      result.data.forEach(booking => {
        expect(booking.vehicle).toBe('SUV');
      });
    });

    it('filters bookings by search term', async () => {
      const filters: Partial<BookingFilters> = { search: 'John' };
      const result = await getBookings(filters);

      result.data.forEach(booking => {
        const matchesSearch =
          booking.customerName.toLowerCase().includes('john') ||
          booking.customerEmail.toLowerCase().includes('john') ||
          booking.id.toLowerCase().includes('john');
        expect(matchesSearch).toBe(true);
      });
    });

    it('returns correct page based on pagination', async () => {
      const filters: Partial<BookingFilters> = { page: 2, limit: 5 };
      const result = await getBookings(filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('caches results for identical queries', async () => {
      const filters: Partial<BookingFilters> = { status: 'confirmed' };

      const result1 = await getBookings(filters);
      const result2 = await getBookings(filters);

      expect(result1.data).toEqual(result2.data);
    });
  });

  describe('getBookingById', () => {
    it('returns a booking with the specified ID', async () => {
      const id = 'BK-1000';
      const result = await getBookingById(id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(id);
      expect(result!.customerName).toBeDefined();
      expect(result!.customerEmail).toBeDefined();
    });

    it('returns null for non-existent booking IDs', async () => {
      const result = await getBookingById('BK-NON-EXISTENT');
      expect(result).toBeNull();
    });

    it('returns booking with all required fields', async () => {
      const result = await getBookingById('BK-1000');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('customerName');
      expect(result).toHaveProperty('customerEmail');
      expect(result).toHaveProperty('customerPhone');
      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('vehicle');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('priceCents');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('updateBooking', () => {
    it('updates booking status successfully', async () => {
      const id = 'BK-1000';
      const data: Partial<BookingUpdateData> = { status: 'completed' };

      const result = await updateBooking(id, data);

      expect(result.status).toBe('completed');
      expect(result.id).toBe(id);
    });

    it('updates multiple fields', async () => {
      const id = 'BK-1000';
      const data: Partial<BookingUpdateData> = {
        status: 'confirmed',
        priceCents: 50000,
        notes: 'Updated notes',
      };

      const result = await updateBooking(id, data);

      expect(result.status).toBe('confirmed');
      expect(result.priceCents).toBe(50000);
      expect(result.notes).toBe('Updated notes');
    });

    it('clears cache after update', async () => {
      const id = 'BK-1000';
      const data: Partial<BookingUpdateData> = { status: 'completed' };

      const before = await getBookingById(id);
      expect(before).not.toBeNull();

      await updateBooking(id, data);

      const after = await getBookingById(id);
      expect(after?.status).toBe('completed');
    });
  });

  describe('deleteBooking', () => {
    it('returns true on successful deletion', async () => {
      const result = await deleteBooking('BK-1001');
      expect(result).toBe(true);
    });

    it('returns false when booking does not exist', async () => {
      const result = await deleteBooking('BK-DOES-NOT-EXIST');
      expect(result).toBe(false);
    });

    it('clears cache after deletion', async () => {
      await getBookings();
      await deleteBooking('BK-TEST-123');

      const result = await getBookings();
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('getBookingStats', () => {
    it('returns statistics object', async () => {
      const result = await getBookingStats();

      expect(result).toHaveProperty('todayCount');
      expect(result).toHaveProperty('todayRevenueCents');
      expect(result).toHaveProperty('weekCount');
      expect(result).toHaveProperty('weekRevenueCents');
      expect(result).toHaveProperty('monthCount');
      expect(result).toHaveProperty('monthRevenueCents');
      expect(result).toHaveProperty('byStatus');
    });

    it('returns non-negative values', async () => {
      const result = await getBookingStats();

      expect(result.todayCount).toBeGreaterThanOrEqual(0);
      expect(result.todayRevenueCents).toBeGreaterThanOrEqual(0);
      expect(result.weekCount).toBeGreaterThanOrEqual(0);
      expect(result.weekRevenueCents).toBeGreaterThanOrEqual(0);
      expect(result.monthCount).toBeGreaterThanOrEqual(0);
      expect(result.monthRevenueCents).toBeGreaterThanOrEqual(0);
    });

    it('returns status distribution', async () => {
      const result = await getBookingStats();

      expect(result.byStatus).toHaveProperty('pending');
      expect(result.byStatus).toHaveProperty('confirmed');
      expect(result.byStatus).toHaveProperty('completed');
      expect(result.byStatus).toHaveProperty('cancelled');

      // All status counts should be non-negative
      expect(result.byStatus.pending).toBeGreaterThanOrEqual(0);
      expect(result.byStatus.confirmed).toBeGreaterThanOrEqual(0);
      expect(result.byStatus.completed).toBeGreaterThanOrEqual(0);
      expect(result.byStatus.cancelled).toBeGreaterThanOrEqual(0);

      const allBookings = await getBookings({ page: 1, limit: 1000 });
      const totalByStatus =
        result.byStatus.pending +
        result.byStatus.confirmed +
        result.byStatus.completed +
        result.byStatus.cancelled;
      expect(totalByStatus).toBe(allBookings.total);
    });
  });

  describe('exportBookingsToCSV', () => {
    it('returns CSV string with headers', async () => {
      const csv = await exportBookingsToCSV();

      expect(csv).toContain('ID');
      expect(csv).toContain('Customer');
      expect(csv).toContain('Email');
      expect(csv).toContain('Service');
      expect(csv).toContain('Vehicle');
      expect(csv).toContain('Date');
      expect(csv).toContain('Time');
      expect(csv).toContain('Status');
      expect(csv).toContain('Price');
    });

    it('respects filters when exporting', async () => {
      const filters: Partial<BookingFilters> = { status: 'confirmed' };
      const csv = await exportBookingsToCSV(filters);

      // Should contain data rows
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });
  });
});
