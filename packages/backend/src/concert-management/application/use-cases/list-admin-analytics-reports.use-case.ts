import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { toNumber } from './dashboard-analytics.helpers';
import { Prisma } from '@prisma/client';

export interface ReportConcertRow {
  id: string;
  title: string;
  startsAt: Date;
  status: string;
  posterAssetId: string | null;
  organizerId: string;
  organizerDisplayName: string;
  revenueVnd: number | bigint | string | null;
  totalTickets: number | bigint | string | null;
  soldTickets: number | bigint | string | null;
  eligibleTickets: number | bigint | string | null;
  checkedInTickets: number | bigint | string | null;
}

export interface ListAdminAnalyticsReportsInput {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  windowDays?: number;
  organizerId?: string;
}

@Injectable()
export class ListAdminAnalyticsReportsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ListAdminAnalyticsReportsInput) {
    const page = input.page || 1;
    const limit = input.limit || 20;
    const offset = (page - 1) * limit;
    const search = input.search ? `%${input.search}%` : '%';

    const conditions = [Prisma.sql`(c.title ILIKE ${search} OR u.display_name ILIKE ${search})`];
    
    if (input.status && input.status !== 'ALL') {
      conditions.push(Prisma.sql`c.status::text = ${input.status}`);
    }
    
    if (input.organizerId && input.organizerId !== 'ALL') {
      conditions.push(Prisma.sql`c.created_by_id = ${input.organizerId}::uuid`);
    }

    if (input.windowDays && input.windowDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.windowDays);
      conditions.push(Prisma.sql`c.starts_at >= ${cutoff}`);
    }

    const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const rows = await this.prisma.$queryRaw<ReportConcertRow[]>`
      SELECT
        c.id, c.title, c.starts_at as "startsAt", c.status::text, c.poster_asset_id as "posterAssetId",
        u.id as "organizerId", u.display_name as "organizerDisplayName",
        (SELECT SUM(total_amount_vnd)::bigint FROM orders WHERE concert_id = c.id AND status = 'PAID'::order_status) as "revenueVnd",
        (SELECT SUM(total_quantity)::bigint FROM ticket_types WHERE concert_id = c.id AND status != 'ARCHIVED'::ticket_type_status) as "totalTickets",
        (SELECT SUM(sold_quantity)::bigint FROM ticket_types WHERE concert_id = c.id AND status != 'ARCHIVED'::ticket_type_status) as "soldTickets",
        (SELECT COUNT(*)::bigint FROM tickets WHERE concert_id = c.id AND status IN ('ISSUED'::ticket_status, 'CHECKED_IN'::ticket_status)) as "eligibleTickets",
        (SELECT COUNT(DISTINCT ticket_id)::bigint FROM checkin_events WHERE concert_id = c.id AND result = 'ACCEPTED'::checkin_event_result) as "checkedInTickets"
      FROM concerts c
      INNER JOIN users u ON u.id = c.created_by_id
      ${where}
      ORDER BY "revenueVnd" DESC NULLS LAST, c.starts_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalCountRow = await this.prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*)::bigint as count
      FROM concerts c
      INNER JOIN users u ON u.id = c.created_by_id
      ${where}
    `;

    const totalItems = toNumber(totalCountRow[0]?.count) || 0;

    return {
      items: rows.map(row => ({
        id: row.id,
        title: row.title,
        startsAt: row.startsAt,
        status: row.status,
        posterAssetId: row.posterAssetId,
        organizerId: row.organizerId,
        organizerDisplayName: row.organizerDisplayName,
        revenueVnd: toNumber(row.revenueVnd),
        totalTickets: toNumber(row.totalTickets),
        soldTickets: toNumber(row.soldTickets),
        eligibleTickets: toNumber(row.eligibleTickets),
        checkedInTickets: toNumber(row.checkedInTickets),
      })),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      page,
      limit,
    };
  }
}
