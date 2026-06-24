import { Injectable } from '@nestjs/common';
import { ConcertStatus, OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type { AdminDashboardMetrics, TopGrossingConcert } from './dashboard-analytics.types';
import {
  fillRevenueTrend,
  getUtcTrendWindow,
  normalizeWindowDays,
  toNumber,
  type RevenueTrendRow,
} from './dashboard-analytics.helpers';

interface TopGrossingConcertRow {
  concertId: string;
  title: string;
  organizerId: string;
  organizerDisplayName: string;
  revenueVnd: number | bigint | string | null;
  paidOrders: number | bigint | string | null;
}

export interface GetAdminDashboardMetricsInput {
  windowDays?: number;
}

@Injectable()
export class GetAdminDashboardMetricsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: GetAdminDashboardMetricsInput = {}): Promise<AdminDashboardMetrics> {
    const windowDays = normalizeWindowDays(input.windowDays);
    const { startDate, endExclusive } = getUtcTrendWindow(windowDays);

    const [revenueAggregate, totalActiveConcerts, revenueRows, topRows] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: OrderStatus.PAID },
        _sum: { totalAmountVnd: true },
      }),
      this.prisma.concert.count({
        where: { status: ConcertStatus.PUBLISHED },
      }),
      this.prisma.$queryRaw<RevenueTrendRow[]>`
        SELECT
          to_char(o.paid_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
          SUM(o.total_amount_vnd)::bigint AS "revenueVnd",
          COUNT(o.id)::bigint AS "paidOrders"
        FROM orders o
        WHERE o.status = ${OrderStatus.PAID}::order_status
          AND o.paid_at IS NOT NULL
          AND o.paid_at >= ${startDate}
          AND o.paid_at < ${endExclusive}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<TopGrossingConcertRow[]>`
        SELECT
          c.id AS "concertId",
          c.title,
          c.created_by_id AS "organizerId",
          u.display_name AS "organizerDisplayName",
          SUM(o.total_amount_vnd)::bigint AS "revenueVnd",
          COUNT(o.id)::bigint AS "paidOrders"
        FROM orders o
        INNER JOIN concerts c ON c.id = o.concert_id
        INNER JOIN users u ON u.id = c.created_by_id
        WHERE o.status = ${OrderStatus.PAID}::order_status
        GROUP BY c.id, c.title, c.created_by_id, u.display_name
        ORDER BY SUM(o.total_amount_vnd) DESC, c.title ASC
        LIMIT 5
      `,
    ]);

    return {
      totalPlatformRevenueVnd: revenueAggregate._sum.totalAmountVnd ?? 0,
      totalActiveConcerts,
      revenueTrend: {
        windowDays,
        points: fillRevenueTrend(windowDays, revenueRows),
      },
      topGrossingConcerts: topRows.map(
        (row): TopGrossingConcert => ({
          concertId: row.concertId,
          title: row.title,
          organizerId: row.organizerId,
          organizerDisplayName: row.organizerDisplayName,
          revenueVnd: toNumber(row.revenueVnd),
          paidOrders: toNumber(row.paidOrders),
        }),
      ),
    };
  }
}
