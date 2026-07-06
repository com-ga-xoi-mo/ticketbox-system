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
        take: params.limit,
        skip: params.offset,
        orderBy: { displayName: 'asc' },
        include: { avatarAsset: true },
      }),
      this.prisma.artist.count({ where }),
    ]);

    return { items: items as any[], total };
  }

  async findAdminArtists(params: import('../../domain/ports/artist-repository.port').FindAdminArtistsParams): Promise<PaginatedArtists> {
    const where: Prisma.ArtistWhereInput = {
      ...(params.status && { status: params.status }),
      ...(params.query && {
        displayName: { contains: params.query, mode: 'insensitive' },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { createdAt: 'desc' },
        include: { avatarAsset: true, posterAsset: true },
      }),
      this.prisma.artist.count({ where }),
    ]);

    return { items: items as any[], total };
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
      // 1. Lock the concert row
      const concertList = await tx.$queryRaw<{ id: string, artist_name: string }[]>`SELECT id, artist_name FROM concerts WHERE id = ${params.concertId}::uuid FOR UPDATE`;
      if (concertList.length === 0) {
        throw new Error(`Concert ${params.concertId} not found`);
      }

      // 2. Load current links
      const currentLinks = await tx.concertArtist.findMany({
        where: { concertId: params.concertId },
      });
      const currentArtistIds = new Set(currentLinks.map(l => l.artistId));

      // 3. Load submitted artists
      const submittedArtistIds = params.artists.map(a => a.artistId);
      let submittedArtists: { id: string, status: string, display_name: string }[] = [];
      if (submittedArtistIds.length > 0) {
        submittedArtists = await tx.$queryRaw<{ id: string, status: string, display_name: string }[]>`SELECT id, status, display_name FROM artists WHERE id = ANY(${submittedArtistIds}::uuid[])`;
      }

      if (submittedArtists.length !== submittedArtistIds.length) {
        throw new Error('Some submitted artists do not exist');
      }

      // 4. Validate active-only new links
      for (const a of submittedArtists) {
        if (a.status === 'INACTIVE' && !currentArtistIds.has(a.id)) {
          throw new Error(`Cannot link inactive artist ${a.id}`);
        }
      }

      // 5. Replace links
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

        // 6. Synchronize primary artistName
        const primaryArtistId = params.artists.find(a => a.displayOrder === 0)?.artistId;
        const primaryArtist = submittedArtists.find(a => a.id === primaryArtistId);
        if (primaryArtist) {
          await tx.concert.update({
            where: { id: params.concertId },
            data: { artistName: primaryArtist.display_name },
          });
        }
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
          startsAt: { lt: new Date() },
        },
      },
    });
  }

  async createAssetAndLinkAvatar(artistId: string, assetData: any): Promise<{ replacedStorageKey?: string }> {
    return this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id: artistId },
        select: { avatarAsset: { select: { storageKey: true } } },
      });

      const replacedStorageKey = artist?.avatarAsset?.storageKey;

      await tx.asset.create({
        data: {
          id: assetData.id,
          kind: 'ARTIST_AVATAR',
          status: 'ACTIVE',
          publicUrl: assetData.publicUrl,
          originalName: assetData.originalName,
          contentType: assetData.contentType,
          sizeBytes: assetData.sizeBytes,
          checksum: assetData.checksum,
          storageKey: assetData.storageKey,
          uploadedById: assetData.uploadedById,
        },
      });

      await tx.artist.update({
        where: { id: artistId },
        data: { avatarAssetId: assetData.id },
      });

      return { replacedStorageKey: replacedStorageKey ?? undefined };
    });
  }

  async createAssetAndLinkPoster(artistId: string, assetData: any): Promise<{ replacedStorageKey?: string }> {
    return this.prisma.$transaction(async (tx) => {
      const artist = await tx.artist.findUnique({
        where: { id: artistId },
        select: { posterAsset: { select: { storageKey: true } } },
      });

      const replacedStorageKey = artist?.posterAsset?.storageKey;

      await tx.asset.create({
        data: {
          id: assetData.id,
          kind: 'ARTIST_POSTER',
          status: 'ACTIVE',
          publicUrl: assetData.publicUrl,
          originalName: assetData.originalName,
          contentType: assetData.contentType,
          sizeBytes: assetData.sizeBytes,
          checksum: assetData.checksum,
          storageKey: assetData.storageKey,
          uploadedById: assetData.uploadedById,
        },
      });

      await tx.artist.update({
        where: { id: artistId },
        data: { posterAssetId: assetData.id },
      });

      return { replacedStorageKey: replacedStorageKey ?? undefined };
    });
  }
}
