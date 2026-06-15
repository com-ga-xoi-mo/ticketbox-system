import { BadRequestException, NotFoundException } from '@nestjs/common';

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

    // Apply partial updates
    return this.concertWriteRepo.updateConcert(cmd.concertId, {
      title: cmd.title,
      artistName: cmd.artistName,
      venueName: cmd.venueName,
      venueAddress: cmd.venueAddress,
      city: cmd.city,
      startsAt: cmd.startsAt,
      endsAt: cmd.endsAt,
      description: cmd.description,
    });
  }
}
