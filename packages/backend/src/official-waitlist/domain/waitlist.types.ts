export type WaitlistEntryStatus =
  | 'WAITING'
  | 'CANCELLED';

export type WaitlistAvailabilityMarker = 'AVAILABLE' | 'SOLD_OUT' | 'NOTIFIED';

export interface WaitlistEntryRecord {
  id: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  desiredQuantity: number;
  status: WaitlistEntryStatus;
  joinedAt: Date;
  cancelledAt: Date | null;
}

export interface WaitlistRecoveryNotificationContext {
  entry: WaitlistEntryRecord;
  userEmail: string;
  userDisplayName: string;
  concertTitle: string;
  concertSlug: string;
  ticketTypeName: string;
  ticketTypeCode: string;
}

export interface WaitlistStatusRecord {
  entry: WaitlistEntryRecord | null;
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

export interface WaitlistTicketAvailabilityMarkerRecord {
  ticketTypeId: string;
  markerState: WaitlistAvailabilityMarker;
  lastNotifiedAt: Date | null;
}
