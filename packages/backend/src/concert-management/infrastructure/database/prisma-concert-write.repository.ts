import { Injectable } from '@nestjs/common';
import { ConcertStatus, TicketTypeStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type { Concert, TicketType } from '../../domain/concert.types';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';

@Injectable()
export class PrismaConcertWriteRepository implements ConcertWriteRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createConcert(data: {
    createdById: string;
    slug: string;
    title: string;
    artistName: string;
    venueName: string;
    venueAddress?: string;
    latitude?: number | null;
    longitude?: number | null;
    city: string;
    startsAt: Date;
    endsAt: Date;
    description?: string;
    eventType?: string;
    isFeatured?: boolean;
    displayOrder?: number;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImageUrl?: string | null;
  }): Promise<Concert> {
    const record = await this.prisma.concert.create({
      data: {
        createdById: data.createdById,
        slug: data.slug,
        title: data.title,
        artistName: data.artistName,
        venueName: data.venueName,
        venueAddress: data.venueAddress ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        city: data.city,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        description: data.description ?? null,
        status: ConcertStatus.DRAFT,
        eventType: (data.eventType as any) ?? 'CONCERT',
        isFeatured: data.isFeatured ?? false,
        displayOrder: data.displayOrder ?? 0,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        seoImageUrl: data.seoImageUrl ?? null,
      },
      include: {
        posterAsset: true,
        bannerAsset: true,
        concertArtists: {
          orderBy: { displayOrder: 'asc' },
          include: {
            artist: {
              include: { avatarAsset: true },
            },
          },
        },
        _count: {
          select: { ticketTypes: true, seatingZones: true, checkinStaff: true },
        },
      },
    });

    return this.mapToDomainConcert(record);
  }

  async updateConcert(
    id: string,
    data: {
      title?: string;
      artistName?: string;
      venueName?: string;
      venueAddress?: string;
      latitude?: number | null;
      longitude?: number | null;
      city?: string;
      startsAt?: Date;
      endsAt?: Date;
      description?: string | null;
      status?: string;
      publishedAt?: Date | null;
      cancelledAt?: Date | null;
      slug?: string;
      eventType?: string;
      isFeatured?: boolean;
      displayOrder?: number;
      seoTitle?: string | null;
      seoDescription?: string | null;
      seoImageUrl?: string | null;
    },
  ): Promise<Concert> {
    const record = await this.prisma.concert.update({
      where: { id },
      data: {
        title: data.title,
        artistName: data.artistName,
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        description: data.description,
        status: data.status as ConcertStatus | undefined,
        publishedAt: data.publishedAt,
        cancelledAt: data.cancelledAt,
        slug: data.slug,
        eventType: data.eventType as any,
        isFeatured: data.isFeatured,
        displayOrder: data.displayOrder,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoImageUrl: data.seoImageUrl,
      },
      include: {
        posterAsset: true,
        bannerAsset: true,
        concertArtists: {
          orderBy: { displayOrder: 'asc' },
          include: {
            artist: {
              include: { avatarAsset: true },
            },
          },
        },
        _count: {
          select: { ticketTypes: true, seatingZones: true, checkinStaff: true },
        },
      },
    });

    return this.mapToDomainConcert(record);
  }

  async findConcertById(id: string): Promise<Concert | null> {
    const record = await this.prisma.concert.findUnique({
      where: { id },
      include: {
        posterAsset: true,
        bannerAsset: true,
        concertArtists: {
          orderBy: { displayOrder: 'asc' },
          include: {
            artist: {
              include: { avatarAsset: true },
            },
          },
        },
        _count: {
          select: { ticketTypes: true, seatingZones: true, checkinStaff: true },
        },
      },
    });
    if (!record) return null;
    return this.mapToDomainConcert(record);
  }

  async findConcertsByOwner(createdById: string): Promise<Concert[]> {
    const records = await this.prisma.concert.findMany({
      where: { createdById },
      orderBy: { updatedAt: 'desc' },
      include: {
        posterAsset: true,
        bannerAsset: true,
        concertArtists: {
          orderBy: { displayOrder: 'asc' },
          include: {
            artist: {
              include: { avatarAsset: true },
            },
          },
        },
        _count: {
          select: { ticketTypes: true, seatingZones: true, checkinStaff: true },
        },
      },
    });
    return records.map((record) => this.mapToDomainConcert(record));
  }

  async findAllConcerts(): Promise<Concert[]> {
    const records = await this.prisma.concert.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        posterAsset: true,
        bannerAsset: true,
        concertArtists: {
          orderBy: { displayOrder: 'asc' },
          include: {
            artist: {
              include: { avatarAsset: true },
            },
          },
        },
        _count: {
          select: { ticketTypes: true, seatingZones: true, checkinStaff: true },
        },
      },
    });
    return records.map((record) => this.mapToDomainConcert(record));
  }

  async createTicketType(data: {
    concertId: string;
    code: string;
    name: string;
    description?: string;
    priceVnd: number;
    totalQuantity: number;
    saleStartsAt: Date;
    saleEndsAt: Date;
    maxPerUser: number;
    status?: string;
  }): Promise<TicketType> {
    const record = await this.prisma.ticketType.create({
      data: {
        concertId: data.concertId,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        priceVnd: data.priceVnd,
        totalQuantity: data.totalQuantity,
        reservedQuantity: 0,
        soldQuantity: 0,
        maxPerUser: data.maxPerUser,
        saleStartsAt: data.saleStartsAt,
        saleEndsAt: data.saleEndsAt,
        status: (data.status as TicketTypeStatus) ?? TicketTypeStatus.ACTIVE,
      },
    });

    return this.mapToDomainTicketType(record);
  }

  async updateTicketType(
    id: string,
    data: {
      code?: string;
      name?: string;
      description?: string | null;
      priceVnd?: number;
      totalQuantity?: number;
      saleStartsAt?: Date;
      saleEndsAt?: Date;
      maxPerUser?: number;
      status?: string;
    },
  ): Promise<TicketType> {
    const record = await this.prisma.ticketType.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        priceVnd: data.priceVnd,
        totalQuantity: data.totalQuantity,
        saleStartsAt: data.saleStartsAt,
        saleEndsAt: data.saleEndsAt,
        maxPerUser: data.maxPerUser,
        status: data.status as TicketTypeStatus | undefined,
      },
    });

    return this.mapToDomainTicketType(record);
  }

  async archiveTicketType(id: string): Promise<TicketType> {
    const record = await this.prisma.ticketType.update({
      where: { id },
      data: {
        status: TicketTypeStatus.ARCHIVED,
      },
    });

    return this.mapToDomainTicketType(record);
  }

  async findTicketTypesByConcertId(concertId: string): Promise<TicketType[]> {
    const records = await this.prisma.ticketType.findMany({
      where: { concertId },
    });
    return records.map((record) => this.mapToDomainTicketType(record));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToDomainConcert(record: any): Concert {
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      artistName: record.artistName,
      description: record.description,
      venueName: record.venueName,
      venueAddress: record.venueAddress,
      latitude: record.latitude !== null && record.latitude !== undefined
        ? Number(record.latitude)
        : null,
      longitude: record.longitude !== null && record.longitude !== undefined
        ? Number(record.longitude)
        : null,
      city: record.city,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      status: record.status,
      createdById: record.createdById,
      posterAssetId: record.posterAssetId,
      posterAsset: record.posterAsset
        ? {
            id: record.posterAsset.id,
            kind: record.posterAsset.kind,
            status: record.posterAsset.status,
            publicUrl: record.posterAsset.publicUrl,
            originalName: record.posterAsset.originalName,
            contentType: record.posterAsset.contentType,
            sizeBytes: record.posterAsset.sizeBytes,
          }
        : null,
      seatingMapAssetId: record.seatingMapAssetId,
      bannerAssetId: record.bannerAssetId,
      bannerAsset: record.bannerAsset
        ? {
            id: record.bannerAsset.id,
            kind: record.bannerAsset.kind,
            status: record.bannerAsset.status,
            publicUrl: record.bannerAsset.publicUrl,
            originalName: record.bannerAsset.originalName,
            contentType: record.bannerAsset.contentType,
            sizeBytes: record.bannerAsset.sizeBytes,
          }
        : null,
      eventType: record.eventType,
      isFeatured: record.isFeatured,
      displayOrder: record.displayOrder,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      seoImageUrl: record.seoImageUrl,
      artists: record.concertArtists?.map((ca: any) => ({
        id: ca.artist.id,
        slug: ca.artist.slug,
        displayName: ca.artist.displayName,
        status: ca.artist.status,
        displayOrder: ca.displayOrder,
        avatarAsset: ca.artist.avatarAsset
          ? {
              id: ca.artist.avatarAsset.id,
              kind: ca.artist.avatarAsset.kind,
              status: ca.artist.avatarAsset.status,
              publicUrl: ca.artist.avatarAsset.publicUrl,
              originalName: ca.artist.avatarAsset.originalName,
              contentType: ca.artist.avatarAsset.contentType,
              sizeBytes: ca.artist.avatarAsset.sizeBytes,
            }
          : null,
      })) ?? [],
      publishedAt: record.publishedAt,
      cancelledAt: record.cancelledAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ticketTypesCount: record._count?.ticketTypes ?? 0,
      seatingZonesCount: record._count?.seatingZones ?? 0,
      checkinStaffCount: record._count?.checkinStaff ?? 0,
      seatingMapConfigured: !!record.seatingMapAssetId,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToDomainTicketType(record: any): TicketType {
    return {
      id: record.id,
      concertId: record.concertId,
      code: record.code,
      name: record.name,
      description: record.description,
      priceVnd: record.priceVnd,
      totalQuantity: record.totalQuantity,
      reservedQuantity: record.reservedQuantity,
      soldQuantity: record.soldQuantity,
      maxPerUser: record.maxPerUser,
      saleStartsAt: record.saleStartsAt,
      saleEndsAt: record.saleEndsAt,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
