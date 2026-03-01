'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, Button } from '@/components/admin/ui';
import { getBookingStats, type Booking } from '@/lib/admin/services';
import { LineChart, BarChart, PieChart } from '@mui/x-charts';
import { Download, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

interface Stats {
  todayCount: number;
  todayRevenue: number;
  weekCount: number;
  weekRevenue: number;
  monthCount: number;
  monthRevenue: number;
  byStatus: Record<Booking['status'], number>;
}

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ date: string; value: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const bookingStats = await getBookingStats();
        setStats(bookingStats);

        // Generate 30 days of revenue data
        const days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: Math.floor(Math.random() * 2000) + 1000,
          };
        });
        setRevenueData(days);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleExport = useCallback(() => {
    window.alert('Export functionality coming soon!');
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
            <p className="text-dark-900 mt-1">Insights and performance metrics.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse">
              &nbsp;
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
          <p className="text-dark-900 mt-1">Track your business performance and trends.</p>
        </div>
        <Button onClick={handleExport} variant="secondary" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6" hover animate>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-dark-900 mb-1">Today&apos;s Revenue</p>
              <p className="text-3xl font-bold">${stats?.todayRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-gold" />
            </div>
          </div>
        </Card>

        <Card className="p-6" hover animate>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-dark-900 mb-1">This Week</p>
              <p className="text-3xl font-bold">${stats?.weekRevenue.toLocaleString()}</p>
              <p className="text-sm text-dark-900 mt-1">{stats?.weekCount} bookings</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-gold" />
            </div>
          </div>
        </Card>

        <Card className="p-6" hover animate>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-dark-900 mb-1">This Month</p>
              <p className="text-3xl font-bold">${stats?.monthRevenue.toLocaleString()}</p>
              <p className="text-sm text-dark-900 mt-1">{stats?.monthCount} bookings</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gold" />
            </div>
          </div>
        </Card>

        <Card className="p-6" hover animate>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-dark-900 mb-1">Active Customers</p>
              <p className="text-3xl font-bold">156</p>
              <p className="text-sm text-green-400 mt-1">+12% this month</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-gold" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="p-6" animate>
          <h2 className="text-lg font-semibold mb-4">Revenue Trend (30 Days)</h2>
          <div className="h-80">
            <LineChart
              xAxis={[
                {
                  data: revenueData.map((_, i) => i),
                  tickLabelInterval: 'auto',
                  tickLabelStyle: {
                    fill: '#888',
                    fontSize: 10,
                  },
                  valueFormatter: value => revenueData[value]?.date || '',
                },
              ]}
              yAxis={[
                {
                  tickLabelStyle: {
                    fill: '#888',
                    fontSize: 10,
                  },
                },
              ]}
              series={[
                {
                  data: revenueData.map(d => d.value),
                  area: true,
                  color: '#D4A853',
                  showMark: false,
                },
              ]}
              height={320}
              slotProps={{
                legend: { hidden: true },
              }}
            />
          </div>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6" animate>
          <h2 className="text-lg font-semibold mb-4">Booking Status Distribution</h2>
          <div className="h-80 flex items-center justify-center">
            {stats && (
              <PieChart
                series={[
                  {
                    data: [
                      { id: 0, value: stats.byStatus.pending, label: 'Pending', color: '#EAB308' },
                      {
                        id: 1,
                        value: stats.byStatus.confirmed,
                        label: 'Confirmed',
                        color: '#D4A853',
                      },
                      {
                        id: 2,
                        value: stats.byStatus.completed,
                        label: 'Completed',
                        color: '#22C55E',
                      },
                      {
                        id: 3,
                        value: stats.byStatus.cancelled,
                        label: 'Cancelled',
                        color: '#EF4444',
                      },
                    ],
                    innerRadius: 60,
                    outerRadius: 100,
                    paddingAngle: 2,
                    cornerRadius: 4,
                    cx: 150,
                    cy: 150,
                  },
                ]}
                height={320}
                slotProps={{
                  legend: {
                    direction: 'row',
                    position: { vertical: 'bottom', horizontal: 'middle' },
                    padding: 20,
                    labelStyle: {
                      fill: '#fff',
                      fontSize: 12,
                    },
                  },
                }}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Bookings */}
        <Card className="p-6" animate>
          <h2 className="text-lg font-semibold mb-4">Weekly Bookings</h2>
          <div className="h-80">
            <BarChart
              xAxis={[
                {
                  scaleType: 'band',
                  data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  tickLabelStyle: {
                    fill: '#888',
                    fontSize: 12,
                  },
                },
              ]}
              yAxis={[
                {
                  tickLabelStyle: {
                    fill: '#888',
                    fontSize: 10,
                  },
                },
              ]}
              series={[
                {
                  data: [12, 18, 15, 22, 28, 35, 30],
                  color: '#D4A853',
                },
              ]}
              height={320}
              slotProps={{
                legend: { hidden: true },
              }}
            />
          </div>
        </Card>

        {/* Top Services */}
        <Card className="p-6" animate>
          <h2 className="text-lg font-semibold mb-4">Service Performance</h2>
          <div className="space-y-4">
            {[
              { name: 'Premium', bookings: 62, revenue: 18538, color: '#D4A853' },
              { name: 'Essential', bookings: 45, revenue: 6705, color: '#8A7018' },
              { name: 'Ultimate', bookings: 22, revenue: 10978, color: '#E8C87A' },
            ].map(service => (
              <div key={service.name}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{service.name}</span>
                  <div className="text-right">
                    <span className="font-medium">{service.bookings} bookings</span>
                    <span className="text-dark-900 ml-2">${service.revenue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(service.bookings / 62) * 100}%`,
                      backgroundColor: service.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
