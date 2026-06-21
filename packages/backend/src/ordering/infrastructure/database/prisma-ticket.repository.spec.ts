import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TicketIssuanceOrderNotPaidError,
  TicketPartialIssuanceConflictError,
} from '../../domain/errors';
import { OrderStatus } from '../../domain/order-status.enum';
import { Ticket } from '../../domain/ticket.entity';
import { TicketStatus } from '../../domain/ticket-status.enum';
import { PrismaTicketRepository } from './prisma-ticket.repository';

const issuedAt = new Date('2026-06-16T10:30:00.000Z');

function buildPrismaTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    ticketNumber: 'TCK-ORD-20260616-ABC123-001',
    orderId: 'order-1',
    orderItemId: 'order-item-1',
    userId: 'user-1',
    concertId: 'concert-1',
    ticketTypeId: 'ticket-type-1',
    qrTokenHash: 'hash',
    status: TicketStatus.ISSUED,
    issuedAt,
    checkedInAt: null,
    voidedAt: null,
    ...overrides,
  };
}

function buildPaidOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-20260616-ABC123',
    userId: 'user-1',
    concertId: 'concert-1',
    status: OrderStatus.PAID,
    items: [
      {
        id: 'order-item-1',
        ticketTypeId: 'ticket-type-1',
        quantity: 2,
      },
    ],
    tickets: [],
    ...overrides,
  };
}

function buildTicketSummary(overrides: Record<string, unknown> = {}) {
  return {
    ...buildPrismaTicket(),
    order: { orderNumber: 'ORD-20260616-ABC123' },
    concert: {
      title: 'Concert',
      startsAt: new Date('2026-07-01T12:00:00.000Z'),
    },
    ticketType: {
      name: 'VIP',
      code: 'VIP',
    },
    ...overrides,
  };
}

describe('PrismaTicketRepository', () => {
  let tx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    order: { findUnique: ReturnType<typeof vi.fn> };
    ticket: { create: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    ticket: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaTicketRepository;

  beforeEach(() => {
    tx = {
      $queryRaw: vi.fn(),
      order: { findUnique: vi.fn() },
      ticket: { create: vi.fn() },
    };
    prisma = {
      $transaction: vi.fn((callback) => callback(tx)),
      ticket: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    };
    repository = new PrismaTicketRepository(prisma as never);
    tx.$queryRaw.mockResolvedValue([{ id: 'order-1' }]);
  });

  it('locks a paid order and inserts one ticket per requested quantity', async () => {
    tx.order.findUnique.mockResolvedValue(buildPaidOrder());
    tx.ticket.create
      .mockResolvedValueOnce(buildPrismaTicket({ id: 'ticket-1' }))
      .mockResolvedValueOnce(
        buildPrismaTicket({
          id: 'ticket-2',
          ticketNumber: 'TCK-ORD-20260616-ABC123-002',
        }),
      );

    const result = await repository.issueTicketsForPaidOrder({
      orderId: 'order-1',
      createTickets: () => [
        {
          id: 'ticket-1',
          ticketNumber: 'TCK-ORD-20260616-ABC123-001',
          orderItemId: 'order-item-1',
          ticketTypeId: 'ticket-type-1',
          qrTokenHash: 'hash-1',
          issuedAt,
        },
        {
          id: 'ticket-2',
          ticketNumber: 'TCK-ORD-20260616-ABC123-002',
          orderItemId: 'order-item-1',
          ticketTypeId: 'ticket-type-1',
          qrTokenHash: 'hash-2',
          issuedAt,
        },
      ],
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.ticket.create).toHaveBeenCalledTimes(2);
    expect(tx.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'ticket-1',
        orderId: 'order-1',
        status: TicketStatus.ISSUED,
        qrTokenHash: 'hash-1',
      }),
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(Ticket);
  });

  it('returns existing tickets for a fully issued order without creating duplicates', async () => {
    const createTickets = vi.fn();
    tx.order.findUnique.mockResolvedValue(
      buildPaidOrder({
        tickets: [
          buildPrismaTicket({ id: 'ticket-1' }),
          buildPrismaTicket({
            id: 'ticket-2',
            ticketNumber: 'TCK-ORD-20260616-ABC123-002',
          }),
        ],
      }),
    );

    const result = await repository.issueTicketsForPaidOrder({
      orderId: 'order-1',
      createTickets,
    });

    expect(result).toHaveLength(2);
    expect(createTickets).not.toHaveBeenCalled();
    expect(tx.ticket.create).not.toHaveBeenCalled();
  });

  it('fails fast when an order has a partial ticket set', async () => {
    tx.order.findUnique.mockResolvedValue(
      buildPaidOrder({
        tickets: [buildPrismaTicket()],
      }),
    );

    await expect(
      repository.issueTicketsForPaidOrder({
        orderId: 'order-1',
        createTickets: vi.fn(),
      }),
    ).rejects.toThrow(TicketPartialIssuanceConflictError);

    expect(tx.ticket.create).not.toHaveBeenCalled();
  });

  it('rejects non-paid orders', async () => {
    tx.order.findUnique.mockResolvedValue(
      buildPaidOrder({ status: OrderStatus.PENDING_PAYMENT }),
    );

    await expect(
      repository.issueTicketsForPaidOrder({
        orderId: 'order-1',
        createTickets: vi.fn(),
      }),
    ).rejects.toThrow(TicketIssuanceOrderNotPaidError);
  });

  it('queries ticket summaries scoped by owner', async () => {
    prisma.ticket.findMany.mockResolvedValue([buildTicketSummary()]);

    const result = await repository.findByUserId('user-1');

    expect(prisma.ticket.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: expect.any(Object),
      orderBy: { issuedAt: 'desc' },
    });
    expect(result[0]).toMatchObject({
      id: 'ticket-1',
      orderNumber: 'ORD-20260616-ABC123',
      concertTitle: 'Concert',
      ticketTypeCode: 'VIP',
    });
  });

  it('queries ticket detail by ticket id and owner id', async () => {
    prisma.ticket.findFirst.mockResolvedValue(buildTicketSummary());

    const result = await repository.findByUserIdAndId('user-1', 'ticket-1');

    expect(prisma.ticket.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'ticket-1',
        userId: 'user-1',
      },
      include: expect.any(Object),
    });
    expect(result?.id).toBe('ticket-1');
  });
});
