import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import {
  OrderNotFoundError,
  TicketTypeNotFoundError,
} from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import { OrderController } from './order.controller';

function buildOrder(overrides: Partial<ConstructorParameters<typeof Order>[0]> = {}) {
  return new Order({
    id: 'order-1',
    orderNumber: 'ORD-20260616-ABC123',
    userId: 'user-1',
    concertId: 'concert-1',
    idempotencyKey: 'idem-1',
    status: OrderStatus.PENDING_PAYMENT,
    totalAmountVnd: 300000,
    reservationExpiresAt: new Date('2026-06-16T10:15:00.000Z'),
    createdAt: new Date('2026-06-16T10:00:00.000Z'),
    updatedAt: new Date('2026-06-16T10:00:00.000Z'),
    items: [
      new OrderItem({
        id: 'order-item-1',
        ticketTypeId: 'ticket-type-1',
        quantity: 2,
        unitPriceVnd: 150000,
        totalPriceVnd: 300000,
      }),
    ],
    ...overrides,
  });
}

describe('OrderController', () => {
  let controller: OrderController;
  let createOrderUseCase: { execute: ReturnType<typeof vi.fn> };
  let getOrderUseCase: { execute: ReturnType<typeof vi.fn> };
  let listUserOrdersUseCase: { execute: ReturnType<typeof vi.fn> };
  const request = { user: { id: 'user-1', roles: [Role.AUDIENCE] } };

  beforeEach(() => {
    createOrderUseCase = { execute: vi.fn() };
    getOrderUseCase = { execute: vi.fn() };
    listUserOrdersUseCase = { execute: vi.fn() };
    controller = new OrderController(
      createOrderUseCase as never,
      getOrderUseCase as never,
      listUserOrdersUseCase as never,
    );
  });

  it('uses JwtAuthGuard and RolesGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, OrderController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('creates an order for the authenticated user', async () => {
    createOrderUseCase.execute.mockResolvedValue(buildOrder());

    const result = await controller.createOrder(
      {
        concertId: 'concert-1',
        idempotencyKey: 'idem-1',
        items: [{ ticketTypeId: 'ticket-type-1', quantity: 2 }],
      },
      request,
    );

    expect(createOrderUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      concertId: 'concert-1',
      idempotencyKey: 'idem-1',
      items: [{ ticketTypeId: 'ticket-type-1', quantity: 2 }],
    });
    expect(result).toMatchObject({ id: 'order-1', totalAmountVnd: 300000 });
    expect(result).not.toHaveProperty('domainEvents');
  });

  it('maps missing ticket type pricing to 404', async () => {
    createOrderUseCase.execute.mockRejectedValue(
      new TicketTypeNotFoundError('concert-1', 'ticket-type-1'),
    );

    await expect(
      controller.createOrder(
        {
          concertId: 'concert-1',
          idempotencyKey: 'idem-1',
          items: [{ ticketTypeId: 'ticket-type-1', quantity: 2 }],
        },
        request,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('lists current user orders', async () => {
    listUserOrdersUseCase.execute.mockResolvedValue([buildOrder()]);

    const result = await controller.listMyOrders(request);

    expect(listUserOrdersUseCase.execute).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result).toHaveLength(1);
  });

  it('gets current user order detail', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder());

    const result = await controller.getMyOrder('order-1', request);

    expect(getOrderUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      orderId: 'order-1',
    });
    expect(result).toMatchObject({ id: 'order-1' });
  });

  it('maps not-found order detail errors to 404', async () => {
    getOrderUseCase.execute.mockRejectedValue(new OrderNotFoundError('order-1'));

    await expect(controller.getMyOrder('order-1', request)).rejects.toThrow(
      NotFoundException,
    );
  });
});
