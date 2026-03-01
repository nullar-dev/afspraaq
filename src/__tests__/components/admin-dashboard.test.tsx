import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '@/components/admin/dashboard/Dashboard';
import { mockDashboardData } from '@/lib/admin/mock/dashboard';

describe('Admin Dashboard', () => {
  it('renders sparkline fallback when revenue data is empty', () => {
    render(
      <Dashboard
        data={{
          ...mockDashboardData,
          sparklineData: {
            ...mockDashboardData.sparklineData,
            revenue: [],
          },
        }}
      />
    );

    expect(screen.getByTestId('sparkline-empty')).toBeTruthy();
  });

  it('renders safely when injected data object is incomplete', () => {
    render(
      <Dashboard data={{ todayStats: { revenue: 2500 } } as unknown as typeof mockDashboardData} />
    );

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText("Today's Revenue")).toBeTruthy();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
