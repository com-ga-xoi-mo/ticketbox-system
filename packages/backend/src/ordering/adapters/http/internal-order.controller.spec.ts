import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InvalidOrderTransitionError,
  OrderConflictError,
  OrderNotFoundError,
} from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { InternalOrderController } from './internal-order.controller';

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
        ticketTypeName: 'Mock Ticket', ticketTypeId: 'ticket-type-1',
        quantity: 2,
        unitPriceVnd: 150000,
        totalPriceVnd: 300000,
      }),
    ],
    ...overrides,
  });
}

describe('InternalOrderController', () => {
  let controller: InternalOrderController;
  let transitionOrderStatusUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transitionOrderStatusUseCase = { execute: vi.fn() };
    controller = new InternalOrderController(transitionOrderStatusUseCase as never);
  });

  it('uses InternalApiKeyGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, InternalOrderController);

    expect(guards).toEqual([InternalApiKeyGuard]);
  });

  it('transitions order status through the internal endpoint', async () => {
    transitionOrderStatusUseCase.execute.mockResolvedValue(
      buildOrder({ status: OrderStatus.PAID }),
    );

    const result = await controller.transitionStatus('order-1', {
      status: OrderStatus.PAID,
    });

    expect(transitionOrderStatusUseCase.execute).toHaveBeenCalledWith({
      orderId: 'order-1',
      status: OrderStatus.PAID,
      skipOwnershipCheck: true,
    });
    expect(result).toMatchObject({ status: OrderStatus.PAID });
    expect(result).not.toHaveProperty('domainEvents');
  });

  it('maps not found to 404', async () => {
    transitionOrderStatusUseCase.execute.mockRejectedValue(
      new OrderNotFoundError('order-1'),
    );

    await expect(
      controller.transitionStatus('order-1', { status: OrderStatus.PAID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps invalid transitions to 400', async () => {
    transitionOrderStatusUseCase.execute.mockRejectedValue(
      new InvalidOrderTransitionError(OrderStatus.EXPIRED, OrderStatus.PAID),
    );

    await expect(
      controller.transitionStatus('order-1', { status: OrderStatus.PAID }),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps optimistic lock conflicts to 409', async () => {
    transitionOrderStatusUseCase.execute.mockRejectedValue(
      new OrderConflictError('order-1'),
    );

    await expect(
      controller.transitionStatus('order-1', { status: OrderStatus.PAID }),
    ).rejects.toThrow(ConflictException);
  });
});
