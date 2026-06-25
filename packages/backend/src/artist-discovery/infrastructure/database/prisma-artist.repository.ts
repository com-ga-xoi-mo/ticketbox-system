import { PrismaClient, Prisma } from '@prisma/client';
import { ArtistRepositoryPort, FindActiveArtistsParams, PaginatedArtists, SetConcertArtistsParams } from '../../domain/ports/artist-repository.port';
import { ArtistRecord, ArtistStatus, ConcertArtistRecord, ArtistFollowRecord, ArtistFavoriteRecord } from '../../domain/artist.types';

export class PrismaArtistRepository implements ArtistRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findBySlug(slug: string): Promise<ArtistRecord | null> {
    const artist = await this.prisma.artist.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: { avatarAsset: true, posterAsset: true },
    });
    return artist as any;
  }

  async findById(id: string): Promise<ArtistRecord | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
    });
    return artist as any;
  }

  async findActive(params: FindActiveArtistsParams): Promise<PaginatedArtists> {
    const where: Prisma.ArtistWhereInput = {
      status: 'ACTIVE',
      ...(params.query && {
        displayName: { contains: params.query, mode: 'insensitive' },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        skip: params.offset,
        take: params.limit,
        orderBy: { displayName: 'asc' },
        include: { avatarAsset: true },
      }),
      this.prisma.artist.count({ where }),
    ]);

    return { items: items as any, total };
  }

  async findTopByFavorites(limit: number): Promise<ArtistRecord[]> {
    const artists = await this.prisma.artist.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { favoriteCount: 'desc' },
        { displayName: 'asc' },
      ],
      take: limit,
      include: { avatarAsset: true },
    });
    return artists as any;
  }

  async create(data: any): Promise<ArtistRecord> {
    const artist = await this.prisma.artist.create({ data });
    return artist as any;
  }

  async update(id: string, data: any): Promise<ArtistRecord> {
    const artist = await this.prisma.artist.update({
      where: { id },
      data,
    });
    return artist as any;
  }

  async findConcertArtists(concertId: string): Promise<ConcertArtistRecord[]> {
    const items = await this.prisma.concertArtist.findMany({
      where: { concertId },
      orderBy: { displayOrder: 'asc' },
    });
    return items as any;
  }

  async setConcertArtists(params: SetConcertArtistsParams): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.concertArtist.deleteMany({
        where: { concertId: params.concertId },
      });
      if (params.artists.length > 0) {
        await tx.concertArtist.createMany({
          data: params.artists.map((a) => ({
            concertId: params.concertId,
            artistId: a.artistId,
            displayOrder: a.displayOrder,
          })),
        });
      }
    });
  }

  async findFollow(userId: string, artistId: string): Promise<ArtistFollowRecord | null> {
    const follow = await this.prisma.artistFollow.findUnique({
      where: { userId_artistId: { userId, artistId } },
    });
    return follow as any;
  }

  async createFollow(userId: string, artistId: string): Promise<ArtistFollowRecord> {
    const follow = await this.prisma.artistFollow.create({
      data: { userId, artistId },
    });
    return follow as any;
  }

  async deleteFollow(userId: string, artistId: string): Promise<void> {
    await this.prisma.artistFollow.delete({
      where: { userId_artistId: { userId, artistId } },
    });
  }

  async findFavorite(userId: string, artistId: string): Promise<ArtistFavoriteRecord | null> {
    const fav = await this.prisma.artistFavorite.findUnique({
      where: { userId_artistId: { userId, artistId } },
    });
    return fav as any;
  }

  async createFavorite(userId: string, artistId: string): Promise<ArtistFavoriteRecord> {
    const fav = await this.prisma.artistFavorite.create({
      data: { userId, artistId },
    });
    return fav as any;
  }

  async deleteFavorite(userId: string, artistId: string): Promise<void> {
    await this.prisma.artistFavorite.delete({
      where: { userId_artistId: { userId, artistId } },
    });
  }

  async incrementFollowerCount(artistId: string): Promise<void> {
    await this.prisma.artist.update({
      where: { id: artistId },
      data: { followerCount: { increment: 1 } },
    });
  }

  async decrementFollowerCount(artistId: string): Promise<void> {
    await this.prisma.artist.update({
      where: { id: artistId },
      data: { followerCount: { decrement: 1 } },
    });
  }

  async incrementFavoriteCount(artistId: string): Promise<void> {
    await this.prisma.artist.update({
      where: { id: artistId },
      data: { favoriteCount: { increment: 1 } },
    });
  }

  async decrementFavoriteCount(artistId: string): Promise<void> {
    await this.prisma.artist.update({
      where: { id: artistId },
      data: { favoriteCount: { decrement: 1 } },
    });
  }

  async findUpcomingEventsByArtist(artistId: string): Promise<any[]> {
    const items = await this.prisma.concertArtist.findMany({
      where: {
        artistId,
        concert: {
          status: 'PUBLISHED',
          startsAt: { gt: new Date() },
        },
      },
      include: {
        concert: { include: { posterAsset: true } },
      },
      orderBy: { concert: { startsAt: 'asc' } },
    });
    return items.map((i) => i.concert);
  }

  async countPastEventsByArtist(artistId: string): Promise<number> {
    return this.prisma.concertArtist.count({
      where: {
        artistId,
        concert: {
          status: 'PUBLISHED',
          startsAt: { lte: new Date() },
        },
      },
    });
  }
}
