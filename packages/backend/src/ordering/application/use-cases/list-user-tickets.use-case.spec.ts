import { describe, expect, it, vi } from 'vitest';

import { TicketStatus } from '../../domain/ticket-status.enum';
import type { TicketRepositoryPort } from '../../domain/ports/ticket-repository.port';
import { ListUserTicketsUseCase } from './list-user-tickets.use-case';

describe('ListUserTicketsUseCase', () => {
  it('lists tickets scoped to the current user', async () => {
    const repository: TicketRepositoryPort = {
      issueTicketsForPaidOrder: vi.fn(),
      findByUserId: vi.fn().mockResolvedValue([
        {
          id: 'ticket-1',
          ticketNumber: 'TCK-001',
          orderId: 'order-1',
          orderNumber: 'ORD-001',
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
      ]),
      findByUserIdAndId: vi.fn(),
    };
    const useCase = new ListUserTicketsUseCase(repository);

    const result = await useCase.execute({ userId: 'user-1' });

    expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toHaveLength(1);
  });
});
