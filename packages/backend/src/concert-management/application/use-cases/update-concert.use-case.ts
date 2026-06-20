import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { Concert } from '../../domain/concert.types';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { UpdateConcertCommand } from './commands';

export class UpdateConcertUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: UpdateConcertCommand): Promise<Concert> {
    const actor = {
      userId: cmd.requesterId,
      roles: [cmd.requesterRole],
    };

    // Enforce ownership/auth first
    await this.authorizeConcertManagement.execute({
      actor,
      concertId: cmd.concertId,
      allowAdminOverride: cmd.allowAdminOverride,
    });

    const concert = await this.concertWriteRepo.findConcertById(cmd.concertId);
    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    if (concert.status === 'ENDED' || concert.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot update concert in ${concert.status} status`);
    }

    if (cmd.slug) {
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugPattern.test(cmd.slug)) {
        throw new BadRequestException('Slug must be URL-safe (lowercase alphanumeric and hyphens)');
      }
    }

    // Apply partial updates
    try {
      return await this.concertWriteRepo.updateConcert(cmd.concertId, {
        title: cmd.title,
        artistName: cmd.artistName,
        venueName: cmd.venueName,
        venueAddress: cmd.venueAddress,
        city: cmd.city,
        startsAt: cmd.startsAt,
        endsAt: cmd.endsAt,
        description: cmd.description,
        slug: cmd.slug,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Concert slug already exists');
      }
      throw err;
    }
  }
}
