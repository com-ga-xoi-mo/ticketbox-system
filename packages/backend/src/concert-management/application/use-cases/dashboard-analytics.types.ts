export interface DailyRevenuePoint {
  date: string;
  revenueVnd: number;
  paidOrders: number;
}

export interface RevenueTrend {
  windowDays: number;
  points: DailyRevenuePoint[];
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
  revenueTrend: RevenueTrend;
  topGrossingConcerts: TopGrossingConcert[];
}

export interface CheckinRateMetrics {
  scopedConcerts: number;
  eligibleTickets: number;
  checkedInTickets: number;
  rate: number;
}

export interface OrganizerDashboardMetrics {
  myTotalRevenueVnd: number;
  ticketSalesVelocity: RevenueTrend;
  overallCheckinRate: CheckinRateMetrics;
}
