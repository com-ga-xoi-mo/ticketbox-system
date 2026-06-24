import { get } from '../../../shared/api/client';

export interface RevenueTrendPoint {
  date: string;
  revenueVnd: number;
  paidOrders: number;
}

export interface CheckinRateMetrics {
  scopedConcerts: number;
  eligibleTickets: number;
  checkedInTickets: number;
  rate: number;
}

export interface OrganizerDashboardMetrics {
  myTotalRevenueVnd: number;
  ticketSalesVelocity: {
    windowDays: number;
    points: RevenueTrendPoint[];
  };
  overallCheckinRate: CheckinRateMetrics;
}

export async function getOrganizerDashboardMetrics(windowDays?: number): Promise<OrganizerDashboardMetrics> {
  const query = windowDays ? `?windowDays=${windowDays}` : '';
  return get<OrganizerDashboardMetrics>(`/organizer/analytics/dashboard${query}`);
}
