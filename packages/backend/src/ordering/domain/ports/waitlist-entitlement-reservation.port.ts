export const WAITLIST_ENTITLEMENT_RESERVATION_PORT = Symbol(
  'WaitlistEntitlementReservationPort',
);

export interface WaitlistEntitlementReservationRequest {
  entitlementId?: string;
  userId: string;
  concertId: string;
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  orderId: string;
  now: Date;
}

export interface WaitlistEntitlementReservationPort<TTransaction = unknown> {
  validateAndConsumeForReservation(
    tx: TTransaction,
    request: WaitlistEntitlementReservationRequest,
  ): Promise<void>;
}
