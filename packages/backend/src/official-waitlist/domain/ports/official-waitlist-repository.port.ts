import type {
  TicketTypeWaitlistInfo,
  WaitlistRecoveryNotificationContext,
  WaitlistTicketAvailabilityMarkerRecord,
  WaitlistEntryRecord,
  WaitlistStatusRecord,
} from '../waitlist.types';

export const OFFICIAL_WAITLIST_REPOSITORY = Symbol('OfficialWaitlistRepository');

export interface CreateWaitlistEntryInput {
  userId: string;
  concertId: string;
  ticketTypeId: string;
  desiredQuantity: number;
  joinedAt: Date;
}

export interface OfficialWaitlistRepositoryPort {
  findTicketType(ticketTypeId: string): Promise<TicketTypeWaitlistInfo | null>;
  countAlreadyReservedOrSoldByUser(input: {
    userId: string;
    ticketTypeId: string;
  }): Promise<number>;
  findActiveEntry(input: {
    userId: string;
    ticketTypeId: string;
  }): Promise<WaitlistEntryRecord | null>;
  createEntry(input: CreateWaitlistEntryInput): Promise<WaitlistEntryRecord>;
  cancelEntry(input: {
    userId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<WaitlistEntryRecord | null>;
  getStatus(input: {
    userId: string;
    concertId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<WaitlistStatusRecord>;
  listTicketTypesWithActiveSubscribers(limit: number): Promise<string[]>;
  getOrCreateAvailabilityMarker(
    ticketTypeId: string,
  ): Promise<WaitlistTicketAvailabilityMarkerRecord>;
  updateAvailabilityMarker(input: {
    ticketTypeId: string;
    markerState: 'AVAILABLE' | 'SOLD_OUT' | 'NOTIFIED';
    lastNotifiedAt?: Date | null;
  }): Promise<void>;
  listActiveSubscriberNotificationContexts(input: {
    ticketTypeId: string;
  }): Promise<WaitlistRecoveryNotificationContext[]>;
  withTicketTypeLock<T>(ticketTypeId: string, work: () => Promise<T>): Promise<T>;
}
