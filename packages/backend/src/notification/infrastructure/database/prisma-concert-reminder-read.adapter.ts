import { Injectable } from '@nestjs/common';
import { ConcertStatus, OrderStatus, TicketStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  ConcertReminderReadPort,
  ReminderRecipient,
  UpcomingConcertReminderTarget,
} from '../../domain/ports/concert-reminder-read.port';

@Injectable()
export class PrismaConcertReminderReadAdapter implements ConcertReminderReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async findConcertsStartingWithin(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<UpcomingConcertReminderTarget[]> {
    const concerts = await this.prisma.concert.findMany({
      where: {
        status: ConcertStatus.PUBLISHED,
        startsAt: { gte: windowStart, lt: windowEnd },
      },
      select: { id: true, title: true, startsAt: true },
    });

    return concerts.map((concert) => ({
      concertId: concert.id,
      concertTitle: concert.title,
      startsAt: concert.startsAt,
    }));
  }

  async findValidTicketHolders(concertId: string): Promise<ReminderRecipient[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        concertId,
        status: { in: [TicketStatus.ISSUED, TicketStatus.CHECKED_IN] },
        order: { status: OrderStatus.PAID },
      },
      select: {
        userId: true,
        user: { select: { displayName: true, email: true } },
      },
    });

    const byUser = new Map<string, ReminderRecipient>();
    for (const ticket of tickets) {
      const existing = byUser.get(ticket.userId);
      if (existing) {
        existing.ticketCount += 1;
        continue;
      }
      byUser.set(ticket.userId, {
        userId: ticket.userId,
        userDisplayName: ticket.user.displayName,
        toEmail: ticket.user.email,
        ticketCount: 1,
      });
    }

    return [...byUser.values()];
  }
}
