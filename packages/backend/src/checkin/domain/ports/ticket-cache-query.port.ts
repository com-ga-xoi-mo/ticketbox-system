export const TICKET_CACHE_QUERY = Symbol('TicketCacheQuery');

export interface TicketCacheHashEntry {
  hash: string;
  status: 'valid' | 'checked_in';
}

export interface TicketCacheDelta {
  upserted: TicketCacheHashEntry[];
  voided: string[];
}

export interface TicketCacheQueryPort {
  getFullCache(concertId: string): Promise<TicketCacheHashEntry[]>;
  getDeltaCache(concertId: string, since: Date): Promise<TicketCacheDelta>;
}
