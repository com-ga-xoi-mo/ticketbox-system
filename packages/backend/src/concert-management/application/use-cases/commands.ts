import type { Role } from '../../../identity/domain/role.enum';

export interface CreateConcertCommand {
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
  city?: string;
  startsAt?: Date;
  endsAt?: Date;
  description?: string;
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
