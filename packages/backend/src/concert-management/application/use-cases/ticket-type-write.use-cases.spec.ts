import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { Role } from '../../../identity/domain/role.enum';
import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { TicketType } from '../../domain/concert.types';
import { CreateTicketTypeUseCase } from './create-ticket-type.use-case';
import { UpdateTicketTypeUseCase } from './update-ticket-type.use-case';
import { ArchiveTicketTypeUseCase } from './archive-ticket-type.use-case';

describe('Ticket Type Write Use Cases', () => {
  let concertWriteRepo: ConcertWriteRepositoryPort;
  let authorizeConcertManagement: AuthorizeConcertManagementUseCase;

  beforeEach(() => {
    concertWriteRepo = {
      createConcert: vi.fn(),
      updateConcert: vi.fn(),
      findConcertById: vi.fn(),
      findConcertsByOwner: vi.fn(),
      findAllConcerts: vi.fn(),
      createTicketType: vi.fn(),
      updateTicketType: vi.fn(),
      archiveTicketType: vi.fn(),
      findTicketTypesByConcertId: vi.fn(),
    };

    authorizeConcertManagement = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthorizeConcertManagementUseCase;
  });

  describe('CreateTicketTypeUseCase', () => {
    it('throws validation error for negative price', async () => {
      const useCase = new CreateTicketTypeUseCase(concertWriteRepo, authorizeConcertManagement);
      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          code: 'VIP',
          name: 'VIP Ticket',
          priceVnd: -100,
          totalQuantity: 100,
          saleStartsAt: new Date('2026-06-15T00:00:00Z'),
          saleEndsAt: new Date('2026-06-20T00:00:00Z'),
          maxPerUser: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws validation error for zero quantity', async () => {
      const useCase = new CreateTicketTypeUseCase(concertWriteRepo, authorizeConcertManagement);
      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          code: 'VIP',
          name: 'VIP Ticket',
          priceVnd: 500000,
          totalQuantity: 0,
          saleStartsAt: new Date('2026-06-15T00:00:00Z'),
          saleEndsAt: new Date('2026-06-20T00:00:00Z'),
          maxPerUser: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws validation error for saleEndsAt <= saleStartsAt', async () => {
      const useCase = new CreateTicketTypeUseCase(concertWriteRepo, authorizeConcertManagement);
      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          code: 'VIP',
          name: 'VIP Ticket',
          priceVnd: 500000,
          totalQuantity: 100,
          saleStartsAt: new Date('2026-06-20T00:00:00Z'),
          saleEndsAt: new Date('2026-06-15T00:00:00Z'),
          maxPerUser: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if ticket type code already exists in concert', async () => {
      const useCase = new CreateTicketTypeUseCase(concertWriteRepo, authorizeConcertManagement);
      const existing: TicketType = {
        id: 'tt-1',
        concertId: 'concert-1',
        code: 'VIP',
        name: 'VIP',
        description: null,
        priceVnd: 500000,
        totalQuantity: 100,
        reservedQuantity: 0,
        soldQuantity: 0,
        maxPerUser: 4,
        saleStartsAt: new Date(),
        saleEndsAt: new Date(),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findTicketTypesByConcertId).mockResolvedValue([existing]);

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          code: 'vip', // case insensitive
          name: 'VIP Ticket',
          priceVnd: 500000,
          totalQuantity: 100,
          saleStartsAt: new Date('2026-06-15T00:00:00Z'),
          saleEndsAt: new Date('2026-06-20T00:00:00Z'),
          maxPerUser: 4,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('UpdateTicketTypeUseCase', () => {
    it('throws ConflictException when updating code to another existing ticket type code in same concert', async () => {
      const useCase = new UpdateTicketTypeUseCase(concertWriteRepo, authorizeConcertManagement);
      const existing: TicketType[] = [
        {
          id: 'tt-1',
          concertId: 'concert-1',
          code: 'VIP',
          name: 'VIP',
          description: null,
          priceVnd: 500000,
          totalQuantity: 100,
          reservedQuantity: 0,
          soldQuantity: 0,
          maxPerUser: 4,
          saleStartsAt: new Date(),
          saleEndsAt: new Date(),
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tt-2',
          concertId: 'concert-1',
          code: 'GA',
          name: 'GA',
          description: null,
          priceVnd: 200000,
          totalQuantity: 100,
          reservedQuantity: 0,
          soldQuantity: 0,
          maxPerUser: 4,
          saleStartsAt: new Date(),
          saleEndsAt: new Date(),
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(concertWriteRepo.findTicketTypesByConcertId).mockResolvedValue(existing);

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          ticketTypeId: 'tt-2',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          code: 'vip', // conflict with tt-1
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ArchiveTicketTypeUseCase', () => {
    it('throws BadRequestException if ticket type has soldQuantity > 0', async () => {
      const useCase = new ArchiveTicketTypeUseCase(concertWriteRepo, authorizeConcertManagement);
      const ticketType: TicketType = {
        id: 'tt-1',
        concertId: 'concert-1',
        code: 'VIP',
        name: 'VIP',
        description: null,
        priceVnd: 500000,
        totalQuantity: 100,
        reservedQuantity: 0,
        soldQuantity: 1, // sold 1
        maxPerUser: 4,
        saleStartsAt: new Date(),
        saleEndsAt: new Date(),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findTicketTypesByConcertId).mockResolvedValue([ticketType]);

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          ticketTypeId: 'tt-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets status to ARCHIVED if soldQuantity + reservedQuantity === 0', async () => {
      const useCase = new ArchiveTicketTypeUseCase(concertWriteRepo, authorizeConcertManagement);
      const ticketType: TicketType = {
        id: 'tt-1',
        concertId: 'concert-1',
        code: 'VIP',
        name: 'VIP',
        description: null,
        priceVnd: 500000,
        totalQuantity: 100,
        reservedQuantity: 0,
        soldQuantity: 0,
        maxPerUser: 4,
        saleStartsAt: new Date(),
        saleEndsAt: new Date(),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findTicketTypesByConcertId).mockResolvedValue([ticketType]);

      await useCase.execute({
        concertId: 'concert-1',
        ticketTypeId: 'tt-1',
        requesterId: 'organizer-1',
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
      });

      expect(concertWriteRepo.archiveTicketType).toHaveBeenCalledWith('tt-1');
    });
  });
});
