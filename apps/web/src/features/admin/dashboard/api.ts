import { get } from '../../../shared/api/client';

export interface RevenueTrendPoint {
  date: string;
  revenueVnd: number;
  paidOrders: number;
}

export interface TopGrossingConcert {
  concertId: string;
  title: string;
  organizerId: string;
  organizerDisplayName: string;
  revenueVnd: number;
  paidOrders: number;
}

export interface AdminDashboardMetrics {
  totalPlatformRevenueVnd: number;
  totalActiveConcerts: number;
  revenueTrend: {
    windowDays: number;
    points: RevenueTrendPoint[];
  };
  topGrossingConcerts: TopGrossingConcert[];
}

export async function getAdminDashboardMetrics(windowDays?: number): Promise<AdminDashboardMetrics> {
  const query = windowDays ? `?windowDays=${windowDays}` : '';
  return get<AdminDashboardMetrics>(`/admin/analytics/dashboard${query}`);
}
