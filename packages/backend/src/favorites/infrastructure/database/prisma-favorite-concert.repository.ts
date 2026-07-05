import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  FavoriteConcertReadModel,
  FavoriteRepositoryPort,
} from '../../domain/ports/favorite-repository.port';

@Injectable()
export class PrismaFavoriteRepository implements FavoriteRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async toggleFavorite(
    userId: string,
    concertId: string,
  ): Promise<{ isFavorited: boolean }> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true },
    });

    if (!concert) {
      throw new NotFoundException(`Concert ${concertId} not found`);
    }

    const existing = await this.prisma.favoriteConcert.findUnique({
      where: { userId_concertId: { userId, concertId } },
    });

    if (existing) {
      await this.prisma.favoriteConcert.delete({
        where: { userId_concertId: { userId, concertId } },
      });
      return { isFavorited: false };
    }

    await this.prisma.favoriteConcert.create({
      data: { userId, concertId },
    });
    return { isFavorited: true };
  }

  async isFavorited(userId: string, concertId: string): Promise<boolean> {
    const record = await this.prisma.favoriteConcert.findUnique({
      where: { userId_concertId: { userId, concertId } },
      select: { userId: true },
    });
    return record !== null;
  }

  async listByUser(userId: string): Promise<FavoriteConcertReadModel[]> {
    const rows = await this.prisma.favoriteConcert.findMany({
      where: { userId },
      include: {
        concert: {
          select: {
            id: true,
            title: true,
            slug: true,
            artistName: true,
            startsAt: true,
            endsAt: true,
            venueName: true,
            city: true,
            posterAsset: { select: { publicUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.concert.id,
      title: r.concert.title,
      slug: r.concert.slug,
      artistName: r.concert.artistName,
      startsAt: r.concert.startsAt,
      endsAt: r.concert.endsAt,
      venueName: r.concert.venueName,
      city: r.concert.city,
      posterUrl: r.concert.posterAsset?.publicUrl ?? null,
      favoritedAt: r.createdAt,
    }));
  }
}
