import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class DashboardAnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  windowDays?: number;
}

export interface DailyRevenuePointResponseDto {
  date: string;
  revenueVnd: number;
  paidOrders: number;
}

export interface RevenueTrendResponseDto {
  windowDays: number;
  points: DailyRevenuePointResponseDto[];
}

export interface TopGrossingConcertResponseDto {
  concertId: string;
  title: string;
  organizerId: string;
  organizerDisplayName: string;
  revenueVnd: number;
  paidOrders: number;
}

export interface AdminDashboardMetricsResponseDto {
  totalPlatformRevenueVnd: number;
  totalActiveConcerts: number;
  revenueTrend: RevenueTrendResponseDto;
  topGrossingConcerts: TopGrossingConcertResponseDto[];
}

export interface CheckinRateResponseDto {
  scopedConcerts: number;
  eligibleTickets: number;
  checkedInTickets: number;
  rate: number;
}

export interface OrganizerDashboardMetricsResponseDto {
  myTotalRevenueVnd: number;
  ticketSalesVelocity: RevenueTrendResponseDto;
  overallCheckinRate: CheckinRateResponseDto;
}
