import { Injectable } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  TicketCacheDelta,
  TicketCacheHashEntry,
  TicketCacheQueryPort,
} from '../../domain/ports/ticket-cache-query.port';

@Injectable()
export class PrismaTicketCacheQueryAdapter implements TicketCacheQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getFullCache(concertId: string): Promise<TicketCacheHashEntry[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        concertId,
        status: { in: [TicketStatus.ISSUED, TicketStatus.CHECKED_IN] },
      },
      select: { qrTokenHash: true, status: true },
    });

    return tickets.map((t) => ({
      hash: t.qrTokenHash,
      status: t.status === TicketStatus.CHECKED_IN ? 'checked_in' : 'valid',
    }));
  }

  async getDeltaCache(concertId: string, since: Date): Promise<TicketCacheDelta> {
    const [changed, voided] = await Promise.all([
      this.prisma.ticket.findMany({
        where: {
          concertId,
          status: { in: [TicketStatus.ISSUED, TicketStatus.CHECKED_IN] },
          OR: [
            { issuedAt: { gte: since } },
            { checkedInAt: { gte: since } },
          ],
        },
        select: { qrTokenHash: true, status: true },
      }),
      this.prisma.ticket.findMany({
        where: {
          concertId,
          status: { in: [TicketStatus.VOIDED, TicketStatus.REFUNDED] },
          voidedAt: { gte: since },
        },
        select: { qrTokenHash: true },
      }),
    ]);

    return {
      upserted: changed.map((t) => ({
        hash: t.qrTokenHash,
        status: t.status === TicketStatus.CHECKED_IN ? 'checked_in' : 'valid',
      })),
      voided: voided.map((t) => t.qrTokenHash),
    };
  }
}
