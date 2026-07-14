import type { WaitlistStatusRecord } from '../../domain/waitlist.types';

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
    joinedAt: status.entry?.joinedAt.toISOString() ?? null,
  };
}
