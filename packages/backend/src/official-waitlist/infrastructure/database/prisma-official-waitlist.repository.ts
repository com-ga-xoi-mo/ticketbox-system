import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  CreateWaitlistEntryInput,
  OfficialWaitlistRepositoryPort,
} from '../../domain/ports/official-waitlist-repository.port';
import type {
  TicketTypeWaitlistInfo,
  WaitlistRecoveryNotificationContext,
  WaitlistEntryRecord,
  WaitlistStatusRecord,
  WaitlistTicketAvailabilityMarkerRecord,
} from '../../domain/waitlist.types';

const ACTIVE_ENTRY_STATUSES = ['WAITING'] as const;

@Injectable()
export class PrismaOfficialWaitlistRepository
  implements OfficialWaitlistRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findTicketType(ticketTypeId: string): Promise<TicketTypeWaitlistInfo | null> {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      select: {
        id: true,
        concertId: true,
        totalQuantity: true,
        reservedQuantity: true,
        soldQuantity: true,
        maxPerUser: true,
        status: true,
        saleStartsAt: true,
        saleEndsAt: true,
      },
    });

    return ticketType ? { ...ticketType, status: String(ticketType.status) } : null;
  }

  async countAlreadyReservedOrSoldByUser(input: {
    userId: string;
    ticketTypeId: string;
  }): Promise<number> {
    const result = await this.prisma.orderItem.aggregate({
      where: {
        ticketTypeId: input.ticketTypeId,
        order: {
          userId: input.userId,
          status: { in: ['PENDING_PAYMENT', 'PAID'] },
          orderSourceType: 'DIRECT',
        },
      },
      _sum: { quantity: true },
    });

    return result._sum.quantity ?? 0;
  }

  async findActiveEntry(input: {
    userId: string;
    ticketTypeId: string;
  }): Promise<WaitlistEntryRecord | null> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        userId: input.userId,
        ticketTypeId: input.ticketTypeId,
        status: { in: [...ACTIVE_ENTRY_STATUSES] },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return entry ? this.toEntry(entry) : null;
  }

  async createEntry(input: CreateWaitlistEntryInput): Promise<WaitlistEntryRecord> {
    const entry = await this.prisma.waitlistEntry.create({
      data: {
        userId: input.userId,
        concertId: input.concertId,
        ticketTypeId: input.ticketTypeId,
        desiredQuantity: input.desiredQuantity,
        status: 'WAITING',
        joinedAt: input.joinedAt,
      },
    });

    return this.toEntry(entry);
  }

  async cancelEntry(input: {
    userId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<WaitlistEntryRecord | null> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        userId: input.userId,
        ticketTypeId: input.ticketTypeId,
        status: { in: [...ACTIVE_ENTRY_STATUSES] },
      },
      orderBy: { joinedAt: 'asc' },
    });

    if (!entry) {
      return null;
    }

    const updated = await this.prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'CANCELLED', cancelledAt: input.now },
    });

    return this.toEntry(updated);
  }

  async getStatus(input: {
    userId: string;
    concertId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<WaitlistStatusRecord> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        userId: input.userId,
        concertId: input.concertId,
        ticketTypeId: input.ticketTypeId,
        status: { in: [...ACTIVE_ENTRY_STATUSES] },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return { entry: entry ? this.toEntry(entry) : null };
  }

  async listTicketTypesWithActiveSubscribers(limit: number): Promise<string[]> {
    const rows = await this.prisma.waitlistEntry.groupBy({
      by: ['ticketTypeId'],
      where: { status: { in: [...ACTIVE_ENTRY_STATUSES] } },
      orderBy: { ticketTypeId: 'asc' },
      take: limit,
    });
    return rows.map((row) => row.ticketTypeId);
  }

  async getOrCreateAvailabilityMarker(
    ticketTypeId: string,
  ): Promise<WaitlistTicketAvailabilityMarkerRecord> {
    const marker = await this.prisma.waitlistTicketAvailability.upsert({
      where: { ticketTypeId },
      create: { ticketTypeId, markerState: 'AVAILABLE' },
      update: {},
    });
    return {
      ticketTypeId: marker.ticketTypeId,
      markerState: marker.markerState,
      lastNotifiedAt: marker.lastNotifiedAt,
    };
  }

  async updateAvailabilityMarker(input: {
    ticketTypeId: string;
    markerState: 'AVAILABLE' | 'SOLD_OUT' | 'NOTIFIED';
    lastNotifiedAt?: Date | null;
  }): Promise<void> {
    await this.prisma.waitlistTicketAvailability.upsert({
      where: { ticketTypeId: input.ticketTypeId },
      create: {
        ticketTypeId: input.ticketTypeId,
        markerState: input.markerState,
        lastNotifiedAt: input.lastNotifiedAt ?? null,
      },
      update: {
        markerState: input.markerState,
        ...(input.lastNotifiedAt !== undefined
          ? { lastNotifiedAt: input.lastNotifiedAt }
          : {}),
      },
    });
  }

  async listActiveSubscriberNotificationContexts(input: {
    ticketTypeId: string;
  }): Promise<WaitlistRecoveryNotificationContext[]> {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        ticketTypeId: input.ticketTypeId,
        status: { in: [...ACTIVE_ENTRY_STATUSES] },
      },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: { select: { email: true, displayName: true } },
        concert: { select: { title: true, slug: true } },
        ticketType: { select: { name: true, code: true } },
      },
    });

    return entries.map((entry) => ({
      entry: this.toEntry(entry),
      userEmail: entry.user.email,
      userDisplayName: entry.user.displayName,
      concertTitle: entry.concert.title,
      concertSlug: entry.concert.slug,
      ticketTypeName: entry.ticketType.name,
      ticketTypeCode: entry.ticketType.code,
    }));
  }

  async withTicketTypeLock<T>(ticketTypeId: string, work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        `official-waitlist:${ticketTypeId}`,
      );
      return work();
    });
  }

  private toEntry(entry: {
    id: string;
    userId: string;
    concertId: string;
    ticketTypeId: string;
    desiredQuantity: number;
    status: string;
    joinedAt: Date;
    grantedAt: Date | null;
    fulfilledAt: Date | null;
    cancelledAt: Date | null;
    expiredAt: Date | null;
  }): WaitlistEntryRecord {
    return entry as WaitlistEntryRecord;
  }
}
