import type { Role } from '../../../identity/domain/role.enum';

export interface CreateConcertCommand {
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
}

export interface UpdateConcertCommand {
  concertId: string;
  requesterId: string;
  requesterRole: Role;
  allowAdminOverride?: boolean;
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
  slug?: string;
  eventType?: string;
  resaleEnabled?: boolean;
  resaleMaxPricePercent?: number;
  isFeatured?: boolean;
  displayOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string | null;
}

export interface PublishConcertCommand {
  concertId: string;
  requesterId: string;
  requesterRole: Role;
  allowAdminOverride?: boolean;
}

export interface CancelConcertCommand {
  concertId: string;
  requesterId: string;
  requesterRole: Role;
  allowAdminOverride?: boolean;
}

export interface CreateTicketTypeCommand {
  concertId: string;
  requesterId: string;
  requesterRole: Role;
  allowAdminOverride?: boolean;
  code: string;
  name: string;
  description?: string;
  priceVnd: number;
  totalQuantity: number;
  saleStartsAt: Date;
  saleEndsAt: Date;
  maxPerUser: number;
  status?: string; // e.g. ACTIVE, PAUSED, etc.
}

export interface UpdateTicketTypeCommand {
  concertId: string;
  ticketTypeId: string;
  requesterId: string;
  requesterRole: Role;
  allowAdminOverride?: boolean;
  code?: string;
  name?: string;
  description?: string;
  priceVnd?: number;
  totalQuantity?: number;
  saleStartsAt?: Date;
  saleEndsAt?: Date;
  maxPerUser?: number;
  status?: string;
}

export interface ArchiveTicketTypeCommand {
  concertId: string;
  ticketTypeId: string;
  requesterId: string;
  requesterRole: Role;
  allowAdminOverride?: boolean;
}
