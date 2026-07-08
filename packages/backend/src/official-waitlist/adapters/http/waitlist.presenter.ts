import type {
  PurchaseEntitlementRecord,
  WaitlistStatusRecord,
} from '../../domain/waitlist.types';

export function serializeWaitlistStatus(
  status: WaitlistStatusRecord,
  fallback: { concertId: string; ticketTypeId: string },
) {
  return {
    entryId: status.entry?.id ?? null,
    concertId: status.entry?.concertId ?? fallback.concertId,
    ticketTypeId: status.entry?.ticketTypeId ?? fallback.ticketTypeId,
    status: status.entry?.status ?? null,
    desiredQuantity: status.entry?.desiredQuantity ?? null,
    queuePosition: status.queuePosition,
    joinedAt: status.entry?.joinedAt.toISOString() ?? null,
    entitlement: status.entitlement
      ? serializeEntitlement(status.entitlement)
      : null,
  };
}

export function serializeEntitlement(entitlement: PurchaseEntitlementRecord) {
  return {
    id: entitlement.id,
    status: entitlement.status,
    quantity: entitlement.quantity,
    expiresAt: entitlement.expiresAt.toISOString(),
    grantedAt: entitlement.grantedAt.toISOString(),
  };
}
