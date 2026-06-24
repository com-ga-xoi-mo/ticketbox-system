import { Injectable } from '@nestjs/common';
import { CheckinEventResult, ConcertStatus, OrderStatus, TicketStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type { CheckinRateMetrics, OrganizerDashboardMetrics } from './dashboard-analytics.types';
import {
  fillRevenueTrend,
  getUtcTrendWindow,
  normalizeWindowDays,
  toNumber,
  type RevenueTrendRow,
} from './dashboard-analytics.helpers';

interface CheckinRateRow {
  scopedConcerts: number | bigint | string | null;
  eligibleTickets: number | bigint | string | null;
  checkedInTickets: number | bigint | string | null;
}

export interface GetOrganizerDashboardMetricsInput {
  organizerId: string;
  windowDays?: number;
}

@Injectable()
export class GetOrganizerDashboardMetricsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: GetOrganizerDashboardMetricsInput): Promise<OrganizerDashboardMetrics> {
    const windowDays = normalizeWindowDays(input.windowDays);
    const { startDate, endExclusive } = getUtcTrendWindow(windowDays);
    const now = new Date();

    const [revenueAggregate, revenueRows, checkinRows] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.PAID,
          concert: { createdById: input.organizerId },
        },
        _sum: { totalAmountVnd: true },
      }),
      this.prisma.$queryRaw<RevenueTrendRow[]>`
        SELECT
          to_char(o.paid_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
          SUM(o.total_amount_vnd)::bigint AS "revenueVnd",
          COUNT(o.id)::bigint AS "paidOrders"
        FROM orders o
        INNER JOIN concerts c ON c.id = o.concert_id
        WHERE o.status = ${OrderStatus.PAID}::order_status
          AND o.paid_at IS NOT NULL
          AND o.paid_at >= ${startDate}
          AND o.paid_at < ${endExclusive}
          AND c.created_by_id = ${input.organizerId}::uuid
          AND c.status = ${ConcertStatus.PUBLISHED}::concert_status
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<CheckinRateRow[]>`
        WITH scoped_concerts AS (
          SELECT id
          FROM concerts
          WHERE created_by_id = ${input.organizerId}::uuid
            AND status = ${ConcertStatus.PUBLISHED}::concert_status
            AND ends_at >= ${now}
        ),
        ticket_counts AS (
          SELECT COUNT(t.id)::bigint AS eligible_tickets
          FROM tickets t
          INNER JOIN scoped_concerts c ON c.id = t.concert_id
          WHERE t.status IN (${TicketStatus.ISSUED}::ticket_status, ${TicketStatus.CHECKED_IN}::ticket_status)
        ),
        checkin_counts AS (
          SELECT COUNT(DISTINCT ce.ticket_id)::bigint AS checked_in_tickets
          FROM checkin_events ce
          INNER JOIN scoped_concerts c ON c.id = ce.concert_id
          WHERE ce.result = ${CheckinEventResult.ACCEPTED}::checkin_event_result
            AND ce.ticket_id IS NOT NULL
        )
        SELECT
          (SELECT COUNT(*)::bigint FROM scoped_concerts) AS "scopedConcerts",
          ticket_counts.eligible_tickets AS "eligibleTickets",
          checkin_counts.checked_in_tickets AS "checkedInTickets"
        FROM ticket_counts, checkin_counts
      `,
    ]);

    return {
      myTotalRevenueVnd: revenueAggregate._sum.totalAmountVnd ?? 0,
      ticketSalesVelocity: {
        windowDays,
        points: fillRevenueTrend(windowDays, revenueRows),
      },
      overallCheckinRate: this.toCheckinRate(checkinRows[0]),
    };
  }

  private toCheckinRate(row: CheckinRateRow | undefined): CheckinRateMetrics {
    const eligibleTickets = toNumber(row?.eligibleTickets);
    const checkedInTickets = toNumber(row?.checkedInTickets);

    return {
      scopedConcerts: toNumber(row?.scopedConcerts),
      eligibleTickets,
      checkedInTickets,
      rate: eligibleTickets === 0 ? 0 : checkedInTickets / eligibleTickets,
    };
  }
}
