import type { PublicTicketType } from '@ticketbox/api-types';

export type SaleWindowState = 'upcoming' | 'on-sale' | 'ended' | 'paused' | 'sold-out';

export function getSaleWindowState(ticketType: PublicTicketType, now: Date = new Date()): SaleWindowState {
  if (ticketType.status === 'SOLD_OUT' || ticketType.availableQuantity === 0) return 'sold-out';
  if (ticketType.status === 'PAUSED') return 'paused';
  if (ticketType.status === 'ARCHIVED') return 'ended';

  const start = new Date(ticketType.saleStartsAt);
  const end = new Date(ticketType.saleEndsAt);

  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'on-sale';
}
