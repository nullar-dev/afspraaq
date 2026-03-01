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
  createBooking,
  getBookings,
  updateBooking,
  deleteBooking,
  type Booking,
  type BookingCreateData,
  type BookingFilters,
} from '@/lib/admin/services';
import { formatUsdFromCents } from '@/lib/admin/currency';
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

const isBookingStatus = (value: string | null): value is Booking['status'] =>
  value === 'pending' || value === 'confirmed' || value === 'completed' || value === 'cancelled';

const isBookingService = (value: string | null): value is Booking['service'] =>
  value === 'Essential' || value === 'Premium' || value === 'Ultimate';

const isBookingVehicle = (value: string | null): value is Booking['vehicle'] =>
  value === 'Sedan' || value === 'SUV' || value === 'Crossover' || value === 'Luxury';

function getSafeSearchParam(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function BookingsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const serviceParam = searchParams.get('service');
  const vehicleParam = searchParams.get('vehicle');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BookingFilters>({
    search: getSafeSearchParam(searchParams.get('search')),
    status: isBookingStatus(statusParam) ? statusParam : undefined,
    service: isBookingService(serviceParam) ? serviceParam : undefined,
    vehicle: isBookingVehicle(vehicleParam) ? vehicleParam : undefined,
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
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingBooking, setIsDeletingBooking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [createForm, setCreateForm] = useState<BookingCreateData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    service: 'Essential',
    vehicle: 'Sedan',
    date: new Date().toISOString().split('T')[0] || '',
    time: '09:00 AM',
    status: 'pending',
    notes: '',
    priceCents: 0,
  });

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getBookings(filters);
      setBookings(result.data);
      setPagination({
        page: result.page,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

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
    if (!selectedBooking || !editForm.status || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      await updateBooking(selectedBooking.id, { status: editForm.status });
      setIsEditModalOpen(false);
      await fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update booking');
    } finally {
      setIsSavingEdit(false);
    }
  }, [selectedBooking, editForm, fetchBookings, isSavingEdit]);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedBooking || isDeletingBooking) return;

    setIsDeletingBooking(true);
    try {
      const deleted = await deleteBooking(selectedBooking.id);
      if (!deleted) {
        throw new Error('Booking could not be deleted');
      }
      setIsDeleteModalOpen(false);
      await fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
    } finally {
      setIsDeletingBooking(false);
    }
  }, [selectedBooking, fetchBookings, isDeletingBooking]);

  const handleCreateBooking = useCallback(async () => {
    if (isCreatingBooking) {
      return;
    }

    setIsCreatingBooking(true);
    try {
      await createBooking(createForm);
      setIsCreateModalOpen(false);
      setCreateForm(prev => ({
        ...prev,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        notes: '',
      }));

      const params = new URLSearchParams(searchParams);
      params.delete('new');
      router.replace(`/admin/bookings?${params.toString()}`, { scroll: false });
      await fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsCreatingBooking(false);
    }
  }, [createForm, fetchBookings, isCreatingBooking, router, searchParams]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    const params = new URLSearchParams(searchParams);
    params.delete('new');
    router.replace(`/admin/bookings?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleExport = useCallback(async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const { exportBookingsToCSV } = await import('@/lib/admin/services');
      const csv = await exportBookingsToCSV(filters);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export bookings');
    } finally {
      setIsExporting(false);
    }
  }, [filters, isExporting]);

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
      {error && (
        <Card className="p-4 border-red-500/40">
          <p className="text-red-300 text-sm">{error}</p>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <SearchInput
            value={filters.search || ''}
            onChange={value => handleFilterChange('search', value || undefined)}
            debounceMs={300}
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
            <Button
              variant="secondary"
              onClick={handleExport}
              className="flex items-center gap-2"
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export'}
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
              <td className="py-3 px-4 font-medium">{formatUsdFromCents(booking.priceCents)}</td>
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
                <p className="font-medium">{formatUsdFromCents(selectedBooking.priceCents)}</p>
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
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
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
            <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeletingBooking}>
              {isDeletingBooking ? 'Deleting...' : 'Delete'}
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

      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="New Booking"
        maxWidth="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button onClick={handleCreateBooking} disabled={isCreatingBooking}>
              {isCreatingBooking ? 'Creating...' : 'Create Booking'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-900 mb-1">Customer Name</label>
            <input
              type="text"
              value={createForm.customerName}
              onChange={e => setCreateForm(prev => ({ ...prev, customerName: e.target.value }))}
              required
              minLength={2}
              maxLength={100}
              className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-900 mb-1">Customer Email</label>
            <input
              type="email"
              value={createForm.customerEmail}
              onChange={e => setCreateForm(prev => ({ ...prev, customerEmail: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-900 mb-1">Phone</label>
            <input
              type="tel"
              value={createForm.customerPhone || ''}
              onChange={e => setCreateForm(prev => ({ ...prev, customerPhone: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
            />
          </div>
          <Select
            label="Service"
            value={createForm.service}
            onChange={e =>
              setCreateForm(prev => ({
                ...prev,
                service: e.target.value as Booking['service'],
              }))
            }
            options={serviceOptions.filter(option => option.value !== '')}
          />
          <Select
            label="Vehicle"
            value={createForm.vehicle}
            onChange={e =>
              setCreateForm(prev => ({
                ...prev,
                vehicle: e.target.value as Booking['vehicle'],
              }))
            }
            options={vehicleOptions.filter(option => option.value !== '')}
          />
          <Select
            label="Status"
            value={createForm.status || 'pending'}
            onChange={e =>
              setCreateForm(prev => ({
                ...prev,
                status: e.target.value as Booking['status'],
              }))
            }
            options={statusOptions.filter(option => option.value !== '')}
          />
          <div>
            <label className="block text-sm font-medium text-dark-900 mb-1">Date</label>
            <input
              type="date"
              value={createForm.date}
              onChange={e => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-900 mb-1">Time</label>
            <input
              type="text"
              value={createForm.time}
              onChange={e => setCreateForm(prev => ({ ...prev, time: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-900 mb-1">Price (USD)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={((createForm.priceCents ?? 0) / 100).toFixed(2)}
              onChange={e => {
                const dollars = Number.parseFloat(e.target.value);
                setCreateForm(prev => ({
                  ...prev,
                  priceCents:
                    Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 100) : 0,
                }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-dark-900 mb-1">Notes</label>
            <textarea
              value={createForm.notes || ''}
              onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400 text-white focus:outline-none focus:border-gold"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
