import { describe, it, beforeEach, expect, vi } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { InitiateTransferUseCase } from './initiate-transfer.usecase';
import { TICKET_TRANSFER_REPOSITORY } from '../../domain/ports/ticket-transfer-repository.port';
import { GIFTING_EVENT_PUBLISHER } from '../../domain/ports/gifting-event-publisher.port';
import { PrismaService } from '../../../platform/database/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('InitiateTransferUseCase', () => {
  let useCase: InitiateTransferUseCase;
  let mockTransferRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockEventPublisher: Record<string, ReturnType<typeof vi.fn>>;
  let mockPrisma: { ticket: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    mockTransferRepo = {
      findPendingTransferByTicketId: vi.fn(),
      createTransfer: vi.fn(),
    };

    mockEventPublisher = {
      publishGiftInvitation: vi.fn(),
    };

    mockPrisma = {
      ticket: {
        findUnique: vi.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        InitiateTransferUseCase,
        { provide: TICKET_TRANSFER_REPOSITORY, useValue: mockTransferRepo },
        { provide: GIFTING_EVENT_PUBLISHER, useValue: mockEventPublisher },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<InitiateTransferUseCase>(InitiateTransferUseCase);
  });

  it('should throw ConflictException if ticket is not found', async () => {
    mockPrisma.ticket.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute({
        ticketId: 't1',
        senderId: 's1',
        recipientEmail: 'friend@example.com',
      }),
    ).rejects.toThrow(ConflictException);
  });

  // Additional tests covering ownership, status checks, 24h window, and successful creation go here.
});
