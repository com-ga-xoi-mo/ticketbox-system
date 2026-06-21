import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import {
  InsufficientTicketInventoryError,
  InventoryReservationConflictError,
  OrderNotFoundError,
  PerUserTicketLimitExceededError,
  TicketNotFoundError,
  TicketTypeInactiveError,
  TicketTypeNotFoundError,
  TicketTypeSaleWindowError,
} from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import { TicketStatus } from '../../domain/ticket-status.enum';
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
  let listUserTicketsUseCase: { execute: ReturnType<typeof vi.fn> };
  let getUserTicketUseCase: { execute: ReturnType<typeof vi.fn> };
  const request = { user: { id: 'user-1', roles: [Role.AUDIENCE] } };

  beforeEach(() => {
    createOrderUseCase = { execute: vi.fn() };
    getOrderUseCase = { execute: vi.fn() };
    listUserOrdersUseCase = { execute: vi.fn() };
    listUserTicketsUseCase = { execute: vi.fn() };
    getUserTicketUseCase = { execute: vi.fn() };
    controller = new OrderController(
      createOrderUseCase as never,
      getOrderUseCase as never,
      listUserOrdersUseCase as never,
      listUserTicketsUseCase as never,
      getUserTicketUseCase as never,
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

  it.each([
    new TicketTypeInactiveError('ticket-type-1'),
    new TicketTypeSaleWindowError('ticket-type-1'),
  ])('maps invalid ticket type sale state to 400', async (error) => {
    createOrderUseCase.execute.mockRejectedValue(error);

    await expect(
      controller.createOrder(
        {
          concertId: 'concert-1',
          idempotencyKey: 'idem-1',
          items: [{ ticketTypeId: 'ticket-type-1', quantity: 2 }],
        },
        request,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    new InsufficientTicketInventoryError('ticket-type-1', 2),
    new InventoryReservationConflictError('order-1'),
    new PerUserTicketLimitExceededError('ticket-type-1', 2, 1, 2),
  ])('maps inventory reservation conflicts to 409', async (error) => {
    createOrderUseCase.execute.mockRejectedValue(error);

    await expect(
      controller.createOrder(
        {
          concertId: 'concert-1',
          idempotencyKey: 'idem-1',
          items: [{ ticketTypeId: 'ticket-type-1', quantity: 2 }],
        },
        request,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('lists current user orders', async () => {
    listUserOrdersUseCase.execute.mockResolvedValue([buildOrder()]);

    const result = await controller.listMyOrders(request);

    expect(listUserOrdersUseCase.execute).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result).toHaveLength(1);
  });

  it('lists current user tickets', async () => {
    listUserTicketsUseCase.execute.mockResolvedValue([
      {
        id: 'ticket-1',
        ticketNumber: 'TCK-ORD-001',
        orderId: 'order-1',
        orderNumber: 'ORD-20260616-ABC123',
        userId: 'user-1',
        concertId: 'concert-1',
        concertTitle: 'Concert',
        concertStartsAt: new Date('2026-07-01T12:00:00.000Z'),
        ticketTypeId: 'ticket-type-1',
        ticketTypeName: 'VIP',
        ticketTypeCode: 'VIP',
        status: TicketStatus.ISSUED,
        issuedAt: new Date('2026-06-16T10:30:00.000Z'),
        checkedInAt: null,
      },
    ]);

    const result = await controller.listMyTickets(request);

    expect(listUserTicketsUseCase.execute).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'ticket-1',
        concertStartsAt: '2026-07-01T12:00:00.000Z',
        issuedAt: '2026-06-16T10:30:00.000Z',
      }),
    ]);
  });

  it('gets current user ticket detail with QR payload', async () => {
    getUserTicketUseCase.execute.mockResolvedValue({
      id: 'ticket-1',
      ticketNumber: 'TCK-ORD-001',
      orderId: 'order-1',
      orderNumber: 'ORD-20260616-ABC123',
      userId: 'user-1',
      concertId: 'concert-1',
      concertTitle: 'Concert',
      concertStartsAt: new Date('2026-07-01T12:00:00.000Z'),
      ticketTypeId: 'ticket-type-1',
      ticketTypeName: 'VIP',
      ticketTypeCode: 'VIP',
      status: TicketStatus.ISSUED,
      issuedAt: new Date('2026-06-16T10:30:00.000Z'),
      checkedInAt: null,
      qrPayload: 'signed.qr.payload',
    });

    const result = await controller.getMyTicket('ticket-1', request);

    expect(getUserTicketUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      ticketId: 'ticket-1',
    });
    expect(result).toMatchObject({
      id: 'ticket-1',
      qrPayload: 'signed.qr.payload',
    });
  });

  it('maps missing or non-owned ticket detail errors to 404', async () => {
    getUserTicketUseCase.execute.mockRejectedValue(new TicketNotFoundError('ticket-1'));

    await expect(controller.getMyTicket('ticket-1', request)).rejects.toThrow(
      NotFoundException,
    );
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
