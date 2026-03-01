// Mock data for admin dashboard
// 100% mock - ready for real data integration later

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  service: 'Essential' | 'Premium' | 'Ultimate';
  vehicle: 'Sedan' | 'SUV' | 'Crossover' | 'Luxury';
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  price: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string;
  joinedAt: string;
}

export interface DailyStats {
  date: string;
  bookings: number;
  revenue: number;
  customers: number;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'view' | 'edit' | 'create' | 'delete';
}

// Helper to safely get date string
function safeDateString(date: Date): string {
  try {
    return date.toISOString().split('T')[0] || date.toISOString();
  } catch {
    return new Date().toISOString().split('T')[0] || '2024-01-01';
  }
}

// Generate 30 days of mock data
function generateDailyStats(): DailyStats[] {
  const stats: DailyStats[] = [];
  const baseRevenue = 3000;
  const baseBookings = 15;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const variance = Math.sin(i * 0.5) * 0.3 + Math.random() * 0.4 - 0.2;
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const weekendMultiplier = weekend ? 0.6 : 1.2;

    stats.push({
      date: safeDateString(date),
      bookings: Math.max(
        5,
        Math.floor((baseBookings + baseBookings * variance) * weekendMultiplier)
      ),
      revenue: Math.max(
        1000,
        Math.floor((baseRevenue + baseRevenue * variance * 1.5) * weekendMultiplier)
      ),
      customers: Math.max(
        3,
        Math.floor((baseBookings * 0.7 + baseBookings * variance * 0.5) * weekendMultiplier)
      ),
    });
  }
  return stats;
}

// Generate today's bookings
function generateTodayBookings(): Booking[] {
  const services: Array<'Essential' | 'Premium' | 'Ultimate'> = [
    'Essential',
    'Premium',
    'Ultimate',
  ];
  const vehicles: Array<'Sedan' | 'SUV' | 'Crossover' | 'Luxury'> = [
    'Sedan',
    'SUV',
    'Crossover',
    'Luxury',
  ];
  const times = [
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
  ];

  const firstNames = [
    'John',
    'Sarah',
    'Mike',
    'Emma',
    'David',
    'Lisa',
    'Chris',
    'Anna',
    'James',
    'Maria',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
  ];

  const bookings: Booking[] = [];
  const todayStr = safeDateString(new Date());

  for (let i = 0; i < 8; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)] ?? 'John';
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)] ?? 'Smith';
    const service = services[Math.floor(Math.random() * services.length)] ?? 'Premium';
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)] ?? 'Sedan';
    const timeSlot = times[i * 2] ?? '09:00 AM';

    const priceMap: Record<string, number> = { Essential: 149, Premium: 299, Ultimate: 499 };
    const vehicleMultiplier = vehicle === 'Luxury' ? 1.5 : vehicle === 'SUV' ? 1.2 : 1;

    bookings.push({
      id: `BK-${1000 + i}`,
      customerName: `${firstName} ${lastName}`,
      customerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      service,
      vehicle,
      date: todayStr,
      time: timeSlot,
      status: i < 3 ? 'completed' : i < 5 ? 'confirmed' : 'pending',
      price: Math.floor((priceMap[service] ?? 299) * vehicleMultiplier),
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return bookings.sort((a, b) => times.indexOf(a.time) - times.indexOf(b.time));
}

// Service distribution
const serviceDistribution = [
  { name: 'Essential', count: 45, percentage: 35, color: '#8A7018' },
  { name: 'Premium', count: 62, percentage: 48, color: '#D4A853' },
  { name: 'Ultimate', count: 22, percentage: 17, color: '#E8C87A' },
];

// Vehicle distribution
const vehicleDistribution = [
  { name: 'Sedan', count: 58, percentage: 45 },
  { name: 'SUV', count: 45, percentage: 35 },
  { name: 'Crossover', count: 19, percentage: 15 },
  { name: 'Luxury', count: 7, percentage: 5 },
];

// Recent activity
function generateRecentActivity(): ActivityItem[] {
  return [
    {
      id: '1',
      actor: 'admin@example.com',
      action: 'viewed',
      target: 'profile list',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      type: 'view',
    },
    {
      id: '2',
      actor: 'admin@example.com',
      action: 'accessed',
      target: 'session check',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      type: 'view',
    },
    {
      id: '3',
      actor: 'admin@example.com',
      action: 'viewed',
      target: 'booking #BK-1005',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      type: 'view',
    },
    {
      id: '4',
      actor: 'admin@example.com',
      action: 'updated',
      target: 'booking #BK-1003',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      type: 'edit',
    },
    {
      id: '5',
      actor: 'admin@example.com',
      action: 'created',
      target: 'new customer',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      type: 'create',
    },
    {
      id: '6',
      actor: 'admin@example.com',
      action: 'viewed',
      target: 'dashboard',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      type: 'view',
    },
    {
      id: '7',
      actor: 'admin@example.com',
      action: 'exported',
      target: 'bookings report',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      type: 'view',
    },
  ];
}

// Generate customers
function generateCustomers(): Customer[] {
  const firstNames = [
    'John',
    'Sarah',
    'Mike',
    'Emma',
    'David',
    'Lisa',
    'Chris',
    'Anna',
    'James',
    'Maria',
  ];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

  return Array.from({ length: 10 }, (_, i) => {
    const firstName = firstNames[i % firstNames.length] ?? 'John';
    const lastName = lastNames[i % lastNames.length] ?? 'Smith';
    const bookings = Math.floor(Math.random() * 8) + 1;

    const lastBookingDate = new Date(
      Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
    );

    return {
      id: `CUST-${1000 + i}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      phone: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
      totalBookings: bookings,
      totalSpent: bookings * (150 + Math.floor(Math.random() * 300)),
      lastBooking: safeDateString(lastBookingDate),
      joinedAt: new Date(
        Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  });
}

// Calculate stats
const todayBookings = generateTodayBookings();
const dailyStats = generateDailyStats();
const yesterday = dailyStats[dailyStats.length - 2] ?? { revenue: 3000, bookings: 15 };
const todayRevenue = todayBookings.reduce((sum, b) => sum + b.price, 0);

// Export all mock data
export const mockDashboardData = {
  todayStats: {
    revenue: todayRevenue,
    revenueChange: Number(
      (((todayRevenue - yesterday.revenue) / yesterday.revenue) * 100).toFixed(1)
    ),
    bookings: todayBookings.length,
    bookingsChange: Number(
      (((todayBookings.length - yesterday.bookings) / yesterday.bookings) * 100).toFixed(1)
    ),
    totalCustomers: 156,
    customersChange: 3.2,
    pendingAppointments: todayBookings.filter(b => b.status === 'pending').length,
    pendingChange: -2,
  },

  sparklineData: {
    revenue: dailyStats.slice(-7).map(d => d.revenue),
    bookings: dailyStats.slice(-7).map(d => d.bookings),
  },

  trendData: dailyStats,
  todayBookings,
  serviceDistribution,
  vehicleDistribution,
  recentActivity: generateRecentActivity(),
  customers: generateCustomers(),

  weekHeatmap: Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      bookings: isWeekend ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 10) + 5,
      intensity: isWeekend ? 'low' : 'high',
    };
  }),

  quickActions: [
    {
      id: 'new-booking',
      label: 'New Booking',
      icon: 'CalendarPlus',
      shortcut: '⌘N',
      href: '/admin/bookings?new=1',
    },
    {
      id: 'view-calendar',
      label: 'View Calendar',
      icon: 'Calendar',
      shortcut: '⌘C',
      href: '/admin/schedule',
    },
    {
      id: 'add-customer',
      label: 'Add Customer',
      icon: 'UserPlus',
      shortcut: '⌘⇧C',
      href: '/admin/customers?new=1',
    },
    {
      id: 'export-report',
      label: 'Export Report',
      icon: 'Download',
      shortcut: '⌘E',
      href: '/admin/analytics?export=1',
    },
  ],

  navigation: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/admin' },
    { id: 'bookings', label: 'Bookings', icon: 'CalendarDays', href: '/admin/bookings' },
    { id: 'customers', label: 'Customers', icon: 'Users', href: '/admin/customers' },
    { id: 'schedule', label: 'Schedule', icon: 'Clock', href: '/admin/schedule' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', href: '/admin/analytics' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/admin/settings' },
  ],
};

// Searchable items for command palette
export const searchableItems = [
  ...mockDashboardData.todayBookings.map(b => ({
    id: b.id,
    type: 'booking' as const,
    title: `${b.customerName} - ${b.service}`,
    subtitle: `${b.date} at ${b.time}`,
    href: `/admin/bookings?id=${encodeURIComponent(b.id)}`,
  })),
  ...mockDashboardData.customers.map(c => ({
    id: c.id,
    type: 'customer' as const,
    title: c.name,
    subtitle: c.email,
    href: `/admin/customers?id=${encodeURIComponent(c.id)}`,
  })),
  ...mockDashboardData.navigation.map(n => ({
    id: n.id,
    type: 'page' as const,
    title: n.label,
    subtitle: `Navigate to ${n.label}`,
    href: n.href,
  })),
];
