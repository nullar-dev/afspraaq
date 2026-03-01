'use client';

import { Card, Badge } from '@/components/admin/ui';
import { mockDashboardData } from '@/lib/admin/mock/dashboard';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface DashboardProps {
  data?: typeof mockDashboardData;
}

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  change: number;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-6" hover animate>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-900 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            {changeType === 'positive' ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={changeType === 'positive' ? 'text-green-400' : 'text-red-400'}>
              {change > 0 ? '+' : ''}
              {change}%
            </span>
            <span className="text-dark-900 text-sm">vs yesterday</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-gold" />
        </div>
      </div>
    </Card>
  );
}

function Sparkline({ data, color = '#D4A853' }: { data: number[]; color?: string }) {
  const safeData = data.filter(value => Number.isFinite(value));
  if (safeData.length === 0) {
    return <div className="h-16" data-testid="sparkline-empty" />;
  }

  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1;

  const points = safeData
    .map((value, index) => {
      const x = safeData.length === 1 ? 50 : (index / (safeData.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#sparklineGradient)" points={`0,100 ${points} 100,100`} />
    </svg>
  );
}

export function Dashboard({ data = mockDashboardData }: DashboardProps) {
  const { todayStats, sparklineData, todayBookings, recentActivity, serviceDistribution } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-dark-900 mt-1">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-dark rounded-xl font-medium hover:bg-gold-400 transition-colors"
        >
          View All Bookings
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={`$${todayStats.revenue.toLocaleString()}`}
          change={todayStats.revenueChange}
          changeType={todayStats.revenueChange >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
        />
        <StatCard
          title="Bookings Today"
          value={todayStats.bookings}
          change={todayStats.bookingsChange}
          changeType={todayStats.bookingsChange >= 0 ? 'positive' : 'negative'}
          icon={Calendar}
        />
        <StatCard
          title="Total Customers"
          value={todayStats.totalCustomers}
          change={todayStats.customersChange}
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Pending"
          value={todayStats.pendingAppointments}
          change={todayStats.pendingChange}
          changeType={todayStats.pendingChange <= 0 ? 'positive' : 'negative'}
          icon={Clock}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 p-6" animate>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Revenue Trend</h2>
            <div className="flex gap-2">
              {['7D', '30D', '90D'].map(period => (
                <button
                  key={period}
                  className="px-3 py-1 text-sm rounded-lg bg-dark-200 hover:bg-dark-300 transition-colors"
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <Sparkline data={sparklineData.revenue} />
        </Card>

        {/* Service Distribution */}
        <Card className="p-6" animate>
          <h2 className="text-lg font-semibold mb-6">Services</h2>
          <div className="space-y-4">
            {serviceDistribution.map(service => (
              <div key={service.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{service.name}</span>
                  <span className="text-dark-900">{service.percentage}%</span>
                </div>
                <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${service.percentage}%`,
                      backgroundColor: service.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="p-6" animate>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Today&apos;s Schedule</h2>
            <Link
              href="/admin/schedule"
              className="text-sm text-gold hover:text-gold-400 flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {todayBookings.slice(0, 5).map(booking => (
              <div
                key={booking.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-dark-50 hover:bg-dark-200 transition-colors"
              >
                <div className="w-16 text-sm font-medium text-dark-900">{booking.time}</div>
                <div className="flex-1">
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-dark-900">
                    {booking.service} • {booking.vehicle}
                  </p>
                </div>
                <Badge variant={booking.status}>{booking.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6" animate>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link
              href="/admin/analytics"
              className="text-sm text-gold hover:text-gold-400 flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl bg-dark-50">
                <div className="w-8 h-8 rounded-full bg-dark-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">👤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="text-dark-900">{activity.actor.split('@')[0]}</span>{' '}
                    <span>{activity.action}</span>{' '}
                    <span className="text-gold">{activity.target}</span>
                  </p>
                  <p className="text-xs text-dark-900 mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
