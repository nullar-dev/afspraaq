'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Table,
  SearchInput,
  Pagination,
  Modal,
  Select,
} from '@/components/admin/ui';
import {
  getBookings,
  updateBooking,
  deleteBooking,
  type Booking,
  type BookingFilters,
} from '@/lib/admin/services';
import { Eye, Edit, Trash2, Download } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const serviceOptions = [
  { value: '', label: 'All Services' },
  { value: 'Essential', label: 'Essential' },
  { value: 'Premium', label: 'Premium' },
  { value: 'Ultimate', label: 'Ultimate' },
];

const vehicleOptions = [
  { value: '', label: 'All Vehicles' },
  { value: 'Sedan', label: 'Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'Crossover', label: 'Crossover' },
  { value: 'Luxury', label: 'Luxury' },
];

export function BookingsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<BookingFilters>({
    search: searchParams.get('search') || undefined,
    status: (searchParams.get('status') as Booking['status']) || undefined,
    service: (searchParams.get('service') as Booking['service']) || undefined,
    vehicle: (searchParams.get('vehicle') as Booking['vehicle']) || undefined,
    dateFrom: undefined,
    dateTo: undefined,
    page: 1,
    limit: 10,
  });

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Booking>>({});

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getBookings(filters);
      setBookings(result.data);
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
    fetchBookings();
  }, [fetchBookings]);

  const handleFilterChange = useCallback(
    (key: keyof BookingFilters, value: string | undefined) => {
      setFilters(prev => ({ ...prev, [key]: value, page: 1 }));

      // Update URL
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`/admin/bookings?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handleView = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setEditForm(booking);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedBooking || !editForm.status) return;

    await updateBooking(selectedBooking.id, { status: editForm.status });
    setIsEditModalOpen(false);
    fetchBookings();
  }, [selectedBooking, editForm, fetchBookings]);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedBooking) return;

    await deleteBooking(selectedBooking.id);
    setIsDeleteModalOpen(false);
    fetchBookings();
  }, [selectedBooking, fetchBookings]);

  const handleExport = useCallback(async () => {
    // TODO: Implement CSV export
    window.alert('Export functionality coming soon!');
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bookings</h1>
          <p className="text-dark-900 mt-1">Manage all customer appointments and reservations.</p>
        </div>
        <Button onClick={() => router.push('/admin/bookings?new=1')}>+ New Booking</Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <SearchInput
            value={filters.search || ''}
            onChange={value => handleFilterChange('search', value || undefined)}
            placeholder="Search by customer, email, or ID..."
            className="flex-1"
          />

          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.status || ''}
              onChange={e => handleFilterChange('status', e.target.value || undefined)}
              options={statusOptions}
              className="w-40"
            />
            <Select
              value={filters.service || ''}
              onChange={e => handleFilterChange('service', e.target.value || undefined)}
              options={serviceOptions}
              className="w-40"
            />
            <Select
              value={filters.vehicle || ''}
              onChange={e => handleFilterChange('vehicle', e.target.value || undefined)}
              options={vehicleOptions}
              className="w-40"
            />
            <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Bookings Table */}
      <Card className="p-6">
        <Table
          headers={['ID', 'Customer', 'Service', 'Vehicle', 'Date', 'Status', 'Price', 'Actions']}
          isLoading={isLoading}
        >
          {bookings.map(booking => (
            <tr key={booking.id} className="hover:bg-dark-50 transition-colors">
              <td className="py-3 px-4 font-medium">{booking.id}</td>
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-dark-900">{booking.customerEmail}</p>
                </div>
              </td>
              <td className="py-3 px-4">{booking.service}</td>
              <td className="py-3 px-4">{booking.vehicle}</td>
              <td className="py-3 px-4">
                <div>
                  <p>{booking.date}</p>
                  <p className="text-sm text-dark-900">{booking.time}</p>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant={booking.status}>{booking.status}</Badge>
              </td>
              <td className="py-3 px-4 font-medium">${booking.price}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(booking)}
                    className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4 text-dark-900" />
                  </button>
                  <button
                    onClick={() => handleEdit(booking)}
                    className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-gold" />
                  </button>
                  <button
                    onClick={() => handleDelete(booking)}
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
        title={`Booking ${selectedBooking?.id}`}
        footer={
          <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-dark-900">Customer</p>
                <p className="font-medium">{selectedBooking.customerName}</p>
                <p className="text-sm text-dark-900">{selectedBooking.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Service</p>
                <p className="font-medium">{selectedBooking.service}</p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Vehicle</p>
                <p className="font-medium">{selectedBooking.vehicle}</p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Status</p>
                <Badge variant={selectedBooking.status}>{selectedBooking.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-dark-900">Date & Time</p>
                <p className="font-medium">
                  {selectedBooking.date} at {selectedBooking.time}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-900">Price</p>
                <p className="font-medium">${selectedBooking.price}</p>
              </div>
            </div>
            {selectedBooking.notes && (
              <div>
                <p className="text-sm text-dark-900">Notes</p>
                <p className="text-sm">{selectedBooking.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Booking"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </>
        }
      >
        {selectedBooking && (
          <div className="space-y-4">
            <Select
              label="Status"
              value={editForm.status || ''}
              onChange={e =>
                setEditForm(prev => ({ ...prev, status: e.target.value as Booking['status'] }))
              }
              options={statusOptions.filter(o => o.value !== '')}
            />
            <div>
              <p className="text-sm text-dark-900 mb-1">Current Status</p>
              <Badge variant={selectedBooking.status}>{selectedBooking.status}</Badge>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Booking"
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
          Are you sure you want to delete booking <strong>{selectedBooking?.id}</strong>?
        </p>
        <p className="text-sm text-dark-900 mt-2">
          This action cannot be undone. The booking for {selectedBooking?.customerName} will be
          permanently removed.
        </p>
      </Modal>
    </div>
  );
}
