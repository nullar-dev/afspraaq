// Mock schedule data generator
// Used by schedule service - 100% mock, ready for replacement

import type { ScheduleDay, ScheduleSlot, Booking } from '../services/types';

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

const services = ['Essential', 'Premium', 'Ultimate'] as const;
const vehicles = ['Sedan', 'SUV', 'Crossover', 'Luxury'] as const;
const firstNames = ['John', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];

const priceMap = {
  Essential: 149,
  Premium: 299,
  Ultimate: 499,
};

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function generateMockBooking(time: string, date: string): Booking {
  const service = randomItem(services);
  const vehicle = randomItem(vehicles);
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  const basePrice = priceMap[service];
  const vehicleMultiplier = vehicle === 'Luxury' ? 1.5 : vehicle === 'SUV' ? 1.2 : 1;

  return {
    id: `BK-${date.replace(/-/g, '')}-${time.replace(/[^0-9]/g, '')}`,
    customerName: `${firstName} ${lastName}`,
    customerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
    customerPhone: `+1 (555) ${String(Math.floor(Math.random() * 800) + 200).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    service,
    vehicle,
    date,
    time,
    status: hashString(`${date}-${time}`) % 5 === 0 ? 'pending' : 'confirmed',
    priceCents: Math.floor(basePrice * vehicleMultiplier * 100),
    notes: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function generateMockScheduleDay(date: string): ScheduleDay {
  const slots = timeSlots.map((time, index) => {
    // Randomly decide if slot is booked (60% chance for demo)
    const isBooked = Math.random() > 0.4;

    return {
      id: `slot-${date}-${index}`,
      time,
      isAvailable: !isBooked,
      booking: isBooked ? generateMockBooking(time, date) : undefined,
    };
  });

  const bookings = slots
    .filter((slot): slot is ScheduleSlot & { booking: Booking } => slot.booking !== undefined)
    .map(slot => slot.booking);

  return {
    date,
    slots,
    totalBookings: bookings.length,
    totalRevenueCents: bookings.reduce((sum, b) => sum + b.priceCents, 0),
  };
}

export function generateMockWeekSchedule(startDate: string): ScheduleDay[] {
  const week: ScheduleDay[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateString = date.toISOString().split('T')[0] as string;
    week.push(generateMockScheduleDay(dateString));
  }

  return week;
}
