import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  ConcertOwnershipRecord,
  ConcertOwnershipRepositoryPort,
} from '../../domain/ports/concert-ownership.port';

@Injectable()
export class PrismaConcertOwnershipRepository implements ConcertOwnershipRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findOwnership(concertId: string): Promise<ConcertOwnershipRecord | null> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, createdById: true },
    });

    if (!concert) {
      return null;
    }

    return {
      concertId: concert.id,
      ownerUserId: concert.createdById,
    };
  }
}
