import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  CreateWaitlistEntryInput,
  GrantEntitlementInput,
  OfficialWaitlistRepositoryPort,
} from '../../domain/ports/official-waitlist-repository.port';
import type {
  PurchaseEntitlementRecord,
  TicketTypeWaitlistInfo,
  WaitlistEntitlementNotificationContext,
  WaitlistEntryRecord,
  WaitlistStatusRecord,
} from '../../domain/waitlist.types';

const ACTIVE_ENTRY_STATUSES = ['WAITING', 'GRANTED'] as const;

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
        joinedAt: input.joinedAt,
      },
    });

    return this.toEntry(entry);
  }

  async cancelEntryAndRevokeEntitlement(input: {
    userId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<{
    entry: WaitlistEntryRecord | null;
    revokedEntitlementId: string | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findFirst({
        where: {
          userId: input.userId,
          ticketTypeId: input.ticketTypeId,
          status: { in: [...ACTIVE_ENTRY_STATUSES] },
        },
        orderBy: { joinedAt: 'asc' },
      });

      if (!entry) {
        return { entry: null, revokedEntitlementId: null };
      }

      const entitlement = await tx.purchaseEntitlement.findFirst({
        where: {
          waitlistEntryId: entry.id,
          status: 'ACTIVE',
        },
      });

      if (entitlement) {
        await tx.purchaseEntitlement.update({
          where: { id: entitlement.id },
          data: { status: 'REVOKED', revokedAt: input.now },
        });
      }

      const updated = await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'CANCELLED', cancelledAt: input.now },
      });

      return {
        entry: this.toEntry(updated),
        revokedEntitlementId: entitlement?.id ?? null,
      };
    });
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

    const entitlement = await this.prisma.purchaseEntitlement.findFirst({
      where: {
        userId: input.userId,
        concertId: input.concertId,
        ticketTypeId: input.ticketTypeId,
        status: 'ACTIVE',
        expiresAt: { gt: input.now },
      },
      orderBy: { grantedAt: 'desc' },
    });

    const queuePosition =
      entry && entry.status === 'WAITING'
        ? (await this.prisma.waitlistEntry.count({
            where: {
              ticketTypeId: input.ticketTypeId,
              status: 'WAITING',
              joinedAt: { lte: entry.joinedAt },
            },
          }))
        : null;

    return {
      entry: entry ? this.toEntry(entry) : null,
      queuePosition,
      entitlement: entitlement ? this.toEntitlement(entitlement) : null,
    };
  }

  async hasActiveGate(ticketTypeId: string): Promise<boolean> {
    const [entries, entitlements] = await Promise.all([
      this.prisma.waitlistEntry.count({
        where: { ticketTypeId, status: { in: [...ACTIVE_ENTRY_STATUSES] } },
      }),
      this.prisma.purchaseEntitlement.count({
        where: { ticketTypeId, status: 'ACTIVE' },
      }),
    ]);

    return entries + entitlements > 0;
  }

  async sumActiveEntitlementQuantity(
    ticketTypeId: string,
    now: Date,
  ): Promise<number> {
    const result = await this.prisma.purchaseEntitlement.aggregate({
      where: {
        ticketTypeId,
        status: 'ACTIVE',
        expiresAt: { gt: now },
      },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  async listNextWaitingEntries(input: {
    ticketTypeId: string;
    limit: number;
  }): Promise<WaitlistEntryRecord[]> {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        ticketTypeId: input.ticketTypeId,
        status: 'WAITING',
      },
      orderBy: { joinedAt: 'asc' },
      take: input.limit,
    });
    return entries.map((entry) => this.toEntry(entry));
  }

  async grantEntitlement(
    input: GrantEntitlementInput,
  ): Promise<PurchaseEntitlementRecord> {
    return this.prisma.$transaction(async (tx) => {
      const entitlement = await tx.purchaseEntitlement.create({
        data: {
          waitlistEntryId: input.entryId,
          userId: input.userId,
          concertId: input.concertId,
          ticketTypeId: input.ticketTypeId,
          quantity: input.quantity,
          source: 'WAITLIST',
          status: 'ACTIVE',
          grantedAt: input.grantedAt,
          expiresAt: input.expiresAt,
        },
      });

      await tx.waitlistEntry.update({
        where: { id: input.entryId },
        data: { status: 'GRANTED', grantedAt: input.grantedAt },
      });

      return this.toEntitlement(entitlement);
    });
  }

  async findEntitlementNotificationContext(
    entitlementId: string,
  ): Promise<WaitlistEntitlementNotificationContext | null> {
    const entitlement = await this.prisma.purchaseEntitlement.findUnique({
      where: { id: entitlementId },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
        concert: {
          select: {
            title: true,
            slug: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    if (!entitlement) return null;

    return {
      entitlement: this.toEntitlement(entitlement),
      userEmail: entitlement.user.email,
      userDisplayName: entitlement.user.displayName,
      concertTitle: entitlement.concert.title,
      concertSlug: entitlement.concert.slug,
      ticketTypeName: entitlement.ticketType.name,
      ticketTypeCode: entitlement.ticketType.code,
    };
  }

  async listActiveEntitlementsExpiringSoon(input: {
    now: Date;
    reminderWindowEndsAt: Date;
    limit: number;
  }): Promise<PurchaseEntitlementRecord[]> {
    const entitlements = await this.prisma.purchaseEntitlement.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          gt: input.now,
          lte: input.reminderWindowEndsAt,
        },
      },
      orderBy: { expiresAt: 'asc' },
      take: input.limit,
    });

    return entitlements.map((entitlement) => this.toEntitlement(entitlement));
  }

  async expireEntitlements(
    now: Date,
  ): Promise<Array<{ ticketTypeId: string; quantity: number }>> {
    return this.prisma.$transaction(async (tx) => {
      const expired = await tx.purchaseEntitlement.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lte: now },
        },
      });

      if (expired.length === 0) return [];

      await tx.purchaseEntitlement.updateMany({
        where: { id: { in: expired.map((entitlement) => entitlement.id) } },
        data: { status: 'EXPIRED' },
      });
      await tx.waitlistEntry.updateMany({
        where: {
          id: {
            in: expired
              .map((entitlement) => entitlement.waitlistEntryId)
              .filter((id): id is string => Boolean(id)),
          },
        },
        data: { status: 'EXPIRED', expiredAt: now },
      });

      return expired.map((entitlement) => ({
        ticketTypeId: entitlement.ticketTypeId,
        quantity: entitlement.quantity,
      }));
    });
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

  private toEntitlement(entitlement: {
    id: string;
    waitlistEntryId: string | null;
    userId: string;
    concertId: string;
    ticketTypeId: string;
    orderId: string | null;
    source: string;
    status: string;
    quantity: number;
    grantedAt: Date;
    expiresAt: Date;
    consumedAt: Date | null;
    revokedAt: Date | null;
  }): PurchaseEntitlementRecord {
    return entitlement as PurchaseEntitlementRecord;
  }
}
