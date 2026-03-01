'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Badge, Table, SearchInput, Pagination, Modal } from '@/components/admin/ui';
import {
  getCustomers,
  updateCustomer,
  deleteCustomer,
  type Customer,
  type CustomerFilters,
  type CustomerUpdateData,
} from '@/lib/admin/services';
import { Eye, Edit, Trash2, UserPlus, Mail, Phone } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

export function CustomersList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: searchParams.get('search') || undefined,
    minBookings: undefined,
    maxBookings: undefined,
    page: 1,
    limit: 10,
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerUpdateData>>({});

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCustomers(filters);
      setCustomers(result.data);
      setPagination({
        page: result.page,
        total: result.total,
        totalPages: result.totalPages,
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleFilterChange = useCallback(
    (key: keyof CustomerFilters, value: string | undefined) => {
      setFilters(prev => ({ ...prev, [key]: value, page: 1 }));

      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`/admin/customers?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handleView = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setEditForm(customer);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedCustomer) return;

    await updateCustomer(selectedCustomer.id, editForm);
    setIsEditModalOpen(false);
    fetchCustomers();
  }, [selectedCustomer, editForm, fetchCustomers]);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedCustomer) return;

    await deleteCustomer(selectedCustomer.id);
    setIsDeleteModalOpen(false);
    fetchCustomers();
  }, [selectedCustomer, fetchCustomers]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Customers</h1>
          <p className="text-dark-900 mt-1">Manage your customer base and their booking history.</p>
        </div>
        <Button onClick={() => router.push('/admin/customers?new=1')}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <SearchInput
          value={filters.search || ''}
          onChange={value => handleFilterChange('search', value || undefined)}
          placeholder="Search by name, email, or phone..."
        />
      </Card>

      {/* Customers Table */}
      <Card className="p-6">
        <Table
          headers={['Name', 'Contact', 'Bookings', 'Total Spent', 'Last Booking', 'Actions']}
          isLoading={isLoading}
        >
          {customers.map(customer => (
            <tr key={customer.id} className="hover:bg-dark-50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-600 flex items-center justify-center text-dark font-bold">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-dark-900">{customer.id}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-dark-900" />
                    <span className="text-dark-900">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-dark-900" />
                    <span className="text-dark-900">{customer.phone}</span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant="default">{customer.totalBookings} bookings</Badge>
              </td>
              <td className="py-3 px-4 font-medium">${customer.totalSpent.toLocaleString()}</td>
              <td className="py-3 px-4 text-dark-900">{customer.lastBooking}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(customer)}
                    className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4 text-dark-900" />
                  </button>
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-gold" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer)}
                    className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 pt-6 border-t border-dark-400">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
            />
          </div>
        )}
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedCustomer?.name || 'Customer Details'}
        footer={
          <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-gold-600 flex items-center justify-center text-dark font-bold text-2xl">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-semibold">{selectedCustomer.name}</h4>
                <p className="text-sm text-dark-900">{selectedCustomer.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-dark-900">Email</p>
                <p>{selectedCustomer.email}</p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Phone</p>
                <p>{selectedCustomer.phone}</p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Total Bookings</p>
                <p className="font-medium">{selectedCustomer.totalBookings}</p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Total Spent</p>
                <p className="font-medium">${selectedCustomer.totalSpent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Last Booking</p>
                <p>{selectedCustomer.lastBooking}</p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Joined</p>
                <p>{new Date(selectedCustomer.joinedAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-dark-400">
              <Button
                variant="secondary"
                onClick={() =>
                  router.push(
                    `/admin/bookings?search=${encodeURIComponent(selectedCustomer.email)}`
                  )
                }
                className="w-full"
              >
                View Booking History
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </>
        }
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-900 mb-1">Name</label>
              <input
                type="text"
                value={editForm.name || ''}
                onChange={e =>
                  setEditForm((prev: Partial<CustomerUpdateData>) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-900 mb-1">Email</label>
              <input
                type="email"
                value={editForm.email || ''}
                onChange={e =>
                  setEditForm((prev: Partial<CustomerUpdateData>) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-900 mb-1">Phone</label>
              <input
                type="tel"
                value={editForm.phone || ''}
                onChange={e =>
                  setEditForm((prev: Partial<CustomerUpdateData>) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Customer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete customer <strong>{selectedCustomer?.name}</strong>?
        </p>
        <p className="text-sm text-dark-900 mt-2">
          This will remove their profile and associated data. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
