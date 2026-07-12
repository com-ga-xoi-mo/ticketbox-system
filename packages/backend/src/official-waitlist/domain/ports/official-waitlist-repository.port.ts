import type {
  PurchaseEntitlementRecord,
  TicketTypeWaitlistInfo,
  WaitlistEntitlementNotificationContext,
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

export interface GrantEntitlementInput {
  entryId: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  quantity: number;
  grantedAt: Date;
  expiresAt: Date;
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
  cancelEntryAndRevokeEntitlement(input: {
    userId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<{
    entry: WaitlistEntryRecord | null;
    revokedEntitlementId: string | null;
  }>;
  getStatus(input: {
    userId: string;
    concertId: string;
    ticketTypeId: string;
    now: Date;
  }): Promise<WaitlistStatusRecord>;
  hasActiveGate(ticketTypeId: string): Promise<boolean>;
  sumActiveEntitlementQuantity(ticketTypeId: string, now: Date): Promise<number>;
  listNextWaitingEntries(input: {
    ticketTypeId: string;
    limit: number;
  }): Promise<WaitlistEntryRecord[]>;
  grantEntitlement(input: GrantEntitlementInput): Promise<PurchaseEntitlementRecord>;
  findEntitlementNotificationContext(
    entitlementId: string,
  ): Promise<WaitlistEntitlementNotificationContext | null>;
  listActiveEntitlementsExpiringSoon(input: {
    now: Date;
    reminderWindowEndsAt: Date;
    limit: number;
  }): Promise<PurchaseEntitlementRecord[]>;
  expireEntitlements(now: Date): Promise<Array<{ ticketTypeId: string; quantity: number }>>;
  withTicketTypeLock<T>(ticketTypeId: string, work: () => Promise<T>): Promise<T>;
}
