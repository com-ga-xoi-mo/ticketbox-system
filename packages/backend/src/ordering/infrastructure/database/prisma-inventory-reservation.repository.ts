import { Injectable } from '@nestjs/common';
import { Prisma, TicketTypeStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import {
  InsufficientTicketInventoryError,
  InventoryReservationConflictError,
  OrderConflictError,
  TicketTypeInactiveError,
  TicketTypeNotFoundError,
  TicketTypeSaleWindowError,
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
          include: { items: true },
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
          include: { items: true },
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
          include: { items: true },
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
      const order = await tx.order.findUnique({
        where: { id: data.orderId },
        include: { items: true },
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
        include: { items: true },
      });

      if (!updatedOrder) {
        throw new OrderConflictError(data.orderId);
      }

      return this.toDomain(updatedOrder);
    });
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
            quantity: item.quantity,
            unitPriceVnd: item.unitPriceVnd,
            totalPriceVnd: item.totalPriceVnd,
          }),
      ),
    });
  }
}
