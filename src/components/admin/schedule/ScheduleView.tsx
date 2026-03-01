'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/admin/ui';
import {
  getScheduleForDate,
  getWeekSchedule,
  quickUpdateStatus,
  type ScheduleDay,
  type Booking,
} from '@/lib/admin/services';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek } from 'date-fns';

const timeSlots = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
];

export function ScheduleView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleDay | null>(null);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [isLoading, setIsLoading] = useState(true);
  const [weekSchedule, setWeekSchedule] = useState<ScheduleDay[]>([]);

  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      if (view === 'day') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const result = await getScheduleForDate(dateStr);
        setSchedule(result);
      } else {
        const weekStart = format(startOfWeek(selectedDate), 'yyyy-MM-dd');
        const result = await getWeekSchedule(weekStart);
        setWeekSchedule(result);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, view]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handlePrevDay = useCallback(() => {
    setSelectedDate(prev => subDays(prev, view === 'day' ? 1 : 7));
  }, [view]);

  const handleNextDay = useCallback(() => {
    setSelectedDate(prev => addDays(prev, view === 'day' ? 1 : 7));
  }, [view]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleStatusUpdate = useCallback(
    async (bookingId: string, status: Booking['status']) => {
      await quickUpdateStatus(bookingId, status);
      fetchSchedule();
    },
    [fetchSchedule]
  );

  const getSlotBooking = useCallback(
    (time: string) => {
      if (!schedule) return null;
      return schedule.slots.find(slot => slot.time === time)?.booking;
    },
    [schedule]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Schedule</h1>
          <p className="text-dark-900 mt-1">Manage appointments and availability.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-dark-200 rounded-xl p-1">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'day' ? 'bg-gold text-dark' : 'text-dark-900 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'week' ? 'bg-gold text-dark' : 'text-dark-900 hover:text-white'
              }`}
            >
              Week
            </button>
          </div>
          <Button onClick={handleToday} variant="secondary">
            Today
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gold" />
              <h2 className="text-xl font-semibold">
                {view === 'day'
                  ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                  : `Week of ${format(startOfWeek(selectedDate), 'MMMM d, yyyy')}`}
              </h2>
            </div>
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </Card>

      {/* Schedule View */}
      {view === 'day' ? (
        <Card className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {timeSlots.map((_, i) => (
                <div key={i} className="h-16 bg-dark-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {timeSlots.map(time => {
                const booking = getSlotBooking(time);
                return (
                  <div
                    key={time}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      booking ? 'bg-dark-50 border-gold/20' : 'bg-dark-100 border-dark-400'
                    }`}
                  >
                    <div className="w-20 text-sm font-medium text-dark-900">{time}</div>

                    {booking ? (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{booking.customerName}</p>
                            <Badge variant={booking.status}>{booking.status}</Badge>
                          </div>
                          <p className="text-sm text-dark-900">
                            {booking.service} • {booking.vehicle} • ${booking.price}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {booking.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'completed')}
                              className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                              title="Mark as completed"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}
                          {booking.status !== 'cancelled' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                              className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Cancel booking"
                            >
                              <AlertCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center text-dark-900">
                        <Clock className="w-4 h-4 mr-2" />
                        Available
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-96 bg-dark-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-4">
              {weekSchedule.map(day => (
                <div key={day.date} className="space-y-3">
                  <div className="text-center pb-3 border-b border-dark-400">
                    <p className="text-sm text-dark-900">{format(new Date(day.date), 'EEE')}</p>
                    <p className="font-semibold">{format(new Date(day.date), 'd')}</p>
                  </div>

                  <div className="space-y-2">
                    {day.slots
                      .filter(s => s.booking)
                      .map(slot => (
                        <div
                          key={slot.id}
                          className="p-2 bg-gold/10 border border-gold/20 rounded-lg text-xs"
                        >
                          <p className="font-medium">{slot.time}</p>
                          <p className="text-dark-900 truncate">{slot.booking?.customerName}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gold/20 text-gold mt-1">
                            {slot.booking?.status}
                          </span>
                        </div>
                      ))}
                  </div>

                  <div className="pt-3 border-t border-dark-400 text-center">
                    <p className="text-xs text-dark-900">{day.totalBookings} bookings</p>
                    <p className="text-xs text-gold">${day.totalRevenue}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-dark-900">Total Slots</p>
          <p className="text-2xl font-bold">{timeSlots.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-900">Booked</p>
          <p className="text-2xl font-bold text-gold">{schedule?.totalBookings || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-900">Revenue</p>
          <p className="text-2xl font-bold text-green-400">${schedule?.totalRevenue || 0}</p>
        </Card>
      </div>
    </div>
  );
}
