import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  CommitDrawInput,
  CreateLotteryConfigInput,
  CreateLotteryRegistrationInput,
  PresaleLotteryRepositoryPort,
} from '../../domain/ports/presale-lottery-repository.port';
import type {
  LotteryConfigRecord,
  LotteryEntitlementNotificationContext,
  LotteryEntitlementRecord,
  LotteryNotSelectedNotificationContext,
  LotteryRegistrationListItem,
  LotteryRegistrationRecord,
  LotteryStatusRecord,
  TicketTypeLotteryInfo,
} from '../../domain/lottery.types';

@Injectable()
export class PrismaPresaleLotteryRepository implements PresaleLotteryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findTicketType(ticketTypeId: string): Promise<TicketTypeLotteryInfo | null> {
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

  async findConfigByTicketType(ticketTypeId: string): Promise<LotteryConfigRecord | null> {
    const config = await this.prisma.lotteryConfig.findUnique({
      where: { ticketTypeId },
    });
    return config ? this.toConfig(config) : null;
  }

  async createConfig(input: CreateLotteryConfigInput): Promise<LotteryConfigRecord> {
    return this.prisma.$transaction(async (tx) => {
      const config = await tx.lotteryConfig.upsert({
        where: { ticketTypeId: input.ticketTypeId },
        create: {
          ticketTypeId: input.ticketTypeId,
          concertId: input.concertId,
          registrationOpensAt: input.registrationOpensAt,
          registrationClosesAt: input.registrationClosesAt,
          drawAt: input.drawAt,
          allocation: input.allocation,
          entitlementTtlMinutes: input.entitlementTtlMinutes,
          status: 'SCHEDULED',
        },
        update: {
          concertId: input.concertId,
          registrationOpensAt: input.registrationOpensAt,
          registrationClosesAt: input.registrationClosesAt,
          drawAt: input.drawAt,
          allocation: input.allocation,
          entitlementTtlMinutes: input.entitlementTtlMinutes,
          status: 'SCHEDULED',
          seed: null,
          drawnAt: null,
        },
      });

      await tx.ticketType.update({
        where: { id: input.ticketTypeId },
        data: {
          presaleGateOpensAt: input.saleStartsAt,
          presaleGateClosesAt: input.publicSaleStartsAt,
        },
      });

      return this.toConfig(config);
    });
  }

  async updateConfigTtl(input: {
    ticketTypeId: string;
    entitlementTtlMinutes: number;
  }): Promise<LotteryConfigRecord | null> {
    const config = await this.prisma.lotteryConfig.update({
      where: { ticketTypeId: input.ticketTypeId },
      data: { entitlementTtlMinutes: input.entitlementTtlMinutes },
    });
    return this.toConfig(config);
  }

  async cancelConfig(ticketTypeId: string, now: Date): Promise<LotteryConfigRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.lotteryConfig.findUnique({ where: { ticketTypeId } });
      if (!existing) return null;

      const config = await tx.lotteryConfig.update({
        where: { ticketTypeId },
        data: { status: 'CANCELLED', drawnAt: existing.drawnAt ?? null, updatedAt: now },
      });

      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: { presaleGateOpensAt: null, presaleGateClosesAt: null },
      });

      return this.toConfig(config);
    });
  }

  async listRegistrations(ticketTypeId: string): Promise<LotteryRegistrationListItem[]> {
    const registrations = await this.prisma.lotteryRegistration.findMany({
      where: { ticketTypeId },
      orderBy: { registeredAt: 'asc' },
      include: {
        user: { select: { email: true, displayName: true } },
        entitlements: {
          where: { source: 'LOTTERY' },
          orderBy: { grantedAt: 'desc' },
          take: 1,
        },
      },
    });

    return registrations.map((registration) => ({
      id: registration.id,
      userId: registration.userId,
      userEmail: registration.user.email,
      userDisplayName: registration.user.displayName,
      desiredQuantity: registration.desiredQuantity,
      status: registration.status as LotteryRegistrationRecord['status'],
      registeredAt: registration.registeredAt,
      wonAt: registration.wonAt,
      notSelectedAt: registration.notSelectedAt,
      withdrawnAt: registration.withdrawnAt,
      fulfilledAt: registration.fulfilledAt,
      entitlement: registration.entitlements[0]
        ? this.toEntitlement(registration.entitlements[0])
        : null,
    }));
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

  async countReservedOrSoldByUsers(input: {
    ticketTypeId: string;
    userIds: string[];
  }): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (input.userIds.length === 0) return result;

    const items = await this.prisma.orderItem.findMany({
      where: {
        ticketTypeId: input.ticketTypeId,
        order: {
          userId: { in: input.userIds },
          status: { in: ['PENDING_PAYMENT', 'PAID'] },
          orderSourceType: 'DIRECT',
        },
      },
      select: { quantity: true, order: { select: { userId: true } } },
    });

    for (const item of items) {
      const userId = item.order.userId;
      result.set(userId, (result.get(userId) ?? 0) + item.quantity);
    }
    return result;
  }

  async findActiveRegistration(input: {
    userId: string;
    ticketTypeId: string;
  }): Promise<LotteryRegistrationRecord | null> {
    const registration = await this.prisma.lotteryRegistration.findFirst({
      where: {
        userId: input.userId,
        ticketTypeId: input.ticketTypeId,
        status: 'REGISTERED',
      },
    });
    return registration ? this.toRegistration(registration) : null;
  }

  async createRegistration(
    input: CreateLotteryRegistrationInput,
  ): Promise<LotteryRegistrationRecord> {
    const registration = await this.prisma.lotteryRegistration.create({
      data: {
        userId: input.userId,
        concertId: input.concertId,
        ticketTypeId: input.ticketTypeId,
        desiredQuantity: input.desiredQuantity,
        registeredAt: input.registeredAt,
      },
    });
    return this.toRegistration(registration);
  }

  async withdrawRegistration(input: {
    userId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<LotteryRegistrationRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.lotteryRegistration.findFirst({
        where: {
          userId: input.userId,
          ticketTypeId: input.ticketTypeId,
          status: 'REGISTERED',
        },
      });
      if (!registration) return null;

      const updated = await tx.lotteryRegistration.update({
        where: { id: registration.id },
        data: { status: 'WITHDRAWN', withdrawnAt: input.now },
      });
      return this.toRegistration(updated);
    });
  }

  async getStatus(input: {
    userId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<LotteryStatusRecord> {
    const registration = await this.prisma.lotteryRegistration.findFirst({
      where: { userId: input.userId, ticketTypeId: input.ticketTypeId },
      orderBy: { createdAt: 'desc' },
    });

    const config = await this.prisma.lotteryConfig.findUnique({
      where: { ticketTypeId: input.ticketTypeId },
      select: {
        status: true,
        drawAt: true,
        registrationOpensAt: true,
        registrationClosesAt: true,
        entitlementTtlMinutes: true,
      },
    });

    const entitlement = await this.prisma.purchaseEntitlement.findFirst({
      where: {
        userId: input.userId,
        ticketTypeId: input.ticketTypeId,
        source: 'LOTTERY',
        status: 'ACTIVE',
        expiresAt: { gt: input.now },
      },
      orderBy: { grantedAt: 'desc' },
    });

    return {
      registration: registration ? this.toRegistration(registration) : null,
      config: config
        ? {
            status: config.status as LotteryConfigRecord['status'],
            drawAt: config.drawAt,
            registrationOpensAt: config.registrationOpensAt,
            registrationClosesAt: config.registrationClosesAt,
            entitlementTtlMinutes: config.entitlementTtlMinutes,
          }
        : null,
      entitlement: entitlement ? this.toEntitlement(entitlement) : null,
    };
  }

  async sumActiveEntitlementQuantity(ticketTypeId: string, now: Date): Promise<number> {
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

  async listRegisteredForDraw(ticketTypeId: string): Promise<LotteryRegistrationRecord[]> {
    const registrations = await this.prisma.lotteryRegistration.findMany({
      where: { ticketTypeId, status: 'REGISTERED' },
      orderBy: { registeredAt: 'asc' },
    });
    return registrations.map((registration) => this.toRegistration(registration));
  }

  async listDueDrawTicketTypeIds(now: Date): Promise<string[]> {
    const configs = await this.prisma.lotteryConfig.findMany({
      where: { status: 'SCHEDULED', drawAt: { lte: now } },
      select: { ticketTypeId: true },
    });
    return configs.map((config) => config.ticketTypeId);
  }

  async withConfigLock<T>(ticketTypeId: string, work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        `presale-lottery:${ticketTypeId}`,
      );
      return work();
    });
  }

  async beginDraw(ticketTypeId: string): Promise<LotteryConfigRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT id, status FROM lottery_configs WHERE ticket_type_id = $1::uuid FOR UPDATE`,
        ticketTypeId,
      )) as Array<{ id: string; status: string }>;
      const row = rows[0];
      if (!row || row.status !== 'SCHEDULED') return null;

      const config = await tx.lotteryConfig.update({
        where: { id: row.id },
        data: { status: 'DRAWING' },
      });
      return this.toConfig(config);
    });
  }

  async commitDraw(input: CommitDrawInput): Promise<LotteryEntitlementRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      const expiresAt = new Date(input.now.getTime() + input.ttlMinutes * 60 * 1000);
      const granted: LotteryEntitlementRecord[] = [];

      for (const winner of input.winners) {
        const entitlement = await tx.purchaseEntitlement.create({
          data: {
            lotteryRegistrationId: winner.registrationId,
            userId: winner.userId,
            concertId: input.concertId,
            ticketTypeId: input.ticketTypeId,
            source: 'LOTTERY',
            status: 'ACTIVE',
            quantity: winner.quantity,
            grantedAt: input.now,
            expiresAt,
          },
        });
        await tx.lotteryRegistration.update({
          where: { id: winner.registrationId },
          data: { status: 'WON', wonAt: input.now },
        });
        granted.push(this.toEntitlement(entitlement));
      }

      if (input.notSelectedRegistrationIds.length > 0) {
        await tx.lotteryRegistration.updateMany({
          where: { id: { in: input.notSelectedRegistrationIds } },
          data: { status: 'NOT_SELECTED', notSelectedAt: input.now },
        });
      }

      await tx.lotteryDraw.create({
        data: {
          lotteryConfigId: input.configId,
          ticketTypeId: input.ticketTypeId,
          seed: input.seed,
          registrantCount: input.registrantCount,
          winners: input.winners as unknown as object,
          allocationConsumed: input.allocationConsumed,
          executedAt: input.now,
        },
      });

      await tx.lotteryConfig.update({
        where: { id: input.configId },
        data: { status: 'COMPLETED', seed: input.seed, drawnAt: input.now },
      });

      return granted;
    });
  }

  async listActiveEntitlementsExpiringSoon(input: {
    now: Date;
    reminderWindowEndsAt: Date;
    limit: number;
  }): Promise<LotteryEntitlementRecord[]> {
    const entitlements = await this.prisma.purchaseEntitlement.findMany({
      where: {
        source: 'LOTTERY',
        status: 'ACTIVE',
        expiresAt: { gt: input.now, lte: input.reminderWindowEndsAt },
      },
      orderBy: { expiresAt: 'asc' },
      take: input.limit,
    });
    return entitlements.map((entitlement) => this.toEntitlement(entitlement));
  }

  async expireEntitlements(now: Date): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const expired = await tx.purchaseEntitlement.findMany({
        where: { source: 'LOTTERY', status: 'ACTIVE', expiresAt: { lte: now } },
        select: { id: true },
      });
      if (expired.length === 0) return 0;

      await tx.purchaseEntitlement.updateMany({
        where: { id: { in: expired.map((entitlement) => entitlement.id) } },
        data: { status: 'EXPIRED' },
      });
      return expired.length;
    });
  }

  async findEntitlementNotificationContext(
    entitlementId: string,
  ): Promise<LotteryEntitlementNotificationContext | null> {
    const entitlement = await this.prisma.purchaseEntitlement.findUnique({
      where: { id: entitlementId },
      include: {
        user: { select: { email: true, displayName: true } },
        concert: { select: { title: true, slug: true } },
        ticketType: { select: { name: true, code: true } },
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

  async findNotSelectedNotificationContext(
    registrationId: string,
  ): Promise<LotteryNotSelectedNotificationContext | null> {
    const registration = await this.prisma.lotteryRegistration.findUnique({
      where: { id: registrationId },
      include: {
        user: { select: { email: true, displayName: true } },
        concert: { select: { title: true, slug: true } },
        ticketType: { select: { name: true } },
      },
    });
    if (!registration) return null;

    return {
      userId: registration.userId,
      userEmail: registration.user.email,
      userDisplayName: registration.user.displayName,
      concertId: registration.concertId,
      concertTitle: registration.concert.title,
      concertSlug: registration.concert.slug,
      ticketTypeName: registration.ticketType.name,
    };
  }

  private toConfig(config: {
    id: string;
    ticketTypeId: string;
    concertId: string;
    registrationOpensAt: Date;
    registrationClosesAt: Date;
    drawAt: Date;
    allocation: number;
    entitlementTtlMinutes: number;
    status: string;
    seed: string | null;
    drawnAt: Date | null;
  }): LotteryConfigRecord {
    return {
      id: config.id,
      ticketTypeId: config.ticketTypeId,
      concertId: config.concertId,
      registrationOpensAt: config.registrationOpensAt,
      registrationClosesAt: config.registrationClosesAt,
      drawAt: config.drawAt,
      allocation: config.allocation,
      entitlementTtlMinutes: config.entitlementTtlMinutes,
      status: config.status as LotteryConfigRecord['status'],
      seed: config.seed,
      drawnAt: config.drawnAt,
    };
  }

  private toRegistration(registration: {
    id: string;
    userId: string;
    concertId: string;
    ticketTypeId: string;
    desiredQuantity: number;
    status: string;
    registeredAt: Date;
    wonAt: Date | null;
    notSelectedAt: Date | null;
    withdrawnAt: Date | null;
    fulfilledAt: Date | null;
  }): LotteryRegistrationRecord {
    return registration as LotteryRegistrationRecord;
  }

  private toEntitlement(entitlement: {
    id: string;
    lotteryRegistrationId: string | null;
    userId: string;
    concertId: string;
    ticketTypeId: string;
    orderId: string | null;
    status: string;
    quantity: number;
    grantedAt: Date;
    expiresAt: Date;
    consumedAt: Date | null;
    revokedAt: Date | null;
  }): LotteryEntitlementRecord {
    return {
      id: entitlement.id,
      lotteryRegistrationId: entitlement.lotteryRegistrationId,
      userId: entitlement.userId,
      concertId: entitlement.concertId,
      ticketTypeId: entitlement.ticketTypeId,
      orderId: entitlement.orderId,
      status: entitlement.status as LotteryEntitlementRecord['status'],
      quantity: entitlement.quantity,
      grantedAt: entitlement.grantedAt,
      expiresAt: entitlement.expiresAt,
      consumedAt: entitlement.consumedAt,
      revokedAt: entitlement.revokedAt,
    };
  }
}
