import { z } from 'zod';

const qrHashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const cacheStatusSchema = z.enum(['valid', 'checked_in']);

export const TicketCacheEntrySchema = z
  .object({ hash: qrHashSchema, status: cacheStatusSchema })
  .strict();
export type TicketCacheEntry = z.infer<typeof TicketCacheEntrySchema>;

export const TicketCacheFullResponseSchema = z
  .object({
    entries: z.array(TicketCacheEntrySchema),
    syncedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type TicketCacheFullResponse = z.infer<typeof TicketCacheFullResponseSchema>;

export const TicketCacheDeltaResponseSchema = z
  .object({
    upserted: z.array(TicketCacheEntrySchema),
    voided: z.array(qrHashSchema),
    syncedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type TicketCacheDeltaResponse = z.infer<typeof TicketCacheDeltaResponseSchema>;
