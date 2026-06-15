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
    city: string;
    startsAt: Date;
    endsAt: Date;
    description?: string;
  }): Promise<Concert> {
    const record = await this.prisma.concert.create({
      data: {
        createdById: data.createdById,
        slug: data.slug,
        title: data.title,
        artistName: data.artistName,
        venueName: data.venueName,
        venueAddress: data.venueAddress ?? null,
        city: data.city,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        description: data.description ?? null,
        status: ConcertStatus.DRAFT,
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
      city?: string;
      startsAt?: Date;
      endsAt?: Date;
      description?: string | null;
      status?: string;
      publishedAt?: Date | null;
      cancelledAt?: Date | null;
    },
  ): Promise<Concert> {
    const record = await this.prisma.concert.update({
      where: { id },
      data: {
        title: data.title,
        artistName: data.artistName,
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        city: data.city,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        description: data.description,
        status: data.status as ConcertStatus | undefined,
        publishedAt: data.publishedAt,
        cancelledAt: data.cancelledAt,
      },
    });

    return this.mapToDomainConcert(record);
  }

  async findConcertById(id: string): Promise<Concert | null> {
    const record = await this.prisma.concert.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.mapToDomainConcert(record);
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
      city: record.city,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      status: record.status,
      createdById: record.createdById,
      posterAssetId: record.posterAssetId,
      seatingMapAssetId: record.seatingMapAssetId,
      publishedAt: record.publishedAt,
      cancelledAt: record.cancelledAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
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
