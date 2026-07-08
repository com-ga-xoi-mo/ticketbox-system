export type WaitlistEntryStatus =
  | 'WAITING'
  | 'GRANTED'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PurchaseEntitlementStatus =
  | 'ACTIVE'
  | 'CONSUMED'
  | 'EXPIRED'
  | 'REVOKED';

export type PurchaseEntitlementSource = 'WAITLIST' | 'LOTTERY';

export interface WaitlistEntryRecord {
  id: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  desiredQuantity: number;
  status: WaitlistEntryStatus;
  joinedAt: Date;
  grantedAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
}

export interface PurchaseEntitlementRecord {
  id: string;
  waitlistEntryId: string | null;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  orderId: string | null;
  source: PurchaseEntitlementSource;
  status: PurchaseEntitlementStatus;
  quantity: number;
  grantedAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
}

export interface WaitlistEntitlementNotificationContext {
  entitlement: PurchaseEntitlementRecord;
  userEmail: string;
  userDisplayName: string;
  concertTitle: string;
  concertSlug: string;
  ticketTypeName: string;
  ticketTypeCode: string;
}

export interface WaitlistStatusRecord {
  entry: WaitlistEntryRecord | null;
  queuePosition: number | null;
  entitlement: PurchaseEntitlementRecord | null;
}

export interface TicketTypeWaitlistInfo {
  id: string;
  concertId: string;
  totalQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  maxPerUser: number;
  status: string;
  saleStartsAt: Date;
  saleEndsAt: Date;
}
