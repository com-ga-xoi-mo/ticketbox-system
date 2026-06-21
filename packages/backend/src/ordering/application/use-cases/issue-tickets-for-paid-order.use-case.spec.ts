import { describe, expect, it, vi } from 'vitest';

import {
  TicketIssuanceOrderNotPaidError,
  TicketPartialIssuanceConflictError,
} from '../../domain/errors';
import { OrderStatus } from '../../domain/order-status.enum';
import { QrTicketTokenService } from '../../domain/qr-ticket-token.service';
import { Ticket } from '../../domain/ticket.entity';
import { TicketStatus } from '../../domain/ticket-status.enum';
import type {
  IssueTicketsForPaidOrderData,
  TicketRepositoryPort,
} from '../../domain/ports/ticket-repository.port';
import { IssueTicketsForPaidOrderUseCase } from './issue-tickets-for-paid-order.use-case';

const issuedAt = new Date('2026-06-16T10:30:00.000Z');

function buildRepository(
  handler: (data: IssueTicketsForPaidOrderData) => Promise<Ticket[]>,
): TicketRepositoryPort {
  return {
    issueTicketsForPaidOrder: vi.fn(handler),
    findByUserId: vi.fn(),
    findByUserIdAndId: vi.fn(),
  };
}

describe('IssueTicketsForPaidOrderUseCase', () => {
  it('creates one issued ticket per order item quantity and returns QR payloads', async () => {
    const tokenService = new QrTicketTokenService('secret');
    const repository = buildRepository(async (data) => {
      const plans = data.createTickets({
        id: 'order-1',
        orderNumber: 'ORD-20260616-ABC123',
        userId: 'user-1',
        concertId: 'concert-1',
        status: OrderStatus.PAID,
        items: [
          { id: 'order-item-1', ticketTypeId: 'ticket-type-1', quantity: 2 },
        ],
      });

      return plans.map(
        (plan) =>
          new Ticket({
            id: plan.id,
            ticketNumber: plan.ticketNumber,
            orderId: 'order-1',
            orderItemId: plan.orderItemId,
            userId: 'user-1',
            concertId: 'concert-1',
            ticketTypeId: plan.ticketTypeId,
            qrTokenHash: plan.qrTokenHash,
            status: TicketStatus.ISSUED,
            issuedAt: plan.issuedAt,
          }),
      );
    });
    const useCase = new IssueTicketsForPaidOrderUseCase(repository, tokenService);

    const result = await useCase.execute({ orderId: 'order-1', issuedAt });

    expect(result).toHaveLength(2);
    expect(result.map(({ ticket }) => ticket.ticketNumber)).toEqual([
      'TCK-ORD-20260616-ABC123-001',
      'TCK-ORD-20260616-ABC123-002',
    ]);
    for (const issuedTicket of result) {
      expect(issuedTicket.ticket.qrTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(issuedTicket.ticket.qrTokenHash).not.toBe(issuedTicket.qrPayload);
    }
  });

  it('returns existing fully issued tickets without requiring new ticket plans', async () => {
    const tokenService = new QrTicketTokenService('secret');
    const repository = buildRepository(async () => [
      new Ticket({
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
      }),
    ]);
    const useCase = new IssueTicketsForPaidOrderUseCase(repository, tokenService);

    const result = await useCase.execute({ orderId: 'order-1' });

    expect(result).toHaveLength(1);
    expect(result[0].ticket.id).toBe('ticket-1');
    expect(result[0].qrPayload).toContain('.');
  });

  it('rejects non-paid orders before creating plans', async () => {
    const tokenService = new QrTicketTokenService('secret');
    const repository = buildRepository(async (data) => {
      data.createTickets({
        id: 'order-1',
        orderNumber: 'ORD-20260616-ABC123',
        userId: 'user-1',
        concertId: 'concert-1',
        status: OrderStatus.PENDING_PAYMENT,
        items: [{ id: 'order-item-1', ticketTypeId: 'ticket-type-1', quantity: 1 }],
      });
      return [];
    });
    const useCase = new IssueTicketsForPaidOrderUseCase(repository, tokenService);

    await expect(useCase.execute({ orderId: 'order-1' })).rejects.toThrow(
      TicketIssuanceOrderNotPaidError,
    );
  });

  it('fails fast if generated plans do not match expected item quantity', async () => {
    const tokenService = new QrTicketTokenService('secret');
    const repository = buildRepository(async (data) => {
      data.createTickets({
        id: 'order-1',
        orderNumber: 'ORD-20260616-ABC123',
        userId: 'user-1',
        concertId: 'concert-1',
        status: OrderStatus.PAID,
        items: [{ id: 'order-item-1', ticketTypeId: 'ticket-type-1', quantity: -1 }],
      });
      return [];
    });
    const useCase = new IssueTicketsForPaidOrderUseCase(repository, tokenService);

    await expect(useCase.execute({ orderId: 'order-1' })).rejects.toThrow(
      TicketPartialIssuanceConflictError,
    );
  });
});
