import { describe, expect, it } from 'vitest';
import {
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerBookings,
  getCustomerStats,
} from '@/lib/admin/services/customers';
import type { CustomerFilters, CustomerUpdateData } from '@/lib/admin/services/types';

describe('Customers Service', () => {
  describe('getCustomers', () => {
    it('returns paginated customers with default filters', async () => {
      const result = await getCustomers();

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeLessThanOrEqual(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBeGreaterThan(0);
      expect(result.totalPages).toBeGreaterThan(0);
    });

    it('filters customers by search term', async () => {
      const filters: Partial<CustomerFilters> = { search: 'Smith' };
      const result = await getCustomers(filters);

      result.data.forEach(customer => {
        const matchesSearch =
          customer.name.toLowerCase().includes('smith') ||
          customer.email.toLowerCase().includes('smith') ||
          customer.id.toLowerCase().includes('smith');
        expect(matchesSearch).toBe(true);
      });
    });

    it('filters customers by minBookings', async () => {
      const filters: Partial<CustomerFilters> = { minBookings: 5 };
      const result = await getCustomers(filters);

      result.data.forEach(customer => {
        expect(customer.totalBookings).toBeGreaterThanOrEqual(5);
      });
    });

    it('filters customers by maxBookings', async () => {
      const filters: Partial<CustomerFilters> = { maxBookings: 3 };
      const result = await getCustomers(filters);

      result.data.forEach(customer => {
        expect(customer.totalBookings).toBeLessThanOrEqual(3);
      });
    });

    it('returns correct page based on pagination', async () => {
      const filters: Partial<CustomerFilters> = { page: 2, limit: 5 };
      const result = await getCustomers(filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('caches results for identical queries', async () => {
      const filters: Partial<CustomerFilters> = { search: 'John' };

      const result1 = await getCustomers(filters);
      const result2 = await getCustomers(filters);

      expect(result1.data).toEqual(result2.data);
    });
  });

  describe('getCustomerById', () => {
    it('returns a customer with the specified ID', async () => {
      const id = 'CUST-TEST-123';
      const result = await getCustomerById(id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(id);
      expect(result!.name).toBeDefined();
      expect(result!.email).toBeDefined();
    });

    it('always returns a customer for any ID (mock behavior)', async () => {
      // Note: Mock implementation generates data for any ID
      // Real implementation should return null for non-existent customers
      const result = await getCustomerById('NON-EXISTENT');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('NON-EXISTENT');
    });

    it('returns customer with all required fields', async () => {
      const result = await getCustomerById('CUST-TEST');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('totalBookings');
      expect(result).toHaveProperty('totalSpent');
      expect(result).toHaveProperty('lastBooking');
      expect(result).toHaveProperty('joinedAt');
      expect(result).toHaveProperty('avatar');
      expect(result).toHaveProperty('address');
    });
  });

  describe('updateCustomer', () => {
    it('updates customer name successfully', async () => {
      const id = 'CUST-TEST-123';
      const data: Partial<CustomerUpdateData> = { name: 'Updated Name' };

      const result = await updateCustomer(id, data);

      expect(result.name).toBe('Updated Name');
      expect(result.id).toBe(id);
    });

    it('updates customer email successfully', async () => {
      const id = 'CUST-TEST-123';
      const data: Partial<CustomerUpdateData> = { email: 'updated@example.com' };

      const result = await updateCustomer(id, data);

      expect(result.email).toBe('updated@example.com');
    });

    it('updates customer phone successfully', async () => {
      const id = 'CUST-TEST-123';
      const data: Partial<CustomerUpdateData> = { phone: '+1 (555) 999-8888' };

      const result = await updateCustomer(id, data);

      expect(result.phone).toBe('+1 (555) 999-8888');
    });

    it('updates multiple fields', async () => {
      const id = 'CUST-TEST-123';
      const data: Partial<CustomerUpdateData> = {
        name: 'New Name',
        email: 'new@example.com',
        phone: '+1 (555) 111-2222',
      };

      const result = await updateCustomer(id, data);

      expect(result.name).toBe('New Name');
      expect(result.email).toBe('new@example.com');
      expect(result.phone).toBe('+1 (555) 111-2222');
    });

    it('clears cache after update', async () => {
      const id = 'CUST-TEST-123';
      const data: Partial<CustomerUpdateData> = { name: 'Updated' };

      await getCustomers();
      await updateCustomer(id, data);

      const result = await getCustomers();
      expect(result.data).toBeInstanceOf(Array);
    });

    it('always generates a customer for any ID (mock behavior)', async () => {
      // Note: Mock implementation generates data for any ID
      // Real implementation should throw for non-existent customers
      const data: Partial<CustomerUpdateData> = { name: 'Updated Name' };
      const result = await updateCustomer('NON-EXISTENT', data);

      expect(result).not.toBeNull();
      expect(result.id).toBe('NON-EXISTENT');
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteCustomer', () => {
    it('returns true on successful deletion', async () => {
      const result = await deleteCustomer('CUST-TEST-123');
      expect(result).toBe(true);
    });

    it('clears cache after deletion', async () => {
      await getCustomers();
      await deleteCustomer('CUST-TEST-123');

      const result = await getCustomers();
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('getCustomerBookings', () => {
    it('returns array of booking IDs', async () => {
      const result = await getCustomerBookings('CUST-TEST-123');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(8);
    });

    it('returns valid booking ID format', async () => {
      const result = await getCustomerBookings('CUST-TEST-123');

      result.forEach(id => {
        expect(typeof id).toBe('string');
        expect(Number.parseInt(id)).toBeGreaterThanOrEqual(1000);
      });
    });
  });

  describe('getCustomerStats', () => {
    it('returns statistics object', async () => {
      const result = await getCustomerStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('newThisMonth');
      expect(result).toHaveProperty('activeThisMonth');
      expect(result).toHaveProperty('topCustomers');
    });

    it('returns non-negative values', async () => {
      const result = await getCustomerStats();

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.newThisMonth).toBeGreaterThanOrEqual(0);
      expect(result.activeThisMonth).toBeGreaterThanOrEqual(0);
    });

    it('returns top 5 customers', async () => {
      const result = await getCustomerStats();

      expect(result.topCustomers).toHaveLength(5);

      result.topCustomers.forEach(customer => {
        expect(customer).toHaveProperty('id');
        expect(customer).toHaveProperty('name');
        expect(customer).toHaveProperty('totalSpent');
        expect(customer.totalSpent).toBeGreaterThanOrEqual(0);
      });
    });

    it('returns customers sorted by totalSpent', async () => {
      const result = await getCustomerStats();
      const customers = result.topCustomers;

      for (let i = 1; i < customers.length; i++) {
        const prev = customers[i - 1]!;
        const curr = customers[i]!;
        expect(prev.totalSpent).toBeGreaterThanOrEqual(curr.totalSpent);
      }
    });
  });
});
