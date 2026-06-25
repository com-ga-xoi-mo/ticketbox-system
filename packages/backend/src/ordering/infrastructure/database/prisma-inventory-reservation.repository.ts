import { Injectable } from '@nestjs/common';
import { Prisma, TicketTypeStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import {
  InsufficientTicketInventoryError,
  InventoryReservationConflictError,
  OrderConflictError,
  PaidOrderExpirationSkippedError,
  SuccessfulPaymentRequiredError,
  TicketTypeInactiveError,
  TicketTypeNotFoundError,
  TicketTypeSaleWindowError,
  PerUserTicketLimitExceededError,
} from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type {
  InventoryAdjustmentData,
  IInventoryAdjustmentRepository,
} from '../../domain/ports/inventory-adjustment.port';
import type { IInventoryReservationRepository } from '../../domain/ports/inventory-reservation.port';

interface LockedTicketTypeRecord {
  id: string;
  concertId: string;
  priceVnd: number;
  totalQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  maxPerUser: number;
  saleStartsAt: Date;
  saleEndsAt: Date;
  status: TicketTypeStatus;
}

interface PrismaOrderWithItems {
  id: string;
  orderNumber: string;
  userId: string;
  concertId: string;
  idempotencyKey: string | null;
  status: string;
  totalAmountVnd: number;
  reservationExpiresAt: Date | null;
  paidAt: Date | null;
  expiredAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    ticketTypeId: string;
    quantity: number;
    unitPriceVnd: number;
    totalPriceVnd: number;
    ticketType: {
      name: string;
    };
  }>;
}

@Injectable()
export class PrismaInventoryReservationRepository
  implements IInventoryReservationRepository, IInventoryAdjustmentRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async reserve(order: Order): Promise<Order> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingOrder = await tx.order.findUnique({
          where: {
            userId_idempotencyKey: {
              userId: order.userId,
              idempotencyKey: order.idempotencyKey ?? '',
            },
          },
          include: { items: { include: { ticketType: true } } },
        });

        if (existingOrder) {
          return this.toDomain(existingOrder);
        }

        const requestedQuantities = this.quantityByTicketType(order);
        const lockedTicketTypes = await this.lockTicketTypes(
          tx,
          order.concertId,
          [...requestedQuantities.keys()],
        );

        this.validateLockedTicketTypes({
          ticketTypes: lockedTicketTypes,
          requestedQuantities,
          concertId: order.concertId,
          now: order.createdAt,
        });

        const existingUserQuantities = await this.findUserQuantitiesByTicketType(
          tx,
          order.userId,
          [...requestedQuantities.keys()],
          order.createdAt,
        );

        this.validatePerUserTicketLimits({
          ticketTypes: lockedTicketTypes,
          requestedQuantities,
          existingUserQuantities,
        });

        const createdOrder = await tx.order.create({
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            userId: order.userId,
            concertId: order.concertId,
            idempotencyKey: order.idempotencyKey,
            status: order.status,
            totalAmountVnd: order.totalAmountVnd,
            reservationExpiresAt: order.reservationExpiresAt,
            paidAt: order.paidAt,
            expiredAt: order.expiredAt,
            cancelledAt: order.cancelledAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: {
              create: order.items.map((item) => ({
                id: item.id,
                ticketTypeId: item.ticketTypeId,
                quantity: item.quantity,
                unitPriceVnd: item.unitPriceVnd,
                totalPriceVnd: item.totalPriceVnd,
              })),
            },
          },
          include: { items: { include: { ticketType: true } } },
        });

        for (const [ticketTypeId, quantity] of requestedQuantities) {
          await tx.ticketType.update({
            where: { id: ticketTypeId },
            data: {
              reservedQuantity: {
                increment: quantity,
              },
            },
          });
        }

        return this.toDomain(createdOrder);
      });
    } catch (err: unknown) {
      if (this.isUniqueConstraintError(err)) {
        const existingOrder = await this.prisma.order.findUnique({
          where: {
            userId_idempotencyKey: {
              userId: order.userId,
              idempotencyKey: order.idempotencyKey ?? '',
            },
          },
          include: { items: { include: { ticketType: true } } },
        });

        if (existingOrder) {
          return this.toDomain(existingOrder);
        }
      }

      throw err;
    }
  }

  async applyStatusTransition(data: InventoryAdjustmentData): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOrder(tx, data.orderId);
      const order = await tx.order.findUnique({
        where: { id: data.orderId },
        include: { items: { include: { ticketType: true } } },
      });

      if (!order || order.status !== data.expectedStatus) {
        throw new OrderConflictError(data.orderId);
      }

      const quantities = new Map<string, number>();
      for (const item of order.items) {
        quantities.set(
          item.ticketTypeId,
          (quantities.get(item.ticketTypeId) ?? 0) + item.quantity,
        );
      }
      await this.lockTicketTypesForAdjustment(
        tx,
        data.orderId,
        [...quantities.keys()],
      );

      if (data.nextStatus === OrderStatus.EXPIRED) {
        const successfulPayment = await tx.payment.findFirst({
          where: {
            orderId: data.orderId,
            status: 'SUCCEEDED',
          },
          select: { id: true },
        });
        if (successfulPayment) {
          throw new PaidOrderExpirationSkippedError(
            data.orderId,
            successfulPayment.id,
          );
        }
      }

      if (data.nextStatus === OrderStatus.PAID) {
        const successfulPayment = await tx.payment.findFirst({
          where: {
            orderId: data.orderId,
            status: 'SUCCEEDED',
          },
          select: { id: true },
        });
        if (!successfulPayment) {
          throw new SuccessfulPaymentRequiredError(data.orderId);
        }
      }

      const orderUpdateResult = await tx.order.updateMany({
        where: {
          id: data.orderId,
          status: data.expectedStatus,
        },
        data: {
          status: data.nextStatus,
          updatedAt: data.updatedAt,
          paidAt: data.paidAt,
          expiredAt: data.expiredAt,
          cancelledAt: data.cancelledAt,
        },
      });

      if (orderUpdateResult.count !== 1) {
        throw new OrderConflictError(data.orderId);
      }

      for (const [ticketTypeId, quantity] of quantities) {
        const updateResult = await tx.ticketType.updateMany({
          where: {
            id: ticketTypeId,
            reservedQuantity: { gte: quantity },
          },
          data:
            data.nextStatus === OrderStatus.PAID
              ? {
                  reservedQuantity: { decrement: quantity },
                  soldQuantity: { increment: quantity },
                }
              : {
                  reservedQuantity: { decrement: quantity },
                },
        });

        if (updateResult.count !== 1) {
          throw new InventoryReservationConflictError(data.orderId);
        }
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id: data.orderId },
        include: { items: { include: { ticketType: true } } },
      });

      if (!updatedOrder) {
        throw new OrderConflictError(data.orderId);
      }

      return this.toDomain(updatedOrder);
    });
  }

  private async lockOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM orders
      WHERE id = ${orderId}::uuid
      FOR UPDATE
    `;
    if (rows.length === 0) {
      throw new OrderConflictError(orderId);
    }
  }

  private async lockTicketTypesForAdjustment(
    tx: Prisma.TransactionClient,
    orderId: string,
    ticketTypeIds: string[],
  ): Promise<void> {
    const sortedIds = [...new Set(ticketTypeIds)].sort();
    if (sortedIds.length === 0) return;

    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM ticket_types
      WHERE id IN (${Prisma.join(sortedIds.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY id
      FOR UPDATE
    `;
    if (rows.length !== sortedIds.length) {
      throw new InventoryReservationConflictError(orderId);
    }
  }

  private async lockTicketTypes(
    tx: Prisma.TransactionClient,
    concertId: string,
    ticketTypeIds: string[],
  ): Promise<LockedTicketTypeRecord[]> {
    const sortedTicketTypeIds = [...new Set(ticketTypeIds)].sort();
    if (sortedTicketTypeIds.length === 0) {
      return [];
    }

    return tx.$queryRaw<LockedTicketTypeRecord[]>`
      SELECT
        id,
        concert_id AS "concertId",
        price_vnd AS "priceVnd",
        total_quantity AS "totalQuantity",
        reserved_quantity AS "reservedQuantity",
        sold_quantity AS "soldQuantity",
        max_per_user AS "maxPerUser",
        sale_starts_at AS "saleStartsAt",
        sale_ends_at AS "saleEndsAt",
        status
      FROM ticket_types
      WHERE concert_id = ${concertId}::uuid
        AND id IN (${Prisma.join(sortedTicketTypeIds.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY id
      FOR UPDATE
    `;
  }

  private validateLockedTicketTypes(params: {
    ticketTypes: LockedTicketTypeRecord[];
    requestedQuantities: Map<string, number>;
    concertId: string;
    now: Date;
  }): void {
    const ticketTypeById = new Map(
      params.ticketTypes.map((ticketType) => [ticketType.id, ticketType]),
    );

    for (const [ticketTypeId, requestedQuantity] of params.requestedQuantities) {
      const ticketType = ticketTypeById.get(ticketTypeId);
      if (!ticketType || ticketType.concertId !== params.concertId) {
        throw new TicketTypeNotFoundError(params.concertId, ticketTypeId);
      }

      if (ticketType.status !== TicketTypeStatus.ACTIVE) {
        throw new TicketTypeInactiveError(ticketTypeId);
      }

      if (params.now < ticketType.saleStartsAt || params.now > ticketType.saleEndsAt) {
        throw new TicketTypeSaleWindowError(ticketTypeId);
      }

      const remainingQuantity =
        ticketType.totalQuantity -
        ticketType.soldQuantity -
        ticketType.reservedQuantity;

      if (requestedQuantity > remainingQuantity) {
        throw new InsufficientTicketInventoryError(ticketTypeId, requestedQuantity);
      }
    }
  }

  private async findUserQuantitiesByTicketType(
    tx: Prisma.TransactionClient,
    userId: string,
    ticketTypeIds: string[],
    now: Date,
  ): Promise<Map<string, number>> {
    const groupedQuantities = await tx.orderItem.groupBy({
      by: ['ticketTypeId'],
      where: {
        ticketTypeId: {
          in: ticketTypeIds,
        },
        order: {
          userId,
          OR: [
            { status: OrderStatus.PAID },
            {
              status: OrderStatus.PENDING_PAYMENT,
              reservationExpiresAt: {
                gt: now,
              },
            },
          ],
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return new Map(
      groupedQuantities.map((quantity) => [
        quantity.ticketTypeId,
        quantity._sum.quantity ?? 0,
      ]),
    );
  }

  private validatePerUserTicketLimits(params: {
    ticketTypes: LockedTicketTypeRecord[];
    requestedQuantities: Map<string, number>;
    existingUserQuantities: Map<string, number>;
  }): void {
    const ticketTypeById = new Map(
      params.ticketTypes.map((ticketType) => [ticketType.id, ticketType]),
    );

    for (const [ticketTypeId, requestedQuantity] of params.requestedQuantities) {
      const ticketType = ticketTypeById.get(ticketTypeId);
      if (!ticketType) {
        continue;
      }

      const existingQuantity = params.existingUserQuantities.get(ticketTypeId) ?? 0;
      if (existingQuantity + requestedQuantity > ticketType.maxPerUser) {
        throw new PerUserTicketLimitExceededError(
          ticketTypeId,
          ticketType.maxPerUser,
          existingQuantity,
          requestedQuantity,
        );
      }
    }
  }

  private quantityByTicketType(order: Order): Map<string, number> {
    const quantities = new Map<string, number>();
    for (const item of order.items) {
      quantities.set(
        item.ticketTypeId,
        (quantities.get(item.ticketTypeId) ?? 0) + item.quantity,
      );
    }
    return quantities;
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
  }

  private toDomain(order: PrismaOrderWithItems): Order {
    return new Order({
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      concertId: order.concertId,
      idempotencyKey: order.idempotencyKey,
      status: order.status as OrderStatus,
      totalAmountVnd: order.totalAmountVnd,
      reservationExpiresAt: order.reservationExpiresAt,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map(
        (item) =>
          new OrderItem({
            id: item.id,
            ticketTypeId: item.ticketTypeId,
            ticketTypeName: item.ticketType.name,
            quantity: item.quantity,
            unitPriceVnd: item.unitPriceVnd,
            totalPriceVnd: item.totalPriceVnd,
          }),
      ),
    });
  }
}
