import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import { OrderConflictError } from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type {
  IOrderRepository,
  UpdateOrderStatusData,
} from '../../domain/ports/order-repository.port';

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
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(order: Order): Promise<Order> {
    const created = await this.prisma.order.create({
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

    return this.toDomain(created);
  }

  async findById(orderId: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { ticketType: true } } },
    });

    return order ? this.toDomain(order) : null;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { ticketType: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toDomain(order));
  }

  async findByUserIdAndIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
      include: { items: { include: { ticketType: true } } },
    });

    return order ? this.toDomain(order) : null;
  }

  async updateStatus(data: UpdateOrderStatusData): Promise<Order> {
    const result = await this.prisma.order.updateMany({
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

    if (result.count !== 1) {
      throw new OrderConflictError(data.orderId);
    }

    const updatedOrder = await this.findById(data.orderId);
    if (!updatedOrder) {
      throw new OrderConflictError(data.orderId);
    }

    return updatedOrder;
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
