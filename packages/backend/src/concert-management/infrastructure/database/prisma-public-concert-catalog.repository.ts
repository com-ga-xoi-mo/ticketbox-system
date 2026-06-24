import { Injectable } from '@nestjs/common';
import { ArtistBioStatus, ConcertStatus, SeatingZoneStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import { calculateAvailableQuantity } from '../../domain/catalog-availability';
import type {
  AssetMetadata,
  AvailabilityTicketTypeSnapshot,
  CatalogSearchFilters,
  ConcertAvailabilitySnapshot,
  ConcertAvailabilitySummary,
  ConcertDetail,
  ConcertSummary,
  SeatingZoneCatalogItem,
  TicketTypeCatalogItem,
  TicketTypeZoneMapping,
} from '../../domain/catalog.types';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';

type AssetRecord = {
  id: string;
  kind: string;
  status: string;
  publicUrl: string | null;
  originalName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
};

type SeatingZoneRecord = {
  id: string;
  concertId: string;
  svgElementId: string;
  label: string;
  color: string | null;
  displayOrder: number;
  status: string;
};

type TicketTypeZoneRecord = {
  ticketTypeId: string;
  seatingZoneId: string;
  concertId: string;
  seatingZone?: {
    status: string;
  };
};

type TicketTypeRecord = {
  id: string;
  concertId: string;
  code: string;
  name: string;
  description: string | null;
  priceVnd: number;
  totalQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  maxPerUser: number;
  saleStartsAt: Date;
  saleEndsAt: Date;
  status: string;
  zones?: TicketTypeZoneRecord[];
};

type ConcertSummaryRecord = {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  venueName: string;
  city: string;
  startsAt: Date;
  endsAt: Date;
  posterAsset: AssetRecord | null;
  ticketTypes: TicketTypeRecord[];
};

type ConcertDetailRecord = ConcertSummaryRecord & {
  description: string | null;
  venueAddress: string | null;
  seatingMapAsset: AssetRecord | null;
  seatingZones: SeatingZoneRecord[];
  artistBios: { publishedBio: string | null }[];
};

@Injectable()
export class PrismaPublicConcertCatalogRepository implements PublicConcertCatalogPort {
  constructor(private readonly prisma: PrismaService) {}

  async listUpcomingPublished(now: Date, filters?: CatalogSearchFilters): Promise<ConcertSummary[]> {
    const whereClause: any = {
      ...this.publicConcertWhere(now),
    };

    if (filters?.q) {
      whereClause.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { artistName: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    if (filters?.city) {
      whereClause.city = filters.city;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const startsAtFilter: any = {};
      if (filters.dateFrom) {
        startsAtFilter.gte = filters.dateFrom > now ? filters.dateFrom : now;
      } else {
        startsAtFilter.gte = now;
      }
      
      if (filters.dateTo) {
        startsAtFilter.lte = filters.dateTo;
      }
      whereClause.startsAt = startsAtFilter;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      const priceFilter: any = {};
      if (filters.minPrice !== undefined) priceFilter.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) priceFilter.lte = filters.maxPrice;
      
      whereClause.ticketTypes = {
        some: {
          priceVnd: priceFilter,
        },
      };
    }

    let orderByClause: any = { startsAt: 'asc' };
    if (filters?.sortBy === 'date') {
      orderByClause = { startsAt: filters.sortDir === 'desc' ? 'desc' : 'asc' };
    } else if (filters?.sortBy === 'price') {
      // For price, we fetch and sort in memory
    }

    const concerts = await this.prisma.concert.findMany({
      where: whereClause,
      orderBy: orderByClause,
      include: {
        posterAsset: true,
        ticketTypes: {
          orderBy: { code: 'asc' },
        },
      },
    });

    let summaries = concerts.map((concert) => this.toConcertSummary(concert));

    if (filters?.sortBy === 'price') {
      const dir = filters.sortDir === 'desc' ? -1 : 1;
      summaries.sort((a, b) => {
        const aMin = a.availabilitySummary.minPriceVnd ?? Infinity;
        const bMin = b.availabilitySummary.minPriceVnd ?? Infinity;
        if (aMin < bMin) return -1 * dir;
        if (aMin > bMin) return 1 * dir;
        return 0;
      });
    }

    return summaries;
  }

  async listDistinctCities(now: Date): Promise<string[]> {
    const results = await this.prisma.concert.findMany({
      where: this.publicConcertWhere(now),
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });
    return results.map((r) => r.city);
  }

  async findPublishedUpcomingDetailBySlug(slug: string, now: Date): Promise<ConcertDetail | null> {
    const concert = await this.prisma.concert.findFirst({
      where: {
        ...this.publicConcertWhere(now),
        slug,
      },
      include: {
        posterAsset: true,
        seatingMapAsset: true,
        seatingZones: {
          where: {
            status: SeatingZoneStatus.ACTIVE,
          },
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
        },
        artistBios: {
          where: {
            status: ArtistBioStatus.PUBLISHED,
            publishedBio: {
              not: null,
            },
          },
          orderBy: { publishedAt: 'desc' },
          take: 1,
          select: {
            publishedBio: true,
          },
        },
        ticketTypes: {
          orderBy: { code: 'asc' },
          include: {
            zones: {
              orderBy: { createdAt: 'asc' },
              include: {
                seatingZone: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!concert) return null;
    return this.toConcertDetail(concert);
  }

  async findPublishedUpcomingAvailabilityBySlug(
    slug: string,
    now: Date,
  ): Promise<ConcertAvailabilitySnapshot | null> {
    const concert = await this.prisma.concert.findFirst({
      where: {
        ...this.publicConcertWhere(now),
        slug,
      },
      include: {
        ticketTypes: {
          orderBy: { code: 'asc' },
          include: {
            zones: {
              orderBy: { createdAt: 'asc' },
              include: {
                seatingZone: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!concert) return null;

    return {
      concertId: concert.id,
      slug: concert.slug,
      generatedAt: new Date(),
      ticketTypes: concert.ticketTypes.map((ticketType) =>
        this.toAvailabilityTicketType(ticketType, concert.id),
      ),
    };
  }

  private publicConcertWhere(now: Date) {
    return {
      status: ConcertStatus.PUBLISHED,
      startsAt: {
        gte: now,
      },
    };
  }

  private toConcertSummary(concert: ConcertSummaryRecord): ConcertSummary {
    return {
      id: concert.id,
      slug: concert.slug,
      title: concert.title,
      artistName: concert.artistName,
      venueName: concert.venueName,
      city: concert.city,
      startsAt: concert.startsAt,
      endsAt: concert.endsAt,
      posterAsset: this.toAssetMetadata(concert.posterAsset),
      availabilitySummary: this.toAvailabilitySummary(concert.ticketTypes),
    };
  }

  private toConcertDetail(concert: ConcertDetailRecord): ConcertDetail {
    const ticketTypes = concert.ticketTypes.map((ticketType) =>
      this.toTicketTypeCatalogItem(ticketType, concert.id),
    );

    return {
      ...this.toConcertSummary(concert),
      description: concert.description,
      publishedArtistBio: concert.artistBios[0]?.publishedBio ?? null,
      venueAddress: concert.venueAddress,
      seatingMapAsset: this.toAssetMetadata(concert.seatingMapAsset),
      seatingZones: concert.seatingZones
        .filter((zone) => zone.status === SeatingZoneStatus.ACTIVE)
        .map((zone) => this.toSeatingZoneCatalogItem(zone)),
      ticketTypes,
      ticketTypeZoneMappings: this.toTicketTypeZoneMappings(concert.ticketTypes, concert.id),
    };
  }

  private toAssetMetadata(asset: AssetRecord | null): AssetMetadata | null {
    if (!asset) return null;
    return {
      id: asset.id,
      kind: asset.kind,
      status: asset.status,
      publicUrl: asset.publicUrl,
      originalName: asset.originalName,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
    };
  }

  private toSeatingZoneCatalogItem(zone: SeatingZoneRecord): SeatingZoneCatalogItem {
    return {
      id: zone.id,
      svgElementId: zone.svgElementId,
      label: zone.label,
      color: zone.color,
      displayOrder: zone.displayOrder,
      status: zone.status,
    };
  }

  private toTicketTypeCatalogItem(
    ticketType: TicketTypeRecord,
    concertId: string,
  ): TicketTypeCatalogItem {
    return {
      id: ticketType.id,
      code: ticketType.code,
      name: ticketType.name,
      description: ticketType.description,
      priceVnd: ticketType.priceVnd,
      totalQuantity: ticketType.totalQuantity,
      availableQuantity: calculateAvailableQuantity(
        ticketType.totalQuantity,
        ticketType.reservedQuantity,
        ticketType.soldQuantity,
      ),
      maxPerUser: ticketType.maxPerUser,
      saleStartsAt: ticketType.saleStartsAt,
      saleEndsAt: ticketType.saleEndsAt,
      status: ticketType.status,
      zoneIds: this.zoneIdsForTicketType(ticketType, concertId),
    };
  }

  private toAvailabilityTicketType(
    ticketType: TicketTypeRecord,
    concertId: string,
  ): AvailabilityTicketTypeSnapshot {
    return {
      ticketTypeId: ticketType.id,
      code: ticketType.code,
      name: ticketType.name,
      totalQuantity: ticketType.totalQuantity,
      availableQuantity: calculateAvailableQuantity(
        ticketType.totalQuantity,
        ticketType.reservedQuantity,
        ticketType.soldQuantity,
      ),
      status: ticketType.status,
      saleStartsAt: ticketType.saleStartsAt,
      saleEndsAt: ticketType.saleEndsAt,
      zoneIds: this.zoneIdsForTicketType(ticketType, concertId),
    };
  }

  private toTicketTypeZoneMappings(
    ticketTypes: TicketTypeRecord[],
    concertId: string,
  ): TicketTypeZoneMapping[] {
    return ticketTypes.flatMap((ticketType) =>
      (ticketType.zones ?? [])
        .filter(
          (mapping) =>
            mapping.concertId === concertId &&
            mapping.seatingZone?.status === SeatingZoneStatus.ACTIVE,
        )
        .map((mapping) => ({
          ticketTypeId: mapping.ticketTypeId,
          seatingZoneId: mapping.seatingZoneId,
        })),
    );
  }

  private zoneIdsForTicketType(ticketType: TicketTypeRecord, concertId: string): string[] {
    return (ticketType.zones ?? [])
      .filter(
        (mapping) =>
          mapping.concertId === concertId && mapping.seatingZone?.status === SeatingZoneStatus.ACTIVE,
      )
      .map((mapping) => mapping.seatingZoneId);
  }

  private toAvailabilitySummary(ticketTypes: TicketTypeRecord[]): ConcertAvailabilitySummary {
    const prices = ticketTypes.map((ticketType) => ticketType.priceVnd);
    return {
      totalAvailableQuantity: ticketTypes.reduce(
        (total, ticketType) =>
          total +
          calculateAvailableQuantity(
            ticketType.totalQuantity,
            ticketType.reservedQuantity,
            ticketType.soldQuantity,
          ),
        0,
      ),
      minPriceVnd: prices.length > 0 ? Math.min(...prices) : null,
      maxPriceVnd: prices.length > 0 ? Math.max(...prices) : null,
      ticketTypeCount: ticketTypes.length,
    };
  }
}
