import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OrderStatus as PrismaOrderStatus,
  TicketStatus as PrismaTicketStatus,
} from '@prisma/client';

import type { PrismaService } from '../../../platform/database/prisma.service';
import { PrismaPurchaseConfirmationTicketReadAdapter } from './prisma-purchase-confirmation-ticket-read.adapter';

describe('PrismaPurchaseConfirmationTicketReadAdapter', () => {
  const findMany = vi.fn();
  const prisma = {
    ticket: { findMany },
  } as unknown as PrismaService;
  const adapter = new PrismaPurchaseConfirmationTicketReadAdapter(prisma);

  beforeEach(() => {
    findMany.mockReset();
  });

  it('loads paid-order tickets in deterministic ticket-number order', async () => {
    findMany.mockResolvedValue([
      {
        id: 'ticket-1',
        ticketNumber: 'TCK-001',
        orderId: 'order-1',
        userId: 'user-1',
        concertId: 'concert-1',
        issuedAt: new Date('2026-06-24T01:00:00.000Z'),
        concert: {
          title: 'TicketBox Live',
          startsAt: new Date('2026-07-01T12:00:00.000Z'),
        },
        ticketType: { name: 'VIP' },
      },
      {
        id: 'ticket-2',
        ticketNumber: 'TCK-002',
        orderId: 'order-1',
        userId: 'user-1',
        concertId: 'concert-1',
        issuedAt: new Date('2026-06-24T01:00:00.000Z'),
        concert: {
          title: 'TicketBox Live',
          startsAt: new Date('2026-07-01T12:00:00.000Z'),
        },
        ticketType: { name: 'VIP' },
      },
    ]);

    const result = await adapter.findIssuedTicketsByPaidOrderId('order-1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orderId: 'order-1',
          order: { status: PrismaOrderStatus.PAID },
          status: {
            in: [PrismaTicketStatus.ISSUED, PrismaTicketStatus.CHECKED_IN],
          },
        },
        orderBy: { ticketNumber: 'asc' },
      }),
    );
    expect(result.map((ticket) => ticket.ticketNumber)).toEqual(['TCK-001', 'TCK-002']);
    expect(result[0]).toMatchObject({
      ticketTypeName: 'VIP',
      concertTitle: 'TicketBox Live',
    });
  });

  it.each([
    ['missing order', []],
    ['unpaid order', []],
    ['order without issued tickets', []],
  ])('returns no delivery data for %s', async (_caseName, rows) => {
    findMany.mockResolvedValue(rows);

    await expect(adapter.findIssuedTicketsByPaidOrderId('order-1')).resolves.toEqual([]);
  });
});
