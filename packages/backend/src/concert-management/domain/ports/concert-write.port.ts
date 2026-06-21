import type { Concert, TicketType } from '../concert.types';

export const CONCERT_WRITE_REPOSITORY = Symbol('CONCERT_WRITE_REPOSITORY');

export interface ConcertWriteRepositoryPort {
  createConcert(data: {
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
  }): Promise<Concert>;

  updateConcert(
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
      slug?: string;
    },
  ): Promise<Concert>;

  findConcertById(id: string): Promise<Concert | null>;

  findConcertsByOwner(createdById: string): Promise<Concert[]>;

  findAllConcerts(): Promise<Concert[]>;

  createTicketType(data: {
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
  }): Promise<TicketType>;

  updateTicketType(
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
  ): Promise<TicketType>;

  archiveTicketType(id: string): Promise<TicketType>;

  findTicketTypesByConcertId(concertId: string): Promise<TicketType[]>;
}
