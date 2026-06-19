import { describe, expect, it, vi } from 'vitest';

import { TicketNotFoundError } from '../../domain/errors';
import { QrTicketTokenService } from '../../domain/qr-ticket-token.service';
import { TicketStatus } from '../../domain/ticket-status.enum';
import type { TicketRepositoryPort } from '../../domain/ports/ticket-repository.port';
import { GetUserTicketUseCase } from './get-user-ticket.use-case';

const ticketSummary = {
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
};

describe('GetUserTicketUseCase', () => {
  it('returns owner-scoped ticket detail with a QR payload', async () => {
    const repository: TicketRepositoryPort = {
      issueTicketsForPaidOrder: vi.fn(),
      findByUserId: vi.fn(),
      findByUserIdAndId: vi.fn().mockResolvedValue(ticketSummary),
    };
    const useCase = new GetUserTicketUseCase(
      repository,
      new QrTicketTokenService('secret'),
    );

    const result = await useCase.execute({ userId: 'user-1', ticketId: 'ticket-1' });

    expect(repository.findByUserIdAndId).toHaveBeenCalledWith('user-1', 'ticket-1');
    expect(result).toMatchObject({
      id: 'ticket-1',
      qrPayload: expect.stringContaining('.'),
    });
  });

  it('throws not found when the ticket is missing or owned by another user', async () => {
    const repository: TicketRepositoryPort = {
      issueTicketsForPaidOrder: vi.fn(),
      findByUserId: vi.fn(),
      findByUserIdAndId: vi.fn().mockResolvedValue(null),
    };
    const useCase = new GetUserTicketUseCase(
      repository,
      new QrTicketTokenService('secret'),
    );

    await expect(
      useCase.execute({ userId: 'user-1', ticketId: 'ticket-1' }),
    ).rejects.toThrow(TicketNotFoundError);
  });
});
