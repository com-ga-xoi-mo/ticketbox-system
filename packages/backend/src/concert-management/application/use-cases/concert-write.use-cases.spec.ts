import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';

import {
  ForbiddenConcertOwnershipError,
  ConcertNotFoundError,
} from '../../../identity/domain/errors';
import { Role } from '../../../identity/domain/role.enum';
import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { Concert } from '../../domain/concert.types';
import { CreateConcertUseCase } from './create-concert.use-case';
import { UpdateConcertUseCase } from './update-concert.use-case';
import { PublishConcertUseCase } from './publish-concert.use-case';
import { CancelConcertUseCase } from './cancel-concert.use-case';
import { ListOrganizerConcertsUseCase } from './list-organizer-concerts.use-case';
import { GetOrganizerConcertUseCase } from './get-organizer-concert.use-case';
import { ListAdminConcertsUseCase } from './list-admin-concerts.use-case';
import { GetAdminConcertUseCase } from './get-admin-concert.use-case';

describe('Concert Write Use Cases', () => {
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

  describe('CreateConcertUseCase', () => {
    it('creates a concert and generates correct payload', async () => {
      const useCase = new CreateConcertUseCase(concertWriteRepo);
      const command = {
        createdById: 'organizer-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        venueName: 'Venue 1',
        city: 'City 1',
        startsAt: new Date('2026-07-01T20:00:00.000Z'),
        endsAt: new Date('2026-07-01T22:00:00.000Z'),
      };

      await useCase.execute(command);
      expect(concertWriteRepo.createConcert).toHaveBeenCalledWith(command);
    });

    it('rejects invalid URL slug', async () => {
      const useCase = new CreateConcertUseCase(concertWriteRepo);
      const command = {
        createdById: 'organizer-1',
        slug: 'invalid slug!',
        title: 'My Concert',
        artistName: 'Artist 1',
        venueName: 'Venue 1',
        city: 'City 1',
        startsAt: new Date('2026-07-01T20:00:00.000Z'),
        endsAt: new Date('2026-07-01T22:00:00.000Z'),
      };

      await expect(useCase.execute(command)).rejects.toThrow(BadRequestException);
    });
  });

  describe('UpdateConcertUseCase', () => {
    it('succeeds for organizer who owns the concert', async () => {
      const useCase = new UpdateConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'DRAFT',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);
      vi.mocked(concertWriteRepo.updateConcert).mockResolvedValue({
        ...concert,
        title: 'New Title',
      });

      const result = await useCase.execute({
        concertId: 'concert-1',
        requesterId: 'organizer-1',
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
        title: 'New Title',
      });

      expect(result.title).toBe('New Title');
      expect(authorizeConcertManagement.execute).toHaveBeenCalledWith({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
        allowAdminOverride: false,
      });
    });

    it('throws ForbiddenConcertOwnershipError if authorization fails', async () => {
      const useCase = new UpdateConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      vi.mocked(authorizeConcertManagement.execute).mockRejectedValue(
        new ForbiddenConcertOwnershipError('concert-1'),
      );

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-2',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          title: 'New Title',
        }),
      ).rejects.toThrow(ForbiddenConcertOwnershipError);
    });

    it('allows admin to update any concert', async () => {
      const useCase = new UpdateConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'DRAFT',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);

      await useCase.execute({
        concertId: 'concert-1',
        requesterId: 'admin-1',
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
        title: 'Admin Title Update',
      });

      expect(authorizeConcertManagement.execute).toHaveBeenCalledWith({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'concert-1',
        allowAdminOverride: true,
      });
    });

    it('rejects update if concert status is ENDED or CANCELLED', async () => {
      const useCase = new UpdateConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const endedConcert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'ENDED',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(endedConcert);

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          title: 'New Title',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid URL slug during update', async () => {
      const useCase = new UpdateConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'DRAFT',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          slug: 'invalid slug!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if updated slug is duplicate (P2002 conflict)', async () => {
      const useCase = new UpdateConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'DRAFT',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);
      vi.mocked(concertWriteRepo.updateConcert).mockRejectedValue({ code: 'P2002' });

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
          slug: 'duplicate-slug',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('PublishConcertUseCase', () => {
    it('succeeds for DRAFT concert', async () => {
      const useCase = new PublishConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'DRAFT',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);

      await useCase.execute({
        concertId: 'concert-1',
        requesterId: 'organizer-1',
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
      });

      expect(concertWriteRepo.updateConcert).toHaveBeenCalledWith(
        'concert-1',
        expect.objectContaining({ status: 'PUBLISHED', publishedAt: expect.any(Date) }),
      );
    });

    it('throws for PUBLISHED, CANCELLED, or ENDED concert', async () => {
      const useCase = new PublishConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'PUBLISHED',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: new Date(),
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CancelConcertUseCase', () => {
    it('succeeds for DRAFT or PUBLISHED concert', async () => {
      const useCase = new CancelConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'PUBLISHED',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: new Date(),
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);

      await useCase.execute({
        concertId: 'concert-1',
        requesterId: 'organizer-1',
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
      });

      expect(concertWriteRepo.updateConcert).toHaveBeenCalledWith(
        'concert-1',
        expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
      );
    });

    it('throws for CANCELLED or ENDED concert', async () => {
      const useCase = new CancelConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'CANCELLED',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);

      await expect(
        useCase.execute({
          concertId: 'concert-1',
          requesterId: 'organizer-1',
          requesterRole: Role.ORGANIZER,
          allowAdminOverride: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ListOrganizerConcertsUseCase', () => {
    it('returns concerts owned by the organizer', async () => {
      const useCase = new ListOrganizerConcertsUseCase(concertWriteRepo);
      const concerts: Concert[] = [];
      vi.mocked(concertWriteRepo.findConcertsByOwner).mockResolvedValue(concerts);

      const result = await useCase.execute('organizer-1');
      expect(result).toBe(concerts);
      expect(concertWriteRepo.findConcertsByOwner).toHaveBeenCalledWith('organizer-1');
    });
  });

  describe('GetOrganizerConcertUseCase', () => {
    it('authorizes and returns concert when it exists and belongs to organizer', async () => {
      const useCase = new GetOrganizerConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'DRAFT',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);

      const result = await useCase.execute({ concertId: 'concert-1', organizerId: 'organizer-1' });
      expect(result).toBe(concert);
      expect(authorizeConcertManagement.execute).toHaveBeenCalledWith({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
        allowAdminOverride: false,
      });
      expect(concertWriteRepo.findConcertById).toHaveBeenCalledWith('concert-1');
    });

    it('throws ConcertNotFoundError when missing', async () => {
      const useCase = new GetOrganizerConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(null);

      await expect(
        useCase.execute({ concertId: 'concert-1', organizerId: 'organizer-1' }),
      ).rejects.toThrow(ConcertNotFoundError);
    });
  });

  describe('ListAdminConcertsUseCase', () => {
    it('returns all concerts', async () => {
      const useCase = new ListAdminConcertsUseCase(concertWriteRepo);
      const concerts: Concert[] = [];
      vi.mocked(concertWriteRepo.findAllConcerts).mockResolvedValue(concerts);

      const result = await useCase.execute();
      expect(result).toBe(concerts);
      expect(concertWriteRepo.findAllConcerts).toHaveBeenCalled();
    });
  });

  describe('GetAdminConcertUseCase', () => {
    it('authorizes with allowAdminOverride: true and returns concert when it exists', async () => {
      const useCase = new GetAdminConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      const concert: Concert = {
        id: 'concert-1',
        slug: 'my-concert',
        title: 'My Concert',
        artistName: 'Artist 1',
        description: null,
        venueName: 'Venue 1',
        venueAddress: null,
        city: 'City',
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'DRAFT',
        createdById: 'organizer-1',
        posterAssetId: null,
        seatingMapAssetId: null,
        publishedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(concert);

      const result = await useCase.execute({ concertId: 'concert-1', adminId: 'admin-1' });
      expect(result).toBe(concert);
      expect(authorizeConcertManagement.execute).toHaveBeenCalledWith({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'concert-1',
        allowAdminOverride: true,
      });
    });

    it('throws ConcertNotFoundError when missing', async () => {
      const useCase = new GetAdminConcertUseCase(concertWriteRepo, authorizeConcertManagement);
      vi.mocked(concertWriteRepo.findConcertById).mockResolvedValue(null);

      await expect(useCase.execute({ concertId: 'concert-1', adminId: 'admin-1' })).rejects.toThrow(
        ConcertNotFoundError,
      );
    });
  });
});
