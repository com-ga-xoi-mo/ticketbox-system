export type LotteryConfigStatus =
  | 'SCHEDULED'
  | 'DRAWING'
  | 'COMPLETED'
  | 'CANCELLED';

export type LotteryRegistrationStatus =
  | 'REGISTERED'
  | 'WON'
  | 'NOT_SELECTED'
  | 'WITHDRAWN';

export type PurchaseEntitlementStatus =
  | 'ACTIVE'
  | 'CONSUMED'
  | 'EXPIRED'
  | 'REVOKED';

export interface LotteryConfigRecord {
  id: string;
  ticketTypeId: string;
  concertId: string;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  drawAt: Date;
  allocation: number;
  entitlementTtlMinutes: number;
  status: LotteryConfigStatus;
  seed: string | null;
  drawnAt: Date | null;
}

export interface LotteryRegistrationRecord {
  id: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  desiredQuantity: number;
  status: LotteryRegistrationStatus;
  registeredAt: Date;
  wonAt: Date | null;
  notSelectedAt: Date | null;
  withdrawnAt: Date | null;
  fulfilledAt: Date | null;
}

export interface LotteryEntitlementRecord {
  id: string;
  lotteryRegistrationId: string | null;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  orderId: string | null;
  status: PurchaseEntitlementStatus;
  quantity: number;
  grantedAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
}

export interface LotteryStatusRecord {
  registration: LotteryRegistrationRecord | null;
  config: {
    status: LotteryConfigStatus;
    drawAt: Date;
    registrationOpensAt: Date;
    registrationClosesAt: Date;
    entitlementTtlMinutes: number;
  } | null;
  entitlement: LotteryEntitlementRecord | null;
}

export interface TicketTypeLotteryInfo {
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

export interface LotteryEntitlementNotificationContext {
  entitlement: LotteryEntitlementRecord;
  userEmail: string;
  userDisplayName: string;
  concertTitle: string;
  concertSlug: string;
  ticketTypeName: string;
  ticketTypeCode: string;
}

export interface LotteryNotSelectedNotificationContext {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  concertId: string;
  concertTitle: string;
  concertSlug: string;
  ticketTypeName: string;
}

export interface LotteryRegistrationListItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  desiredQuantity: number;
  status: LotteryRegistrationStatus;
  registeredAt: Date;
  wonAt: Date | null;
  notSelectedAt: Date | null;
  withdrawnAt: Date | null;
  fulfilledAt: Date | null;
  entitlement: LotteryEntitlementRecord | null;
}
